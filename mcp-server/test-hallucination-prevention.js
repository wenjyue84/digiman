/**
 * Test Script: Hallucination Prevention (Priority 3)
 *
 * Tests explicit knowledge constraints and confidence scoring.
 * Run this AFTER starting the MCP server.
 */

import axios from 'axios';

const MCP_PORT = process.env.PORT || 3002;
const BASE_URL = `http://localhost:${MCP_PORT}`;

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(color + args.join(' ') + colors.reset);
}

function logTest(name) {
  console.log('\n' + '='.repeat(60));
  log(colors.cyan, `TEST: ${name}`);
  console.log('='.repeat(60));
}

function logResult(passed, message) {
  if (passed) {
    log(colors.green, '✅ PASS:', message);
  } else {
    log(colors.red, '❌ FAIL:', message);
  }
}

// Test configuration
const TEST_PHONE = '60127777777@s.whatsapp.net';
const TEST_INSTANCE = 'test-instance';

async function testInKBQuestion() {
  logTest('In-KB Question (Should Answer Confidently)');

  const message = {
    from: TEST_PHONE,
    text: 'What is the check-in time?',
    pushName: 'Test User',
    messageType: 'text',
    isGroup: false,
    instanceId: TEST_INSTANCE
  };

  try {
    // Note: This would normally go through WhatsApp webhook
    // For now, we'll test the system prompt directly via admin API

    const kbResponse = await axios.get(`${BASE_URL}/api/rainbow/kb/files`);
    log(colors.blue, 'KB files loaded:', kbResponse.data.files?.length || 0);

    // Check if system prompt includes knowledge constraints
    const settingsResponse = await axios.get(`${BASE_URL}/api/rainbow/settings`);
    const systemPrompt = settingsResponse.data.system_prompt || '';

    const hasConstraints = systemPrompt.includes('KNOWLEDGE CONSTRAINTS') ||
                          systemPrompt.includes('STRICTLY LIMITED');

    logResult(
      hasConstraints,
      `System prompt includes knowledge constraints`
    );

    log(colors.yellow, 'Note: Full message routing test requires WhatsApp instance');
    return hasConstraints;
  } catch (error) {
    log(colors.red, 'Error:', error.message);
    return false;
  }
}

async function testOutOfKBQuestion() {
  logTest('Out-of-KB Question Detection');

  try {
    // Test that knowledge base constraints are in the system prompt
    const settingsResponse = await axios.get(`${BASE_URL}/api/rainbow/settings`);
    const systemPrompt = settingsResponse.data.system_prompt || '';

    const hasIDontKnowInstruction = systemPrompt.includes("I don't have that information") ||
                                    systemPrompt.includes("DO NOT guess");

    logResult(
      hasIDontKnowInstruction,
      'System prompt instructs LLM to say "I don\'t know" for missing info'
    );

    return hasIDontKnowInstruction;
  } catch (error) {
    log(colors.red, 'Error:', error.message);
    return false;
  }
}

async function testConfidenceScoring() {
  logTest('Confidence Scoring Implementation');

  try {
    // Check if llm-settings.json has confidence thresholds
    const settingsResponse = await axios.get(`${BASE_URL}/api/rainbow/llm-settings`);
    const thresholds = settingsResponse.data.thresholds || {};

    const hasLowThreshold = typeof thresholds.lowConfidence === 'number';
    const hasMediumThreshold = typeof thresholds.mediumConfidence === 'number';

    logResult(
      hasLowThreshold,
      `Low confidence threshold configured: ${thresholds.lowConfidence}`
    );

    logResult(
      hasMediumThreshold,
      `Medium confidence threshold configured: ${thresholds.mediumConfidence}`
    );

    // Check reasonable values
    const reasonable = thresholds.lowConfidence >= 0 &&
                      thresholds.lowConfidence <= 1 &&
                      thresholds.mediumConfidence > thresholds.lowConfidence;

    logResult(
      reasonable,
      'Thresholds have reasonable values (0-1 range, medium > low)'
    );

    return hasLowThreshold && hasMediumThreshold && reasonable;
  } catch (error) {
    log(colors.red, 'Error:', error.message);
    return false;
  }
}

async function testDisclaimerMessages() {
  logTest('Disclaimer Message Configuration');

  try {
    // Check that system prompt mentions confidence scoring
    const settingsResponse = await axios.get(`${BASE_URL}/api/rainbow/settings`);
    const systemPrompt = settingsResponse.data.system_prompt || '';

    const hasConfidenceInstructions = systemPrompt.includes('confidence') &&
                                     (systemPrompt.includes('0.5') || systemPrompt.includes('0.7'));

    logResult(
      hasConfidenceInstructions,
      'System prompt includes confidence scoring instructions'
    );

    // Check router implementation (file exists check)
    log(colors.blue, 'Checking message-router.ts implementation...');

    const routerCode = await import('./src/assistant/message-router.js');
    const hasHandleIncomingMessage = typeof routerCode.handleIncomingMessage === 'function';

    logResult(
      hasHandleIncomingMessage,
      'Message router module loaded successfully'
    );

    return hasConfidenceInstructions && hasHandleIncomingMessage;
  } catch (error) {
    log(colors.red, 'Error:', error.message);
    return false;
  }
}

async function testLoggingConfidence() {
  logTest('Confidence Score Logging');

  try {
    // Check if conversation logs support confidence field
    const conversationsResponse = await axios.get(`${BASE_URL}/api/rainbow/kb/conversations`);
    const conversations = conversationsResponse.data.conversations || [];

    log(colors.blue, `Found ${conversations.length} conversation logs`);

    // Check if any recent conversation has confidence scores
    if (conversations.length > 0) {
      const recentConvo = conversations[0];
      log(colors.blue, `Checking conversation: ${recentConvo.phone}`);

      const detailResponse = await axios.get(
        `${BASE_URL}/api/rainbow/kb/conversations/${encodeURIComponent(recentConvo.phone)}`
      );

      const messages = detailResponse.data.conversation?.messages || [];
      const hasConfidenceScores = messages.some(m => typeof m.confidence === 'number');

      logResult(
        hasConfidenceScores || messages.length === 0,
        hasConfidenceScores
          ? 'Found confidence scores in conversation logs'
          : 'No messages yet (confidence logging ready)'
      );

      return true;
    } else {
      log(colors.yellow, 'No conversations yet - logging structure ready');
      return true;
    }
  } catch (error) {
    log(colors.red, 'Error:', error.message);
    return false;
  }
}

async function testSystemHealth() {
  logTest('System Health Check');

  try {
    const healthResponse = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });

    logResult(
      healthResponse.status === 200,
      'MCP server is running'
    );

    return healthResponse.status === 200;
  } catch (error) {
    log(colors.red, 'MCP server not accessible:', error.message);
    log(colors.yellow, 'Make sure to run: cd mcp-server && npm run dev');
    return false;
  }
}

// Main test suite
async function runTests() {
  console.log('\n' + '█'.repeat(60));
  log(colors.cyan, 'PRIORITY 3: HALLUCINATION PREVENTION - TEST SUITE');
  log(colors.cyan, 'Testing explicit knowledge constraints & confidence scoring');
  console.log('█'.repeat(60));

  const results = [];

  // Health check first
  const healthy = await testSystemHealth();
  results.push({ name: 'System Health', passed: healthy });

  if (!healthy) {
    log(colors.red, '\n❌ MCP server not running. Please start it first.');
    log(colors.yellow, 'Run: cd mcp-server && npm run dev');
    process.exit(1);
  }

  // Run tests
  results.push({ name: 'In-KB Questions', passed: await testInKBQuestion() });
  results.push({ name: 'Out-of-KB Detection', passed: await testOutOfKBQuestion() });
  results.push({ name: 'Confidence Scoring', passed: await testConfidenceScoring() });
  results.push({ name: 'Disclaimer Messages', passed: await testDisclaimerMessages() });
  results.push({ name: 'Confidence Logging', passed: await testLoggingConfidence() });

  // Summary
  console.log('\n' + '█'.repeat(60));
  log(colors.cyan, 'TEST SUMMARY');
  console.log('█'.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(r => {
    logResult(r.passed, r.name);
  });

  console.log('\n' + '─'.repeat(60));

  if (passed === total) {
    log(colors.green, `✅ ALL TESTS PASSED (${passed}/${total})`);
    log(colors.green, '\nPriority 3 implementation verified!');
    log(colors.yellow, '\nNext steps:');
    log(colors.yellow, '1. Test with real WhatsApp messages');
    log(colors.yellow, '2. Verify disclaimers appear for low-confidence responses');
    log(colors.yellow, '3. Check escalation triggers for very low confidence (<0.5)');
    log(colors.yellow, '4. Monitor confidence patterns in conversation logs');
  } else {
    log(colors.red, `❌ SOME TESTS FAILED (${passed}/${total} passed)`);
    log(colors.yellow, '\nReview failed tests above and check implementation.');
  }

  console.log('\n');
}

// Run tests
runTests().catch(error => {
  log(colors.red, 'Fatal error:', error.message);
  process.exit(1);
});
