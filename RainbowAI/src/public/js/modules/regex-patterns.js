/**
 * Regex Patterns Module
 * Manages emergency regex patterns configuration
 */

import { toast, escapeHtml as esc } from '../core/utils.js';

// Module-level state
let imRegexPatterns = [];

// Language labels for UI
const REGEX_LANG_LABELS = { en: 'EN', ms: 'MS', zh: 'ZH' };

/**
 * Load regex patterns from API
 */
export async function loadRegexPatterns() {
  try {
    const res = await fetch('/api/rainbow/intent-manager/regex');
    imRegexPatterns = await res.json();
    renderRegexPatterns();
  } catch (err) {
    console.error('Failed to load regex patterns:', err);
    toast('Failed to load regex patterns', 'error');
  }
}

/**
 * Render regex patterns list grouped by language
 */
export function renderRegexPatterns() {
  const list = document.getElementById('im-regex-list');
  if (!imRegexPatterns || imRegexPatterns.length === 0) {
    list.innerHTML = '<div class="text-sm text-neutral-400 py-2">No regex patterns configured</div>';
    return;
  }

  const byLang = { en: [], ms: [], zh: [], _other: [] };
  imRegexPatterns.forEach((item, idx) => {
    const lang = item.language && (item.language === 'en' || item.language === 'ms' || item.language === 'zh') ? item.language : '_other';
    byLang[lang].push({ ...item, _idx: idx });
  });

  const sections = [
    { key: 'en', title: 'English' },
    { key: 'ms', title: 'Malay' },
    { key: 'zh', title: 'Chinese' },
    { key: '_other', title: 'Other' }
  ];

  list.innerHTML = sections.map(({ key, title }) => {
    const items = byLang[key];
    if (!items.length) return '';
    const rows = items.map(({ pattern, description, language, _idx }) => {
      const badge = key === '_other' ? '' : `<span class="text-xs font-medium px-1.5 py-0.5 rounded bg-primary-100 text-primary-700">${REGEX_LANG_LABELS[language] || language || '—'}</span>`;
      return `
        <div class="flex items-center gap-2 bg-danger-50 rounded-2xl p-2">
          ${badge}
          <code class="flex-1 text-xs font-mono text-danger-700 min-w-0">${esc(pattern)}</code>
          <span class="text-xs text-neutral-600 shrink-0">${esc(description || '')}</span>
          <button onclick="removeRegexPattern(${_idx})" class="text-danger-500 hover:text-danger-700 px-2 shrink-0" aria-label="Remove">×</button>
        </div>
      `;
    }).join('');
    return `<div class="space-y-2"><div class="text-xs font-semibold text-neutral-500">${esc(title)}</div><div class="space-y-1">${rows}</div></div>`;
  }).filter(Boolean).join('');
}

/**
 * Add a new regex pattern
 * Validates regex syntax before adding
 */
export function addRegexPattern() {
  const patternInput = document.getElementById('im-regex-pattern');
  const descInput = document.getElementById('im-regex-description');
  const langSelect = document.getElementById('im-regex-language');

  const pattern = patternInput.value.trim();
  const description = descInput.value.trim();
  const language = (langSelect && langSelect.value) ? langSelect.value : 'en';

  if (!pattern) {
    toast('Please enter a regex pattern', 'error');
    return;
  }

  // Validate regex syntax
  try {
    if (pattern.startsWith('/')) {
      const parts = pattern.match(/^\/(.+?)\/([gimuy]*)$/);
      if (!parts) throw new Error('Invalid regex format');
      new RegExp(parts[1], parts[2]);
    } else {
      new RegExp(pattern);
    }
  } catch (err) {
    toast('Invalid regex syntax: ' + err.message, 'error');
    return;
  }

  imRegexPatterns.push({ pattern, description, language });
  patternInput.value = '';
  descInput.value = '';
  renderRegexPatterns();
}

/**
 * Remove a regex pattern by index
 * @param {number} idx - Pattern index
 */
export function removeRegexPattern(idx) {
  imRegexPatterns.splice(idx, 1);
  renderRegexPatterns();
}

/**
 * Save regex patterns to API
 */
export async function saveRegexPatterns() {
  try {
    const res = await fetch('/api/rainbow/intent-manager/regex', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patterns: imRegexPatterns })
    });

    if (!res.ok) throw new Error('Failed to save');

    toast('Regex patterns saved! Restart server to apply.', 'success');
  } catch (err) {
    console.error('Failed to save regex patterns:', err);
    toast('Failed to save regex patterns', 'error');
  }
}
