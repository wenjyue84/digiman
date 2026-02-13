/**
 * Tab Management System
 * Handles tab switching and dynamic template loading
 */

// Track loaded templates to avoid reloading
const loadedTemplates = new Set();

/**
 * Load template for a tab if not already loaded
 * @param {HTMLElement} tabSection - Tab section element
 * @returns {Promise<void>}
 */
async function loadTabTemplate(tabSection) {
  const templateName = tabSection.dataset.template;
  if (!templateName || loadedTemplates.has(templateName)) {
    return; // Already loaded or no template needed
  }

  try {
    const response = await fetch(`/api/rainbow/templates/${templateName}`);

    if (!response.ok) {
      throw new Error(`Template ${templateName} not found (${response.status})`);
    }

    const html = await response.text();
    tabSection.innerHTML = html;
    loadedTemplates.add(templateName);

    console.log(`[Tabs] Loaded template: ${templateName}`);
  } catch (err) {
    console.error(`[Tabs] Failed to load template ${templateName}:`, err);
    tabSection.innerHTML = `
      <div class="p-8 text-center text-danger-500">
        <p>Failed to load ${templateName} tab</p>
        <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600">
          Reload Page
        </button>
      </div>
    `;
  }
}

/**
 * Load tab and call its loader function
 * @param {string} tabName - Tab name (e.g., 'status', 'intents')
 */
async function loadTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.add('hidden');
  });

  // Remove active class from all nav tabs
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('tab-active');
  });

  // Show selected tab
  const tabSection = document.getElementById('tab-' + tabName);
  if (!tabSection) {
    console.error(`[Tabs] Tab not found: tab-${tabName}`);
    return;
  }

  tabSection.classList.remove('hidden');

  // Highlight active nav tab
  const navTab = document.querySelector(`[data-tab="${tabName}"]`);
  if (navTab) {
    navTab.classList.add('tab-active');
  }

  // Load template if needed
  await loadTabTemplate(tabSection);

  // Call tab-specific loader function if exists
  const loaderFunctionName = 'load' + tabName.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('');

  if (typeof window[loaderFunctionName] === 'function') {
    try {
      await window[loaderFunctionName]();
      console.log(`[Tabs] Loaded: ${tabName}`);
    } catch (err) {
      console.error(`[Tabs] Error loading ${tabName}:`, err);
    }
  }
}

/**
 * Map old tab names to new ones for backward compatibility
 */
const tabNameMapping = {
  'status': 'dashboard',               // Removed; redirect to Dashboard
  'system-status': 'dashboard',        // Removed; redirect to Dashboard
  'intent-manager': 'understanding',   // Old Classify Intent → new Understanding
  'kb': 'responses',                   // Old Knowledge Base → new Responses (KB sub-tab)
  'static-replies': 'responses',       // Old Static Messages → new Responses
  'workflow': 'responses',             // Old Workflow → new Responses
  'preview': 'chat-simulator',         // Old Preview → new Chat Simulator
  'real-chat': 'chat-simulator',       // Old Real Chat → new Chat Simulator
  'chat': 'live-chat',                 // Short alias → Live Chat
  'feedback-stats': 'performance',     // Old Feedback Stats → new Performance
  'intent-accuracy': 'performance'     // Old Intent Accuracy → new Performance
};

/**
 * Normalize tab name using mapping (for backward compatibility)
 */
function normalizeTabName(tabName) {
  return tabNameMapping[tabName] || tabName;
}

/**
 * Initialize tabs on page load
 */
function initTabs() {
  // Normalize URL so the app always runs at origin + hash (avoids white screen when
  // opening e.g. /dashboard#chat-simulator in a new tab — pathname is normalized to /)
  const path = window.location.pathname || '/';
  if (path !== '/') {
    const hash = window.location.hash || '';
    window.history.replaceState(null, '', window.location.origin + '/' + hash);
  }

  // Add click handlers to all tab buttons
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = normalizeTabName(btn.dataset.tab);
      loadTab(tabName);

      // Update URL hash
      window.location.hash = tabName;
    });
  });

  // Load tab from URL hash or default to 'dashboard' (hash may include ?audience=developer for help)
  const hash = window.location.hash.slice(1);
  const hashTab = hash.includes('?') ? hash.split('?')[0] : hash;
  const initialTab = normalizeTabName(hashTab) || 'dashboard';

  loadTab(initialTab);

  // Listen for hash changes to support direct URL navigation
  window.addEventListener('hashchange', () => {
    const newHash = window.location.hash.slice(1);
    const newHashTab = newHash.includes('?') ? newHash.split('?')[0] : newHash;
    if (newHashTab) {
      loadTab(normalizeTabName(newHashTab));
    }
  });

  console.log('[Tabs] Initialized with backward compatibility mapping');
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTabs);
} else {
  initTabs();
}

// Export to global scope
window.loadTab = loadTab;
window.initTabs = initTabs;
window.normalizeTabName = normalizeTabName;
