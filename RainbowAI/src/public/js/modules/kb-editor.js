/**
 * KB Editor Module
 *
 * Multi-file progressive disclosure editor for the Knowledge Base.
 * Handles file selection, editing, preview, and saving for both regular KB files and memory logs.
 *
 * Features:
 * - Category-based file filtering (core, system, knowledge, memory)
 * - Real-time modification tracking
 * - Edit/Preview mode toggle
 * - Memory file management (daily logs)
 * - Markdown preview rendering
 * - Auto-save detection
 *
 * @module kb-editor
 */

// Helper: Escape HTML alias
const esc = window.escapeHtml || ((s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));

// ═════════════════════════════════════════════════════════════════════
// Constants & Configuration
// ═════════════════════════════════════════════════════════════════════

/**
 * Base API endpoint for KB operations
 * @constant {string}
 */
const KB_API = '/api/rainbow';

/**
 * KB file definitions with metadata
 * Each file has: id, icon, description, category, and priority
 * @constant {Array<Object>}
 */
const KB_FILE_DEFS = [
  { id: 'AGENTS.md', icon: '\u2728', desc: 'Entry Point \u2014 LLM reads this FIRST (routing table)', cat: 'core', priority: 'always' },
  { id: 'soul.md', icon: '\uD83D\uDC9C', desc: "Rainbow's identity (personality, voice, boundaries)", cat: 'core', priority: 'always' },
  { id: 'users.md', icon: '\uD83D\uDC65', desc: 'Guest profiles, needs, and user journey', cat: 'core', priority: 'ondemand' },
  { id: 'memory.md', icon: '\uD83E\uDDE0', desc: 'Memory system architecture', cat: 'system', priority: 'internal' },
  { id: 'houserules.md', icon: '\uD83D\uDEE1\uFE0F', desc: 'House rules quick reference', cat: 'knowledge', priority: 'ondemand' },
  { id: 'rules-quiet-smoking.md', icon: '\uD83D\uDD07', desc: 'Quiet hours & smoking policy', cat: 'knowledge', priority: 'ondemand' },
  { id: 'rules-guests-conduct.md', icon: '\uD83E\uDD1D', desc: 'Guest conduct, visitors, alcohol', cat: 'knowledge', priority: 'ondemand' },
  { id: 'rules-shared-spaces.md', icon: '\uD83C\uDF7D\uFE0F', desc: 'Kitchen, cleanliness, security, damage', cat: 'knowledge', priority: 'ondemand' },
  { id: 'payment.md', icon: '\uD83D\uDCB3', desc: 'Payment quick reference', cat: 'knowledge', priority: 'ondemand' },
  { id: 'pricing.md', icon: '\uD83D\uDCB0', desc: 'Rates, deposits, inclusions', cat: 'knowledge', priority: 'ondemand' },
  { id: 'payment-methods.md', icon: '\uD83C\uDFE6', desc: 'DuitNow, bank transfer, cash', cat: 'knowledge', priority: 'ondemand' },
  { id: 'refunds.md', icon: '\uD83D\uDD04', desc: 'Refunds, cancellation, disputes', cat: 'knowledge', priority: 'ondemand' },
  { id: 'checkin.md', icon: '\u2705', desc: 'Check-in quick reference', cat: 'knowledge', priority: 'ondemand' },
  { id: 'checkin-times.md', icon: '\u23F0', desc: 'Check-in/out times & flexibility', cat: 'knowledge', priority: 'ondemand' },
  { id: 'checkin-access.md', icon: '\uD83D\uDD11', desc: 'Door password & physical access', cat: 'knowledge', priority: 'ondemand' },
  { id: 'checkin-procedure.md', icon: '\uD83D\uDCCB', desc: 'Step-by-step self check-in', cat: 'knowledge', priority: 'ondemand' },
  { id: 'checkin-wifi.md', icon: '\uD83D\uDCF6', desc: 'WiFi credentials & connectivity', cat: 'knowledge', priority: 'ondemand' },
  { id: 'facilities.md', icon: '\uD83C\uDFE0', desc: 'Facilities quick reference', cat: 'knowledge', priority: 'ondemand' },
  { id: 'facilities-capsules.md', icon: '\uD83D\uDECF\uFE0F', desc: 'Capsule pods & sleep comfort', cat: 'knowledge', priority: 'ondemand' },
  { id: 'facilities-bathrooms.md', icon: '\uD83D\uDEBF', desc: 'Bathrooms & showers', cat: 'knowledge', priority: 'ondemand' },
  { id: 'facilities-kitchen.md', icon: '\uD83C\uDF7D\uFE0F', desc: 'Kitchen & dining facilities', cat: 'knowledge', priority: 'ondemand' },
  { id: 'facilities-common.md', icon: '\uD83D\uDECB\uFE0F', desc: 'Common areas & social spaces', cat: 'knowledge', priority: 'ondemand' },
  { id: 'availability.md', icon: '\uD83D\uDCC5', desc: 'Availability and booking info', cat: 'knowledge', priority: 'ondemand' },
  { id: 'location.md', icon: '\uD83D\uDCCD', desc: 'Address, directions, getting here', cat: 'knowledge', priority: 'ondemand' },
  { id: 'faq.md', icon: '\u2753', desc: 'Unique FAQs and special situations', cat: 'knowledge', priority: 'ondemand' },
];

// ═════════════════════════════════════════════════════════════════════
// State Management
// ═════════════════════════════════════════════════════════════════════

/**
 * Current file being edited (null if no file selected)
 * @type {string|null}
 */
let kbCurrentFile = null;

/**
 * Original content of the current file (for modification detection)
 * @type {string}
 */
let kbOriginalContent = '';

/**
 * Current category filter
 * @type {string}
 */
let kbCurrentCategory = 'core';

/**
 * List of memory files (dates)
 * @type {Array<string>}
 */
let kbMemoryFiles = [];

/**
 * Current file being edited in modal
 * @type {string|null}
 */
let currentEditingFile = null;

// ═════════════════════════════════════════════════════════════════════
// API Communication
// ═════════════════════════════════════════════════════════════════════

/**
 * Makes an API call to the KB endpoints with cache-busting
 *
 * @param {string} path - API path (relative to KB_API)
 * @param {Object} [opts={}] - Fetch options (method, body, etc.)
 * @returns {Promise<Object>} Response data
 * @throws {Error} If the request fails
 */
async function kbApi(path, opts = {}) {
  // PERMANENT FIX: Cache-busting to always get fresh content
  const cacheBuster = '_=' + Date.now();
  const separator = path.includes('?') ? '&' : '?';
  const res = await fetch(KB_API + path + separator + cacheBuster, {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
    cache: 'no-store',
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
  return data;
}

// ═════════════════════════════════════════════════════════════════════
// Initialization
// ═════════════════════════════════════════════════════════════════════

/**
 * Initializes the KB Editor
 * Resets state and shows the file list for the 'core' category
 */
function loadKB() {
  kbCurrentFile = null;
  kbOriginalContent = '';
  document.getElementById('kb-no-file').classList.remove('hidden');
  document.getElementById('kb-editor-panel').classList.add('hidden');
  kbFilterCategory('core');
}

// ═════════════════════════════════════════════════════════════════════
// Category Filtering
// ═════════════════════════════════════════════════════════════════════

/**
 * Filters and displays files by category
 * Handles both regular KB files and memory files
 *
 * @param {string} cat - Category to filter by ('core', 'system', 'knowledge', 'memory')
 */
async function kbFilterCategory(cat) {
  kbCurrentCategory = cat;
  document.querySelectorAll('.kb-cat-btn').forEach(function (btn) {
    const active = btn.dataset.kbCat === cat;
    btn.className = 'kb-cat-btn text-xs px-3 py-1.5 rounded-full border transition ' +
      (active ? 'bg-primary-500 text-white border-primary-500' : 'border-neutral-300 hover:bg-neutral-50');
  });

  const list = document.getElementById('kb-file-list');

  if (cat === 'contacts') {
    await kbLoadContactContexts();
    return;
  }

  if (cat === 'memory') {
    // Fetch memory files from API
    list.innerHTML = '<div class="text-xs text-neutral-400 text-center py-3">Loading...</div>';
    try {
      const data = await kbApi('/memory');
      kbMemoryFiles = data.days || [];
      if (kbMemoryFiles.length === 0) {
        list.innerHTML = '<div class="text-xs text-neutral-400 text-center py-3">No memory files found</div>';
      } else {
        const headerHtml = '<div class="flex items-center gap-2 mb-2 p-2 bg-neutral-50 rounded-lg text-xs text-neutral-500">' +
          '<span>📅</span>' +
          '<span>' + kbMemoryFiles.length + ' daily log' + (kbMemoryFiles.length !== 1 ? 's' : '') + '</span>' +
          '</div>';

        const filesHtml = kbMemoryFiles.map(function (date) {
          const sel = kbCurrentFile === 'memory/' + date;
          return '<button onclick="kbSelectMemoryFile(\'' + date + '\')" class="w-full text-left p-3 rounded-xl border transition hover:bg-neutral-50 ' + (sel ? 'bg-purple-50 border-purple-300 shadow-sm' : 'bg-white border-neutral-200') + '">' +
            '<div class="flex items-start gap-2">' +
            '<span class="text-base mt-0.5">📅</span>' +
            '<div class="flex-1 min-w-0">' +
            '<div class="font-medium text-sm">' + esc(date + '.md') + '</div>' +
            '<div class="text-xs text-neutral-500 mt-0.5">Daily memory log</div>' +
            '</div>' +
            '</div>' +
            '</button>';
        }).join('');

        list.innerHTML = headerHtml + filesHtml;
      }
    } catch (e) {
      list.innerHTML = '<div class="text-xs text-red-400 text-center py-3">Failed to load memory files</div>';
    }
  } else {
    const files = KB_FILE_DEFS.filter(function (f) { return f.cat === cat; });
    list.innerHTML = files.map(function (f) {
      const sel = kbCurrentFile === f.id;
      const badge = f.priority === 'always' ? '<span class="badge-info">always</span>'
        : f.priority === 'internal' ? '<span class="badge-warn">internal</span>' : '';
      return '<button onclick="kbSelectFile(\'' + f.id + '\')" class="w-full text-left p-3 rounded-xl border transition hover:bg-neutral-50 ' + (sel ? 'bg-purple-50 border-purple-300 shadow-sm' : 'bg-white border-neutral-200') + '">' +
        '<div class="flex items-start gap-2">' +
        '<span class="text-base mt-0.5">' + f.icon + '</span>' +
        '<div class="flex-1 min-w-0">' +
        '<div class="font-medium text-sm">' + esc(f.id) + '</div>' +
        '<div class="text-xs text-neutral-500 mt-0.5" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + esc(f.desc) + '</div>' +
        '</div>' +
        badge +
        '</div>' +
        '</button>';
    }).join('');
  }
}

// ═════════════════════════════════════════════════════════════════════
// File Selection & Loading
// ═════════════════════════════════════════════════════════════════════

/**
 * Selects and loads a regular KB file
 *
 * @param {string} filename - Name of the file to load
 */
async function kbSelectFile(filename) {
  try {
    const d = await kbApi('/kb-files/' + encodeURIComponent(filename));
    kbCurrentFile = filename;
    kbOriginalContent = d.content || '';
    document.getElementById('kb-file-editor').value = d.content || '';
    const def = KB_FILE_DEFS.find(function (f) { return f.id === filename; });
    document.getElementById('kb-editor-icon').textContent = def ? def.icon : '\uD83D\uDCC4';
    document.getElementById('kb-editor-filename').textContent = filename;
    document.getElementById('kb-editor-desc').textContent = def ? def.desc : '';
    document.getElementById('kb-no-file').classList.add('hidden');
    document.getElementById('kb-editor-panel').classList.remove('hidden');
    kbUpdateStats();
    kbCheckModified();
    kbSetViewMode('edit');
    kbFilterCategory(kbCurrentCategory);
  } catch (e) {
    toast('Failed to load ' + filename + ': ' + e.message, 'error');
  }
}

/**
 * Selects and loads a memory file (daily log)
 *
 * @param {string} date - Date of the memory file (YYYY-MM-DD)
 */
async function kbSelectMemoryFile(date) {
  try {
    const d = await kbApi('/memory/' + encodeURIComponent(date));
    kbCurrentFile = 'memory/' + date;
    kbOriginalContent = d.content || '';
    document.getElementById('kb-file-editor').value = d.content || '';
    document.getElementById('kb-editor-icon').textContent = '📅';
    document.getElementById('kb-editor-filename').textContent = date + '.md';
    document.getElementById('kb-editor-desc').textContent = 'Daily memory log';
    document.getElementById('kb-no-file').classList.add('hidden');
    document.getElementById('kb-editor-panel').classList.remove('hidden');
    kbUpdateStats();
    kbCheckModified();
    kbSetViewMode('edit');
    kbFilterCategory(kbCurrentCategory);
  } catch (e) {
    toast('Failed to load memory file for ' + date + ': ' + e.message, 'error');
  }
}

/**
 * Opens a KB file from the preview tab
 * Switches to the KB tab and loads the file
 *
 * @param {string} filename - Name of the file to open
 */
function openKBFileFromPreview(filename) {
  // Find the file category
  const def = KB_FILE_DEFS.find(function (f) { return f.id === filename; });
  if (def) {
    kbCurrentCategory = def.cat;
  }
  // Switch to Responses tab > Knowledge Base sub-tab
  if (typeof loadTab === 'function') {
    loadTab('responses');
  }
  setTimeout(function () {
    if (typeof switchResponseTab === 'function') {
      switchResponseTab('knowledge-base');
    }
    setTimeout(function () { kbSelectFile(filename); }, 100);
  }, 200);
}

// ═════════════════════════════════════════════════════════════════════
// File Saving
// ═════════════════════════════════════════════════════════════════════

/**
 * Saves the current file
 * Handles both regular KB files and memory files
 */
async function kbSaveFile() {
  if (!kbCurrentFile) return;
  const content = document.getElementById('kb-file-editor').value;
  try {
    let d;
    if (kbCurrentFile.startsWith('contacts/')) {
      // Save contact context file
      const phone = kbCurrentFile.replace('contacts/', '');
      d = await kbApi('/contact-contexts/' + encodeURIComponent(phone), { method: 'PUT', body: { content: content } });
      kbOriginalContent = content;
      kbCheckModified();
      toast(phone + '-context.md saved successfully');
    } else if (kbCurrentFile.startsWith('memory/')) {
      // Save memory file
      const date = kbCurrentFile.replace('memory/', '');
      d = await kbApi('/memory/' + encodeURIComponent(date), { method: 'PUT', body: { content: content } });
      kbOriginalContent = content;
      kbCheckModified();
      toast(date + '.md saved successfully');
    } else {
      // Save regular KB file
      d = await kbApi('/kb-files/' + encodeURIComponent(kbCurrentFile), { method: 'PUT', body: { content: content } });
      kbOriginalContent = content;
      kbCheckModified();
      toast(kbCurrentFile + ' saved. Backup: ' + d.backup);
    }
  } catch (e) {
    toast('Failed to save: ' + e.message, 'error');
  }
}

// ═════════════════════════════════════════════════════════════════════
// Content Management
// ═════════════════════════════════════════════════════════════════════

/**
 * Resets the editor content to the last saved version
 */
function kbResetContent() {
  document.getElementById('kb-file-editor').value = kbOriginalContent;
  kbCheckModified();
  kbUpdateStats();
  toast('Content reset to last saved version');
}

/**
 * Handles input events in the editor
 * Updates modification state and statistics
 */
function kbOnInput() {
  kbCheckModified();
  kbUpdateStats();
}

/**
 * Checks if the current content has been modified
 * Updates UI elements to reflect modification state
 */
function kbCheckModified() {
  const current = document.getElementById('kb-file-editor').value;
  const modified = current !== kbOriginalContent;
  document.getElementById('kb-unsaved-bar').classList.toggle('hidden', !modified);
  document.getElementById('kb-save-btn').classList.toggle('hidden', !modified);
  document.getElementById('kb-reset-btn').classList.toggle('hidden', !modified);
  document.getElementById('kb-editor-modified').classList.toggle('hidden', !modified);
}

/**
 * Updates the statistics display (lines and characters)
 */
function kbUpdateStats() {
  const content = document.getElementById('kb-file-editor').value;
  document.getElementById('kb-editor-stats').textContent =
    content.split('\n').length + ' lines \u00B7 ' + content.length + ' characters';
}

// ═════════════════════════════════════════════════════════════════════
// View Mode
// ═════════════════════════════════════════════════════════════════════

/**
 * Sets the view mode (edit or preview)
 *
 * @param {string} mode - View mode ('edit' or 'preview')
 */
function kbSetViewMode(mode) {
  const editBtn = document.getElementById('kb-mode-edit');
  const previewBtn = document.getElementById('kb-mode-preview');
  const editC = document.getElementById('kb-edit-container');
  const prevC = document.getElementById('kb-preview-pane');
  editBtn.className = 'text-xs px-3 py-1.5 transition ' + (mode === 'edit' ? 'bg-primary-500 text-white' : 'hover:bg-neutral-50');
  previewBtn.className = 'text-xs px-3 py-1.5 transition ' + (mode === 'preview' ? 'bg-primary-500 text-white' : 'hover:bg-neutral-50');
  if (mode === 'edit') {
    editC.classList.remove('hidden');
    prevC.classList.add('hidden');
  } else {
    editC.classList.add('hidden');
    prevC.classList.remove('hidden');
    kbRenderPreview();
  }
}

// ═════════════════════════════════════════════════════════════════════
// Preview Rendering
// ═════════════════════════════════════════════════════════════════════

/**
 * Renders the current content as HTML preview
 * Applies basic Markdown-like transformations
 */
function kbRenderPreview() {
  const raw = document.getElementById('kb-file-editor').value;
  let html = esc(raw)
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  html = '<p>' + html + '</p>';
  document.getElementById('kb-preview-pane').innerHTML = html;
}

// ═════════════════════════════════════════════════════════════════════
// Modal Functions (Edit Modal for KB Files)
// ═════════════════════════════════════════════════════════════════════

/**
 * Opens the KB edit modal for a specific file
 *
 * @param {string} filename - Name of the file to edit
 */
async function openKbEditModal(filename) {
  currentEditingFile = filename;
  const modal = document.getElementById('kb-edit-modal');
  const filenameEl = document.getElementById('kb-edit-filename');
  const contentEl = document.getElementById('kb-edit-content');
  const saveBtn = document.getElementById('kb-edit-save-btn');

  // Show modal
  modal.classList.remove('hidden');
  filenameEl.textContent = filename;
  contentEl.value = 'Loading...';
  contentEl.disabled = true;
  saveBtn.disabled = true;

  // Fetch file content
  try {
    const response = await fetch(KB_API + '/kb-files/' + encodeURIComponent(filename) + '?_=' + Date.now(), { cache: 'no-store' });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load file');
    }

    contentEl.value = data.content || '';
    contentEl.disabled = false;
    saveBtn.disabled = false;
    contentEl.focus();
  } catch (error) {
    toast('Failed to load ' + filename + ': ' + error.message, 'error');
    contentEl.value = 'Error loading file: ' + error.message;
  }
}

/**
 * Closes the KB edit modal
 * Prompts for confirmation if there are unsaved changes
 */
function closeKbEditModal() {
  const modal = document.getElementById('kb-edit-modal');
  const contentEl = document.getElementById('kb-edit-content');

  // Check if there are unsaved changes
  if (contentEl.value !== '' && !contentEl.disabled) {
    if (!confirm('Close without saving?')) {
      return;
    }
  }

  modal.classList.add('hidden');
  currentEditingFile = null;
}

/**
 * Saves the file from the modal
 */
async function saveKbFileFromModal() {
  if (!currentEditingFile) return;

  const contentEl = document.getElementById('kb-edit-content');
  const saveBtn = document.getElementById('kb-edit-save-btn');
  const content = contentEl.value;

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const response = await fetch(KB_API + '/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: currentEditingFile,
        content: content
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to save file');
    }

    toast(currentEditingFile + ' saved successfully');
    closeKbEditModal();
  } catch (error) {
    toast('Failed to save ' + currentEditingFile + ': ' + error.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

// ═════════════════════════════════════════════════════════════════════
// Exports (for use in other modules)
// ═════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════
// Contact Context Files (US-104)
// ═════════════════════════════════════════════════════════════════════

/**
 * Contact context files list
 * @type {Array<Object>}
 */
let kbContactFiles = [];

/**
 * Loads and displays contact context files
 */
async function kbLoadContactContexts() {
  const list = document.getElementById('kb-file-list');
  list.innerHTML = '<div class="text-xs text-neutral-400 text-center py-3">Loading contacts...</div>';

  try {
    const data = await kbApi('/contact-contexts');
    kbContactFiles = data.files || [];

    if (kbContactFiles.length === 0) {
      list.innerHTML = '<div class="text-xs text-neutral-400 text-center py-4">' +
        '<p class="mb-2">No contact context files yet</p>' +
        '<button onclick="kbGenerateContactContexts()" class="text-xs bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-lg transition">' +
        'Generate from conversations</button>' +
        '</div>';
      return;
    }

    var headerHtml = '<div class="flex items-center justify-between mb-2 p-2 bg-neutral-50 rounded-lg">' +
      '<span class="text-xs text-neutral-500">' + kbContactFiles.length + ' contact' + (kbContactFiles.length !== 1 ? 's' : '') + '</span>' +
      '<button onclick="kbGenerateContactContexts()" class="text-xs bg-primary-500 hover:bg-primary-600 text-white px-2 py-1 rounded transition" title="Regenerate context files from conversation history">' +
      'Regenerate</button>' +
      '</div>';

    var filesHtml = kbContactFiles.map(function (f) {
      var sel = kbCurrentFile === 'contacts/' + f.phone;
      var modDate = new Date(f.modified).toLocaleDateString();
      return '<button onclick="kbSelectContactFile(\'' + f.phone + '\')" class="w-full text-left p-3 rounded-xl border transition hover:bg-neutral-50 ' + (sel ? 'bg-purple-50 border-purple-300 shadow-sm' : 'bg-white border-neutral-200') + '">' +
        '<div class="flex items-start gap-2">' +
        '<span class="text-base mt-0.5">\uD83D\uDC64</span>' +
        '<div class="flex-1 min-w-0">' +
        '<div class="font-medium text-sm truncate">' + esc(f.phone) + '</div>' +
        '<div class="text-xs text-neutral-500 mt-0.5">' + esc(modDate) + ' &middot; ' + Math.round(f.size / 1024 * 10) / 10 + 'KB</div>' +
        '</div>' +
        '</div>' +
        '</button>';
    }).join('');

    list.innerHTML = headerHtml + filesHtml;
  } catch (e) {
    list.innerHTML = '<div class="text-xs text-red-400 text-center py-3">Failed to load contacts: ' + esc(e.message) + '</div>';
  }
}

/**
 * Generate contact context files from conversation history
 */
async function kbGenerateContactContexts() {
  var list = document.getElementById('kb-file-list');
  var prevHtml = list.innerHTML;
  list.innerHTML = '<div class="text-xs text-neutral-400 text-center py-3">Generating context files from conversations...</div>';

  try {
    var data = await kbApi('/contact-contexts/generate', { method: 'POST' });
    if (typeof toast === 'function') {
      toast('Generated ' + data.generated + ' context files (' + data.skipped + ' skipped, ' + data.errors + ' errors)');
    }
    // Reload the list
    await kbLoadContactContexts();
  } catch (e) {
    if (typeof toast === 'function') {
      toast('Failed to generate: ' + e.message, 'error');
    }
    list.innerHTML = prevHtml;
  }
}

/**
 * Select and load a contact context file
 * @param {string} phone - Phone number
 */
async function kbSelectContactFile(phone) {
  try {
    var d = await kbApi('/contact-contexts/' + encodeURIComponent(phone));
    kbCurrentFile = 'contacts/' + phone;
    kbOriginalContent = d.content || '';
    document.getElementById('kb-file-editor').value = d.content || '';
    document.getElementById('kb-editor-icon').textContent = '\uD83D\uDC64';
    document.getElementById('kb-editor-filename').textContent = phone + '-context.md';
    document.getElementById('kb-editor-desc').textContent = 'Contact context file';
    document.getElementById('kb-no-file').classList.add('hidden');
    document.getElementById('kb-editor-panel').classList.remove('hidden');
    kbUpdateStats();
    kbCheckModified();
    kbSetViewMode('edit');
    kbFilterCategory(kbCurrentCategory);
  } catch (e) {
    if (typeof toast === 'function') {
      toast('Failed to load context for ' + phone + ': ' + e.message, 'error');
    }
  }
}

// ═════════════════════════════════════════════════════════════════════
// KB Test Chat (US-112)
// ═════════════════════════════════════════════════════════════════════

/**
 * KB test chat history (for multi-turn)
 * @type {Array<Object>}
 */
let kbTestHistory = [];

/**
 * Send a test question to KB-only endpoint
 */
async function kbTestSend() {
  var input = document.getElementById('kb-test-input');
  var question = (input ? input.value.trim() : '');
  if (!question) return;

  var msgContainer = document.getElementById('kb-test-messages');
  if (!msgContainer) return;

  // Add user message to UI
  msgContainer.innerHTML += '<div class="flex justify-end mb-2">' +
    '<div class="bg-primary-500 text-white px-3 py-2 rounded-2xl rounded-br-sm max-w-[80%] text-sm">' + esc(question) + '</div>' +
    '</div>';

  input.value = '';
  input.disabled = true;

  // Show loading
  var loadingId = 'kb-test-loading-' + Date.now();
  msgContainer.innerHTML += '<div id="' + loadingId + '" class="flex justify-start mb-2">' +
    '<div class="bg-neutral-100 text-neutral-500 px-3 py-2 rounded-2xl rounded-bl-sm text-sm">Thinking...</div>' +
    '</div>';
  msgContainer.scrollTop = msgContainer.scrollHeight;

  try {
    var data = await kbApi('/kb-test', {
      method: 'POST',
      body: { question: question, history: kbTestHistory }
    });

    // Remove loading
    var loadEl = document.getElementById(loadingId);
    if (loadEl) loadEl.remove();

    // Add to history
    kbTestHistory.push({ role: 'user', content: question });
    kbTestHistory.push({ role: 'assistant', content: data.answer });

    // Build dev info (US-010: detailed token breakdown)
    var di = data.devInfo || {};
    var devHtml = '<details class="mt-1">' +
      '<summary class="text-xs text-neutral-400 cursor-pointer select-none">' +
      (di.responseTime || 0) + 'ms' +
      (di.provider ? ' &middot; ' + esc(di.provider) : '') +
      (di.tokensUsed ? ' &middot; ' + di.tokensUsed + ' tokens' : '') +
      ' <span class="text-neutral-300">(details)</span>' +
      '</summary>' +
      '<div class="mt-1 text-xs text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-lg p-2 space-y-0.5">' +
      '<div class="flex justify-between"><span>Provider:</span><span class="font-mono">' + esc(di.provider || '—') + '</span></div>' +
      '<div class="flex justify-between"><span>Model:</span><span class="font-mono text-xs">' + esc(di.model || '—') + '</span></div>' +
      '<div class="flex justify-between"><span>Response time:</span><span>' + (di.responseTime || 0) + 'ms</span></div>' +
      '<div class="border-t border-neutral-200 my-1"></div>' +
      '<div class="flex justify-between font-semibold"><span>Total tokens:</span><span>' + (di.tokensUsed || '—') + '</span></div>' +
      '<div class="flex justify-between text-neutral-400"><span>↳ Prompt tokens:</span><span>' + (di.promptTokens || '—') + '</span></div>' +
      '<div class="flex justify-between text-neutral-400"><span>↳ Completion tokens:</span><span>' + (di.completionTokens || '—') + '</span></div>' +
      (di.kbFilesMatched && di.kbFilesMatched.length > 0
        ? '<div class="border-t border-neutral-200 my-1"></div><div><span>KB files matched (' + di.kbFilesMatched.length + '):</span><div class="mt-0.5 font-mono text-xs text-neutral-400">' + di.kbFilesMatched.map(function(f) { return esc(f); }).join('<br>') + '</div></div>'
        : '<div class="text-neutral-400">No KB files matched (used full KB)</div>') +
      '</div>' +
      '</details>';

    // Add assistant message to UI
    msgContainer.innerHTML += '<div class="flex justify-start mb-2">' +
      '<div class="max-w-[85%]">' +
      '<div class="bg-neutral-100 text-neutral-800 px-3 py-2 rounded-2xl rounded-bl-sm text-sm whitespace-pre-wrap">' + esc(data.answer) + '</div>' +
      devHtml +
      '</div>' +
      '</div>';
  } catch (e) {
    var loadEl2 = document.getElementById(loadingId);
    if (loadEl2) loadEl2.remove();

    msgContainer.innerHTML += '<div class="flex justify-start mb-2">' +
      '<div class="bg-red-50 text-red-600 px-3 py-2 rounded-2xl rounded-bl-sm text-sm">Error: ' + esc(e.message) + '</div>' +
      '</div>';
  }

  input.disabled = false;
  input.focus();
  msgContainer.scrollTop = msgContainer.scrollHeight;
}

/**
 * Clear KB test chat history and UI
 */
function kbTestClear() {
  kbTestHistory = [];
  var msgContainer = document.getElementById('kb-test-messages');
  if (msgContainer) {
    msgContainer.innerHTML = '<div class="text-center text-neutral-400 text-sm py-6">Ask a question to test Knowledge Base accuracy</div>';
  }
  var input = document.getElementById('kb-test-input');
  if (input) {
    input.value = '';
    input.focus();
  }
}

/**
 * Handle Enter key in KB test input
 * @param {KeyboardEvent} event
 */
function kbTestKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    kbTestSend();
  }
}

// Main functions exported for global use
window.loadKB = loadKB;
window.kbFilterCategory = kbFilterCategory;
window.kbSelectFile = kbSelectFile;
window.kbSelectMemoryFile = kbSelectMemoryFile;
window.openKBFileFromPreview = openKBFileFromPreview;
window.kbSaveFile = kbSaveFile;
window.kbResetContent = kbResetContent;
window.kbOnInput = kbOnInput;
window.kbSetViewMode = kbSetViewMode;
window.openKbEditModal = openKbEditModal;
window.closeKbEditModal = closeKbEditModal;
window.saveKbFileFromModal = saveKbFileFromModal;
// US-104: Contact context files
window.kbLoadContactContexts = kbLoadContactContexts;
window.kbGenerateContactContexts = kbGenerateContactContexts;
window.kbSelectContactFile = kbSelectContactFile;
// US-112: KB test chat
window.kbTestSend = kbTestSend;
window.kbTestClear = kbTestClear;
window.kbTestKeydown = kbTestKeydown;
