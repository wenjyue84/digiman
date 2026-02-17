/**
 * Dashboard Tab Loader
 *
 * Main landing page showing:
 * - WhatsApp instance status with phone numbers and connection states
 * - Server connection status (Frontend, Backend, MCP)
 * - AI provider status with speed testing
 * - Quick stats (messages, accuracy, response time, satisfaction)
 * - Real-time activity stream (SSE)
 * - Setup checklist for first-time users
 */

import { api, toast, escapeHtml as esc } from '../core/utils.js';
import {
  runDashboardProviderSpeedTest,
  initActivityStream
} from './dashboard-helpers.js';

// Auto-refresh state for WhatsApp + server status polling
let _statusPollTimer = null;
const STATUS_POLL_INTERVAL = 15_000; // 15 seconds

/**
 * Main Dashboard tab loader
 */
export async function loadDashboard() {
  try {
    // Kick off status + stats fetches in parallel (US-154)
    // Both are independent network calls — no need to wait for one before starting the other
    const statusPromise = api('/status');
    const statsPromise = window.apiHelpers.loadMultipleConfigs(
      { conversations: '/conversations', accuracy: '/intent/accuracy', feedback: '/feedback/stats', responseTime: '/conversations/stats/response-time' },
      { settled: true }
    );

    // While both are in flight, prepare stat DOM elements and show cached/loading state
    const statsEls = {
      messages: document.getElementById('dashboard-stat-messages'),
      accuracy: document.getElementById('dashboard-stat-accuracy'),
      response: document.getElementById('dashboard-stat-response'),
      satisfaction: document.getElementById('dashboard-stat-satisfaction'),
    };

    const STATS_CACHE_KEY = 'rainbow-dashboard-stats';
    const cached = sessionStorage.getItem(STATS_CACHE_KEY);
    if (cached) {
      try {
        const cachedStats = JSON.parse(cached);
        if (statsEls.messages) statsEls.messages.textContent = cachedStats.messages || '-';
        if (statsEls.accuracy) statsEls.accuracy.textContent = cachedStats.accuracy || '-';
        if (statsEls.response) statsEls.response.textContent = cachedStats.response || '-';
        if (statsEls.satisfaction) statsEls.satisfaction.textContent = cachedStats.satisfaction || '-';
        Object.values(statsEls).forEach(el => { if (el) el.style.opacity = '0.6'; });
      } catch (_) {
        Object.values(statsEls).forEach(el => { if (el) el.textContent = '...'; });
      }
    } else {
      Object.values(statsEls).forEach(el => { if (el) el.textContent = '...'; });
    }

    // Await status data — needed for WhatsApp, server, and AI provider sections
    const statusData = await statusPromise;

    // Update WhatsApp Status — show each instance with phone, label, last connected
    const waInstances = statusData.whatsappInstances || [];
    const connectedCount = waInstances.filter(i => i.state === 'open').length;
    const totalCount = waInstances.length;

    // Update header badge
    const badge = document.getElementById('wa-badge');
    if (badge) {
      if (totalCount === 0) {
        badge.textContent = 'no instances';
        badge.className = 'text-xs px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-600';
      } else {
        badge.textContent = `${connectedCount}/${totalCount} connected`;
        badge.className = 'text-xs px-2 py-0.5 rounded-full ' +
          (connectedCount === totalCount ? 'bg-success-100 text-success-700' :
            connectedCount > 0 ? 'bg-warning-100 text-warning-700' : 'bg-danger-100 text-danger-700');
      }
    }

    // Update Server connection (ports 3000, 5000, 3002)
    const serverStatusEl = document.getElementById('server-status');
    if (serverStatusEl) {
      const servers = statusData.servers || {};
      serverStatusEl.innerHTML = Object.keys(servers).length === 0
        ? '<div class="col-span-full text-center py-4 text-neutral-400 text-sm">No server data</div>'
        : Object.entries(servers).map(([serverKey, server]) => renderServerCard(serverKey, server)).join('');
    }

    const waStatusEl = document.getElementById('dashboard-wa-status');
    if (totalCount === 0) {
      waStatusEl.innerHTML = `
        <div class="text-center py-4">
          <p class="text-sm text-neutral-400 mb-2">No WhatsApp instances connected</p>
          <a href="/admin/whatsapp-qr" class="text-xs bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-lg transition inline-block">Pair WhatsApp (QR)</a>
        </div>`;
    } else {
      waStatusEl.innerHTML = waInstances.map(inst => renderInstanceCard(inst, totalCount)).join('');
    }

    // Update AI Model Status (providers are under statusData.ai.providers)
    const aiProviders = (statusData.ai?.providers || [])
      .filter(p => p.enabled)
      .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));

    const aiStatusEl = document.getElementById('dashboard-ai-status');

    if (aiProviders.length === 0) {
      aiStatusEl.innerHTML = '<p class="text-sm text-neutral-400 py-2">No AI models configured</p>';
    } else {
      aiStatusEl.innerHTML = `
        <div class="space-y-2">
          ${aiProviders.slice(0, 4).map(provider => {
        const isDefault = provider.priority === 0;
        const defaultBadge = isDefault
          ? '<span class="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded ml-1 font-bold uppercase tracking-wide border border-amber-200">Default</span>'
          : '';

        return `
            <div class="flex items-center justify-between text-sm" data-provider-id="${esc(provider.id)}">
              <div class="flex items-center gap-2 overflow-hidden">
                <span class="w-2 h-2 rounded-full flex-shrink-0 ${provider.available ? 'bg-success-400' : 'bg-neutral-300'}"></span>
                <span class="text-neutral-700 truncate ${isDefault ? 'font-semibold' : ''}">${esc(provider.name || 'Unknown')}</span>
                ${defaultBadge}
              </div>
              <span class="flex items-center gap-2 flex-shrink-0 ml-2">
                <span class="${provider.available ? 'text-success-600' : 'text-neutral-400'} text-xs whitespace-nowrap">${provider.available ? '✓ Ready' : '✗ Not configured'}</span>
                <span id="dashboard-ai-time-${esc(provider.id)}" class="text-neutral-500 font-mono text-xs w-10 text-right" data-provider-id="${esc(provider.id)}"></span>
              </span>
            </div>
          `}).join('')}
          ${aiProviders.length > 4 ? `
            <button type="button" id="dashboard-ai-more-toggle" onclick="toggleDashboardAiModels()" class="text-xs text-primary-500 hover:text-primary-600 mt-1 pl-4 cursor-pointer underline">+${aiProviders.length - 4} more models</button>
            <div id="dashboard-ai-more-list" class="hidden space-y-2 mt-2">
              ${aiProviders.slice(4).map(provider => {
                const isDefault = provider.priority === 0;
                const defaultBadge = isDefault
                  ? '<span class="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded ml-1 font-bold uppercase tracking-wide border border-amber-200">Default</span>'
                  : '';
                return '<div class="flex items-center justify-between text-sm" data-provider-id="' + esc(provider.id) + '">'
                  + '<div class="flex items-center gap-2 overflow-hidden">'
                  + '<span class="w-2 h-2 rounded-full flex-shrink-0 ' + (provider.available ? 'bg-success-400' : 'bg-neutral-300') + '"></span>'
                  + '<span class="text-neutral-700 truncate ' + (isDefault ? 'font-semibold' : '') + '">' + esc(provider.name || 'Unknown') + '</span>'
                  + defaultBadge
                  + '</div>'
                  + '<span class="flex items-center gap-2 flex-shrink-0 ml-2">'
                  + '<span class="' + (provider.available ? 'text-success-600' : 'text-neutral-400') + ' text-xs whitespace-nowrap">' + (provider.available ? '\u2713 Ready' : '\u2717 Not configured') + '</span>'
                  + '<span id="dashboard-ai-time-' + esc(provider.id) + '" class="text-neutral-500 font-mono text-xs w-10 text-right" data-provider-id="' + esc(provider.id) + '"></span>'
                  + '</span>'
                  + '</div>';
              }).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }
    // Run speed test in background and fill response times (no user click needed)
    runDashboardProviderSpeedTest(true);

    // Await stats results — these were fetched in parallel with /status above
    const statsConfigs = await statsPromise;

    const freshStats = {};

    // Messages Handled — sum messageCount from all conversations
    if (Array.isArray(statsConfigs.conversations)) {
      const totalMessages = statsConfigs.conversations.reduce((sum, c) => sum + (c.messageCount || 0), 0);
      freshStats.messages = totalMessages.toLocaleString();
    } else {
      freshStats.messages = connectedCount > 0 ? '-' : '0';
    }
    statsEls.messages.textContent = freshStats.messages;

    // Intent Accuracy — from intent/accuracy API
    if (statsConfigs.accuracy?.accuracy?.overall) {
      const rate = statsConfigs.accuracy.accuracy.overall.accuracyRate;
      freshStats.accuracy = rate != null ? `${Math.round(rate)}%` : '-';
    } else {
      freshStats.accuracy = '-';
    }
    statsEls.accuracy.textContent = freshStats.accuracy;

    // Avg Response Time — from conversation logs
    if (statsConfigs.responseTime?.avgResponseTimeMs != null) {
      freshStats.response = `${Math.round(statsConfigs.responseTime.avgResponseTimeMs)}ms`;
    } else {
      freshStats.response = '-';
    }
    statsEls.response.textContent = freshStats.response;

    // Satisfaction Rate — from feedback/stats API
    if (statsConfigs.feedback?.stats?.overall) {
      const satRate = parseFloat(statsConfigs.feedback.stats.overall.satisfactionRate);
      freshStats.satisfaction = !isNaN(satRate) ? `${Math.round(satRate)}%` : '-';
    } else {
      freshStats.satisfaction = '-';
    }
    statsEls.satisfaction.textContent = freshStats.satisfaction;

    // Restore full opacity and cache fresh stats
    Object.values(statsEls).forEach(el => {
      if (el) {
        el.style.transition = 'opacity 0.3s ease';
        el.style.opacity = '1';
      }
    });
    sessionStorage.setItem(STATS_CACHE_KEY, JSON.stringify(freshStats));

    // Initialize real-time activity feed via SSE
    initActivityStream();

    // Start auto-polling for WhatsApp + server status (every 15s + on tab focus)
    startStatusPolling();

    // Load setup checklist items (respect persisted dismiss)
    const setupEl = document.getElementById('setup-items');
    const setupDismissed = localStorage.getItem('rainbow-setup-dismissed') === 'true';
    if (setupDismissed) {
      document.getElementById('setup-checklist')?.classList.add('hidden');
    }

    const setupChecklist = [
      { id: 'connect-wa', icon: '📱', text: 'Connect WhatsApp instance', done: totalCount > 0 },
      { id: 'train-intent', icon: '🎓', text: 'Train at least one intent', done: false }, // TODO: Check if intents exist
      { id: 'test-chat', icon: '💬', text: 'Test the AI assistant', done: false }
    ];

    const allDone = setupChecklist.every(item => item.done);
    if (allDone) {
      document.getElementById('setup-checklist')?.classList.add('hidden');
    } else if (!setupDismissed) {
      setupEl.innerHTML = setupChecklist.map(item => `
        <div class="flex items-center gap-2 text-sm">
          <span class="${item.done ? 'text-success-600' : 'text-neutral-400'}">${item.done ? '✓' : '○'}</span>
          <span class="${item.done ? 'text-neutral-500 line-through' : 'text-neutral-700'}">${item.icon} ${item.text}</span>
        </div>
      `).join('');
    }

  } catch (err) {
    console.error('[Dashboard] Failed to load:', err);
    toast(err.message, 'error');

    // Clear loading spinners with error fallback so users don't see infinite loading
    const errorHtml = `
      <div class="text-center py-4 text-neutral-500">
        <p class="text-sm mb-2">Failed to load — <button onclick="loadDashboard()" class="text-primary-500 hover:underline">retry</button></p>
      </div>`;
    const waEl = document.getElementById('dashboard-wa-status');
    const aiEl = document.getElementById('dashboard-ai-status');
    const actEl = document.getElementById('dashboard-recent-activity');
    if (waEl && waEl.querySelector('.animate-spin')) waEl.innerHTML = errorHtml;
    if (aiEl && aiEl.querySelector('.animate-spin')) aiEl.innerHTML = errorHtml;
    if (actEl && actEl.querySelector('.animate-spin')) actEl.innerHTML = errorHtml;
  }
}

/**
 * Toggle showing all AI models in the dashboard card
 */
export function toggleDashboardAiModels() {
  const list = document.getElementById('dashboard-ai-more-list');
  const toggle = document.getElementById('dashboard-ai-more-toggle');
  if (!list || !toggle) return;
  const isHidden = list.classList.contains('hidden');
  list.classList.toggle('hidden');
  if (isHidden) {
    toggle.textContent = 'Show less';
  } else {
    const count = list.querySelectorAll('[data-provider-id]').length;
    toggle.textContent = `+${count} more models`;
  }
}

/**
 * Dismiss the setup checklist permanently
 */
export function dismissChecklist() {
  document.getElementById('setup-checklist')?.classList.add('hidden');
  localStorage.setItem('rainbow-setup-dismissed', 'true');
}

/**
 * Quick action: Navigate to WhatsApp pairing
 */
export function quickActionAddWhatsApp() {
  // WhatsApp Accounts page removed — redirect to QR pairing
  window.location.href = '/admin/whatsapp-qr';
}

/**
 * Quick action: Navigate to Understanding tab to train intents
 */
export function quickActionTrainIntent() {
  if (window.loadTab) window.loadTab('understanding');
}

/**
 * Quick action: Navigate to Chat Simulator tab to test
 */
export function quickActionTestChat() {
  if (window.loadTab) window.loadTab('chat-simulator');
}

/**
 * Refresh the dashboard (reload all data)
 */
export function refreshDashboard() {
  loadDashboard();
  toast('Dashboard refreshed');
}

/**
 * Lightweight status-only refresh — updates WhatsApp instances + server cards
 * without re-running speed tests, SSE, stats, or setup checklist.
 */
async function refreshStatusCards() {
  try {
    const statusData = await api('/status');

    // ── WhatsApp instances ──
    const waInstances = statusData.whatsappInstances || [];
    const connectedCount = waInstances.filter(i => i.state === 'open').length;
    const totalCount = waInstances.length;

    // Update header badge
    const badge = document.getElementById('wa-badge');
    if (badge) {
      if (totalCount === 0) {
        badge.textContent = 'no instances';
        badge.className = 'text-xs px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-600';
      } else {
        badge.textContent = `${connectedCount}/${totalCount} connected`;
        badge.className = 'text-xs px-2 py-0.5 rounded-full ' +
          (connectedCount === totalCount ? 'bg-success-100 text-success-700' :
            connectedCount > 0 ? 'bg-warning-100 text-warning-700' : 'bg-danger-100 text-danger-700');
      }
    }

    // Update WhatsApp instance cards
    const waStatusEl = document.getElementById('dashboard-wa-status');
    if (waStatusEl) {
      if (totalCount === 0) {
        waStatusEl.innerHTML = `
          <div class="text-center py-4">
            <p class="text-sm text-neutral-400 mb-2">No WhatsApp instances connected</p>
            <a href="/admin/whatsapp-qr" class="text-xs bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-lg transition inline-block">Pair WhatsApp (QR)</a>
          </div>`;
      } else {
        waStatusEl.innerHTML = waInstances.map(inst => renderInstanceCard(inst, totalCount)).join('');
      }
    }

    // ── Server status ──
    const serverStatusEl = document.getElementById('server-status');
    if (serverStatusEl) {
      const servers = statusData.servers || {};
      serverStatusEl.innerHTML = Object.keys(servers).length === 0
        ? '<div class="col-span-full text-center py-4 text-neutral-400 text-sm">No server data</div>'
        : Object.entries(servers).map(([serverKey, server]) => renderServerCard(serverKey, server)).join('');
    }
  } catch (err) {
    // Silent fail for background polling — don't toast on every poll failure
    console.warn('[Dashboard] Status poll failed:', err.message);
  }
}

/**
 * Render a single WhatsApp instance card (extracted for reuse)
 */
function renderInstanceCard(inst, totalCount) {
  const phone = inst.user?.phone || inst.id || '';
  const formattedPhone = phone ? '+' + phone.replace(/(\d{2})(\d{2})(\d{3,4})(\d{4})/, '$1 $2-$3 $4') : 'Not linked';

  let lastConnectedText = '';
  if (inst.lastConnectedAt) {
    const lastConnected = new Date(inst.lastConnectedAt);
    const now = new Date();
    const diffMs = now.getTime() - lastConnected.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (inst.state === 'open') {
      lastConnectedText = '<span class="text-success-600 font-medium">Online now</span>';
    } else if (diffMins < 1) {
      lastConnectedText = 'Just now';
    } else if (diffMins < 60) {
      lastConnectedText = `${diffMins}m ago`;
    } else if (diffHours < 24) {
      lastConnectedText = `${diffHours}h ago`;
    } else {
      lastConnectedText = `${diffDays}d ago`;
    }
  } else {
    lastConnectedText = inst.state === 'open' ? '<span class="text-success-600 font-medium">Online now</span>' : 'Never connected';
  }

  const statusDot = inst.state === 'open' ? 'bg-success-400' : inst.unlinkedFromWhatsApp ? 'bg-orange-500' : 'bg-neutral-300';
  const statusText = inst.state === 'open' ? 'Connected' : inst.unlinkedFromWhatsApp ? 'Unlinked' : 'Disconnected';
  const statusColor = inst.state === 'open' ? 'text-success-600' : inst.unlinkedFromWhatsApp ? 'text-orange-600' : 'text-neutral-500';
  const firstConnectedStr = inst.firstConnectedAt
    ? new Date(inst.firstConnectedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

  return `
    <div class="flex items-center justify-between py-2.5 border-b last:border-0">
      <div class="flex items-center gap-3">
        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDot}"></span>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-medium text-neutral-800 text-sm cursor-pointer hover:underline decoration-dashed decoration-neutral-400" 
              onclick="startEditingLabel('${esc(inst.id)}', this)" 
              title="Click to rename">${esc(inst.label || inst.id)}</span>
            <span class="text-xs ${statusColor}">${statusText}</span>
          </div>
          <div class="text-xs text-neutral-500">${esc(formattedPhone)}${inst.user?.name ? ' — ' + esc(inst.user.name) : ''}</div>
          <div class="text-xs text-neutral-400">Last: ${lastConnectedText}</div>
          <div class="text-xs text-neutral-400">First connected: ${firstConnectedStr}</div>
        </div>
      </div>
      <div class="flex gap-1 flex-shrink-0">
        ${inst.state !== 'open' ? `<button type="button" onclick="showInstanceQR('${esc(inst.id)}', '${esc(inst.label || inst.id)}')" class="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition">QR</button>` : ''}
        ${inst.state === 'open' ? `<button onclick="logoutInstance('${esc(inst.id)}')" class="text-xs bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded transition">Logout</button>` : ''}
        <button type="button" onclick="removeInstance('${esc(inst.id)}', ${totalCount})" class="text-xs bg-danger-500 hover:bg-danger-600 text-white px-2 py-1 rounded transition">Remove</button>
      </div>
    </div>`;
}

/**
 * Render a single server status card (extracted for reuse)
 */
function renderServerCard(serverKey, server) {
  const formatLastChecked = (iso) => {
    if (!iso) return 'N/A';
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' });
    } catch (_) { return iso; }
  };

  const statusColor = server.online ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700';
  const statusIcon = server.online ? '✓' : '✗';
  const responseTime = server.responseTime !== undefined ? `${server.responseTime}ms` : 'N/A';
  const lastChecked = formatLastChecked(server.lastCheckedAt);

  return `
    <div class="border rounded-2xl p-4 ${server.online ? 'border-success-200' : 'border-danger-200'}">
      <div class="flex items-center justify-between mb-2">
        <h4 class="font-medium text-neutral-800">${esc(server.name)}</h4>
        <span class="${statusColor} px-2 py-1 rounded-full text-xs font-medium">${statusIcon} ${server.online ? 'Online' : 'Offline'}</span>
      </div>
      <div class="text-sm text-neutral-600 space-y-1">
        <div class="flex justify-between">
          <span class="text-neutral-500">Port:</span>
          <span class="font-mono font-medium">${server.port}</span>
        </div>
        ${server.online ? `
          <div class="flex justify-between">
            <span class="text-neutral-500">Response:</span>
            <span class="font-mono text-success-600">${responseTime}</span>
          </div>
        ` : `
          <div class="flex justify-between">
            <span class="text-neutral-500">Error:</span>
            <span class="font-mono text-danger-600 text-xs">${esc(server.error || 'Unknown')}</span>
          </div>
        `}
        <div class="flex justify-between">
          <span class="text-neutral-500">Last checked:</span>
          <span class="font-mono text-neutral-600 text-xs" title="${esc(lastChecked)}">${esc(lastChecked)}</span>
        </div>
        <div class="mt-2 flex flex-wrap gap-2">
          ${server.url ? `<a href="${server.url}" target="_blank" class="text-xs text-primary-600 hover:text-primary-700 underline">Open →</a>` : ''}
          <button type="button" onclick="restartServer('${esc(serverKey)}')" class="text-xs px-2 py-1 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-neutral-700 transition">Restart</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Start auto-polling WhatsApp + server status while dashboard is active.
 * Also refreshes immediately when the browser tab regains focus.
 */
export function startStatusPolling() {
  stopStatusPolling(); // clear any existing timer

  _statusPollTimer = setInterval(refreshStatusCards, STATUS_POLL_INTERVAL);

  // Refresh immediately when user returns to this browser tab
  document.addEventListener('visibilitychange', _onVisibilityChange);
}

/**
 * Stop status polling (called when navigating away from dashboard tab)
 */
export function stopStatusPolling() {
  if (_statusPollTimer) {
    clearInterval(_statusPollTimer);
    _statusPollTimer = null;
  }
  document.removeEventListener('visibilitychange', _onVisibilityChange);
}

function _onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    refreshStatusCards();
  }
}

/**
 * Start inline editing of WhatsApp instance label
 */
export function startEditingLabel(id, el) {
  const currentLabel = el.textContent;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentLabel;
  input.className = 'border rounded px-2 py-0.5 text-sm w-full max-w-[200px] shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none';

  // Handle save on blur and enter
  let isSaving = false;
  const save = () => {
    if (isSaving) return;
    isSaving = true;
    finishEditingLabel(id, input, currentLabel);
  };

  input.onblur = save;
  input.onkeydown = (e) => {
    if (e.key === 'Enter') {
      save();
    } else if (e.key === 'Escape') {
      // Revert
      el.textContent = currentLabel;
      input.replaceWith(el);
      isSaving = true; // Prevent blur from firing save
    }
  };

  el.replaceWith(input);
  input.select();
}

/**
 * Finish inline editing and save
 */
export async function finishEditingLabel(id, input, oldLabel) {
  const newLabel = input.value.trim();

  // If no change, just revert
  if (newLabel === oldLabel) {
    const span = createLabelSpan(id, newLabel);
    input.replaceWith(span);
    return;
  }

  if (!newLabel) {
    toast('Label cannot be empty', 'error');
    const span = createLabelSpan(id, oldLabel);
    input.replaceWith(span);
    return;
  }

  try {
    const res = await api(`/whatsapp/instances/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: { label: newLabel }
    });

    if (input.parentNode) {
      const span = createLabelSpan(id, res.instance?.label || newLabel);
      input.replaceWith(span);
    }
    toast('Label updated');
  } catch (e) {
    console.error('Failed to update label:', e);
    toast(e.message || 'Failed to update label', 'error');
    if (input.parentNode) {
      const span = createLabelSpan(id, oldLabel);
      input.replaceWith(span);
    }
  }
}

function createLabelSpan(id, label) {
  const span = document.createElement('span');
  span.className = 'font-medium text-neutral-800 text-sm cursor-pointer hover:underline decoration-dashed decoration-neutral-400';
  span.onclick = function () { startEditingLabel(id, this); };
  span.title = 'Click to rename';
  span.textContent = label;
  return span;
}

