import http from 'http';

function fetchPage() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3002/', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
  });
}

const html = await fetchPage();
console.log('Checking for window.loadDashboard...');
if (html.includes('window.loadDashboard = loadDashboard')) {
  console.log('✅ FOUND: window.loadDashboard');
} else {
  console.log('❌ NOT FOUND');
}

if (html.includes('window.loadSystemStatus = loadSystemStatus')) {
  console.log('✅ FOUND: window.loadSystemStatus');
} else {
  console.log('❌ NOT FOUND');
}

console.log('\nTotal exposures:');
const exposures = (html.match(/window\.\w+ = \w+;/g) || []).length;
console.log(`Found ${exposures} window exposures`);

console.log('\nAll window assignments:');
const matches = html.match(/window\.\w+ = \w+;/g) || [];
matches.slice(0, 10).forEach(m => console.log(`  ${m}`));
