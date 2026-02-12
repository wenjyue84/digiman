/**
 * Static Knowledge Module
 * Manages static reply templates and knowledge base entries
 */

import { api } from '../api.js';
import { toast } from '../toast.js';
import { escapeHtml as esc } from '../core/utils.js';

/**
 * Load static replies/knowledge base
 */
export async function loadStaticReplies() {
  try {
    const data = await api('/knowledge');
    const el = document.getElementById('static-replies-list');
    const entries = data.static || [];

    if (entries.length === 0) {
      el.innerHTML = '<p class="text-neutral-400">No static replies configured.</p>';
      return;
    }

    el.innerHTML = entries.map(entry => `
      <div class="border rounded-lg p-3 mb-2">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <span class="font-medium text-sm">${esc(entry.intent)}</span>
            <p class="text-xs text-neutral-600 mt-1">${esc(entry.reply)}</p>
          </div>
          <button onclick="editStaticReply('${esc(entry.intent)}')" class="text-xs text-primary-600 hover:text-primary-700 ml-2">Edit</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    toast(e.message, 'error');
  }
}

/**
 * Edit static reply (placeholder for full implementation)
 */
export function editStaticReply(intent) {
  toast('Edit functionality - to be implemented', 'info');
}
