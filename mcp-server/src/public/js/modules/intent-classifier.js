/**
 * Intent Classification Module
 * Manages intent keywords, examples, and classification
 */

import { api } from '../api.js';
import { toast } from '../toast.js';
import { escapeHtml as esc } from '../core/utils.js';

/**
 * Load intent manager data (keywords, examples, templates)
 */
export async function loadIntentManagerData() {
  try {
    const data = await api('/intents');
    const el = document.getElementById('intent-manager-content');
    const categories = data.categories || [];

    el.innerHTML = categories.map(cat => `
      <div class="border rounded-lg p-3 mb-2">
        <h4 class="font-medium">${esc(cat.phase || 'Uncategorized')}</h4>
        <p class="text-xs text-neutral-600">${(cat.intents || []).length} intents</p>
      </div>
    `).join('');
  } catch (e) {
    toast(e.message, 'error');
  }
}
