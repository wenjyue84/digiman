/**
 * Intent Analytics Module
 * Displays intent accuracy metrics and analytics
 */

import { api } from '../api.js';
import { toast } from '../toast.js';

/**
 * Load intent accuracy metrics
 */
export async function loadIntentAccuracy() {
  try {
    const data = await api('/intents/analytics');
    const el = document.getElementById('intent-analytics');

    el.innerHTML = `
      <div class="border rounded-lg p-4">
        <p class="text-sm text-neutral-600">Overall Accuracy</p>
        <p class="text-3xl font-bold">${((data.accuracy || 0) * 100).toFixed(1)}%</p>
      </div>
    `;
  } catch (e) {
    toast(e.message, 'error');
  }
}
