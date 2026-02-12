// ═══════════════════════════════════════════════════════════════════
// Settings Templates System for Rainbow Admin Dashboard
// Add this code to rainbow-admin.html before the "Regex Patterns Management" section
// ═══════════════════════════════════════════════════════════════════

const SETTINGS_TEMPLATES = {
  'cost-optimized': {
    name: 'T1 Cost-Optimized',
    description: 'Minimal cost using free models (Ollama cloud → OpenRouter free → Groq fallback)',
    icon: '💰',
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
    icon: '⭐',
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
    icon: '⚡',
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
    icon: '⚖️',
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
    icon: '🌏',
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

function renderSettingsTemplateButtons() {
  const container = document.getElementById('settings-template-buttons');
  if (!container) return;

  const buttons = Object.entries(SETTINGS_TEMPLATES).map(([id, tpl]) => {
    const isRecommended = id === 'balanced';
    return `
      <button
        id="settings-tpl-btn-${id}"
        onclick="applySettingsTemplate('${id}')"
        class="settings-template-btn group relative text-xs px-4 py-2.5 rounded-2xl border-2 transition-all
          ${isRecommended
            ? 'bg-primary-100 border-primary-400 shadow-sm'
            : 'bg-white border-neutral-200 hover:border-primary-300 hover:bg-primary-50'}"
        title="${esc(tpl.description)}">
        <span class="font-semibold">${tpl.icon} ${tpl.name}</span>
        ${isRecommended ? '<span class="ml-1 text-xs text-primary-600">✓</span>' : ''}
        <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10 w-64">
          <div class="bg-neutral-900 text-white text-xs rounded-lg p-3 shadow-strong">
            <div class="font-semibold mb-1">${tpl.name}</div>
            <div class="text-neutral-300">${esc(tpl.description)}</div>
          </div>
        </div>
      </button>
    `;
  }).join('');

  container.innerHTML = buttons;
  detectActiveSettingsTemplate();
}

async function applySettingsTemplate(templateId) {
  const template = SETTINGS_TEMPLATES[templateId];
  if (!template) {
    toast('Template not found', 'error');
    return;
  }

  if (!confirm(`Apply "${template.name}" template?\n\nThis will update all settings including:\n• Provider selection & priority\n• Token limits\n• Temperature settings\n• Rate limits\n• Conversation management`)) {
    return;
  }

  try {
    const settings = template.settings;

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
    const currentProviders = [...settingsProviders];
    settings.providers.forEach(tplProvider => {
      const existing = currentProviders.find(p => p.id === tplProvider.id);
      if (existing) {
        existing.enabled = tplProvider.enabled;
        existing.priority = tplProvider.priority;
      }
    });

    // Disable providers not in template
    const templateIds = new Set(settings.providers.map(p => p.id));
    currentProviders.forEach(p => {
      if (!templateIds.has(p.id)) {
        p.enabled = false;
      }
    });

    settingsProviders = currentProviders.sort((a, b) => a.priority - b.priority);

    // Re-render providers list
    renderProvidersList();

    // Highlight the active template button
    detectActiveSettingsTemplate();

    // Save settings
    await saveSettings();

    toast(`Template "${template.name}" applied successfully!`, 'success');
  } catch (err) {
    console.error('Failed to apply template:', err);
    toast('Failed to apply template: ' + err.message, 'error');
  }
}

function detectActiveSettingsTemplate() {
  // Get current settings from form
  const currentSettings = {
    max_classify_tokens: parseInt(document.getElementById('s-ai-classify-tokens')?.value || 0),
    max_chat_tokens: parseInt(document.getElementById('s-ai-chat-tokens')?.value || 0),
    classify_temperature: parseFloat(document.getElementById('s-ai-classify-temp')?.value || 0),
    chat_temperature: parseFloat(document.getElementById('s-ai-chat-temp')?.value || 0),
    rate_limits: {
      per_minute: parseInt(document.getElementById('s-rate-minute')?.value || 0),
      per_hour: parseInt(document.getElementById('s-rate-hour')?.value || 0)
    },
    providers: settingsProviders.filter(p => p.enabled).map(p => ({ id: p.id, priority: p.priority }))
  };

  // Reset all button styles
  document.querySelectorAll('.settings-template-btn').forEach(btn => {
    btn.classList.remove('border-primary-500', 'bg-primary-100', 'shadow-md');
    btn.classList.add('border-neutral-200', 'bg-white');
  });

  // Check which template matches
  let matchedTemplate = null;
  for (const [id, template] of Object.entries(SETTINGS_TEMPLATES)) {
    if (settingsMatchTemplate(currentSettings, template.settings)) {
      matchedTemplate = id;
      break;
    }
  }

  // Highlight matched template
  if (matchedTemplate) {
    const btn = document.getElementById(`settings-tpl-btn-${matchedTemplate}`);
    if (btn) {
      btn.classList.remove('border-neutral-200', 'bg-white');
      btn.classList.add('border-primary-500', 'bg-primary-100', 'shadow-md');
    }

    const indicator = document.getElementById('settings-template-indicator');
    if (indicator) {
      indicator.textContent = `Active template: ${SETTINGS_TEMPLATES[matchedTemplate].name}`;
      indicator.classList.remove('hidden');
    }
  }
}

function settingsMatchTemplate(current, template) {
  // Check if current settings match a template (with some tolerance)
  const tolerance = 0.01; // For temperature comparison

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
  const currentProviderMap = new Map(current.providers.map(p => [p.id, p.priority]));
  const templateProviderMap = new Map(template.providers.map(p => [p.id, p.priority]));

  // Must have same enabled providers
  if (currentProviderMap.size !== templateProviderMap.size) return false;

  for (const [id, priority] of templateProviderMap) {
    if (!currentProviderMap.has(id) || currentProviderMap.get(id) !== priority) {
      return false;
    }
  }

  return true;
}
