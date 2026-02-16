/**
 * Centralized cache manager for dashboard modules.
 * Replaces per-module cache variables with a namespaced cache.
 *
 * Usage:
 *   cacheManager.set('intents.routing', data);
 *   const routing = cacheManager.get('intents.routing');
 *   cacheManager.clear('intents.routing');  // clear one key
 *   cacheManager.clearAll();                // clear everything
 *
 * Convention: use dot-separated namespace keys, e.g.
 *   'intents.routing', 'intents.knowledge', 'workflows.list',
 *   'settings.config', 'settings.adminNotifs'
 */
const cacheManager = {
  _cache: {},

  /**
   * Get a cached value by key.
   * @param {string} key - Namespaced cache key
   * @returns {*} The cached value, or null if not set
   */
  get(key) {
    return this._cache[key] || null;
  },

  /**
   * Set a cached value.
   * @param {string} key - Namespaced cache key
   * @param {*} value - Value to cache
   * @returns {*} The value that was set (for chaining)
   */
  set(key, value) {
    this._cache[key] = value;
    return value;
  },

  /**
   * Check whether a key exists in the cache.
   * @param {string} key - Namespaced cache key
   * @returns {boolean}
   */
  has(key) {
    return key in this._cache;
  },

  /**
   * Clear a single key, or all keys in a namespace prefix.
   * @param {string} [key] - If provided, delete that key. If omitted, clears everything.
   */
  clear(key) {
    if (key) {
      delete this._cache[key];
    } else {
      this._cache = {};
    }
  },

  /**
   * Clear the entire cache. Alias for clear() with no arguments.
   */
  clearAll() {
    this._cache = {};
  },

  /**
   * Clear all keys that start with a given namespace prefix.
   * Example: clearNamespace('intents') removes 'intents.routing', 'intents.knowledge', etc.
   * @param {string} prefix - Namespace prefix (without trailing dot)
   */
  clearNamespace(prefix) {
    const dotPrefix = prefix + '.';
    Object.keys(this._cache).forEach(key => {
      if (key === prefix || key.startsWith(dotPrefix)) {
        delete this._cache[key];
      }
    });
  },

  /**
   * Get all keys currently in the cache (useful for debugging).
   * @returns {string[]}
   */
  keys() {
    return Object.keys(this._cache);
  }
};

// Make available globally for dashboard modules
window.cacheManager = cacheManager;
