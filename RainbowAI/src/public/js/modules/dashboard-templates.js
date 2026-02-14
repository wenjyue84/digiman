// ═══════════════════════════════════════════════════════════════════
// Dashboard Templates Module
// Extracted from legacy-functions.js — Intent Templates + Settings Templates
// ═══════════════════════════════════════════════════════════════════

import { toast } from '../core/utils.js';

// ─── Local utility ─────────────────────────────────────────────────
function esc(s) {
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

// ═══════════════════════════════════════════════════════════════════
// Intent Templates (T1–T7)
// ═══════════════════════════════════════════════════════════════════

const INTENT_TEMPLATES = {
  't1-quality': {
    name: 'T1 Maximum Quality',
    description: 'Highest accuracy, slowest speed, highest cost',
    tiers: {
      tier1_emergency: { enabled: true, contextMessages: 0 },
      tier2_fuzzy: { enabled: true, contextMessages: 10, threshold: 0.95 },
      tier3_semantic: { enabled: true, contextMessages: 10, threshold: 0.72 },
      tier4_llm: { enabled: true, contextMessages: 20 }
    },
    conversationState: {
      trackLastIntent: true,
      trackSlots: true,
      maxHistoryMessages: 30,
      contextTTL: 60
    },
    llm: {
      defaultProviderId: 'groq-llama',
      thresholds: { fuzzy: 0.95, semantic: 0.72, layer2: 0.85, llm: 0.65 },
      maxTokens: 300,
      temperature: 0.05
    }
  },
  't2-performance': {
    name: 'T2 High Performance',
    description: 'Maximum speed, minimum cost, good accuracy',
    tiers: {
      tier1_emergency: { enabled: true, contextMessages: 0 },
      tier2_fuzzy: { enabled: true, contextMessages: 2, threshold: 0.85 },
      tier3_semantic: { enabled: true, contextMessages: 3, threshold: 0.60 },
      tier4_llm: { enabled: true, contextMessages: 5 }
    },
    conversationState: {
      trackLastIntent: true,
      trackSlots: true,
      maxHistoryMessages: 10,
      contextTTL: 15
    },
    llm: {
      defaultProviderId: 'groq-llama-8b',
      thresholds: { fuzzy: 0.85, semantic: 0.60, layer2: 0.75, llm: 0.55 },
      maxTokens: 100,
      temperature: 0.05
    }
  },
  't3-balanced': {
    name: 'T3 Balanced',
    description: 'Optimal balance of speed, cost, and accuracy',
    tiers: {
      tier1_emergency: { enabled: true, contextMessages: 0 },
      tier2_fuzzy: { enabled: true, contextMessages: 3, threshold: 0.80 },
      tier3_semantic: { enabled: true, contextMessages: 5, threshold: 0.67 },
      tier4_llm: { enabled: true, contextMessages: 10 }
    },
    conversationState: {
      trackLastIntent: true,
      trackSlots: true,
      maxHistoryMessages: 20,
      contextTTL: 30
    },
    llm: {
      defaultProviderId: 'groq-llama-8b',
      thresholds: { fuzzy: 0.80, semantic: 0.70, layer2: 0.80, llm: 0.60 },
      maxTokens: 500,
      temperature: 0.1
    }
  },
  't4-smart-fast': {
    name: 'T4 Smart-Fast',
    description: 'AI-optimized thresholds for WhatsApp hostel bot',
    tiers: {
      tier1_emergency: { enabled: true, contextMessages: 0 },
      tier2_fuzzy: { enabled: true, contextMessages: 4, threshold: 0.86 },
      tier3_semantic: { enabled: true, contextMessages: 6, threshold: 0.65 },
      tier4_llm: { enabled: true, contextMessages: 8 }
    },
    conversationState: {
      trackLastIntent: true,
      trackSlots: true,
      maxHistoryMessages: 15,
      contextTTL: 25
    },
    llm: {
      defaultProviderId: 'groq-llama-8b',
      thresholds: { fuzzy: 0.86, semantic: 0.65, layer2: 0.80, llm: 0.58 },
      maxTokens: 150,
      temperature: 0.08
    }
  },
  't5-tiered-hybrid': {
    name: 'T5 Tiered-Hybrid',
    description: 'Cascading tiers with uncertainty-based routing',
    tiers: {
      tier1_emergency: { enabled: true, contextMessages: 0 },
      tier2_fuzzy: { enabled: true, contextMessages: 0, threshold: 0.90 },
      tier3_semantic: { enabled: true, contextMessages: 3, threshold: 0.671 },
      tier4_llm: { enabled: true, contextMessages: 7 }
    },
    conversationState: {
      trackLastIntent: true,
      trackSlots: true,
      maxHistoryMessages: 15,
      contextTTL: 20
    },
    llm: {
      defaultProviderId: 'groq-llama-8b',
      thresholds: { fuzzy: 0.90, semantic: 0.671, layer2: 0.82, llm: 0.60 },
      maxTokens: 200,
      temperature: 0.08
    }
  },
  't6-emergency': {
    name: 'T6 Emergency-Optimized',
    description: 'Optimized for critical emergency detection',
    tiers: {
      tier1_emergency: { enabled: true, contextMessages: 0 },
      tier2_fuzzy: { enabled: true, contextMessages: 5, threshold: 0.75 },
      tier3_semantic: { enabled: false, contextMessages: 0, threshold: 0.67 },
      tier4_llm: { enabled: true, contextMessages: 12 }
    },
    conversationState: {
      trackLastIntent: true,
      trackSlots: true,
      maxHistoryMessages: 25,
      contextTTL: 45
    },
    llm: {
      defaultProviderId: 'groq-llama',
      thresholds: { fuzzy: 0.75, semantic: 0.67, layer2: 0.85, llm: 0.65 },
      maxTokens: 250,
      temperature: 0.05
    }
  },
  't7-multilang': {
    name: 'T7 Multi-Language',
    description: 'Optimized for Chinese, Malay, English code-mixing',
    tiers: {
      tier1_emergency: { enabled: true, contextMessages: 0 },
      tier2_fuzzy: { enabled: true, contextMessages: 6, threshold: 0.82 },
      tier3_semantic: { enabled: true, contextMessages: 8, threshold: 0.63 },
      tier4_llm: { enabled: true, contextMessages: 12 }
    },
    conversationState: {
      trackLastIntent: true,
      trackSlots: true,
      maxHistoryMessages: 18,
      contextTTL: 35
    },
    llm: {
      defaultProviderId: 'ollama-gemini-flash',
      thresholds: { fuzzy: 0.82, semantic: 0.63, layer2: 0.80, llm: 0.62 },
      maxTokens: 200,
      temperature: 0.1
    }
  }
};

// ─── Intent Template Functions ─────────────────────────────────────

function toggleTemplateHelp() {
  var help = document.getElementById('template-help');
  help.classList.toggle('hidden');
}

async function applyIntentTemplate(templateId, event) {
  var template = INTENT_TEMPLATES[templateId];
  if (!template) {
    toast('Template not found', 'error');
    return;
  }

  if (!confirm('Apply template "' + template.name + '"? This will override current tier settings and the T4 LLM model (AI Fallback).')) {
    return;
  }

  try {
    // Apply tier settings via API
    var res = await fetch('/api/rainbow/intent-manager/apply-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: templateId,
        config: template
      })
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    // Update UI via window (defined in intent-manager module)
    window.updateTierUI(template.tiers);

    // Update current template label
    document.getElementById('current-template-label').textContent = template.name;

    // Highlight selected button
    if (event) {
      document.querySelectorAll('.dashboard-template-btn').forEach(function(btn) {
        btn.classList.remove('active');
        var check = btn.querySelector('.btn-check');
        if (check) check.remove();
      });
      var clickedBtn = event.target.closest('.dashboard-template-btn');
      if (clickedBtn) {
        clickedBtn.classList.add('active');
        if (!clickedBtn.querySelector('.btn-check')) {
          var check = document.createElement('span');
          check.className = 'btn-check';
          check.textContent = '\u2713';
          clickedBtn.appendChild(check);
        }
      }
    }

    toast('Template "' + template.name + '" applied successfully!', 'success');

    // Reload to reflect changes (defined in intent-manager module)
    await window.loadIntentManagerData();
  } catch (err) {
    console.error('Failed to apply template:', err);
    toast('Failed to apply template: ' + err.message, 'error');
  }
}

function saveCurrentAsCustom() {
  var name = prompt('Enter a name for this custom template:', 'My Custom Template');
  if (!name) return;

  try {
    // Get current configuration from UI
    var currentConfig = {
      name: name,
      description: 'Custom template',
      tiers: {
        tier1_emergency: {
          enabled: document.getElementById('tier1-enabled').checked,
          contextMessages: 0
        },
        tier2_fuzzy: {
          enabled: document.getElementById('tier2-enabled').checked,
          contextMessages: parseInt(document.getElementById('tier2-context')?.value || 3),
          threshold: parseFloat(document.getElementById('tier2-threshold')?.value || 0.80)
        },
        tier3_semantic: {
          enabled: document.getElementById('tier3-enabled').checked,
          contextMessages: parseInt(document.getElementById('tier3-context')?.value || 5),
          threshold: parseFloat(document.getElementById('tier3-threshold')?.value || 0.67)
        },
        tier4_llm: {
          enabled: document.getElementById('tier4-enabled').checked,
          contextMessages: parseInt(document.getElementById('tier4-context')?.value || 10)
        }
      }
    };

    // Save to localStorage
    var customTemplates = JSON.parse(localStorage.getItem('intent_custom_templates') || '{}');
    var customId = 't-custom-' + Date.now();
    customTemplates[customId] = currentConfig;
    localStorage.setItem('intent_custom_templates', JSON.stringify(customTemplates));

    toast('Custom template "' + name + '" saved!', 'success');
  } catch (err) {
    console.error('Failed to save custom template:', err);
    toast('Failed to save custom template', 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════
// Settings Templates (T1–T5)
// ═══════════════════════════════════════════════════════════════════

const SETTINGS_TEMPLATES = {
  'cost-optimized': {
    name: 'T1 Cost-Optimized',
    description: 'Minimal cost using free models (Ollama cloud \u2192 OpenRouter free \u2192 Groq fallback)',
    icon: '\uD83D\uDCB0',
    settings: {
      max_classify_tokens: 100,
      max_chat_tokens: 400,
      classify_temperature: 0.1,
      chat_temperature: 0.7,
      rate_limits: { per_minute: 15, per_hour: 80 },
      conversation_management: { enabled: true, summarize_threshold: 6 },
      routing_mode: { splitModel: true, classifyProvider: 'ollama-local', tieredPipeline: true },
      providers: [
        { id: 'ollama-local', enabled: true, priority: 1 },
        { id: 'ollama-gemini-flash', enabled: true, priority: 2 },
        { id: 'ollama-deepseek-v3.2', enabled: true, priority: 3 },
        { id: 'ollama-qwen3-80b', enabled: true, priority: 4 },
        { id: 'openrouter-llama-8b', enabled: true, priority: 5 },
        { id: 'openrouter-gemma-9b', enabled: true, priority: 6 },
        { id: 'openrouter-qwen-32b', enabled: true, priority: 7 },
        { id: 'groq-llama-8b', enabled: true, priority: 8 },
        { id: 'groq-llama', enabled: true, priority: 9 }
      ]
    }
  },
  'quality-optimized': {
    name: 'T2 Quality-Optimized',
    description: 'Maximum quality with premium reasoning models (Kimi K2.5, DeepSeek V3.2, DeepSeek R1)',
    icon: '\u2B50',
    settings: {
      max_classify_tokens: 300,
      max_chat_tokens: 2000,
      classify_temperature: 0.05,
      chat_temperature: 0.7,
      rate_limits: { per_minute: 30, per_hour: 200 },
      conversation_management: { enabled: true, summarize_threshold: 20 },
      routing_mode: { splitModel: true, classifyProvider: 'groq-deepseek-r1', tieredPipeline: true },
      providers: [
        { id: 'moonshot-kimi', enabled: true, priority: 1 },
        { id: 'ollama-deepseek-v3.2', enabled: true, priority: 2 },
        { id: 'groq-deepseek-r1', enabled: true, priority: 3 },
        { id: 'groq-llama', enabled: true, priority: 4 },
        { id: 'ollama-qwen3-80b', enabled: true, priority: 5 },
        { id: 'groq-qwen3-32b', enabled: true, priority: 6 },
        { id: 'ollama-gemini-flash', enabled: true, priority: 7 },
        { id: 'ollama-local', enabled: true, priority: 8 }
      ]
    }
  },
  'speed-optimized': {
    name: 'T3 Speed-Optimized',
    description: 'Minimum latency with fastest models (Llama 4 Scout 750 tok/s, Llama 8B 560 tok/s)',
    icon: '\u26A1',
    settings: {
      max_classify_tokens: 100,
      max_chat_tokens: 500,
      classify_temperature: 0.05,
      chat_temperature: 0.7,
      rate_limits: { per_minute: 40, per_hour: 200 },
      conversation_management: { enabled: true, summarize_threshold: 6 },
      routing_mode: { splitModel: true, classifyProvider: 'groq-llama4-scout', tieredPipeline: false },
      providers: [
        { id: 'groq-llama4-scout', enabled: true, priority: 1 },
        { id: 'groq-llama-8b', enabled: true, priority: 2 },
        { id: 'ollama-local', enabled: true, priority: 3 },
        { id: 'groq-qwen3-32b', enabled: true, priority: 4 }
      ]
    }
  },
  'balanced': {
    name: 'T4 Balanced (Recommended)',
    description: 'Optimal balance using free fast models + proven stable fallbacks',
    icon: '\u2696\uFE0F',
    settings: {
      max_classify_tokens: 150,
      max_chat_tokens: 800,
      classify_temperature: 0.1,
      chat_temperature: 0.7,
      rate_limits: { per_minute: 20, per_hour: 100 },
      conversation_management: { enabled: true, summarize_threshold: 10 },
      routing_mode: { splitModel: false, classifyProvider: 'groq-llama-8b', tieredPipeline: true },
      providers: [
        { id: 'ollama-local', enabled: true, priority: 1 },
        { id: 'groq-llama', enabled: true, priority: 2 },
        { id: 'groq-llama-8b', enabled: true, priority: 3 },
        { id: 'groq-qwen3-32b', enabled: true, priority: 4 },
        { id: 'ollama-gemini-flash', enabled: true, priority: 5 }
      ]
    }
  },
  'multilingual': {
    name: 'T5 Multilingual',
    description: 'Optimized for Chinese/Malay/English code-mixing (Qwen, Gemini, DeepSeek)',
    icon: '\uD83C\uDF0F',
    settings: {
      max_classify_tokens: 200,
      max_chat_tokens: 1000,
      classify_temperature: 0.1,
      chat_temperature: 0.7,
      rate_limits: { per_minute: 20, per_hour: 100 },
      conversation_management: { enabled: true, summarize_threshold: 15 },
      routing_mode: { splitModel: true, classifyProvider: 'groq-qwen3-32b', tieredPipeline: true },
      providers: [
        { id: 'ollama-gemini-flash', enabled: true, priority: 1 },
        { id: 'groq-qwen3-32b', enabled: true, priority: 2 },
        { id: 'ollama-qwen3-80b', enabled: true, priority: 3 },
        { id: 'ollama-deepseek-v3.2', enabled: true, priority: 4 },
        { id: 'groq-llama', enabled: true, priority: 5 }
      ]
    }
  }
};

// ─── Settings Template Functions ───────────────────────────────────

function renderSettingsTemplateButtons() {
  var container = document.getElementById('settings-template-buttons');
  if (!container) return;

  var buttonsHtml = '';
  var entries = Object.entries(SETTINGS_TEMPLATES);
  for (var i = 0; i < entries.length; i++) {
    var id = entries[i][0];
    var tpl = entries[i][1];
    var isRecommended = id === 'balanced';
    var btnClass = isRecommended
      ? 'bg-primary-100 border-primary-400 shadow-sm'
      : 'bg-white border-neutral-200 hover:border-primary-300 hover:bg-primary-50';
    var recommendedMark = isRecommended
      ? '<span class="ml-1 text-xs text-primary-600">\u2713</span>'
      : '';

    buttonsHtml += '<button'
      + ' id="settings-tpl-btn-' + id + '"'
      + ' onclick="applySettingsTemplate(\'' + id + '\')"'
      + ' class="settings-template-btn group relative text-xs px-4 py-2.5 rounded-2xl border-2 transition-all ' + btnClass + '"'
      + ' title="' + esc(tpl.description) + '">'
      + '<span class="font-semibold">' + tpl.icon + ' ' + tpl.name + '</span>'
      + recommendedMark
      + '<div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10 w-64">'
      + '<div class="bg-neutral-900 text-white text-xs rounded-lg p-3 shadow-strong">'
      + '<div class="font-semibold mb-1">' + tpl.name + '</div>'
      + '<div class="text-neutral-300">' + esc(tpl.description) + '</div>'
      + '</div>'
      + '</div>'
      + '</button>';
  }

  container.innerHTML = buttonsHtml;
  detectActiveSettingsTemplate();
}

async function applySettingsTemplate(templateId) {
  var template = SETTINGS_TEMPLATES[templateId];
  if (!template) {
    toast('Template not found', 'error');
    return;
  }

  if (!confirm('Apply "' + template.name + '" template?\n\nThis will update all settings including:\n\u2022 Provider selection & priority\n\u2022 Token limits\n\u2022 Temperature settings\n\u2022 Rate limits\n\u2022 Conversation management')) {
    return;
  }

  try {
    var settings = template.settings;

    // Update all form fields
    document.getElementById('s-ai-classify-tokens').value = settings.max_classify_tokens;
    document.getElementById('s-ai-chat-tokens').value = settings.max_chat_tokens;
    document.getElementById('s-ai-classify-temp').value = settings.classify_temperature;
    document.getElementById('s-ai-chat-temp').value = settings.chat_temperature;
    document.getElementById('s-rate-minute').value = settings.rate_limits.per_minute;
    document.getElementById('s-rate-hour').value = settings.rate_limits.per_hour;

    // Update conversation management
    if (settings.conversation_management) {
      document.getElementById('s-conv-enabled').checked = settings.conversation_management.enabled;
      document.getElementById('s-conv-threshold').value = settings.conversation_management.summarize_threshold;
    }

    // Update provider priorities and enabled status
    var currentProviders = [].concat(window.settingsProviders);
    settings.providers.forEach(function(tplProvider) {
      var existing = currentProviders.find(function(p) { return p.id === tplProvider.id; });
      if (existing) {
        existing.enabled = tplProvider.enabled;
        existing.priority = tplProvider.priority;
      }
    });

    // Disable providers not in template
    var templateIds = new Set(settings.providers.map(function(p) { return p.id; }));
    currentProviders.forEach(function(p) {
      if (!templateIds.has(p.id)) {
        p.enabled = false;
      }
    });

    window.settingsProviders = currentProviders.sort(function(a, b) { return a.priority - b.priority; });

    // Re-render providers list (defined in settings module)
    window.renderProvidersList();

    // Highlight the active template button
    detectActiveSettingsTemplate();

    // Save settings (defined in settings module)
    await window.saveSettings();

    toast('Template "' + template.name + '" applied successfully!', 'success');
  } catch (err) {
    console.error('Failed to apply template:', err);
    toast('Failed to apply template: ' + err.message, 'error');
  }
}

function detectActiveSettingsTemplate() {
  // Get current settings from form
  var currentSettings = {
    max_classify_tokens: parseInt(document.getElementById('s-ai-classify-tokens')?.value || 0),
    max_chat_tokens: parseInt(document.getElementById('s-ai-chat-tokens')?.value || 0),
    classify_temperature: parseFloat(document.getElementById('s-ai-classify-temp')?.value || 0),
    chat_temperature: parseFloat(document.getElementById('s-ai-chat-temp')?.value || 0),
    rate_limits: {
      per_minute: parseInt(document.getElementById('s-rate-minute')?.value || 0),
      per_hour: parseInt(document.getElementById('s-rate-hour')?.value || 0)
    },
    providers: window.settingsProviders.filter(function(p) { return p.enabled; }).map(function(p) { return { id: p.id, priority: p.priority }; })
  };

  document.querySelectorAll('.dashboard-template-btn').forEach(function(btn) {
    btn.classList.remove('active');
    var check = btn.querySelector('.btn-check');
    if (check) check.remove();
  });

  var matchedTemplate = null;
  var templateEntries = Object.entries(SETTINGS_TEMPLATES);
  for (var i = 0; i < templateEntries.length; i++) {
    var id = templateEntries[i][0];
    var template = templateEntries[i][1];
    if (settingsMatchTemplate(currentSettings, template.settings)) {
      matchedTemplate = id;
      break;
    }
  }

  if (matchedTemplate) {
    var btn = document.getElementById('settings-tpl-btn-' + matchedTemplate);
    if (btn) {
      btn.classList.add('active');
      if (!btn.querySelector('.btn-check')) {
        var check = document.createElement('span');
        check.className = 'btn-check';
        check.textContent = '\u2713';
        btn.appendChild(check);
      }
    }
    var currentLabel = document.getElementById('settings-current-label');
    if (currentLabel) currentLabel.textContent = SETTINGS_TEMPLATES[matchedTemplate].name;
    var indicator = document.getElementById('settings-template-indicator');
    if (indicator) { indicator.classList.add('hidden'); indicator.textContent = ''; }
  } else {
    var currentLabel = document.getElementById('settings-current-label');
    if (currentLabel) currentLabel.textContent = 'Custom';
    var indicator = document.getElementById('settings-template-indicator');
    if (indicator) { indicator.classList.add('hidden'); indicator.textContent = ''; }
  }
}

function settingsMatchTemplate(current, template) {
  // Check if current settings match a template (with some tolerance)
  var tolerance = 0.01; // For temperature comparison

  // Check token limits
  if (current.max_classify_tokens !== template.max_classify_tokens) return false;
  if (current.max_chat_tokens !== template.max_chat_tokens) return false;

  // Check temperatures (with tolerance)
  if (Math.abs(current.classify_temperature - template.classify_temperature) > tolerance) return false;
  if (Math.abs(current.chat_temperature - template.chat_temperature) > tolerance) return false;

  // Check rate limits
  if (current.rate_limits.per_minute !== template.rate_limits.per_minute) return false;
  if (current.rate_limits.per_hour !== template.rate_limits.per_hour) return false;

  // Check provider configuration (enabled providers and priorities)
  var currentProviderMap = new Map(current.providers.map(function(p) { return [p.id, p.priority]; }));
  var templateProviderMap = new Map(template.providers.map(function(p) { return [p.id, p.priority]; }));

  // Must have same enabled providers
  if (currentProviderMap.size !== templateProviderMap.size) return false;

  for (var entry of templateProviderMap) {
    var id = entry[0];
    var priority = entry[1];
    if (!currentProviderMap.has(id) || currentProviderMap.get(id) !== priority) {
      return false;
    }
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════

export {
  INTENT_TEMPLATES,
  toggleTemplateHelp,
  applyIntentTemplate,
  saveCurrentAsCustom,
  SETTINGS_TEMPLATES,
  renderSettingsTemplateButtons,
  applySettingsTemplate,
  detectActiveSettingsTemplate,
  settingsMatchTemplate
};
