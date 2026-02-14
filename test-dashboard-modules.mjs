import http from 'http';

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
    const windowAssignRegex = /window\.(\w+)\s*=\s*\w+;/g;
    const exposedFuncs = new Set();
    while ((match = windowAssignRegex.exec(html)) !== null) {
      exposedFuncs.add(match[1]);
    }
    console.log(`✓ Found ${exposedFuncs.size} functions exposed to window:`);
    Array.from(exposedFuncs).sort().forEach(f => console.log(`  - window.${f}`));
    console.log();

    // Check for module scripts
    console.log('📦 Checking for additional module script tags...');
    const scriptRegex = /<script[^>]*type="module"[^>]*src="([^"]+)"/g;
    let scriptCount = 0;
    while ((match = scriptRegex.exec(html)) !== null) {
      scriptCount++;
      console.log(`  ✓ ${match[1].replace(/\?.*/, '')}`);
    }
    console.log(`✓ Found ${scriptCount} module script tags\n`);

    // Verify key functions exist
    console.log('✅ Verifying critical functions exposed:');
    const criticalFuncs = [
      'loadDashboard', 'loadSystemStatus', 'loadUnderstanding',
      'loadResponses', 'loadChatSimulator', 'loadPerformance'
    ];
    let allFound = true;
    for (const func of criticalFuncs) {
      if (exposedFuncs.has(func)) {
        console.log(`  ✓ window.${func}`);
      } else {
        console.log(`  ✗ window.${func} NOT FOUND`);
        allFound = false;
      }
    }

    if (allFound) {
      console.log('\n✅ All critical functions exposed correctly!\n');
    } else {
      console.log('\n⚠️ Some critical functions are missing!\n');
      process.exit(1);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

runTests();
