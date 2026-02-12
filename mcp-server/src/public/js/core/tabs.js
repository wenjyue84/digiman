// ═══════════════════════════════════════════════════════════════════
// Tab Routing & Navigation
// ═══════════════════════════════════════════════════════════════════

const BASE_PATH = '';
const VALID_TABS = ['status', 'intents', 'intent-manager', 'static-replies', 'kb', 'preview', 'real-chat', 'workflow', 'settings', 'testing', 'feedback-stats', 'intent-accuracy', 'help'];

/**
 * Get the current tab from URL path
 * @returns {string} Current tab name (defaults to 'status')
 */
function getTabFromURL() {
  const seg = window.location.pathname.replace(BASE_PATH, '').replace(/^\//, '').split('/')[0];
  return VALID_TABS.includes(seg) ? seg : 'status';
}

/**
 * Toggle visibility of a dropdown menu
 * @param {string} dropdownId - ID of the dropdown element
 */
function toggleDropdown(dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  const isHidden = dropdown.classList.contains('hidden');

  // Close all dropdowns first
  closeAllDropdowns();

  // Toggle this dropdown
  if (isHidden) {
    dropdown.classList.remove('hidden');
  }
}

/**
 * Close all dropdown menus
 */
function closeAllDropdowns() {
  document.querySelectorAll('[id$="-dropdown"]').forEach(d => d.classList.add('hidden'));
}

/**
 * Switch to a different tab
 * @param {string} tab - Tab name to switch to
 * @param {boolean} pushState - Whether to update browser history
 */
function switchTab(tab, pushState = true) {
  document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('tab-active'); b.classList.add('text-neutral-500'); });
  const active = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
  if (active) { active.classList.add('tab-active'); active.classList.remove('text-neutral-500'); }
  document.querySelectorAll('.tab-content').forEach(s => s.classList.add('hidden'));
  document.getElementById('tab-' + tab).classList.remove('hidden');
  if (pushState) history.pushState(null, '', BASE_PATH + '/' + tab);
  loadTab(tab);
}

/**
 * Load content for a specific tab
 * @param {string} tab - Tab name to load
 */
function loadTab(tab) {
  // Tab loaders will be populated from module files in phases 3-5
  // For now, create placeholders that will be overridden
  const loaders = {
    status: typeof loadStatus !== 'undefined' ? loadStatus : () => console.log('Status loader placeholder'),
    intents: typeof loadIntents !== 'undefined' ? loadIntents : () => console.log('Intents loader placeholder'),
    'intent-manager': typeof loadIntentManagerData !== 'undefined' ? loadIntentManagerData : () => console.log('Intent Manager loader placeholder'),
    'static-replies': typeof loadStaticReplies !== 'undefined' ? loadStaticReplies : () => console.log('Static Replies loader placeholder'),
    kb: typeof loadKB !== 'undefined' ? loadKB : () => console.log('KB loader placeholder'),
    preview: typeof loadPreview !== 'undefined' ? loadPreview : () => console.log('Preview loader placeholder'),
    'real-chat': typeof loadRealChat !== 'undefined' ? loadRealChat : () => console.log('Real Chat loader placeholder'),
    settings: typeof loadSettings !== 'undefined' ? loadSettings : () => console.log('Settings loader placeholder'),
    workflow: typeof loadWorkflow !== 'undefined' ? loadWorkflow : () => console.log('Workflow loader placeholder'),
    testing: () => {}, // Results loaded on-demand via Run button
    'feedback-stats': typeof loadFeedbackStats !== 'undefined' ? loadFeedbackStats : () => console.log('Feedback Stats loader placeholder'),
    'intent-accuracy': typeof loadIntentAccuracy !== 'undefined' ? loadIntentAccuracy : () => console.log('Intent Accuracy loader placeholder'),
    help: () => {} // No dynamic loading needed for help
  };
  if (loaders[tab]) loaders[tab]();
}

// ═══════════════════════════════════════════════════════════════════
// Event Listeners (Initialize on DOM ready)
// ═══════════════════════════════════════════════════════════════════

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
  if (!event.target.closest('.relative')) {
    closeAllDropdowns();
  }
});

// Tab button click handlers
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Browser back/forward button support
  window.addEventListener('popstate', () => switchTab(getTabFromURL(), false));

  // Load initial tab from URL
  const initialTab = getTabFromURL();
  switchTab(initialTab, false);
});
