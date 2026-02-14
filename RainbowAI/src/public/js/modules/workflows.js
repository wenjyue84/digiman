/**
 * @fileoverview Multi-step workflow CRUD and advanced settings
 * @module workflows
 */

import { api, toast, escapeHtml as esc } from '../core/utils.js';
import { updateWorkflowTestSelect } from './workflow-testing.js';

// ─── State ─────────────────────────────────────────────────────────────
let cachedWorkflows = { workflows: [] };
let currentWorkflowId = null;
let currentWorkflowSteps = [];

// ─── Main Loader ───────────────────────────────────────────────────────
export async function loadWorkflow() {
  try {
    const [workflowsData, advancedData] = await Promise.all([
      api('/workflows'),
      api('/workflow')
    ]);
    cachedWorkflows = workflowsData;
    renderWorkflowList();
    renderAdvancedSettings(advancedData);
    updateWorkflowTestSelect(); // Update workflow test dropdown
    // Re-select current workflow if one was active
    if (currentWorkflowId) {
      const still = workflowsData.workflows.find(w => w.id === currentWorkflowId);
      if (still) selectWorkflow(currentWorkflowId);
      else { currentWorkflowId = null; hideWorkflowEditor(); }
    }
  } catch (e) { toast(e.message, 'error'); }
}

export function renderWorkflowList() {
  const el = document.getElementById('workflow-list');
  const wfs = cachedWorkflows.workflows || [];
  if (wfs.length === 0) {
    el.innerHTML = '<p class="text-neutral-400 text-sm">No workflows yet</p>';
    return;
  }
  el.innerHTML = wfs.map(w => `
    <div onclick="selectWorkflow('${esc(w.id)}')"
      class="card-hover border rounded-xl p-3 relative ${currentWorkflowId === w.id ? 'border-primary-500 bg-primary-50' : w.featured ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 hover:border-green-400' : 'hover:border-neutral-300'}">
      ${w.featured ? '<span class="absolute -top-1.5 -right-1.5 text-[10px] px-2 py-0.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full font-semibold shadow-md">⭐ MOST USED</span>' : ''}
      <div class="font-medium text-sm ${w.featured ? 'text-green-900' : 'text-neutral-800'}">${esc(w.name)}</div>
      ${w.description ? `<div class="text-xs text-neutral-600 mt-0.5 line-clamp-2">${esc(w.description)}</div>` : ''}
      <div class="flex items-center gap-2 mt-1.5">
        <span class="text-xs font-mono text-neutral-400">${esc(w.id)}</span>
        <span class="text-xs ${w.featured ? 'text-green-600' : 'text-neutral-500'}">${w.steps.length} step${w.steps.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  `).join('');
  updateWorkflowTestSelect(); // Update test dropdown when workflows change
}

export function hideWorkflowEditor() {
  document.getElementById('workflow-editor').classList.add('hidden');
  document.getElementById('workflow-editor-placeholder').classList.remove('hidden');
}

export async function selectWorkflow(id) {
  currentWorkflowId = id;
  const wf = cachedWorkflows.workflows.find(w => w.id === id);
  if (!wf) return;
  currentWorkflowSteps = JSON.parse(JSON.stringify(wf.steps));
  document.getElementById('wf-edit-name').value = wf.name;
  document.getElementById('wf-edit-id').textContent = wf.id;
  document.getElementById('workflow-editor').classList.remove('hidden');
  document.getElementById('workflow-editor-placeholder').classList.add('hidden');
  renderWorkflowList();
  renderSteps();
}

export function renderSteps() {
  const container = document.getElementById('wf-steps-container');
  if (currentWorkflowSteps.length === 0) {
    container.innerHTML = '<p class="text-neutral-400 text-sm text-center py-4">No steps yet. Click "+ Add Step" to begin.</p>';
    return;
  }
  container.innerHTML = currentWorkflowSteps.map((step, idx) => `
    <div class="relative">
      ${idx > 0 ? '<div class="absolute left-5 -top-3 w-0.5 h-3 bg-neutral-300"></div>' : ''}
      <div class="border rounded-xl p-3 bg-neutral-50 mb-1">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="w-7 h-7 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center font-bold">${idx + 1}</span>
            <span class="text-xs font-mono text-neutral-400">${esc(step.id)}</span>
          </div>
          <div class="flex items-center gap-1">
            ${idx > 0 ? `<button onclick="moveStep(${idx}, -1)" class="text-xs px-1.5 py-0.5 text-neutral-500 hover:bg-neutral-200 rounded" title="Move up">&#9650;</button>` : ''}
            ${idx < currentWorkflowSteps.length - 1 ? `<button onclick="moveStep(${idx}, 1)" class="text-xs px-1.5 py-0.5 text-neutral-500 hover:bg-neutral-200 rounded" title="Move down">&#9660;</button>` : ''}
            <button onclick="removeStep(${idx})" class="text-xs px-1.5 py-0.5 text-danger-500 hover:bg-danger-50 rounded" title="Delete step">&#10005;</button>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2 mb-2">
          <div>
            <label class="text-xs text-neutral-500">EN</label>
            <textarea rows="2" class="w-full border rounded px-2 py-1 text-xs" id="step-en-${idx}" onchange="updateStepMessage(${idx})">${esc(step.message?.en || '')}</textarea>
          </div>
          <div>
            <label class="text-xs text-neutral-500">MS</label>
            <textarea rows="2" class="w-full border rounded px-2 py-1 text-xs" id="step-ms-${idx}" onchange="updateStepMessage(${idx})">${esc(step.message?.ms || '')}</textarea>
          </div>
          <div>
            <label class="text-xs text-neutral-500">ZH</label>
            <textarea rows="2" class="w-full border rounded px-2 py-1 text-xs" id="step-zh-${idx}" onchange="updateStepMessage(${idx})">${esc(step.message?.zh || '')}</textarea>
          </div>
        </div>
        <label class="flex items-center gap-2 text-xs text-neutral-600">
          <input type="checkbox" ${step.waitForReply ? 'checked' : ''} onchange="updateStepWait(${idx}, this.checked)" />
          Wait for reply
        </label>
      </div>
    </div>
  `).join('');
}

export function updateStepMessage(idx) {
  currentWorkflowSteps[idx].message = {
    en: document.getElementById('step-en-' + idx).value,
    ms: document.getElementById('step-ms-' + idx).value,
    zh: document.getElementById('step-zh-' + idx).value
  };
}

export function updateStepWait(idx, checked) {
  currentWorkflowSteps[idx].waitForReply = checked;
}

export function addStep() {
  const id = 's' + (currentWorkflowSteps.length + 1);
  currentWorkflowSteps.push({ id, message: { en: '', ms: '', zh: '' }, waitForReply: true });
  renderSteps();
}

export function removeStep(idx) {
  currentWorkflowSteps.splice(idx, 1);
  renderSteps();
}

export function moveStep(idx, direction) {
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= currentWorkflowSteps.length) return;
  // Collect current values from DOM before moving
  for (let i = 0; i < currentWorkflowSteps.length; i++) {
    const enEl = document.getElementById('step-en-' + i);
    if (enEl) updateStepMessage(i);
  }
  const tmp = currentWorkflowSteps[idx];
  currentWorkflowSteps[idx] = currentWorkflowSteps[newIdx];
  currentWorkflowSteps[newIdx] = tmp;
  renderSteps();
}

export async function saveCurrentWorkflow() {
  if (!currentWorkflowId) return;
  // Collect latest values from DOM
  for (let i = 0; i < currentWorkflowSteps.length; i++) {
    const enEl = document.getElementById('step-en-' + i);
    if (enEl) updateStepMessage(i);
  }
  try {
    const name = document.getElementById('wf-edit-name').value.trim();
    await api('/workflows/' + encodeURIComponent(currentWorkflowId), {
      method: 'PUT',
      body: { name, steps: currentWorkflowSteps }
    });
    toast('Workflow saved: ' + name);
    // Refresh
    const wfData = await api('/workflows');
    cachedWorkflows = wfData;
    renderWorkflowList();
  } catch (e) { toast(e.message, 'error'); }
}

export async function createWorkflow() {
  const name = prompt('Workflow name:');
  if (!name) return;
  const id = name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  if (!id) { toast('Invalid name', 'error'); return; }
  try {
    await api('/workflows', { method: 'POST', body: { id, name: name.trim(), steps: [] } });
    toast('Created: ' + name);
    const wfData = await api('/workflows');
    cachedWorkflows = wfData;
    renderWorkflowList();
    selectWorkflow(id);
  } catch (e) { toast(e.message, 'error'); }
}

export async function deleteCurrentWorkflow() {
  if (!currentWorkflowId) return;
  if (!confirm('Delete workflow "' + currentWorkflowId + '"?')) return;
  try {
    await api('/workflows/' + encodeURIComponent(currentWorkflowId), { method: 'DELETE' });
    toast('Deleted: ' + currentWorkflowId);
    currentWorkflowId = null;
    hideWorkflowEditor();
    const wfData = await api('/workflows');
    cachedWorkflows = wfData;
    renderWorkflowList();
  } catch (e) { toast(e.message, 'error'); }
}

// ─── Advanced Workflow Settings (workflow.json) ────────────────────────
export function renderAdvancedSettings(d) {
  const el = document.getElementById('workflow-advanced-content');
  el.innerHTML = `
    <div class="bg-neutral-50 border rounded-xl p-4 mt-2">
      <h4 class="font-medium text-neutral-700 text-sm mb-2">Escalation</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><label class="text-xs text-neutral-500 block mb-1">Timeout (ms)</label>
          <input type="number" class="w-full border rounded px-2 py-1.5 text-sm" id="w-esc-timeout" value="${d.escalation?.timeout_ms || 0}" /></div>
        <div><label class="text-xs text-neutral-500 block mb-1">Unknown Threshold</label>
          <input type="number" class="w-full border rounded px-2 py-1.5 text-sm" id="w-esc-threshold" value="${d.escalation?.unknown_threshold || 0}" /></div>
        <div><label class="text-xs text-neutral-500 block mb-1">Primary Phone</label>
          <input class="w-full border rounded px-2 py-1.5 text-sm" id="w-esc-primary" value="${esc(d.escalation?.primary_phone || '')}" /></div>
        <div><label class="text-xs text-neutral-500 block mb-1">Secondary Phone</label>
          <input class="w-full border rounded px-2 py-1.5 text-sm" id="w-esc-secondary" value="${esc(d.escalation?.secondary_phone || '')}" /></div>
      </div>
    </div>
    <div class="bg-neutral-50 border rounded-xl p-4">
      <h4 class="font-medium text-neutral-700 text-sm mb-2">Payment</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><label class="text-xs text-neutral-500 block mb-1">Forward To</label>
          <input class="w-full border rounded px-2 py-1.5 text-sm" id="w-pay-forward" value="${esc(d.payment?.forward_to || '')}" /></div>
        <div><label class="text-xs text-neutral-500 block mb-1">Receipt Patterns (comma-separated)</label>
          <input class="w-full border rounded px-2 py-1.5 text-sm" id="w-pay-patterns" value="${esc((d.payment?.receipt_patterns || []).join(', '))}" /></div>
      </div>
    </div>
    <div class="bg-neutral-50 border rounded-xl p-4">
      <h4 class="font-medium text-neutral-700 text-sm mb-2">Booking</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="flex items-center gap-2">
          <input type="checkbox" id="w-book-enabled" ${d.booking?.enabled ? 'checked' : ''} />
          <label for="w-book-enabled" class="text-sm text-neutral-700">Enabled</label>
        </div>
        <div><label class="text-xs text-neutral-500 block mb-1">Max Guests (Auto)</label>
          <input type="number" class="w-full border rounded px-2 py-1.5 text-sm" id="w-book-max" value="${d.booking?.max_guests_auto || 0}" /></div>
      </div>
    </div>
    <div class="bg-neutral-50 border rounded-xl p-4">
      <h4 class="font-medium text-neutral-700 text-sm mb-2">Non-Text Handling</h4>
      <div class="flex items-center gap-2">
        <input type="checkbox" id="w-nontext-enabled" ${d.non_text_handling?.enabled ? 'checked' : ''} />
        <label for="w-nontext-enabled" class="text-sm text-neutral-700">Enabled</label>
      </div>
    </div>
    <button onclick="saveAdvancedWorkflow()" class="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-2xl text-sm transition">Save Advanced Settings</button>
  `;
}

export async function saveAdvancedWorkflow() {
  try {
    await api('/workflow', {
      method: 'PATCH',
      body: {
        escalation: {
          timeout_ms: parseInt(document.getElementById('w-esc-timeout').value) || 0,
          unknown_threshold: parseInt(document.getElementById('w-esc-threshold').value) || 0,
          primary_phone: document.getElementById('w-esc-primary').value,
          secondary_phone: document.getElementById('w-esc-secondary').value
        },
        payment: {
          forward_to: document.getElementById('w-pay-forward').value,
          receipt_patterns: document.getElementById('w-pay-patterns').value.split(',').map(s => s.trim()).filter(Boolean)
        },
        booking: {
          enabled: document.getElementById('w-book-enabled').checked,
          max_guests_auto: parseInt(document.getElementById('w-book-max').value) || 0
        },
        non_text_handling: {
          enabled: document.getElementById('w-nontext-enabled').checked
        }
      }
    });
    toast('Advanced settings saved');
  } catch (e) { toast(e.message, 'error'); }
}
