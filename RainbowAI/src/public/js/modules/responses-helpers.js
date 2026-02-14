/**
 * Responses Tab Helper Functions
 *
 * Utilities for the Responses tab:
 * - System message template management
 * - Template editing
 */

import { api, toast, escapeHtml as esc } from '../core/utils.js';

/**
 * Load System Message templates
 */
export async function loadStaticTemplates() {
  try {
    const templates = await api('/templates');
    const el = document.getElementById('static-templates');
    if (!el) return;

    if (Object.keys(templates).length === 0) {
      el.innerHTML = '<p class="text-neutral-400">No system message templates configured.</p>';
      return;
    }

    el.innerHTML = Object.entries(templates).map(([key, content]) => `
      <div class="border rounded-lg p-3 mb-2">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="font-medium text-sm font-mono text-primary-700">${esc(key)}</span>
              <span class="text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">System</span>
            </div>
            <p class="text-xs text-neutral-600 mt-1 line-clamp-2">${esc(content.en || '')}</p>
            ${content.ms || content.zh ? `<div class="flex gap-1 mt-1 text-[10px] text-neutral-400">
              ${content.ms ? '<span title="Malay">MS</span>' : ''}
              ${content.zh ? '<span title="Chinese">ZH</span>' : ''}
            </div>` : ''}
          </div>
          <button onclick="editTemplate('${esc(key)}')" class="text-xs text-primary-600 hover:text-primary-700 ml-2 px-2 py-1 rounded hover:bg-primary-50 transition">Edit</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    if (document.getElementById('static-templates')) {
      document.getElementById('static-templates').innerHTML = `<p class="text-danger-500 text-xs">Failed to load templates: ${esc(e.message)}</p>`;
    }
  }
}

// Note: editTemplate, cancelEditTemplate, saveTemplate, deleteTemplate
// are now in responses-crud.js (Phase 7)
