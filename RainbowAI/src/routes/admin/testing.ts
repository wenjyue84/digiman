import { Router } from 'express';
import type { Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { configStore } from '../../assistant/config-store.js';
import { isAIAvailable, classifyAndRespond, testProvider } from '../../assistant/ai-client.js';
import { buildSystemPrompt, guessTopicFiles } from '../../assistant/knowledge-base.js';

const router = Router();

// ─── Intent Test ─────────────────────────────────────────────────────

router.post('/intents/test', async (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'message (string) required' });
    return;
  }
  try {
    const { classifyMessage } = await import('../../assistant/intents.js');
    const intentResult = await classifyMessage(message, []);

    const routingConfig = configStore.getRouting() || {};
    const route = routingConfig[intentResult.category];
    const routedAction: string = route?.action || 'llm_reply';

    let response = '';
    if (routedAction === 'static_reply') {
      const { getStaticReply } = await import('../../assistant/knowledge.js');
      response = getStaticReply(intentResult.category, 'en') || '(no static reply configured)';
    } else if (isAIAvailable()) {
      const systemPrompt = buildSystemPrompt(configStore.getSettings().system_prompt);
      const aiResult = await classifyAndRespond(systemPrompt, [], message);
      response = aiResult.response;
    }

    res.json({
      intent: intentResult.category,
      source: intentResult.source,
      action: routedAction,
      confidence: intentResult.confidence,
      response,
      matchedKeyword: intentResult.matchedKeyword,
      matchedExample: intentResult.matchedExample,
      detectedLanguage: intentResult.detectedLanguage
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Preview Chat (Simulate Guest Conversation) ────────────────────

router.post('/preview/chat', async (req: Request, res: Response) => {
  const { message, history } = req.body;
  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'message (string) required' });
    return;
  }

  try {
    const startTime = Date.now();

    const conversationHistory = Array.isArray(history) ? history.map((msg: any) => ({
      role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.timestamp || new Date().toISOString()
    })) : [];

    const { classifyMessage } = await import('../../assistant/intents.js');
    const intentResult = await classifyMessage(message, conversationHistory);

    const routingConfig = configStore.getRouting() || {};
    const route = routingConfig[intentResult.category];
    const routedAction: string = route?.action || 'llm_reply';

    const { detectMessageType } = await import('../../assistant/problem-detector.js');
    const messageType = detectMessageType(message);

    // Analyze sentiment
    const { analyzeSentiment, isSentimentAnalysisEnabled } = await import('../../assistant/sentiment-tracker.js');
    const sentimentScore = isSentimentAnalysisEnabled() ? analyzeSentiment(message) : null;

    let finalMessage = '';
    let llmModel = 'none';
    let topicFiles: string[] = [];
    let problemOverride = false;
    let editMeta: {
      type: 'knowledge' | 'workflow' | 'template';
      intent?: string;
      workflowId?: string;
      workflowName?: string;
      stepId?: string;
      stepIndex?: number;
      templateKey?: string;
      languages?: { en: string; ms: string; zh: string };
      alsoTemplate?: { key: string; languages: { en: string; ms: string; zh: string } };
    } | null = null;

    if (routedAction === 'static_reply') {
      const knowledge = configStore.getKnowledge() || { static: [], dynamic: {} };
      const staticEntry = (knowledge.static || []).find(e => e.intent === intentResult.category);
      const staticText = staticEntry?.response?.en || '(no static reply configured)';

      if (messageType === 'info') {
        finalMessage = staticText;
      } else {
        problemOverride = true;
        if (isAIAvailable()) {
          topicFiles = guessTopicFiles(message);
          const systemPrompt = buildSystemPrompt(configStore.getSettings().system_prompt, topicFiles);
          const result = await classifyAndRespond(systemPrompt, conversationHistory, message);
          finalMessage = result.response || staticText;
          llmModel = result.model || 'unknown';
        } else {
          finalMessage = staticText;
        }
      }

      // Inline-edit metadata for static replies (Quick Replies)
      if (staticEntry) {
        editMeta = {
          type: 'knowledge',
          intent: intentResult.category,
          languages: { en: staticEntry.response.en || '', ms: staticEntry.response.ms || '', zh: staticEntry.response.zh || '' }
        };
      }

      // Check if this intent also has a System Message template
      const templates = configStore.getTemplates() || {};
      const tmpl = templates[intentResult.category];
      if (tmpl && editMeta) {
        editMeta.alsoTemplate = {
          key: intentResult.category,
          languages: { en: tmpl.en || '', ms: tmpl.ms || '', zh: tmpl.zh || '' }
        };
      }

    } else if (routedAction === 'workflow') {
      // Workflow routing — show the first step message
      const workflowId = route?.workflow_id;
      if (workflowId) {
        const workflowsData = configStore.getWorkflows() || { workflows: [] };
        const workflow = (workflowsData.workflows || []).find(w => w.id === workflowId);
        if (workflow && workflow.steps.length > 0) {
          // Show all non-waitForReply intro messages, then the first waitForReply step
          const introMessages: string[] = [];
          let editStep = workflow.steps[0];
          for (const step of workflow.steps) {
            introMessages.push(step.message?.en || '');
            editStep = step;
            if (step.waitForReply) break;
          }
          finalMessage = introMessages.join('\n\n');
          editMeta = {
            type: 'workflow',
            workflowId,
            workflowName: workflow.name,
            stepId: editStep.id,
            stepIndex: workflow.steps.indexOf(editStep),
            languages: {
              en: editStep.message?.en || '',
              ms: editStep.message?.ms || '',
              zh: editStep.message?.zh || ''
            }
          };
        }
      }
      // Fallback to LLM if workflow not found
      if (!finalMessage) {
        if (isAIAvailable()) {
          topicFiles = guessTopicFiles(message);
          const systemPrompt = buildSystemPrompt(configStore.getSettings().system_prompt, topicFiles);
          const result = await classifyAndRespond(systemPrompt, conversationHistory, message);
          finalMessage = result.response;
          llmModel = result.model || 'unknown';
        } else {
          finalMessage = 'Workflow not configured';
        }
      }

    } else if (isAIAvailable()) {
      topicFiles = guessTopicFiles(message);
      const systemPrompt = buildSystemPrompt(configStore.getSettings().system_prompt, topicFiles);
      const result = await classifyAndRespond(systemPrompt, conversationHistory, message);
      finalMessage = result.response;
      llmModel = result.model || 'unknown';
    } else {
      finalMessage = 'AI not available';
    }

    const responseTime = Date.now() - startTime;

    res.json({
      message: finalMessage,
      intent: intentResult.category,
      source: intentResult.source,
      action: routedAction,
      routedAction: routedAction,
      confidence: intentResult.confidence,
      model: llmModel,
      responseTime: responseTime,
      matchedKeyword: intentResult.matchedKeyword,
      matchedExample: intentResult.matchedExample,
      detectedLanguage: intentResult.detectedLanguage,
      kbFiles: topicFiles.length > 0 ? ['AGENTS.md', 'soul.md', 'memory.md', ...topicFiles] : [],
      messageType: messageType,
      problemOverride: problemOverride,
      sentiment: sentimentScore,
      editMeta: editMeta
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Test AI Provider (dynamic) ──────────────────────────────────────

router.post('/test-ai/:provider', async (req: Request, res: Response) => {
  const providerId = req.params.provider;
  try {
    const result = await testProvider(providerId);
    res.json(result);
  } catch (e: any) {
    res.json({ ok: false, error: e.message });
  }
});

// ─── Workflow Testing (Send Real Message) ────────────────────────────

router.post('/test-workflow/send-summary', async (req: Request, res: Response) => {
  const { workflowId, collectedData, phone } = req.body;
  if (!workflowId || !phone) {
    res.status(400).json({ error: 'workflowId and phone required' });
    return;
  }

  try {
    const workflows = configStore.getWorkflows();
    const workflow = workflows.workflows.find(w => w.id === workflowId);
    if (!workflow) {
      res.status(404).json({ error: `Workflow "${workflowId}" not found` });
      return;
    }

    const lines: string[] = [];
    lines.push(`📋 *Workflow Test Summary: ${workflow.name}*`);
    lines.push('');
    lines.push(`🧪 *Test Mode*`);
    lines.push(`📱 *Admin Phone:* ${phone}`);
    lines.push('');
    lines.push('*Collected Test Responses:*');

    Object.entries(collectedData).forEach(([stepId, response], idx) => {
      const step = workflow.steps.find(s => s.id === stepId);
      if (step) {
        lines.push(`${idx + 1}. ${step.message.en}`);
        lines.push(`   ↳ _${response}_`);
      }
    });

    lines.push('');
    lines.push('---');
    lines.push('🧪 _Test executed via Workflow Tester_');
    lines.push('🤖 _Generated by Rainbow AI Assistant_');

    const summary = lines.join('\n');

    const { sendWhatsAppMessage } = await import('../../lib/baileys-client.js');
    await sendWhatsAppMessage(phone, summary);
    console.log(`[Admin] Workflow test summary sent to ${phone}`);

    res.json({ ok: true, message: 'Summary sent successfully', summary });
  } catch (err: any) {
    console.error('[Admin] Failed to send workflow test summary:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Test Runner ─────────────────────────────────────────────────────

router.post('/tests/run', async (_req: Request, res: Response) => {
  const projectArg = (_req.body?.project as string) || 'unit';
  const allowed = ['unit', 'integration', 'semantic'];
  if (!allowed.includes(projectArg)) {
    res.status(400).json({ error: `Invalid project: ${projectArg}. Allowed: ${allowed.join(', ')}` });
    return;
  }

  const mcpRoot = path.resolve(process.cwd());
  const npxPath = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  try {
    const result = await new Promise<{ stdout: string; stderr: string; code: number }>((resolve) => {
      let stdout = '';
      let stderr = '';
      const child = spawn(npxPath, ['vitest', 'run', '--project', projectArg, '--reporter=json'], {
        cwd: mcpRoot,
        env: { ...process.env, FORCE_COLOR: '0' },
        shell: true,
        timeout: 120_000,
      });
      child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
      child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
      child.on('close', (code) => resolve({ stdout, stderr, code: code ?? 1 }));
      child.on('error', (err) => resolve({ stdout, stderr: err.message, code: 1 }));
    });

    let parsed: any = null;
    try {
      const jsonStart = result.stdout.indexOf('{');
      if (jsonStart >= 0) {
        parsed = JSON.parse(result.stdout.slice(jsonStart));
      }
    } catch { /* non-JSON output, return raw */ }

    if (parsed) {
      const testFiles = (parsed.testResults || []).map((f: any) => ({
        file: path.basename(f.name || ''),
        status: f.status,
        tests: (f.assertionResults || []).map((t: any) => ({
          name: t.fullName || t.title,
          status: t.status,
          duration: t.duration,
          failureMessages: t.failureMessages,
        })),
        duration: f.endTime - f.startTime,
      }));

      res.json({
        success: parsed.success ?? (result.code === 0),
        numTotalTests: parsed.numTotalTests ?? 0,
        numPassedTests: parsed.numPassedTests ?? 0,
        numFailedTests: parsed.numFailedTests ?? 0,
        numTotalTestSuites: parsed.numTotalTestSuites ?? 0,
        numPassedTestSuites: parsed.numPassedTestSuites ?? 0,
        numFailedTestSuites: parsed.numFailedTestSuites ?? 0,
        startTime: parsed.startTime,
        duration: Date.now() - (parsed.startTime || Date.now()),
        testFiles,
        project: projectArg,
      });
    } else {
      res.json({
        success: result.code === 0,
        raw: result.stdout.slice(0, 5000),
        stderr: result.stderr.slice(0, 2000),
        project: projectArg,
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Test Coverage Runner ────────────────────────────────────────────

router.post('/tests/coverage', async (_req: Request, res: Response) => {
  const mcpRoot = path.resolve(process.cwd());
  const npxPath = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  try {
    const result = await new Promise<{ stdout: string; stderr: string; code: number }>((resolve) => {
      let stdout = '';
      let stderr = '';
      const child = spawn(npxPath, ['vitest', 'run', '--project', 'unit', '--coverage', '--reporter=json'], {
        cwd: mcpRoot,
        env: { ...process.env, FORCE_COLOR: '0' },
        shell: true,
        timeout: 120_000,
      });
      child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
      child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
      child.on('close', (code) => resolve({ stdout, stderr, code: code ?? 1 }));
      child.on('error', (err) => resolve({ stdout, stderr: err.message, code: 1 }));
    });

    const coverageLines = result.stderr.split('\n').filter(l => l.includes('|') && !l.includes('---'));
    const coverage: { file: string; stmts: string; branch: string; funcs: string; lines: string }[] = [];
    for (const line of coverageLines) {
      const parts = line.split('|').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 5 && parts[0] !== 'File') {
        coverage.push({ file: parts[0], stmts: parts[1], branch: parts[2], funcs: parts[3], lines: parts[4] });
      }
    }

    res.json({
      success: result.code === 0,
      coverage,
      raw: result.stderr.slice(0, 5000),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
