/**
 * api-helpers.js — Standardized API request patterns for the Rainbow dashboard
 *
 * Provides reusable helpers for:
 * - Parallel config fetching (multiple api() calls via Promise.all)
 * - Standardized error message formatting
 * - Generic table rendering from data arrays
 *
 * Depends on: window.api (from core/utils.js), window.cacheManager (from cache-manager.js)
 *
 * Usage:
 *   const data = await apiHelpers.loadMultipleConfigs(['intents', 'routing', 'knowledge']);
 *   // => { intents: {...}, routing: {...}, knowledge: {...} }
 *
 *   const data = await apiHelpers.loadMultipleConfigs({
 *     intents: '/intents',
 *     routing: '/routing',
 *     myCustomKey: '/some/custom/path'
 *   });
 *   // => { intents: {...}, routing: {...}, myCustomKey: {...} }
 *
 *   apiHelpers.renderTableFromData('container-id', dataArray, [
 *     { key: 'name', label: 'Name' },
 *     { key: 'status', label: 'Status', render: (val, row) => val ? 'Active' : 'Off' }
 *   ], { emptyMessage: 'No items found', rowClass: 'border-b hover:bg-neutral-50' });
 */
const apiHelpers = {

  /**
   * Fetch multiple configs in parallel using the existing api() function.
   *
   * Accepts either:
   *   - An array of endpoint names (assumes path = '/' + name):
   *     ['intents', 'routing', 'knowledge']
   *     => fetches /intents, /routing, /knowledge
   *     => returns { intents: data, routing: data, knowledge: data }
   *
   *   - An object mapping custom keys to paths:
   *     { intentsData: '/intents', routingData: '/routing', wfConfig: '/workflow' }
   *     => fetches each path
   *     => returns { intentsData: data, routingData: data, wfConfig: data }
   *
   * @param {string[]|Object<string,string>} configNames - Array of endpoint names or { key: path } map
   * @param {Object} [options] - Optional settings
   * @param {boolean} [options.settled=false] - If true, uses Promise.allSettled (returns partial data on failure)
   * @param {Object<string,string>} [options.cacheKeys] - Map of configName to cacheManager key for auto-caching
   * @returns {Promise<Object>} - Map of { configName: data }
   */
  async loadMultipleConfigs(configNames, options = {}) {
    const { settled = false, cacheKeys = {} } = options;

    // Normalize to { key: path } map
    let keyPathMap;
    if (Array.isArray(configNames)) {
      keyPathMap = {};
      for (const name of configNames) {
        keyPathMap[name] = '/' + name;
      }
    } else {
      keyPathMap = configNames;
    }

    const keys = Object.keys(keyPathMap);
    const paths = keys.map(k => keyPathMap[k]);

    // Execute all fetches in parallel
    let results;
    if (settled) {
      results = await Promise.allSettled(paths.map(p => window.api(p)));
    } else {
      const rawResults = await Promise.all(paths.map(p => window.api(p)));
      results = rawResults.map(v => ({ status: 'fulfilled', value: v }));
    }

    // Build result object
    const output = {};
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const result = results[i];
      if (result.status === 'fulfilled') {
        output[key] = result.value;
        // Auto-cache if cacheKey provided
        if (cacheKeys[key] && window.cacheManager) {
          window.cacheManager.set(cacheKeys[key], result.value);
        }
      } else {
        output[key] = null;
      }
    }

    return output;
  },

  /**
   * Standardized error message formatting for API errors.
   *
   * Extracts a user-friendly message from various error types:
   * - Error objects with .message
   * - HTTP error strings
   * - Network errors
   * - Unknown error types
   *
   * @param {Error|string|*} error - The error to format
   * @returns {string} A user-friendly error message
   */
  formatApiError(error) {
    if (!error) return 'An unknown error occurred';

    // Already a string
    if (typeof error === 'string') return error;

    // Error object with message
    if (error.message) {
      const msg = error.message;

      // Timeout errors
      if (msg.includes('timeout') || msg.includes('AbortError')) {
        return 'Request timed out. The server may be busy — please try again.';
      }

      // Network errors
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        return 'Network error. Check your connection and ensure all servers are running (start-all.bat).';
      }

      // HTTP status errors
      const httpMatch = msg.match(/HTTP (\d+)/);
      if (httpMatch) {
        const code = parseInt(httpMatch[1]);
        if (code === 404) return 'Resource not found (404). The endpoint may have been removed or renamed.';
        if (code === 413) return 'Payload too large (413). Try sending less data.';
        if (code === 429) return 'Rate limited (429). Please wait a moment and try again.';
        if (code >= 500) return 'Server error (' + code + '). Check server logs for details.';
      }

      return msg;
    }

    // Fallback
    return String(error);
  },

  /**
   * Render a generic HTML table from a data array into a container element.
   *
   * Columns can provide a custom render function for flexible cell content.
   *
   * @param {string} containerId - ID of the container element to render into
   * @param {Array<Object>} data - Array of data objects to render as rows
   * @param {Array<Object>} columns - Column definitions:
   *   - key {string} - Property name in data objects
   *   - label {string} - Column header text
   *   - render {Function} [optional] - (value, rowData, rowIndex) => HTML string
   *   - className {string} [optional] - Extra CSS classes for td cells
   *   - headerClass {string} [optional] - Extra CSS classes for th header
   * @param {Object} [options] - Render options
   * @param {string} [options.emptyMessage='No data available'] - Message when data is empty
   * @param {string} [options.rowClass='border-b hover:bg-neutral-50'] - CSS class for tr rows
   * @param {string} [options.headerClass=''] - CSS class for the thead tr
   * @param {boolean} [options.showHeader=true] - Whether to show column headers
   * @param {Function} [options.rowAttrs] - (rowData, rowIndex) => string of extra attributes for tr
   */
  renderTableFromData(containerId, data, columns, options = {}) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const {
      emptyMessage = 'No data available',
      rowClass = 'border-b hover:bg-neutral-50',
      headerClass = 'bg-neutral-50 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider',
      showHeader = true,
      rowAttrs = null
    } = options;

    const esc = window.escapeHtml || function(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

    if (!data || data.length === 0) {
      el.innerHTML = '<tr><td colspan="' + columns.length + '" class="text-neutral-400 py-4 text-center text-sm">' + esc(emptyMessage) + '</td></tr>';
      return;
    }

    const rows = [];

    // Header row
    if (showHeader) {
      rows.push('<tr class="' + headerClass + '">');
      for (const col of columns) {
        rows.push('<th class="py-2 px-3 ' + (col.headerClass || '') + '">' + esc(col.label) + '</th>');
      }
      rows.push('</tr>');
    }

    // Data rows
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const extraAttrs = rowAttrs ? ' ' + rowAttrs(row, i) : '';
      rows.push('<tr class="' + rowClass + '"' + extraAttrs + '>');
      for (const col of columns) {
        const value = row[col.key];
        const cellContent = col.render
          ? col.render(value, row, i)
          : esc(value != null ? String(value) : '');
        rows.push('<td class="py-2 px-3 ' + (col.className || '') + '">' + cellContent + '</td>');
      }
      rows.push('</tr>');
    }

    el.innerHTML = rows.join('');
  }
};

// Make available globally (same pattern as window.cacheManager)
window.apiHelpers = apiHelpers;
