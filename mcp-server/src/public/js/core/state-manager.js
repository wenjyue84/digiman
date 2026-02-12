// ═══════════════════════════════════════════════════════════════════
// State Manager - Centralized state management with localStorage sync
// ═══════════════════════════════════════════════════════════════════

const StateManager = (function() {
  // Initialize global state object
  if (!window.RainbowState) {
    window.RainbowState = {
      realChat: {
        devMode: localStorage.getItem('rc-dev-mode') === 'true',
        translateMode: localStorage.getItem('rc-translate-mode') === 'true',
        translateLang: localStorage.getItem('rc-translate-lang') || 'ms',
        activePhone: null,
        conversations: [],
        instances: {},
        autoRefresh: null,
        pendingTranslation: null
      }
    };
  }

  // Keys that should persist to localStorage
  const PERSISTED_KEYS = [
    'realChat.devMode',
    'realChat.translateMode',
    'realChat.translateLang'
  ];

  // Watchers for state changes
  const watchers = {};

  /**
   * Get a value from state using dot notation
   * @param {string} path - Dot-separated path (e.g., 'realChat.devMode')
   * @returns {any} State value
   */
  function get(path) {
    const parts = path.split('.');
    let current = window.RainbowState;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current;
  }

  /**
   * Set a value in state using dot notation
   * @param {string} path - Dot-separated path
   * @param {any} value - Value to set
   * @param {object} opts - Options {persist: boolean}
   */
  function set(path, value, opts = {}) {
    const parts = path.split('.');
    const lastKey = parts.pop();
    let current = window.RainbowState;

    // Navigate to the parent object
    for (const part of parts) {
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    // Set the value
    const oldValue = current[lastKey];
    current[lastKey] = value;

    // Persist to localStorage if needed
    if (opts.persist || PERSISTED_KEYS.includes(path)) {
      const storageKey = path.replace(/\./g, '-');
      if (typeof value === 'boolean') {
        localStorage.setItem(storageKey, value.toString());
      } else {
        localStorage.setItem(storageKey, JSON.stringify(value));
      }
    }

    // Notify watchers
    if (watchers[path]) {
      watchers[path].forEach(callback => {
        try {
          callback(value, oldValue);
        } catch (err) {
          console.error(`StateManager watcher error for ${path}:`, err);
        }
      });
    }
  }

  /**
   * Watch for changes to a state path
   * @param {string} path - Dot-separated path to watch
   * @param {function} callback - Called with (newValue, oldValue)
   * @returns {function} Unwatch function
   */
  function watch(path, callback) {
    if (!watchers[path]) {
      watchers[path] = [];
    }
    watchers[path].push(callback);

    // Return unwatch function
    return function unwatch() {
      const index = watchers[path].indexOf(callback);
      if (index > -1) {
        watchers[path].splice(index, 1);
      }
    };
  }

  /**
   * Batch multiple state updates (prevents multiple localStorage writes)
   * @param {function} fn - Function that performs multiple set() calls
   */
  function batch(fn) {
    // Simple implementation - just call the function
    // Could be enhanced with batching logic if needed
    fn();
  }

  /**
   * Migrate legacy localStorage keys to new StateManager format
   */
  function migrateLegacyStorage() {
    const migrations = {
      'rc-dev-mode': (val) => set('realChat.devMode', val === 'true'),
      'rc-translate-mode': (val) => set('realChat.translateMode', val === 'true'),
      'rc-translate-lang': (val) => set('realChat.translateLang', val || 'ms')
    };

    Object.entries(migrations).forEach(([key, migrator]) => {
      const value = localStorage.getItem(key);
      if (value !== null) {
        migrator(value);
      }
    });
  }

  // Run migration on load
  migrateLegacyStorage();

  // Public API
  return {
    get,
    set,
    watch,
    batch
  };
})();
