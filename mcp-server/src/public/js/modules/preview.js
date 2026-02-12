/**
 * Preview Module
 * Chat simulator for testing AI responses
 */

import { api } from '../api.js';
import { toast } from '../toast.js';
import { escapeHtml as esc } from '../core/utils.js';

/**
 * Load preview/chat simulator
 */
export function loadPreview() {
  const el = document.getElementById('preview-content');
  el.innerHTML = `
    <div class="border rounded-lg p-4">
      <h3 class="font-semibold mb-3">Chat Simulator</h3>
      <div id="preview-messages" class="h-64 overflow-y-auto border rounded p-2 mb-3 bg-neutral-50"></div>
      <form onsubmit="sendPreviewMessage(event)">
        <input type="text" id="preview-input" class="w-full border rounded px-3 py-2" placeholder="Type a message...">
      </form>
    </div>
  `;
}

/**
 * Send preview message
 */
export async function sendPreviewMessage(e) {
  e.preventDefault();
  const input = document.getElementById('preview-input');
  const msg = input.value.trim();
  if (!msg) return;

  const messagesEl = document.getElementById('preview-messages');
  messagesEl.innerHTML += `<div class="mb-2"><strong>You:</strong> ${esc(msg)}</div>`;
  input.value = '';

  try {
    const data = await api('/test-message', { method: 'POST', body: { message: msg } });
    messagesEl.innerHTML += `<div class="mb-2 text-primary-600"><strong>AI:</strong> ${esc(data.reply || 'No response')}</div>`;
    messagesEl.scrollTop = messagesEl.scrollHeight;
  } catch (e) {
    toast(e.message, 'error');
  }
}
