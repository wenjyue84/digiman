// ═══════════════════════════════════════════════════════════════════
// Global State Variables
// ═══════════════════════════════════════════════════════════════════

const API = '/api/rainbow';

// Cached data
let cachedRouting = {};
let cachedKnowledge = { static: [], dynamic: {} };
let cachedWorkflows = { workflows: [] };
let cachedSettings = null;
let cachedIntentNames = [];
let currentWorkflowId = null;
