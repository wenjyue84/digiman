/**
 * Status Tab Module
 * Displays server status, WhatsApp instances, and AI provider availability
 */

import { api } from '../api.js';
import { toast } from '../toast.js';
import { escapeHtml as esc } from '../core/utils.js';

/**
 * Load and display status information
 * Shows server health, WhatsApp instances, and AI providers
 */
export async function loadStatus() {
  try {
    const d = await api('/status');
    const instances = d.whatsappInstances || [];
    const connectedCount = instances.filter(i => i.state === 'open').length;
    const totalCount = instances.length;

    // Update server status
    const servers = d.servers || {};
    const serverStatusEl = document.getElementById('server-status');
    serverStatusEl.innerHTML = Object.values(servers).map(server => {
      const statusColor = server.online ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700';
      const statusIcon = server.online ? '✓' : '✗';
      const responseTime = server.responseTime !== undefined ? `${server.responseTime}ms` : 'N/A';
      return `
        <div class="border rounded-2xl p-4 ${server.online ? 'border-green-200' : 'border-red-200'}">
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
            ${server.url ? `
              <div class="mt-2">
                <a href="${server.url}" target="_blank" class="text-xs text-primary-600 hover:text-primary-700 underline">Open →</a>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    const badge = document.getElementById('wa-badge');
    if (totalCount === 0) {
      badge.textContent = 'no instances';
      badge.className = 'text-xs px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-600';
    } else {
      badge.textContent = `${connectedCount}/${totalCount} connected`;
      badge.className = 'text-xs px-2 py-0.5 rounded-full ' +
        (connectedCount === totalCount ? 'bg-success-100 text-success-700' :
         connectedCount > 0 ? 'bg-warning-100 text-warning-700' : 'bg-danger-100 text-danger-700');
    }

    const el = document.getElementById('wa-instances');
    if (totalCount === 0) {
      el.innerHTML = '<p class="text-neutral-400">No WhatsApp instances. Click "+ Add Number" to connect one.</p>';
    } else {
      // Check for unlinked instances
      const unlinkedInstances = instances.filter(i => i.unlinkedFromWhatsApp);

      let html = '';

      // Show unlinked warning banner if any
      if (unlinkedInstances.length > 0) {
        html += `
          <div class="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div class="flex items-start gap-2">
              <span class="text-orange-600 text-xl">⚠️</span>
              <div class="flex-1">
                <h4 class="font-semibold text-orange-800 mb-1">WhatsApp Instances Unlinked</h4>
                <p class="text-sm text-orange-700 mb-2">
                  The following instance(s) were unlinked from WhatsApp (possibly by the user):
                </p>
                <ul class="text-sm text-orange-700 space-y-1 mb-2">
                  ${unlinkedInstances.map(i => `
                    <li class="flex items-center gap-1">
                      <span class="font-medium">${esc(i.label)}</span>
                      ${i.user ? `(${esc(i.user.phone || '')})` : `(${esc(i.id)})`}
                      ${i.lastUnlinkedAt ? `<span class="text-xs text-orange-600">— ${new Date(i.lastUnlinkedAt).toLocaleString()}</span>` : ''}
                    </li>
                  `).join('')}
                </ul>
                <p class="text-xs text-orange-600">
                  ℹ️ A notification has been sent to the user. If this was intentional, you can remove the instance below.
                </p>
              </div>
            </div>
          </div>
        `;
      }

      html += instances.map(i => {
        // Format last connected time
        let lastConnectedText = '';
        if (i.lastConnectedAt) {
          const lastConnected = new Date(i.lastConnectedAt);
          const now = new Date();
          const diffMs = now.getTime() - lastConnected.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);

          if (i.state === 'open') {
            lastConnectedText = `<span class="text-success-600">● Online</span>`;
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
          lastConnectedText = i.state === 'open' ? '<span class="text-success-600">● Online</span>' : 'Never';
        }

        return `
        <div class="flex items-center justify-between py-2 border-b last:border-0 ${i.unlinkedFromWhatsApp ? 'bg-orange-50' : ''}">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full flex-shrink-0 ${i.state === 'open' ? 'bg-success-400' : i.unlinkedFromWhatsApp ? 'bg-orange-500' : 'bg-warning-400'}"></span>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-medium text-neutral-800">${esc(i.label)}</span>
                ${i.unlinkedFromWhatsApp ? '<span class="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Unlinked from WhatsApp</span>' : ''}
              </div>
              <div class="text-xs text-neutral-400">${esc(i.id)} ${i.user ? '— ' + esc(i.user.name || '') + ' (' + esc(i.user.phone || '') + ')' : ''}</div>
              <div class="text-xs text-neutral-500">Last: ${lastConnectedText}</div>
            </div>
          </div>
          <div class="flex gap-1 flex-shrink-0">
            ${i.state !== 'open' ? `<button onclick="showInstanceQR('${esc(i.id)}', '${esc(i.label)}')" class="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition">QR</button>` : ''}
            ${i.state === 'open' ? `<button onclick="logoutInstance('${esc(i.id)}')" class="text-xs bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded transition">Logout</button>` : ''}
            <button onclick="removeInstance('${esc(i.id)}')" class="text-xs bg-danger-500 hover:bg-danger-600 text-white px-2 py-1 rounded transition">Remove</button>
          </div>
        </div>
      `;
      }).join('');

      el.innerHTML = html;
    }

    // AI Availability with enabled providers only (sorted by priority, default first)
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
            class="text-xs bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 px-3 py-1 rounded transition disabled:opacity-50"
            ${!provider.available ? 'disabled' : ''}
            id="test-btn-${provider.id}"
          >Test</button>
        </div>
      `;
    }).join('');

    const overallStatus = d.ai?.available
      ? '<span class="text-xs bg-success-100 text-success-700 px-2 py-1 rounded font-medium">✓ Available</span>'
      : '<span class="text-xs bg-danger-100 text-danger-700 px-2 py-1 rounded font-medium">✗ Unavailable</span>';

    document.getElementById('ai-status').innerHTML = `
      <div class="flex items-center justify-between mb-3 pb-2 border-b">
        <span class="text-sm font-medium text-neutral-700">Overall Status:</span>
        ${overallStatus}
      </div>
      ${aiHtml}
    `;

    document.getElementById('config-files').innerHTML = (d.config_files || [])
      .map(f => `<span class="px-2 py-1 bg-primary-50 text-primary-700 rounded text-xs font-mono">${f}.json</span>`).join('');

    // Auto-test all enabled providers (show response times automatically)
    aiProviders.forEach((p, i) => {
      setTimeout(() => testAIProvider(p.id), i * 300);
    });
  } catch (e) {
    document.getElementById('wa-instances').innerHTML = `<span class="text-danger-500">Error: ${e.message}</span>`;
  }
}

/**
 * Test an AI provider's availability
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
