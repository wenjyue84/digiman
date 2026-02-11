#!/usr/bin/env node
const https = require('https');

const query = `
  query {
    project(_id: "6988ba46ea91e8e06ef1420c") {
      services {
        _id
        name
        status
        domains {
          domain
          isGenerated
        }
      }
    }
  }
`;

const ZEABUR_TOKEN = process.env.ZEABUR_TOKEN;

if (!ZEABUR_TOKEN) {
  console.error('❌ Error: ZEABUR_TOKEN environment variable is required');
  console.log('💡 Set it with: export ZEABUR_TOKEN=your-token');
  process.exit(1);
}

const options = {
  hostname: 'api.zeabur.com',
  path: '/graphql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ZEABUR_TOKEN}`
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    const data = JSON.parse(body);
    const services = data.data?.project?.services || [];

    console.log('\n' + '═'.repeat(60));
    console.log('📊 FRANKFURT PROJECT - DEPLOYMENT STATUS');
    console.log('═'.repeat(60) + '\n');

    services.forEach(svc => {
      const icon = svc.status === 'RUNNING' ? '✅' :
                   svc.status === 'BUILDING' ? '🔨' :
                   svc.status === 'CRASHED' ? '❌' : '⚠️';

      console.log(`${icon} ${svc.name}`);
      console.log(`   Status: ${svc.status}`);

      if (svc.domains && svc.domains.length > 0) {
        console.log(`   Domain: ${svc.domains[0].domain}`);
        console.log(`   URL: https://${svc.domains[0].domain}`);
      } else {
        console.log(`   Domain: (not assigned yet)`);
      }
      console.log('');
    });

    console.log('═'.repeat(60));

    // Summary
    const running = services.filter(s => s.status === 'RUNNING').length;
    const building = services.filter(s => s.status === 'BUILDING').length;
    const total = services.length;

    console.log(`\n📈 Summary: ${running}/${total} services running`);
    if (building > 0) {
      console.log(`⏳ ${building} service(s) still building...`);
    }
    console.log('');
  });
});

req.on('error', (e) => console.error('Error:', e));
req.write(JSON.stringify({ query }));
req.end();
