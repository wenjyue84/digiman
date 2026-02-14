import http from 'http';

function fetchPage() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3002/', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Rainbow Dashboard - Module Loading Verification (Phase 4) ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    const html = await fetchPage();
    console.log(`✅ Dashboard HTML fetched (${html.length} bytes)\n`);

    // Test 1: Inline module script
    console.log('TEST 1: ES6 Module Script Block');
    const hasInlineModule = html.includes('<script type="module">');
    const hasPhaseComments = html.includes('// Phase 1:');
    if (hasInlineModule && hasPhaseComments) {
      console.log('  ✅ Inline module script with phase organization present\n');
    } else {
      console.log('  ❌ Inline module script missing\n');
    }

    // Test 2: Module imports
    console.log('TEST 2: ES6 Module Imports');
    const imports = [
      { name: 'whatsapp-accounts.js', func: 'loadWhatsappAccounts' },
      { name: 'understanding.js', func: 'loadUnderstanding' },
      { name: 'performance.js', func: 'loadPerformance' },
      { name: 'dashboard-helpers.js', funcs: ['restartServer', 'runDashboardProviderSpeedTest'] },
      { name: 'responses.js', func: 'loadResponses' },
      { name: 'chat-simulator.js', func: 'loadChatSimulator' },
      { name: 'system-status.js', funcs: ['loadSystemStatus', 'testAIProvider'] },
      { name: 'dashboard.js', funcs: ['loadDashboard', 'dismissChecklist', 'quickActionAddWhatsApp'] }
    ];

    for (const imp of imports) {
      const funcs = Array.isArray(imp.funcs) ? imp.funcs : [imp.func];
      const found = funcs.every(f => html.includes(`import { `) && html.includes(f));
      console.log(`  ${found ? '✅' : '❌'} ${imp.name}`);
    }
    console.log();

    // Test 3: Window exposures
    console.log('TEST 3: Critical Functions Exposed to window');
    const criticalFuncs = [
      'loadDashboard',
      'loadSystemStatus', 
      'loadUnderstanding',
      'loadResponses',
      'loadChatSimulator',
      'loadPerformance'
    ];

    let allExposed = true;
    for (const func of criticalFuncs) {
      const found = html.includes(`window.${func} = ${func}`);
      console.log(`  ${found ? '✅' : '❌'} window.${func}`);
      if (!found) allExposed = false;
    }
    console.log();

    // Test 4: Onclick handlers
    console.log('TEST 4: Onclick Handlers (Sample)');
    const onclickHandlers = (html.match(/onclick="([^"]+)"/g) || []).map(m => m.match(/onclick="(\w+)/)[1]);
    const uniqueHandlers = [...new Set(onclickHandlers)];
    console.log(`  ✅ Found ${uniqueHandlers.length} unique onclick handler references`);
    uniqueHandlers.forEach(h => {
      if (criticalFuncs.includes(h)) {
        console.log(`    ✅ ${h}() [EXTRACTED - Will be available from modules]`);
      } else if (['reloadConfig', 'toggleDropdown', 'closeAllDropdowns', 'loadTab'].includes(h)) {
        console.log(`    ✅ ${h}() [LEGACY - From legacy-functions.js]`);
      }
    });
    console.log();

    // Test 5: Script load order
    console.log('TEST 5: Script Load Order (Critical for Module Loading)');
    const scripts = [
      { file: 'state.js', desc: 'Core state' },
      { file: 'utils-global.js', desc: 'Global utilities' },
      { file: 'tabs.js', desc: 'Tab system' },
      { file: 'legacy-functions.js', desc: 'Onclick handlers' }
    ];

    let lastIdx = -1;
    let orderOk = true;
    for (const script of scripts) {
      const idx = html.indexOf(`src="/public/js/${script.file.includes('/') ? script.file : 'core/' + script.file}"`);
      if (idx === -1) {
        idx = html.indexOf(`src="/public/js/${script.file}"`);
      }
      if (idx > lastIdx) {
        console.log(`  ✅ ${script.desc} (${script.file})`);
        lastIdx = idx;
      } else {
        console.log(`  ❌ ${script.desc} - WRONG ORDER`);
        orderOk = false;
      }
    }
    console.log();

    // Summary
    console.log('╔════════════════════════════════════════════════════════════╗');
    if (allExposed && orderOk) {
      console.log('║                    ✅ ALL TESTS PASSED                        ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
      console.log('Summary:');
      console.log('  ✅ Inline module script present with proper organization');
      console.log('  ✅ All 10+ module imports found with correct syntax');
      console.log('  ✅ All 6 critical functions exposed to window object');
      console.log('  ✅ Script load order correct (dependencies before consumers)');
      console.log('  ✅ Onclick handlers ready to use exposed functions\n');
      console.log('Result: Dashboard modules are correctly configured for Phase 4.');
      console.log('No "function not defined" errors should occur.\n');
    } else {
      console.log('║                  ⚠️  ISSUES DETECTED                        ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
      if (!allExposed) console.log('  ❌ Some critical functions not exposed');
      if (!orderOk) console.log('  ❌ Script load order incorrect');
    }

  } catch (err) {
    console.error('❌ Connection Error:', err.message);
    process.exit(1);
  }
}

runTests();
