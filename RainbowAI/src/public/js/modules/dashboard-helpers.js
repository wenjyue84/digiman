/**
 * Dashboard Helper Functions
 *
 * Utilities for the Dashboard tab:
 * - Server restart controls
 * - AI provider speed testing
 * - Real-time activity stream (SSE)
 * - Activity event rendering and management
 */

import { api, toast, escapeHtml as esc } from '../core/utils.js';

// ═══════════════════════════════════════════════════════════════════
// Server Controls
// ═══════════════════════════════════════════════════════════════════

/**
 * Restart a server (MCP, Backend, or Frontend)
 * @param {string} serverKey - 'mcp', 'backend', or 'frontend'
 */
export async function restartServer(serverKey) {
  if (serverKey === 'mcp') {
    try {
      toast('Restarting MCP server…', 'info');
      await api('/restart', { method: 'POST' });
      toast('Server is restarting. Reopen the dashboard in a few seconds.', 'info');
    } catch (e) {
      toast(e.message || 'Restart request failed', 'error');
    }
    return;
  }
  if (serverKey === 'backend') {
    toast('To restart Backend API: run in project root — npm run dev:server (or start-all.bat)', 'info');
    return;
  }
  if (serverKey === 'frontend') {
    toast('To restart Frontend: run in project root — npm run dev (or start-all.bat)', 'info');
    return;
  }
  toast('Unknown server', 'error');
}

// ═══════════════════════════════════════════════════════════════════
// AI Provider Speed Testing
// ═══════════════════════════════════════════════════════════════════

/**
 * Run speed test for each enabled AI provider and show response time on dashboard
 * Called automatically when Dashboard tab loads
 */
export async function runDashboardProviderSpeedTest() {
  const aiStatusEl = document.getElementById('dashboard-ai-status');
  if (!aiStatusEl) return;

  let statusData;
  try {
    statusData = await api('/status');
  } catch (e) {
    return;
  }

  const providers = (statusData.ai?.providers || []).filter(p => p.enabled && p.available);
  if (providers.length === 0) return;

  for (const p of providers) {
    const timeEl = document.getElementById('dashboard-ai-time-' + p.id);
    if (timeEl) timeEl.textContent = '…';

    try {
      const result = await api('/test-ai/' + encodeURIComponent(p.id), { method: 'POST' });
      const timeMs = result.responseTime;
      const timeStr = timeMs == null ? '—' : (timeMs >= 1000 ? (timeMs / 1000).toFixed(1) + 's' : timeMs + 'ms');

      if (timeEl) {
        timeEl.textContent = result.ok ? timeStr : '✗';
        timeEl.className = result.ok ? 'text-primary-600 font-mono text-xs' : 'text-red-600 font-mono text-xs';
      }
    } catch (e) {
      if (timeEl) {
        timeEl.textContent = '✗';
        timeEl.className = 'text-red-600 font-mono text-xs';
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// Real-time Activity Stream (SSE)
// ═══════════════════════════════════════════════════════════════════

let _activityEventSource = null;
let _activityEvents = []; // Local cache of activity events (newest first)
const MAX_DISPLAYED_ACTIVITIES = 30;
const DEFAULT_VISIBLE_ACTIVITIES = 3;
let _activityExpanded = false;

/**
 * Format a timestamp into relative time string
 * @param {string} isoString - ISO 8601 timestamp
 * @returns {string} Relative time string (e.g., "2m ago")
 */
function formatRelativeTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${diffDay}d ago`;
}

/**
 * Get CSS color class for event type
 * @param {string} type - Activity event type
 * @returns {string} Tailwind color class
 */
function getActivityColor(type) {
  switch (type) {
    case 'message_received': return 'text-blue-600';
    case 'intent_classified': return 'text-purple-600';
    case 'response_sent': return 'text-success-600';
    case 'whatsapp_connected': return 'text-success-600';
    case 'whatsapp_disconnected': return 'text-orange-600';
    case 'whatsapp_unlinked': return 'text-danger-600';
    case 'escalation': return 'text-danger-600';
    case 'emergency': return 'text-danger-700 font-semibold';
    case 'error': return 'text-danger-600';
    case 'workflow_started': return 'text-primary-600';
    case 'booking_started': return 'text-primary-600';
    case 'feedback': return 'text-success-600';
    case 'rate_limited': return 'text-orange-600';
    case 'config_reloaded': return 'text-neutral-600';
    default: return 'text-neutral-700';
  }
}

/**
 * Toggle Recent Activity expanded (show 3 vs show all)
 */
export function toggleActivityExpand() {
  _activityExpanded = !_activityExpanded;
  const card = document.getElementById('recent-activity-card');
  if (card) card.classList.toggle('activity-expanded', _activityExpanded);
  renderActivityEvents();
}

/**
 * Render activity events to the DOM (default: 3 visible, chevron to show more)
 */
function renderActivityEvents() {
  const el = document.getElementById('dashboard-recent-activity');
  if (!el) return;

  if (_activityEvents.length === 0) {
    el.innerHTML = `
      <div class="text-center py-6">
        <div class="text-3xl mb-2">🔍</div>
        <div class="text-sm text-neutral-500">No activity yet — waiting for events...</div>
        <div class="text-xs text-neutral-400 mt-1">Send a WhatsApp message to see real-time activity</div>
      </div>`;
    return;
  }

  const visibleCount = _activityExpanded
    ? Math.min(_activityEvents.length, MAX_DISPLAYED_ACTIVITIES)
    : DEFAULT_VISIBLE_ACTIVITIES;
  const itemsToShow = _activityEvents.slice(0, visibleCount);
  const hasMore = _activityEvents.length > DEFAULT_VISIBLE_ACTIVITIES;
  const hiddenCount = _activityEvents.length - DEFAULT_VISIBLE_ACTIVITIES;

  el.innerHTML = `
    <div class="space-y-0">
      ${itemsToShow.map((evt, idx) => `
        <div class="flex items-start gap-3 py-2.5 ${idx < itemsToShow.length - 1 ? 'border-b border-neutral-100' : ''} ${idx === 0 ? 'activity-new-item' : ''}" data-event-id="${esc(evt.id)}">
          <div class="text-lg flex-shrink-0 mt-0.5">${evt.icon}</div>
          <div class="flex-1 min-w-0">
            <div class="text-sm ${getActivityColor(evt.type)}">${esc(evt.message)}</div>
            <div class="text-xs text-neutral-400 mt-0.5 activity-timestamp" data-ts="${evt.timestamp}">${formatRelativeTime(evt.timestamp)}</div>
          </div>
        </div>
      `).join('')}
      ${hasMore ? `
        <div class="border-t border-neutral-100 pt-2 mt-2">
          <button type="button" onclick="toggleActivityExpand()" class="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition" aria-expanded="${_activityExpanded}">
            ${_activityExpanded
        ? '<span>Show less</span><svg class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>'
        : `<span>Show more (${hiddenCount} more)</span><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>`
      }
          </button>
        </div>
      ` : ''}
    </div>`;
}

/**
 * Add a single activity event to the top of the list with animation
 * @param {Object} event - Activity event object
 */
function addActivityEvent(event) {
  // Deduplicate
  if (_activityEvents.some(e => e.id === event.id)) return;

  _activityEvents.unshift(event);

  // Keep only the last MAX items
  if (_activityEvents.length > MAX_DISPLAYED_ACTIVITIES + 10) {
    _activityEvents = _activityEvents.slice(0, MAX_DISPLAYED_ACTIVITIES + 10);
  }

  renderActivityEvents();

  // Pulse animation on the newest item
  const newItem = document.querySelector('.activity-new-item');
  if (newItem) {
    newItem.style.animation = 'activitySlideIn 0.4s ease-out';
    newItem.style.backgroundColor = '#f0fdf4';
    setTimeout(() => {
      newItem.style.transition = 'background-color 1s ease';
      newItem.style.backgroundColor = 'transparent';
    }, 800);
  }
}

/**
 * Initialize the SSE stream for real-time activity
 */
export function initActivityStream() {
  // Don't reconnect if already connected
  if (_activityEventSource && _activityEventSource.readyState !== EventSource.CLOSED) {
    return;
  }

  const liveDot = document.getElementById('activity-live-dot');
  const offlineDot = document.getElementById('activity-offline-dot');

  // Show connecting state
  if (offlineDot) offlineDot.classList.remove('hidden');
  if (liveDot) liveDot.classList.add('hidden');

  const baseUrl = window.location.origin;
  _activityEventSource = new EventSource(`${baseUrl}/api/rainbow/activity/stream`);

  _activityEventSource.addEventListener('init', (e) => {
    try {
      const data = JSON.parse(e.data);
      _activityEvents = data.events || [];
      const card = document.getElementById('recent-activity-card');
      if (card) card.classList.toggle('activity-expanded', _activityExpanded);
      renderActivityEvents();

      // Show LIVE indicator
      if (liveDot) liveDot.classList.remove('hidden');
      if (offlineDot) offlineDot.classList.add('hidden');
    } catch (err) {
      console.error('[Activity] Failed to parse init data:', err);
    }
  });

  _activityEventSource.addEventListener('activity', (e) => {
    try {
      const event = JSON.parse(e.data);
      addActivityEvent(event);
    } catch (err) {
      console.error('[Activity] Failed to parse event:', err);
    }
  });

  _activityEventSource.onerror = () => {
    // Show offline indicator
    if (liveDot) liveDot.classList.add('hidden');
    if (offlineDot) {
      offlineDot.classList.remove('hidden');
      offlineDot.textContent = 'Reconnecting...';
    }
    // EventSource will auto-reconnect
  };

  _activityEventSource.onopen = () => {
    if (liveDot) liveDot.classList.remove('hidden');
    if (offlineDot) offlineDot.classList.add('hidden');
  };
}

/**
 * Disconnect the activity stream (call when leaving dashboard tab)
 */
export function disconnectActivityStream() {
  if (_activityEventSource) {
    _activityEventSource.close();
    _activityEventSource = null;
  }
}

// Update relative timestamps every 30s
setInterval(() => {
  document.querySelectorAll('.activity-timestamp').forEach(el => {
    const ts = el.getAttribute('data-ts');
    if (ts) el.textContent = formatRelativeTime(ts);
  });
}, 30000);
