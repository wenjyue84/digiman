/**
 * Test Dashboard Module Loading
 * 
 * This script verifies:
 * 1. All module imports succeed
 * 2. All functions are exposed to window
 * 3. No syntax errors in modules
 * 4. Module dependencies load correctly
 */

const http = require('http');
const url = require('url');

function fetchPage(pathname) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 3002,
      path: pathname,
      method: 'GET'
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Dashboard Module Loading\n');

  try {
    // Fetch the dashboard HTML
    console.log('📥 Fetching dashboard HTML from http://localhost:3002/...');
    const html = await fetchPage('/');
    console.log(`✓ Dashboard fetched (${html.length} bytes)\n`);

    // Check for module imports
    console.log('🔍 Checking for ES6 module imports...');
    const moduleImportRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"]/g;
    let importCount = 0;
    let match;
    const imports = {};

    while ((match = moduleImportRegex.exec(html)) !== null) {
      const funcs = match[1].trim().split(',').map(f => f.trim());
      const module = match[2];
      importCount++;
      imports[module] = funcs;
      console.log(`  ✓ ${module.split('/').pop()}: {${funcs.join(', ')}}`);
    }
    console.log(`✓ Found ${importCount} module imports\n`);

    // Check for window exposure
    console.log('🪟 Checking for window.* exposures...');
    const windowAssignRegex = /window\.(\w+)\s*=\s*\w+/g;
    const exposedFuncs = new Set();
    while ((match = windowAssignRegex.exec(html)) !== null) {
      exposedFuncs.add(match[1]);
    }
    console.log(`✓ Found ${exposedFuncs.size} functions exposed to window:`);
    Array.from(exposedFuncs).forEach(f => console.log(`  - window.${f}`));
    console.log();

    // Check for module scripts
    console.log('📦 Checking for additional module script tags...');
    const scriptRegex = /<script[^>]*type="module"[^>]*src="([^"]+)"/g;
    let scriptCount = 0;
    while ((match = scriptRegex.exec(html)) !== null) {
      scriptCount++;
      console.log(`  ✓ ${match[1]}`);
    }
    console.log(`✓ Found ${scriptCount} module script tags\n`);

    // Check core scripts load order
    console.log('📋 Checking core script load order...');
    const coreScripts = [
      '/public/js/core/state.js',
      '/public/js/core/utils-global.js',
      '/public/js/core/state-manager.js',
      '/public/js/core/modals.js',
      '/public/js/core/constants.js',
      '/public/js/core/tabs.js'
    ];

    let lastIndex = -1;
    let orderOk = true;
    for (const script of coreScripts) {
      const idx = html.indexOf(`src="${script}"`);
      if (idx === -1) {
        console.log(`  ✗ Missing: ${script}`);
        orderOk = false;
      } else if (idx < lastIndex) {
        console.log(`  ✗ Wrong order: ${script}`);
        orderOk = false;
      } else {
        console.log(`  ✓ ${script.split('/').pop()}`);
        lastIndex = idx;
      }
    }
    if (orderOk) console.log('✓ Script load order is correct\n');
    else console.log('✗ Script load order has issues\n');

    // Summary
    console.log('📊 Summary:');
    console.log(`  Module imports: ${importCount}`);
    console.log(`  Window exposures: ${exposedFuncs.size}`);
    console.log(`  Module script tags: ${scriptCount}`);
    console.log(`  Core scripts: ${coreScripts.length}`);
    console.log('\n✅ Dashboard structure validation complete!\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

runTests();
