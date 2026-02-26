#!/usr/bin/env node
/**
 * Merge single-turn + workflow autotest scenarios into a single
 * browser-compatible data file (no ES module syntax).
 */

const fs = require('fs');
const path = require('path');

const singlePath = path.join(__dirname, '../src/public/js/modules/autotest-scenarios-single.js');
const workflowPath = path.join(__dirname, '../src/public/js/modules/autotest-scenarios-workflow.js');
const outputPath = path.join(__dirname, '../src/public/js/data/autotest-scenarios.js');

// Read source files
const singleContent = fs.readFileSync(singlePath, 'utf8');
const workflowContent = fs.readFileSync(workflowPath, 'utf8');

// Extract array bodies (everything between [ and ])
const singleMatch = singleContent.match(/export const SINGLE_TURN_SCENARIOS = \[([\s\S]*)\];/);
if (!singleMatch) {
  console.error('Failed to parse single-turn scenarios');
  process.exit(1);
}

const workflowMatch = workflowContent.match(/export const WORKFLOW_SCENARIOS = \[([\s\S]*)\];/);
if (!workflowMatch) {
  console.error('Failed to parse workflow scenarios');
  process.exit(1);
}

// Count scenarios
const singleCount = (singleMatch[1].match(/\bid:/g) || []).length;
const workflowCount = (workflowMatch[1].match(/\bid:/g) || []).length;
const totalCount = singleCount + workflowCount;

console.log(`Single-turn scenarios: ${singleCount}`);
console.log(`Workflow scenarios: ${workflowCount}`);
console.log(`Total: ${totalCount}`);

// Build combined file
const combined = `// Auto-generated comprehensive test scenarios organized by guest journey phases
// Total: ${totalCount} scenarios covering all intents with professional hospitality terminology
// Combined from: autotest-scenarios-single.js (${singleCount}) + autotest-scenarios-workflow.js (${workflowCount})
// Generated: ${new Date().toISOString().split('T')[0]}

const AUTOTEST_SCENARIOS = [
${singleMatch[1].trimEnd()},

  // ================================================================
  // =========== MULTI-TURN WORKFLOW SCENARIOS BELOW ================
  // ================================================================
${workflowMatch[1].trimEnd()}
];

// Export for use in CLI scripts (browser-compatible: no ES module syntax)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AUTOTEST_SCENARIOS;
}
`;

fs.writeFileSync(outputPath, combined, 'utf8');
console.log(`Written to ${outputPath}`);

// Verify the file is parseable by the same regex the CLI test uses
const verify = fs.readFileSync(outputPath, 'utf8');
const verifyMatch = verify.match(/const AUTOTEST_SCENARIOS = (\[[\s\S]*?\]);/);
if (!verifyMatch) {
  console.error('VERIFICATION FAILED: regex cannot parse the generated file');
  process.exit(1);
}

try {
  const arr = eval(verifyMatch[1]);
  console.log(`Verification: parsed ${arr.length} scenarios successfully`);
  if (arr.length !== totalCount) {
    console.error(`WARNING: Expected ${totalCount} but parsed ${arr.length}`);
  }
} catch (e) {
  console.error('VERIFICATION FAILED:', e.message);
  process.exit(1);
}
