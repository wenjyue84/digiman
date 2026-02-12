// ═══════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════

/**
 * Display a toast notification
 * @param {string} msg - Message to display
 * @param {string} type - Type of toast ('success', 'error', 'info')
 */
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  const colors = type === 'success' ? 'bg-success-500' : type === 'error' ? 'bg-danger-500' : 'bg-blue-500';
  el.className = `toast ${colors} text-white text-sm px-4 py-2 rounded-2xl shadow-medium`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3000);
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
    const res = await fetch(API + path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
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
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
