/**
 * Workflow Management Module
 * Handles workflow configuration and step building
 */

import { api } from '../api.js';
import { toast } from '../toast.js';
import { escapeHtml as esc } from '../core/utils.js';

/**
 * Load workflow configuration
 */
export async function loadWorkflow() {
  try {
    const data = await api('/workflows');
    const el = document.getElementById('workflows-list');
    const workflows = data.workflows || [];

    if (workflows.length === 0) {
      el.innerHTML = '<p class="text-neutral-400">No workflows configured.</p>';
      return;
    }

    el.innerHTML = workflows.map(wf => `
      <div class="border rounded-lg p-3 mb-2">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <span class="font-medium text-sm">${esc(wf.name)}</span>
            <p class="text-xs text-neutral-600 mt-1">ID: ${esc(wf.id)}</p>
          </div>
          <button onclick="editWorkflow('${esc(wf.id)}')" class="text-xs text-primary-600 hover:text-primary-700 ml-2">Edit</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    toast(e.message, 'error');
  }
}

/**
 * Edit workflow (placeholder)
 */
export function editWorkflow(id) {
  toast('Edit workflow functionality - to be implemented', 'info');
}
