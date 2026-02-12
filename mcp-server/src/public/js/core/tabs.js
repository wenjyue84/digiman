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
      throw new Error(`Template ${templateName} not found`);
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
 * Initialize tabs on page load
 */
function initTabs() {
  // Add click handlers to all tab buttons
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = btn.dataset.tab;
      loadTab(tabName);

      // Update URL hash
      window.location.hash = tabName;
    });
  });

  // Load tab from URL hash or default to 'status'
  const hash = window.location.hash.slice(1);
  const initialTab = hash || 'status';
  loadTab(initialTab);

  // Listen for hash changes to support direct URL navigation
  window.addEventListener('hashchange', () => {
    const newHash = window.location.hash.slice(1);
    if (newHash) {
      loadTab(newHash);
    }
  });

  console.log('[Tabs] Initialized');
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
