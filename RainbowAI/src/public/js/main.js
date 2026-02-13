/**
 * Main Orchestrator (Minimal)
 *
 * Most functions are provided by legacy-functions.js (global scope).
 * This module only imports from the 3 self-contained module files
 * (testing, real-chat, kb-editor) that were extracted before the main refactoring.
 *
 * api() and toast() are global from legacy-functions.js via esc/api/toast definitions.
 */

import { runTests, runCoverage } from './modules/testing.js';
import { initHelp } from './modules/help.js';

// Expose testing functions (not in legacy-functions.js)
window.runTests = runTests;
window.runCoverage = runCoverage;
// Help tab: User vs Developer panels
window.loadHelp = initHelp;

// real-chat.js exposes its own window.* exports via the IIFE pattern
// kb-editor.js exposes its own window.* exports directly

console.log('[Main] Module orchestrator loaded');
