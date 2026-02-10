#!/usr/bin/env node
/**
 * NVIDIA Kimi K2.5 API Key Tester
 * Tests if your NVIDIA API key is valid and working
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Load settings
const settingsPath = join(__dirname, 'src', 'assistant', 'data', 'settings.json');
const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

const API_KEY = process.env.NVIDIA_API_KEY;
const BASE_URL = settings.ai.nvidia_base_url;
const MODEL = settings.ai.nvidia_model;

console.log('═══════════════════════════════════════════════════════════');
console.log('   NVIDIA Kimi K2.5 API Key Tester');
console.log('═══════════════════════════════════════════════════════════\n');

// Step 1: Check if API key is set
console.log('Step 1: Checking API Key...');
if (!API_KEY) {
  console.error('❌ NVIDIA_API_KEY not found in .env file!');
  console.error('\n📝 Action Required:');
  console.error('   1. Visit: https://build.nvidia.com');
  console.error('   2. Search for "Kimi K2.5"');
  console.error('   3. Click "View Code" to get your API key');
  console.error('   4. Add it to mcp-server/.env:');
  console.error('      NVIDIA_API_KEY=nvapi-YOUR_KEY_HERE\n');
  process.exit(1);
}

console.log(`✅ API Key found: ${API_KEY.substring(0, 15)}...${API_KEY.substring(API_KEY.length - 5)}`);
console.log(`   Length: ${API_KEY.length} characters\n`);

// Step 2: Check configuration
console.log('Step 2: Checking Configuration...');
console.log(`   Base URL: ${BASE_URL}`);
console.log(`   Model:    ${MODEL}\n`);

// Step 3: Test API connectivity
console.log('Step 3: Testing NVIDIA API...');
console.log('   Sending test request (timeout: 30s)...');

const startTime = Date.now();

try {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: 'Hello! Please respond with just "OK"' }],
      max_tokens: 50,
      temperature: 0.1
    }),
    signal: controller.signal
  });

  clearTimeout(timeout);
  const elapsed = Date.now() - startTime;

  if (!response.ok) {
    const errorText = await response.text().catch(() => '(unable to read error)');
    console.error(`❌ API Error: HTTP ${response.status}`);
    console.error(`   Status: ${response.statusText}`);
    console.error(`   Response: ${errorText.slice(0, 300)}`);

    if (response.status === 401) {
      console.error('\n📝 Your API key is INVALID or EXPIRED!');
      console.error('   Action Required:');
      console.error('   1. Visit: https://build.nvidia.com');
      console.error('   2. Log in with your NVIDIA account');
      console.error('   3. Search for "Kimi K2.5" model');
      console.error('   4. Click "View Code" to get a fresh API key');
      console.error('   5. Replace the key in mcp-server/.env\n');
    } else if (response.status === 429) {
      console.error('\n⏳ Rate limit exceeded!');
      console.error('   Wait a few minutes and try again.\n');
    }

    process.exit(1);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content?.trim() || '(no reply)';

  console.log(`✅ SUCCESS! API responded in ${elapsed}ms`);
  console.log(`   Model: ${data.model || MODEL}`);
  console.log(`   Reply: "${reply}"`);
  console.log(`   Usage: ${JSON.stringify(data.usage || {})}\n`);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Your NVIDIA API key is WORKING!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n🎯 Next Steps:');
  console.log('   1. Open: http://localhost:3002/admin/rainbow');
  console.log('   2. Click the "Test" button for NVIDIA NIM');
  console.log('   3. It should now succeed!\n');

} catch (error) {
  const elapsed = Date.now() - startTime;

  if (error.name === 'AbortError') {
    console.error(`❌ TIMEOUT after ${elapsed}ms`);
    console.error('\n🔍 Possible causes:');
    console.error('   1. Invalid/expired API key → Get new key from https://build.nvidia.com');
    console.error('   2. NVIDIA API is down → Check https://status.nvidia.com');
    console.error('   3. Network/firewall blocking the request');
    console.error('   4. Slow internet connection\n');
    console.error('📝 Most likely: Your API key is expired or invalid.');
    console.error('   Get a fresh key from https://build.nvidia.com\n');
  } else {
    console.error(`❌ Network Error: ${error.message}`);
    console.error('\n🔍 Check your internet connection and firewall settings.\n');
  }

  process.exit(1);
}
