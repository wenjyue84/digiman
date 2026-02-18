/**
 * module-registry.js — Lazy-loading ES Module bridge
 *
 * BEFORE (eager): imported all 35+ tab modules upfront, registered on window.*.
 * AFTER  (lazy):  only bootstraps the lazy-loader; per-tab chunks are loaded
 *                 on demand when the user navigates to each tab.
 *
 * The lazy-loader (lazy-loader.js) maps tab names -> chunk files that each
 * contain the imports + window.* registrations for that tab's modules.
 *
 * Core infrastructure (api, toast, escapeHtml, state, sidebar, tabs, etc.)
 * remains eagerly loaded via regular <script> tags in the HTML.
 */

// ─── Bootstrap the lazy loader ──────────────────────────────────
// This import makes window._ensureTabModules available for tabs.js
import '/public/js/core/lazy-loader.js';

// ─── Global helpers that must always be available ───────────────
// (Previously at the bottom of the old module-registry.js)

async function reloadConfig() {
  try {
    await window.api('/reload', { method: 'POST' });
    window.toast('Config reloaded (DB → memory → files synced)');
    const activeTab = document.querySelector('.tab-active')?.dataset.tab || 'dashboard';
    window.loadTab(activeTab);
  } catch (e) { window.toast(e.message, 'error'); }
}

window.reloadConfig = reloadConfig;
window.switchTab = function (tab) { if (window.loadTab) window.loadTab(tab); };

// Stub for stopStatusPolling / hidePrismaBotFab that tabs.js calls
// on every tab switch.  The real implementations are registered when
// dashboard-chunk / responses-chunk loads.  The stubs prevent errors
// when switching tabs before those chunks have loaded.
if (typeof window.stopStatusPolling !== 'function') {
  window.stopStatusPolling = function () {};
}
if (typeof window.hidePrismaBotFab !== 'function') {
  window.hidePrismaBotFab = function () {};
}

console.log('[ModuleRegistry] Lazy-loading bootstrap ready');
