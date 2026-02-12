/**
 * Feedback Analytics Module
 * Displays user feedback and sentiment tracking
 */

import { api } from '../api.js';
import { toast } from '../toast.js';

/**
 * Load feedback statistics
 */
export async function loadFeedbackStats() {
  try {
    const data = await api('/feedback/stats');
    const el = document.getElementById('feedback-stats');

    el.innerHTML = `
      <div class="grid grid-cols-3 gap-4">
        <div class="border rounded-lg p-4">
          <p class="text-sm text-neutral-600">Total Feedback</p>
          <p class="text-2xl font-bold">${data.total || 0}</p>
        </div>
        <div class="border rounded-lg p-4">
          <p class="text-sm text-neutral-600">Positive</p>
          <p class="text-2xl font-bold text-success-600">${data.positive || 0}</p>
        </div>
        <div class="border rounded-lg p-4">
          <p class="text-sm text-neutral-600">Negative</p>
          <p class="text-2xl font-bold text-danger-600">${data.negative || 0}</p>
        </div>
      </div>
    `;
  } catch (e) {
    toast(e.message, 'error');
  }
}
