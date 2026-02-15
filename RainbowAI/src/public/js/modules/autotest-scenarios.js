/**
 * @fileoverview Autotest scenario definitions — combined entry point
 * @module autotest-scenarios
 */

import { SINGLE_TURN_SCENARIOS } from './autotest-scenarios-single.js';
import { WORKFLOW_SCENARIOS } from './autotest-scenarios-workflow.js';

// Auto-generated comprehensive test scenarios organized by guest journey phases
// Total: 58 scenarios covering all intents with professional hospitality terminology
// Split into single-turn (categories 1-8) and workflow (categories 9-11) modules

export const AUTOTEST_SCENARIOS = [
  ...SINGLE_TURN_SCENARIOS,
  ...WORKFLOW_SCENARIOS
];
