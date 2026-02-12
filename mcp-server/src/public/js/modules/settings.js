/**
 * Settings Module
 * Manages LLM provider configuration and system settings
 */

import { api } from '../api.js';
import { toast } from '../toast.js';
import { escapeHtml as esc } from '../core/utils.js';

/**
 * Load settings panel
 */
export async function loadSettings() {
  try {
    const data = await api('/settings');
    const el = document.getElementById('settings-content');
    const providers = data.ai?.providers || [];

    el.innerHTML = `
      <div class="space-y-4">
        <h3 class="font-semibold">AI Providers</h3>
        ${providers.map(p => `
          <div class="border rounded p-3">
            <label class="flex items-center gap-2">
              <input type="checkbox" ${p.enabled ? 'checked' : ''} onchange="toggleProvider('${esc(p.id)}', this.checked)">
              <span>${esc(p.name)}</span>
            </label>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    toast(e.message, 'error');
  }
}

/**
 * Toggle AI provider
 */
export async function toggleProvider(id, enabled) {
  try {
    await api('/settings/providers/' + id, { method: 'PATCH', body: { enabled } });
    toast(`Provider ${id}: ${enabled ? 'enabled' : 'disabled'}`);
  } catch (e) {
    toast(e.message, 'error');
  }
}
