/**
 * System Status Tab Loader
 *
 * Full system diagnostics page showing:
 * - Server status (Frontend, Backend, MCP) with response times
 * - AI provider status with test buttons and auto-testing
 * - Runtime info (WhatsApp instances, config files)
 * - Config file listing
 */

import { api, toast, escapeHtml as esc } from '../core/utils.js';

/**
 * Test an AI provider manually
 * @param {string} providerId - Provider ID to test
 */
export async function testAIProvider(providerId) {
  const btn = document.getElementById(`test-btn-${providerId}`);
  if (!btn) return;

  btn.textContent = '...';
  btn.disabled = true;
  btn.style.backgroundColor = '';
  btn.style.color = '';
  btn.style.borderColor = '';

  try {
    const result = await api(`/test-ai/${providerId}`, { method: 'POST' });
    if (result.ok) {
      // Show response time on button with green styling
      btn.textContent = result.responseTime + 'ms';
      btn.style.backgroundColor = '#f0fdf4'; // green-50
      btn.style.color = '#16a34a'; // green-600
      btn.style.borderColor = '#86efac'; // green-300
    } else {
      btn.textContent = 'Fail';
      btn.style.backgroundColor = '#fef2f2'; // red-50
      btn.style.color = '#dc2626'; // red-600
      btn.style.borderColor = '#fca5a5'; // red-300
      toast(`✗ ${providerId.toUpperCase()} test failed: ${result.error}`, 'error');
    }
  } catch (e) {
    btn.textContent = 'Err';
    btn.style.backgroundColor = '#fef2f2'; // red-50
    btn.style.color = '#dc2626'; // red-600
    btn.style.borderColor = '#fca5a5'; // red-300
    toast(`✗ ${providerId.toUpperCase()} test error: ${e.message}`, 'error');
  } finally {
    btn.disabled = false;
  }
}

/**
 * Load System Status tab (split from old Status tab)
 * Full server diagnostics: servers, AI providers (with test), runtime, config files
 */
export async function loadSystemStatus() {
  try {
    const d = await api('/status');

    // ── Server Status (3-column cards with ports, response times, URLs) ──
    const serverStatusEl = document.getElementById('server-status');
    if (serverStatusEl) {
      const servers = d.servers || {};
      const formatLastChecked = (iso) => {
        if (!iso) return 'N/A';
        try {
          const d = new Date(iso);
          return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' });
        } catch (_) { return iso; }
      };
      serverStatusEl.innerHTML = Object.values(servers).map(server => {
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
              ${server.url ? `
                <div class="mt-2">
                  <a href="${server.url}" target="_blank" class="text-xs text-primary-600 hover:text-primary-700 underline">Open →</a>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    }

    // ── AI Models (with priority badges, test buttons, auto-test) ──
    const aiProviders = (d.ai?.providers || [])
      .filter(p => p.enabled && p.available)
      .sort((a, b) => a.priority - b.priority);

    const aiHtml = aiProviders.map(provider => {
      const statusColor = provider.available ? 'bg-success-400' : 'bg-neutral-300';
      const isDefault = provider.priority === 0;
      const defaultBadge = isDefault ? '<span class="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded ml-1 font-medium">⭐ Default</span>' : '';
      const typeBadge = provider.type === 'primary'
        ? '<span class="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded ml-1">Primary</span>'
        : provider.type === 'fallback'
          ? '<span class="text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded ml-1">Fallback</span>'
          : '<span class="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded ml-1">Optional</span>';
      return `
        <div class="flex items-center justify-between py-2 border-b last:border-0">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full ${statusColor}"></span>
            <div>
              <div class="flex items-center gap-1">
                <span class="font-medium text-neutral-800">${esc(provider.name)}</span>
                ${defaultBadge}
                ${typeBadge}
              </div>
              <span class="text-xs ${provider.available ? 'text-success-600' : 'text-neutral-400'}">${esc(provider.details)}</span>
            </div>
          </div>
          <button
            onclick="testAIProvider('${provider.id}')"
            class="text-xs bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 px-3 py-1 rounded-2xl transition disabled:opacity-50"
            ${!provider.available ? 'disabled' : ''}
            id="test-btn-${provider.id}"
          >Test</button>
        </div>
      `;
    }).join('');

    const overallStatus = d.ai?.available
      ? '<span class="text-xs bg-success-100 text-success-700 px-2 py-1 rounded-full font-medium">✓ Available</span>'
      : '<span class="text-xs bg-danger-100 text-danger-700 px-2 py-1 rounded-full font-medium">✗ Unavailable</span>';

    const aiOverallEl = document.getElementById('ai-overall-status');
    if (aiOverallEl) aiOverallEl.innerHTML = overallStatus;

    const aiStatusEl = document.getElementById('ai-status');
    if (aiStatusEl) {
      if (aiProviders.length === 0) {
        aiStatusEl.innerHTML = '<p class="text-sm text-neutral-400 py-2">No AI models configured or enabled</p>';
      } else {
        aiStatusEl.innerHTML = aiHtml;
      }
    }

    // ── Runtime Info (summary cards) ──
    const runtimeEl = document.getElementById('runtime-info');
    if (runtimeEl) {
      const instances = d.whatsappInstances || [];
      const connectedCount = instances.filter(i => i.state === 'open').length;
      const totalCount = instances.length;
      const waText = totalCount === 0 ? 'None' : `${connectedCount}/${totalCount}`;
      const waColor = totalCount === 0 ? 'text-neutral-400' : (connectedCount === totalCount ? 'text-success-600' : connectedCount > 0 ? 'text-warning-600' : 'text-danger-600');
      const onlineServers = Object.values(d.servers || {}).filter(s => s.online).length;
      const totalServers = Object.keys(d.servers || {}).length;

      runtimeEl.innerHTML = `
        <div class="bg-neutral-50 rounded-2xl p-4 text-center cursor-pointer hover:bg-primary-50 hover:shadow-md transition-all duration-200 group" onclick="window.location.hash='dashboard'; loadTab('dashboard');" title="View Dashboard">
          <div class="text-3xl mb-2 group-hover:scale-110 transition-transform">💬</div>
          <div class="text-2xl font-bold ${waColor}">${waText}</div>
          <div class="text-xs text-neutral-500 mt-1 group-hover:text-primary-600">WhatsApp Instances</div>
        </div>
        <div class="bg-neutral-50 rounded-2xl p-4 text-center cursor-pointer hover:bg-primary-50 hover:shadow-md transition-all duration-200 group" onclick="window.location.hash='settings'; loadTab('settings');" title="View AI Model Settings">
          <div class="text-3xl mb-2 group-hover:scale-110 transition-transform">🤖</div>
          <div class="text-2xl font-bold text-primary-600">${aiProviders.length}</div>
          <div class="text-xs text-neutral-500 mt-1 group-hover:text-primary-600">AI Models Active</div>
        </div>
        <div class="bg-neutral-50 rounded-2xl p-4 text-center cursor-pointer hover:bg-primary-50 hover:shadow-md transition-all duration-200 group" onclick="document.getElementById('server-status')?.closest('.bg-white')?.scrollIntoView({behavior:'smooth',block:'start'});" title="View Server Details">
          <div class="text-3xl mb-2 group-hover:scale-110 transition-transform">🖥️</div>
          <div class="text-2xl font-bold text-neutral-800">${onlineServers}/${totalServers}</div>
          <div class="text-xs text-neutral-500 mt-1 group-hover:text-primary-600">Servers Online</div>
        </div>
        <div class="bg-neutral-50 rounded-2xl p-4 text-center cursor-pointer hover:bg-primary-50 hover:shadow-md transition-all duration-200 group" onclick="window.location.hash='settings'; loadTab('settings');" title="View Config Files">
          <div class="text-3xl mb-2 group-hover:scale-110 transition-transform">📁</div>
          <div class="text-2xl font-bold text-neutral-800">${(d.config_files || []).length}</div>
          <div class="text-xs text-neutral-500 mt-1 group-hover:text-primary-600">Config Files</div>
        </div>
      `;
    }

    // ── Config Files ──
    const configEl = document.getElementById('config-files');
    if (configEl) {
      configEl.innerHTML = (d.config_files || [])
        .map(f => `<span class="px-3 py-1.5 bg-primary-50 text-primary-700 rounded-2xl text-xs font-mono">${f}.json</span>`).join('');
    }

    // ── Update WA Badge in header ──
    const badge = document.getElementById('wa-badge');
    if (badge) {
      const instances = d.whatsappInstances || [];
      const connectedCount = instances.filter(i => i.state === 'open').length;
      const totalCount = instances.length;
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

    // ── Auto-test all enabled AI providers (staggered) ──
    aiProviders.forEach((p, i) => {
      setTimeout(() => testAIProvider(p.id), i * 300);
    });

  } catch (err) {
    console.error('[System Status] Failed to load:', err);
    toast(err.message, 'error');
  }
}
