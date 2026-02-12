/**
 * API base path
 */
const API = '/api/rainbow';

/**
 * Make an API request to the Rainbow backend
 * @param {string} path - API endpoint path (will be prefixed with /api/rainbow)
 * @param {object} opts - Fetch options
 * @returns {Promise<any>} Response data
 */
export async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
