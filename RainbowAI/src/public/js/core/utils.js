// ═══════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════

/**
 * Display a toast notification
 * @param {string} msg - Message to display
 * @param {string} type - Type of toast ('success', 'error', 'info')
 */
/**
 * Display a toast notification
 * @param {string} msg - Message to display
 * @param {string} type - Type of toast ('success', 'error', 'warning', 'info')
 * @param {boolean} isHtml - Whether to render message as HTML
 * @param {number} duration - Duration in ms (default 3000)
 */
function toast(msg, type = 'success', isHtml = false, duration = 3000) {
  const el = document.createElement('div');
  const colors = type === 'success' ? 'bg-success-500' :
    type === 'error' ? 'bg-danger-500' :
      type === 'warning' ? 'bg-warning-500 text-white' : // Ensure text contrast if needed, though 'text-white' is applied below
        'bg-blue-500';

  el.className = `toast ${colors} text-white text-sm px-4 py-2 rounded-2xl shadow-medium flex items-center gap-3`; // Added flex for better layout if needed

  if (isHtml) el.innerHTML = msg;
  else el.textContent = msg;

  const container = document.getElementById('toast-container');
  if (container) {
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('opacity-0', 'transition-opacity', 'duration-500');
      setTimeout(() => el.remove(), 500);
    }, duration);
  } else {
    // Fallback if container missing
    document.body.appendChild(el);
    el.style.position = 'fixed';
    el.style.bottom = '20px';
    el.style.right = '20px';
    el.style.zIndex = '9999';
    setTimeout(() => el.remove(), duration);
  }
}

/**
 * Make an API request to the Rainbow backend
 * @param {string} path - API endpoint path (will be prefixed with /api/rainbow)
 * @param {object} opts - Fetch options
 * @returns {Promise<any>} Response data
 */
async function api(path, opts = {}) {
  const timeout = opts.timeout || 30000; // Default 30s timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const adminKey = (typeof window !== 'undefined' && window.__ADMIN_KEY__) ? window.__ADMIN_KEY__ : '';
    const res = await fetch(API + path, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...(adminKey ? { 'x-admin-key': adminKey } : {}) },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      const t = (text || '').trim();
      if (t.startsWith('<!DOCTYPE') || t.startsWith('<html')) {
        const on3002 = (typeof window !== 'undefined' && window.location.port === '3002');
        throw new Error(
          on3002
            ? 'Rainbow server returned a page instead of JSON. Restart the server: run start-all.bat or "cd RainbowAI && npm run dev". Then hard refresh (Ctrl+Shift+R).'
            : 'Server returned a page instead of data. Open the Rainbow dashboard at http://localhost:3002 (and ensure the Rainbow server is running: start-all.bat or "cd RainbowAI && npm run dev").'
        );
      }
      throw new Error('Server returned invalid JSON. Is the Rainbow server (port 3002) running? Run start-all.bat or "cd RainbowAI && npm run dev".');
    }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms. Try a shorter message or wait for the server to process.`);
    }
    // Payload too large (HTTP 413)
    if (error.message && error.message.includes('413')) {
      throw new Error('Message too large. Please try a shorter message.');
    }
    // Network or fetch errors
    if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      throw new Error('Network error. Check your connection and ensure the Rainbow server is running (start-all.bat).');
    }
    throw error;
  }
}

/**
 * Escape HTML special characters
 * @param {string} s - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Escape HTML attribute values
 * @param {string} s - String to escape
 * @returns {string} Escaped string safe for attributes
 */
function escapeAttr(s) {
  if (!s) return '';
  return escapeHtml(s).replace(/'/g, '&#39;');
}

/**
 * Format timestamp as relative time (e.g., "2 hours ago")
 * @param {string|number} ts - Timestamp (ISO string or milliseconds)
 * @returns {string} Relative time string
 */
function formatRelativeTime(ts) {
  const now = Date.now();
  const then = typeof ts === 'string' ? new Date(ts).getTime() : ts;
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

/**
 * Format timestamp as readable date/time
 * @param {string|number} ts - Timestamp (ISO string or milliseconds)
 * @returns {string} Formatted date string
 */
function formatDateTime(ts) {
  const date = typeof ts === 'string' ? new Date(ts) : new Date(ts);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Close a modal by ID
 * @param {string} id - Modal element ID
 */
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}

/**
 * Sanitize string for use as CSS class name
 * @param {string} s - String to sanitize
 * @returns {string} CSS-safe string
 */
function css(s) {
  return String(s).replace(/[^a-zA-Z0-9_-]/g, '_');
}

// ═══════════════════════════════════════════════════════════════════
// Content Processing Utilities (merged from utils-global.js)
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if content contains system debug info (JSON intent data or disclaimers)
 * @param {string} content - Message content
 * @returns {boolean} True if system content detected
 */
function hasSystemContent(content) {
  if (!content || typeof content !== 'string') return false;
  return content.indexOf('\n\n{"intent":') > 0 || content.indexOf('Please note: I may not have complete information') > 0;
}

/**
 * Extract user-facing message from content (strip system debug info)
 * @param {string} content - Message content with possible system data
 * @returns {string} Clean user message
 */
function getUserMessage(content) {
  if (!content || typeof content !== 'string') return content;
  let s = content;
  const jsonStart = s.indexOf('\n\n{"intent":');
  if (jsonStart > 0) s = s.slice(0, jsonStart).trim();
  const disclaimerIdx = s.indexOf('Please note: I may not have complete information');
  if (disclaimerIdx > 0) s = s.slice(0, disclaimerIdx).replace(/\n+$/, '').trim();
  return s;
}

/**
 * Format content with system debug data as collapsible HTML
 * @param {string} content - Message content with possible system data
 * @returns {string} HTML-formatted content
 */
function formatSystemContent(content) {
  if (!content || typeof content !== 'string') return escapeHtml(content);

  const parts = content.split('\n\n{"intent":');
  if (parts.length === 1) return escapeHtml(content);

  const userMsg = parts[0].trim();
  const jsonPart = '{"intent":' + parts[1];

  let prettyJson = jsonPart;
  try {
    const parsed = JSON.parse(jsonPart);
    prettyJson = JSON.stringify(parsed, null, 2);
  } catch (e) { }

  return '<div class="lc-user-msg">' + escapeHtml(userMsg) + '</div>' +
    '<div class="lc-system-data">' +
    '<div class="lc-system-label">System Debug Info:</div>' +
    '<pre class="lc-system-json">' + escapeHtml(prettyJson) + '</pre>' +
    '</div>';
}

// ═══════════════════════════════════════════════════════════════════
// Expose to global scope for non-module scripts and inline handlers
// ═══════════════════════════════════════════════════════════════════

window.toast = toast;
window.api = api;
window.escapeHtml = escapeHtml;
window.escapeAttr = escapeAttr;
window.formatRelativeTime = formatRelativeTime;
window.formatDateTime = formatDateTime;
window.closeModal = closeModal;
window.hasSystemContent = hasSystemContent;
window.getUserMessage = getUserMessage;
window.formatSystemContent = formatSystemContent;
window.css = css;

// ═══════════════════════════════════════════════════════════════════
// Exports for ES6 module consumers
// ═══════════════════════════════════════════════════════════════════

export {
  toast, api, escapeHtml, escapeAttr, formatRelativeTime, formatDateTime,
  closeModal, hasSystemContent, getUserMessage, formatSystemContent, css
};
