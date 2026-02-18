/**
 * @fileoverview Configuration reload and initialization
 * @module config
 */

import { api } from '../api.js';
import { toast } from '../toast.js';

/**
 * Reload configuration from DB (DB-first, then disk fallback), then sync files
 * Triggers API reload and refreshes active tab
 */
export async function reloadConfig() {
  try {
    await api('/reload', { method: 'POST' });
    toast('Config reloaded (DB → memory → files synced)');
    const activeTab = document.querySelector('.tab-active')?.dataset.tab || 'status';
    loadTab(activeTab);
  } catch (e) {
    toast(e.message, 'error');
  }
}
