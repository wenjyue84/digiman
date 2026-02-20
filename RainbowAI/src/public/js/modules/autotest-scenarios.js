/**
 * @fileoverview Autotest scenario definitions — combined entry point
 * @module autotest-scenarios
 */

import { SINGLE_TURN_SCENARIOS } from './autotest-scenarios-single.js';
import { WORKFLOW_SCENARIOS } from './autotest-scenarios-workflow.js';

// Auto-generated comprehensive test scenarios organized by guest journey phases
// Total count is dynamic — see window.AUTOTEST_SCENARIOS.length at runtime
// Split into single-turn and workflow modules

export const AUTOTEST_SCENARIOS = [
  ...SINGLE_TURN_SCENARIOS,
  ...WORKFLOW_SCENARIOS
];
