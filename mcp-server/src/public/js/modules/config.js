/**
 * Configuration Management Module
 * Handles config reload and initialization
 */

import { api } from '../api.js';
import { toast } from '../toast.js';

/**
 * Reload configuration from disk
 * Triggers API reload and refreshes active tab
 */
export async function reloadConfig() {
  try {
    await api('/reload', { method: 'POST' });
    toast('Config reloaded from disk');
    const activeTab = document.querySelector('.tab-active')?.dataset.tab || 'status';
    loadTab(activeTab);
  } catch (e) {
    toast(e.message, 'error');
  }
}
