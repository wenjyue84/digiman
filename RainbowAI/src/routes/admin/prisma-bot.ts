/**
 * prisma-bot.ts — Prisma Bot API endpoints
 *
 * POST /prisma-bot/generate   — generate workflow JSON from natural language (original)
 * POST /prisma/ask            — Prisma AI staff assistant chat (US-011/012)
 *   sources: knowledge_base | mcp_server | all_history | internet
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { configStore } from '../../assistant/config-store.js';
import { isAIAvailable, getProviders, resolveApiKey, providerChat } from '../../assistant/ai-provider-manager.js';
import { getKnowledgeMarkdown } from '../../assistant/knowledge-base.js';
import { listConversations, getConversation } from '../../assistant/conversation-logger.js';
import { badRequest, serverError } from './http-utils.js';

const router = Router();

// ─── System Prompt for Workflow Generation ─────────────────────────

const DEFAULT_SYSTEM_PROMPT = `You are Prisma Bot, an AI assistant that generates workflow JSON for a WhatsApp chatbot system called Rainbow AI at Pelangi Capsule Hostel.

When the user describes a workflow in natural language, you generate a valid workflow JSON object.

## Workflow JSON Schema

A workflow has this structure:
{
  "id": "snake_case_id",
  "name": "Human Readable Name",
  "format": "nodes",
  "startNodeId": "first_node_id",
  "nodes": [ ... ]
}

## Available Node Types

1. **message** — Send a trilingual message to the guest
   {
     "id": "unique_node_id",
     "type": "message",
     "label": "Short description",
     "config": {
       "message": { "en": "English text", "ms": "Malay text", "zh": "Chinese text" }
     },
     "next": "next_node_id"
   }

2. **wait_reply** — Wait for guest to reply, store their answer in a variable
   {
     "id": "unique_node_id",
     "type": "wait_reply",
     "label": "Short description",
     "config": {
       "storeAs": "variable_name",
       "prompt": { "en": "Question in English?", "ms": "Soalan dalam Bahasa Melayu?", "zh": "中文问题？" }
     },
     "next": "next_node_id"
   }

3. **whatsapp_send** — Send a WhatsApp message to a specific number (e.g., notify admin)
   {
     "id": "unique_node_id",
     "type": "whatsapp_send",
     "label": "Short description",
     "config": {
       "receiver": "{{system.admin_phone}}",
       "content": { "en": "Notification text", "ms": "Teks notifikasi", "zh": "通知文本" },
       "urgency": "normal"
     },
     "next": "next_node_id"
   }

4. **pelangi_api** — Call the Pelangi Manager API
   {
     "id": "unique_node_id",
     "type": "pelangi_api",
     "label": "Short description",
     "config": {
       "action": "check_availability",
       "params": {}
     },
     "next": "next_node_id"
   }
   Available actions: check_availability, check_lower_deck, create_checkin_link, book_capsule

5. **condition** — Branch based on a variable's value
   {
     "id": "unique_node_id",
     "type": "condition",
     "label": "Short description",
     "config": {
       "field": "{{workflow.data.variable_name}}",
       "operator": "equals",
       "value": "yes",
       "trueNext": "node_if_true",
       "falseNext": "node_if_false"
     }
   }
   Operators: equals, not_equals, contains, gt, lt, exists

## Template Variables
- {{guest.name}}, {{guest.phone}} — Guest info
- {{system.admin_phone}} — Admin phone number
- {{workflow.data.VARIABLE}} — Variables stored by wait_reply nodes

## Trilingual Messages
ALL user-facing text MUST include en (English), ms (Malay), and zh (Chinese) translations.

## Example Workflow

Here is a complete example — a simple complaint handler:
{
  "id": "complaint_handler",
  "name": "Complaint Handler",
  "format": "nodes",
  "startNodeId": "complaint_welcome",
  "nodes": [
    {
      "id": "complaint_welcome",
      "type": "message",
      "label": "Welcome message",
      "config": {
        "message": {
          "en": "I'm sorry to hear you're having an issue. Let me help you report it.",
          "ms": "Maaf mendengar anda ada masalah. Biar saya bantu anda melaporkannya.",
          "zh": "很抱歉听到您遇到了问题。让我帮您报告。"
        }
      },
      "next": "ask_issue"
    },
    {
      "id": "ask_issue",
      "type": "wait_reply",
      "label": "Ask about the issue",
      "config": {
        "storeAs": "issue_description",
        "prompt": {
          "en": "Please describe the issue you're experiencing.",
          "ms": "Sila terangkan masalah yang anda alami.",
          "zh": "请描述您遇到的问题。"
        }
      },
      "next": "notify_staff"
    },
    {
      "id": "notify_staff",
      "type": "whatsapp_send",
      "label": "Notify staff",
      "config": {
        "receiver": "{{system.admin_phone}}",
        "content": {
          "en": "Guest {{guest.name}} ({{guest.phone}}) reported: {{workflow.data.issue_description}}",
          "ms": "Tetamu {{guest.name}} ({{guest.phone}}) melaporkan: {{workflow.data.issue_description}}",
          "zh": "客人 {{guest.name}} ({{guest.phone}}) 报告：{{workflow.data.issue_description}}"
        },
        "urgency": "high"
      },
      "next": "confirm_msg"
    },
    {
      "id": "confirm_msg",
      "type": "message",
      "label": "Confirmation",
      "config": {
        "message": {
          "en": "Your issue has been reported to our staff. Someone will assist you shortly.",
          "ms": "Masalah anda telah dilaporkan kepada staf kami. Seseorang akan membantu anda tidak lama lagi.",
          "zh": "您的问题已报告给我们的工作人员。很快会有人来协助您。"
        }
      }
    }
  ]
}

## Rules
1. Generate ONLY valid JSON — no markdown, no code fences, no explanation text
2. Every node must have a unique id (use snake_case)
3. The last node in a chain should NOT have a "next" field
4. All messages must be trilingual (en, ms, zh)
5. Use meaningful node IDs that describe their purpose
6. Keep workflows practical and concise`;

// ─── Generate Workflow ──────────────────────────────────────────────

router.post('/prisma-bot/generate', async (req: Request, res: Response) => {
  const { description, history } = req.body;
  if (!description || typeof description !== 'string') {
    badRequest(res, 'description (string) required');
    return;
  }

  if (!isAIAvailable()) {
    serverError(res, 'No AI providers available');
    return;
  }

  try {
    const settings = configStore.getSettings();
    const prismaSettings = (settings as any).prismaBot || {};
    const systemPrompt = prismaSettings.systemPrompt || DEFAULT_SYSTEM_PROMPT;

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history if provided
    if (Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }
    }

    messages.push({
      role: 'user',
      content: description
    });

    // Try providers with fallback
    const providers = getProviders();

    // If prismaBot has a preferred provider, try that first
    const preferredId = prismaSettings.providerId;
    let sortedProviders = [...providers];
    if (preferredId) {
      const prefIdx = sortedProviders.findIndex(p => p.id === preferredId);
      if (prefIdx > 0) {
        const [pref] = sortedProviders.splice(prefIdx, 1);
        sortedProviders.unshift(pref);
      }
    }

    let result: { content: string; usage?: any } | null = null;
    let usedModel = 'unknown';
    const startTime = Date.now();

    for (const provider of sortedProviders) {
      const apiKey = resolveApiKey(provider);
      if (!apiKey && provider.type !== 'ollama') continue;

      try {
        result = await providerChat(
          provider,
          messages,
          4096, // generous tokens for workflow JSON
          0.3,  // low temperature for structured output
          false // not JSON mode — some providers don't support it with system prompts
        );
        if (result) {
          usedModel = provider.name;
          break;
        }
      } catch (err: any) {
        console.warn(`[PrismaBot] Provider ${provider.name} failed: ${err.message}`);
        continue;
      }
    }

    if (!result) {
      serverError(res, 'All AI providers failed to generate workflow');
      return;
    }

    const responseTime = Date.now() - startTime;

    // Try to parse the JSON from the response
    let workflow = null;
    let parseError = null;
    try {
      // Extract JSON from response (handle markdown code fences)
      let jsonStr = result.content;
      const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (fenceMatch) {
        jsonStr = fenceMatch[1];
      }
      workflow = JSON.parse(jsonStr.trim());
    } catch (e: any) {
      parseError = e.message;
    }

    res.json({
      ok: true,
      workflow,
      raw: result.content,
      parseError,
      model: usedModel,
      responseTime,
      usage: result.usage || null
    });
  } catch (err: any) {
    console.error('[PrismaBot] Error:', err);
    serverError(res, err.message || 'Failed to generate workflow');
  }
});

// ─── Get Prisma Bot Settings ────────────────────────────────────────

router.get('/prisma-bot/settings', (_req: Request, res: Response) => {
  const settings = configStore.getSettings();
  const prismaSettings = (settings as any).prismaBot || {
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    providerId: 'google-gemini-flash',
    model: 'gemini-2.5-flash'
  };
  res.json(prismaSettings);
});

// ─── Save Prisma Bot Settings ───────────────────────────────────────

router.put('/prisma-bot/settings', (req: Request, res: Response) => {
  const { systemPrompt, providerId, model } = req.body;
  const settings = configStore.getSettings();
  (settings as any).prismaBot = {
    systemPrompt: systemPrompt || DEFAULT_SYSTEM_PROMPT,
    providerId: providerId || 'google-gemini-flash',
    model: model || 'gemini-2.5-flash'
  };
  configStore.setSettings(settings);
  res.json({ ok: true, prismaBot: (settings as any).prismaBot });
});

// ─── Prisma AI Staff Assistant (US-011/012) ─────────────────────────

const PRISMA_ASK_SYSTEM = `You are Prisma, an intelligent AI assistant for Pelangi Capsule Hostel staff.
You help staff answer questions about guests, bookings, hostel operations, and policies.
Be concise, factual, and helpful. If you don't know something, say so clearly.
When referencing information, cite the source (e.g. "According to the knowledge base...").`;

router.post('/prisma/ask', async (req: Request, res: Response) => {
  const { question, source, conversationHistory, activePhone } = req.body;
  if (!question || typeof question !== 'string') {
    badRequest(res, 'question (string) required');
    return;
  }
  if (!isAIAvailable()) {
    serverError(res, 'No AI providers available');
    return;
  }

  const src = (source as string) || 'knowledge_base';
  let contextText = '';
  let sourceUsed = src;

  try {
    if (src === 'knowledge_base') {
      const kb = getKnowledgeMarkdown();
      contextText = kb ? `## Knowledge Base\n\n${kb.slice(0, 8000)}` : '';
    } else if (src === 'mcp_server') {
      const convs = await listConversations();
      const topContacts = convs.slice(0, 30).map((c: any) =>
        `- ${c.name || c.phone} (${c.phone}): last msg ${new Date(c.lastMessageTime || 0).toLocaleDateString()}, unread: ${c.unreadCount || 0}`
      ).join('\n');
      contextText = `## Live Hostel Data (via MCP)\n\n### Recent Contacts\n${topContacts}`;
    } else if (src === 'all_history' && activePhone) {
      const conv = await getConversation(activePhone);
      const msgs = (conv?.messages || []).slice(-60);
      const historyText = msgs.map((m: any) =>
        `[${m.fromMe ? 'Staff' : 'Guest'}] ${m.body || m.text || ''}`
      ).filter((s: string) => s.trim().length > 1).join('\n');
      contextText = `## Conversation History with ${activePhone}\n\n${historyText.slice(0, 8000)}`;
    } else if (src === 'internet') {
      contextText = '## Internet Search\n\nInternet search is not yet available. Please use Knowledge Base or MCP Server source instead.';
    }
  } catch (err: any) {
    console.warn('[Prisma/ask] Context fetch error:', err.message);
  }

  const systemContent = PRISMA_ASK_SYSTEM + (contextText ? `\n\n${contextText}` : '');
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemContent }
  ];

  if (Array.isArray(conversationHistory)) {
    for (const msg of conversationHistory.slice(-20)) {
      if (msg.role && msg.content) {
        messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content });
      }
    }
  }

  messages.push({ role: 'user', content: question });

  const providers = getProviders();
  let result: { content: string; usage?: any } | null = null;
  let usedModel = 'unknown';

  for (const provider of providers) {
    const apiKey = resolveApiKey(provider);
    if (!apiKey && provider.type !== 'ollama') continue;
    try {
      result = await providerChat(provider, messages, 1024, 0.5, false);
      if (result) { usedModel = provider.name; break; }
    } catch (err: any) {
      console.warn(`[Prisma/ask] Provider ${provider.name} failed: ${err.message}`);
    }
  }

  if (!result) {
    serverError(res, 'All AI providers failed');
    return;
  }

  res.json({ ok: true, answer: result.content, sourceUsed, model: usedModel });
});

export default router;
