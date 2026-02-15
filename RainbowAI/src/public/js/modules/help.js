/**
 * Help & Documentation Module
 * Handles help tab: User guide vs Developer guide toggle, hash/session sync,
 * and lazy-loading of partial HTML content for each guide panel.
 *
 * Note: The help.html template contains a <script> that was originally intended
 * to fetch the partials, but innerHTML does not execute <script> tags.
 * All fetching logic lives here instead.
 */

const HELP_STORAGE_KEY = 'rainbow-help-audience';

// Track whether each partial has been fetched
let userGuideLoaded = false;
let devGuideLoaded = false;

/**
 * Fetch and inject a help partial into its panel
 * @param {'user'|'developer'} which
 */
function loadHelpPartial(which) {
  const panelId = which === 'developer' ? 'help-developer-panel' : 'help-user-panel';
  const endpoint = which === 'developer' ? 'help-developer-guide' : 'help-user-guide';
  const panel = document.getElementById(panelId);
  if (!panel) return;

  // Skip if already loaded
  if (which === 'user' && userGuideLoaded) return;
  if (which === 'developer' && devGuideLoaded) return;

  fetch('/api/rainbow/templates/' + endpoint)
    .then(function (r) { return r.ok ? r.text() : Promise.reject('HTTP ' + r.status); })
    .then(function (html) {
      panel.innerHTML = html;
      if (which === 'user') userGuideLoaded = true;
      if (which === 'developer') devGuideLoaded = true;
      console.log('[Help] Loaded partial: ' + endpoint);

      // Re-bind quick-nav links inside the newly injected content
      panel.querySelectorAll('.help-nav-link[data-scroll-to]').forEach(function (link) {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          var id = link.getAttribute('data-scroll-to');
          var el = document.getElementById(id);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    })
    .catch(function () {
      panel.innerHTML = '<div class="text-center py-8 text-danger-500">Failed to load ' +
        which + ' guide. Please refresh.</div>';
    });
}

/**
 * Switch between User and Developer help panels; update URL hash and storage
 * @param {'user'|'developer'} audience
 */
function switchHelpAudience(audience) {
  const userPanel = document.getElementById('help-user-panel');
  const devPanel = document.getElementById('help-developer-panel');
  const userBtn = document.getElementById('help-audience-user');
  const devBtn = document.getElementById('help-audience-developer');
  if (!userPanel || !devPanel || !userBtn || !devBtn) return;

  if (audience === 'developer') {
    userPanel.classList.add('hidden');
    devPanel.classList.remove('hidden');
    userBtn.classList.remove('active');
    devBtn.classList.add('active');
    window.location.hash = 'help?audience=developer';
    // Lazy-load developer guide on first switch
    loadHelpPartial('developer');
  } else {
    userPanel.classList.remove('hidden');
    devPanel.classList.add('hidden');
    userBtn.classList.add('active');
    devBtn.classList.remove('active');
    window.location.hash = 'help';
  }
  try {
    sessionStorage.setItem(HELP_STORAGE_KEY, audience);
  } catch (_) {}
}

/**
 * Initialize help tab: fetch user guide, restore audience from hash/session,
 * and set up lazy-loading for developer guide.
 */
export function initHelp() {
  const userPanel = document.getElementById('help-user-panel');
  const devPanel = document.getElementById('help-developer-panel');
  const userBtn = document.getElementById('help-audience-user');
  const devBtn = document.getElementById('help-audience-developer');
  if (!userPanel || !devPanel || !userBtn || !devBtn) {
    console.log('[Help] Help tab loaded (panels not found)');
    return;
  }

  const hash = (window.location.hash || '').slice(1);
  const fromHash = hash.includes('audience=developer') ? 'developer' : null;
  let audience = fromHash;
  if (audience == null) {
    try {
      audience = sessionStorage.getItem(HELP_STORAGE_KEY) || 'user';
    } catch (_) {
      audience = 'user';
    }
  }

  if (audience === 'developer') {
    userPanel.classList.add('hidden');
    devPanel.classList.remove('hidden');
    userBtn.classList.remove('active');
    devBtn.classList.add('active');
  } else {
    userPanel.classList.remove('hidden');
    devPanel.classList.add('hidden');
    userBtn.classList.add('active');
    devBtn.classList.remove('active');
  }

  window.switchHelpAudience = switchHelpAudience;

  // Fetch user guide immediately (always needed)
  loadHelpPartial('user');

  // If audience is already developer, also fetch that partial now
  if (audience === 'developer') {
    loadHelpPartial('developer');
  }

  // Quick Navigation: scroll to section without changing hash (avoids tab system intercepting)
  document.querySelectorAll('.help-nav-link[data-scroll-to]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = link.getAttribute('data-scroll-to');
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  console.log('[Help] Help tab loaded, audience:', audience);
}
