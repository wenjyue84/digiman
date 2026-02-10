#!/usr/bin/env node

/**
 * Add OpenRouter free models to Rainbow AI settings
 * Run: node add-openrouter-providers.js
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const settingsPath = join(__dirname, 'src', 'assistant', 'data', 'settings.json');

// Popular free OpenRouter models (as of 2026)
const freeModels = [
  {
    id: 'openrouter-qwen-32b',
    name: 'Qwen 2.5 32B (Free)',
    description: 'Alibaba\'s Qwen 2.5 32B - Strong reasoning, multilingual support, free tier',
    type: 'openai-compatible',
    api_key_env: 'OPENROUTER_API_KEY',
    base_url: 'https://openrouter.ai/api/v1',
    model: 'qwen/qwen-2.5-32b-instruct',
    enabled: true
  },
  {
    id: 'openrouter-gemma-9b',
    name: 'Google Gemma 2 9B (Free)',
    description: 'Google\'s Gemma 2 9B IT - Efficient, instruction-tuned, free tier',
    type: 'openai-compatible',
    api_key_env: 'OPENROUTER_API_KEY',
    base_url: 'https://openrouter.ai/api/v1',
    model: 'google/gemma-2-9b-it:free',
    enabled: true
  },
  {
    id: 'openrouter-llama-8b',
    name: 'Meta Llama 3.1 8B (Free)',
    description: 'Meta\'s Llama 3.1 8B - Fast, capable, free tier',
    type: 'openai-compatible',
    api_key_env: 'OPENROUTER_API_KEY',
    base_url: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.1-8b-instruct:free',
    enabled: true
  },
  {
    id: 'openrouter-mistral-7b',
    name: 'Mistral 7B (Free)',
    description: 'Mistral AI\'s 7B model - Efficient, high quality, free tier',
    type: 'openai-compatible',
    api_key_env: 'OPENROUTER_API_KEY',
    base_url: 'https://openrouter.ai/api/v1',
    model: 'mistralai/mistral-7b-instruct:free',
    enabled: true
  },
  {
    id: 'openrouter-phi-3',
    name: 'Microsoft Phi-3 Medium (Free)',
    description: 'Microsoft Phi-3 Medium - Compact but powerful, free tier',
    type: 'openai-compatible',
    api_key_env: 'OPENROUTER_API_KEY',
    base_url: 'https://openrouter.ai/api/v1',
    model: 'microsoft/phi-3-medium-128k-instruct:free',
    enabled: true
  }
];

// Load existing settings
let settings;
if (existsSync(settingsPath)) {
  settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
} else {
  console.error('❌ Settings file not found. Please start the server first to initialize settings.');
  process.exit(1);
}

// Get existing providers
const existingProviders = settings.ai?.providers || [];
const existingIds = new Set(existingProviders.map(p => p.id));

// Filter out models that already exist
const newModels = freeModels.filter(m => !existingIds.has(m.id));

if (newModels.length === 0) {
  console.log('✅ All OpenRouter models already added!');
  process.exit(0);
}

// Get next priority number
const maxPriority = Math.max(...existingProviders.map(p => p.priority || 0), -1);

// Add priority to new models
const providersToAdd = newModels.map((m, i) => ({
  ...m,
  priority: maxPriority + 1 + i
}));

// Update settings
settings.ai.providers = [...existingProviders, ...providersToAdd];

// Save back
writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');

console.log(`✅ Added ${providersToAdd.length} OpenRouter free models:`);
providersToAdd.forEach(p => console.log(`   - ${p.name} (${p.model})`));
console.log('\n🔄 Restart the MCP server or refresh the settings page to see changes.');
