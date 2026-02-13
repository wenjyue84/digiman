/**
 * Help & Documentation Module
 * Handles help tab: User guide vs Developer guide toggle and hash/session sync
 */

const HELP_STORAGE_KEY = 'rainbow-help-audience';

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
 * Initialize help tab: restore User vs Developer from hash or sessionStorage
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
