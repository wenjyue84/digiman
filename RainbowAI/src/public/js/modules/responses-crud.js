/**
 * Responses CRUD Module
 * Handles knowledge, templates, and LLM-generated reply management
 */

import { api, toast, escapeHtml as esc } from '../core/utils.js';

// Use global functions from legacy-functions.js
const css = window.css || ((s) => String(s).replace(/[^a-zA-Z0-9_-]/g, '_'));
const closeModal = window.closeModal || ((id) => document.getElementById(id)?.classList.add('hidden'));
const loadStaticReplies = () => window.loadStaticReplies?.() || Promise.resolve();

// ═════════════════════════════════════════════════════════════════════
// Knowledge (Static Replies) CRUD
// ═════════════════════════════════════════════════════════════════════

/**
 * Edit a static knowledge reply (show edit form)
 * @param {string} intent - Intent category name
 */
export function editKnowledgeStatic(intent) {
  document.getElementById('k-static-view-' + css(intent)).classList.add('hidden');
  document.getElementById('k-static-edit-' + css(intent)).classList.remove('hidden');
}

/**
 * Cancel editing a knowledge reply (hide edit form)
 * @param {string} id - CSS-escaped intent ID
 */
export function cancelEditKnowledge(id) {
  document.getElementById('k-static-view-' + id).classList.remove('hidden');
  document.getElementById('k-static-edit-' + id).classList.add('hidden');
}

/**
 * Save edited knowledge reply
 * @param {string} intent - Intent category name
 */
export async function saveKnowledgeStatic(intent) {
  const id = css(intent);
  try {
    await api('/knowledge/' + encodeURIComponent(intent), {
      method: 'PUT',
      body: {
        response: {
          en: document.getElementById('k-ed-en-' + id).value,
          ms: document.getElementById('k-ed-ms-' + id).value,
          zh: document.getElementById('k-ed-zh-' + id).value
        }
      }
    });
    toast('Saved: ' + intent);
    loadStaticReplies();
  } catch (e) {
    toast(e.message, 'error');
  }
}

/**
 * Delete a knowledge reply
 * @param {string} intent - Intent category name
 */
export async function deleteKnowledge(intent) {
  if (!confirm('Delete reply for "' + intent + '"?')) return;
  try {
    await api('/knowledge/' + encodeURIComponent(intent), { method: 'DELETE' });
    toast('Deleted: ' + intent);
    loadStaticReplies();
  } catch (e) {
    toast(e.message, 'error');
  }
}

/**
 * Show the "Add Knowledge" modal
 */
export function showAddKnowledge() {
  document.getElementById('add-k-intent').value = '';
  document.getElementById('add-k-en').value = '';
  document.getElementById('add-k-ms').value = '';
  document.getElementById('add-k-zh').value = '';
  document.getElementById('add-knowledge-modal').classList.remove('hidden');
  document.getElementById('add-k-intent').focus();
}

/**
 * Submit the "Add Knowledge" form
 * @param {Event} e - Form submit event
 */
export async function submitAddKnowledge(e) {
  e.preventDefault();
  const intent = document.getElementById('add-k-intent').value.trim();
  try {
    await api('/knowledge', {
      method: 'POST',
      body: {
        intent,
        response: {
          en: document.getElementById('add-k-en').value,
          ms: document.getElementById('add-k-ms').value,
          zh: document.getElementById('add-k-zh').value
        }
      }
    });
    toast('Added: ' + intent);
    closeModal('add-knowledge-modal');
    loadStaticReplies();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ═════════════════════════════════════════════════════════════════════
// Generate by LLM (Draft → Approve → Add to Replies)
// ═════════════════════════════════════════════════════════════════════

/**
 * Show the "Generate by LLM" modal (no intent hint)
 */
export function showGenerateByLLMModal() {
  showGenerateByLLMModalWithIntent(null);
}

/**
 * Show the "Generate by LLM" modal with optional intent hint
 * @param {string|null} intentHint - Intent category to pre-fill
 */
export function showGenerateByLLMModalWithIntent(intentHint) {
  document.getElementById('gen-llm-topic').value = (intentHint && typeof intentHint === 'string') ? intentHint.replace(/_/g, ' ') : '';
  document.getElementById('gen-llm-step1').classList.remove('hidden');
  document.getElementById('gen-llm-loading').classList.add('hidden');
  document.getElementById('gen-llm-step2').classList.add('hidden');
  document.getElementById('generate-by-llm-modal').classList.remove('hidden');
  document.getElementById('gen-llm-topic').focus();
}

/**
 * Close the "Generate by LLM" modal
 */
export function closeGenerateByLLMModal() {
  document.getElementById('generate-by-llm-modal').classList.add('hidden');
}

/**
 * Call LLM to generate a draft reply
 */
export async function callGenerateDraft() {
  const topic = document.getElementById('gen-llm-topic').value.trim();
  const btn = document.getElementById('gen-llm-btn');
  const step1 = document.getElementById('gen-llm-step1');
  const loading = document.getElementById('gen-llm-loading');
  const step2 = document.getElementById('gen-llm-step2');

  if (btn) btn.disabled = true;
  step1.classList.add('hidden');
  loading.classList.remove('hidden');
  step2.classList.add('hidden');

  try {
    const result = await api('/knowledge/generate-draft', { method: 'POST', body: { topic: topic || undefined } });
    if (!result.ok) throw new Error(result.error || 'Generation failed');

    document.getElementById('gen-llm-intent').value = result.intent || '';
    document.getElementById('gen-llm-phase').value = result.phase || 'GENERAL_SUPPORT';
    document.getElementById('gen-llm-en').value = (result.response && result.response.en) || '';
    document.getElementById('gen-llm-ms').value = (result.response && result.response.ms) || '';
    document.getElementById('gen-llm-zh').value = (result.response && result.response.zh) || '';

    loading.classList.add('hidden');
    step2.classList.remove('hidden');
    toast('Draft generated. Edit if needed, then Approve & Add to Replies.');
  } catch (e) {
    loading.classList.add('hidden');
    step1.classList.remove('hidden');
    toast(e.message || 'Generation failed', 'error');
  }

  if (btn) btn.disabled = false;
}

/**
 * Approve and save the LLM-generated reply
 */
export async function approveGeneratedReply() {
  const intent = document.getElementById('gen-llm-intent').value.trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '').toLowerCase();
  const en = document.getElementById('gen-llm-en').value.trim();

  if (!intent) {
    toast('Intent key is required', 'error');
    return;
  }
  if (!en) {
    toast('English response is required', 'error');
    return;
  }

  const ms = document.getElementById('gen-llm-ms').value.trim();
  const zh = document.getElementById('gen-llm-zh').value.trim();
  const responseBody = { en, ms, zh };

  try {
    await api('/knowledge', {
      method: 'POST',
      body: { intent, response: responseBody }
    });
    toast('Added to Intent Replies: ' + intent);
    closeGenerateByLLMModal();
    loadStaticReplies();
  } catch (e) {
    // If intent already exists, try updating instead
    if (e.message && e.message.includes('already exists')) {
      try {
        await api('/knowledge/' + encodeURIComponent(intent), { method: 'PUT', body: { response: responseBody } });
        toast('Updated Intent Reply: ' + intent);
        closeGenerateByLLMModal();
        loadStaticReplies();
      } catch (e2) {
        toast(e2.message || 'Failed to update reply', 'error');
      }
    } else {
      toast(e.message || 'Failed to add reply', 'error');
    }
  }
}

/**
 * Generate an AI reply for a specific intent (one-click generation)
 * @param {string} intent - Intent category name
 */
export async function generateAIReply(intent) {
  const btn = document.getElementById('gen-btn-' + css(intent));
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="inline-block animate-spin mr-1">⏳</span> Generating...';
  }

  try {
    const result = await api('/knowledge/generate', { method: 'POST', body: { intent } });
    if (!result.ok) throw new Error(result.error || 'Generation failed');

    // Save the generated reply
    await api('/knowledge', {
      method: 'POST',
      body: { intent, response: result.response }
    });

    toast('AI reply generated and saved for "' + intent + '". You can edit it below.');
    loadStaticReplies();
  } catch (e) {
    toast(e.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '✨ Generate by AI';
    }
  }
}

// ═════════════════════════════════════════════════════════════════════
// Template CRUD
// ═════════════════════════════════════════════════════════════════════

/**
 * Edit a template (show edit form)
 * @param {string} key - Template key
 */
export function editTemplate(key) {
  document.getElementById('tpl-view-' + css(key)).classList.add('hidden');
  document.getElementById('tpl-edit-' + css(key)).classList.remove('hidden');
}

/**
 * Cancel editing a template (hide edit form)
 * @param {string} id - CSS-escaped template ID
 */
export function cancelEditTemplate(id) {
  document.getElementById('tpl-view-' + id).classList.remove('hidden');
  document.getElementById('tpl-edit-' + id).classList.add('hidden');
}

/**
 * Save edited template
 * @param {string} key - Template key
 */
export async function saveTemplate(key) {
  const id = css(key);
  try {
    await api('/templates/' + encodeURIComponent(key), {
      method: 'PUT',
      body: {
        en: document.getElementById('tpl-ed-en-' + id).value,
        ms: document.getElementById('tpl-ed-ms-' + id).value,
        zh: document.getElementById('tpl-ed-zh-' + id).value
      }
    });
    toast('Saved: ' + key);
    loadStaticReplies();
  } catch (e) {
    toast(e.message, 'error');
  }
}

/**
 * Delete a template
 * @param {string} key - Template key
 */
export async function deleteTemplate(key) {
  if (!confirm('Delete template "' + key + '"?')) return;
  try {
    await api('/templates/' + encodeURIComponent(key), { method: 'DELETE' });
    toast('Deleted: ' + key);
    loadStaticReplies();
  } catch (e) {
    toast(e.message, 'error');
  }
}

/**
 * Show the "Add Template" modal
 */
export function showAddTemplate() {
  document.getElementById('add-t-key').value = '';
  document.getElementById('add-t-en').value = '';
  document.getElementById('add-t-ms').value = '';
  document.getElementById('add-t-zh').value = '';
  document.getElementById('add-template-modal').classList.remove('hidden');
  document.getElementById('add-t-key').focus();
}

/**
 * Submit the "Add Template" form
 * @param {Event} e - Form submit event
 */
export async function submitAddTemplate(e) {
  e.preventDefault();
  try {
    await api('/templates', {
      method: 'POST',
      body: {
        key: document.getElementById('add-t-key').value.trim(),
        en: document.getElementById('add-t-en').value,
        ms: document.getElementById('add-t-ms').value,
        zh: document.getElementById('add-t-zh').value
      }
    });
    toast('Template added');
    closeModal('add-template-modal');
    loadStaticReplies();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ═════════════════════════════════════════════════════════════════════
// Bulk Translate All Intents
// ═════════════════════════════════════════════════════════════════════

/**
 * Translate all intents that are missing MS or ZH translations
 */
export async function translateAllIntents() {
  const btn = document.getElementById('translate-all-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Translating...';
  }

  try {
    const result = await api('/knowledge/translate-all', { method: 'POST' });
    const msg = 'Translated: ' + result.translated + ', Skipped: ' + result.skipped + ', Failed: ' + result.failed + ' (Total: ' + result.total + ')';
    toast(msg);
    loadStaticReplies();
  } catch (e) {
    toast(e.message || 'Bulk translation failed', 'error');
  }

  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Translate All';
  }
}
