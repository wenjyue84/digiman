#!/usr/bin/env node
const https = require('https');

const SERVICE_ID = '698b58fe6b07a3677cc4f467';
const ZEABUR_TOKEN = process.env.ZEABUR_TOKEN;

if (!ZEABUR_TOKEN) {
  console.error('❌ Error: ZEABUR_TOKEN environment variable is required');
  console.log('💡 Set it with: export ZEABUR_TOKEN=your-token');
  process.exit(1);
}

const query = `
  query {
    service(_id: "${SERVICE_ID}") {
      _id
      name
      status
      deployments {
        _id
        status
        createdAt
        finishedAt
      }
    }
  }
`;

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
    const service = data.data?.service;

    if (!service) {
      console.log('❌ Service not found');
      return;
    }

    console.log('\n' + '═'.repeat(60));
    console.log('📊 MCP SERVER DEPLOYMENT DETAILS');
    console.log('═'.repeat(60) + '\n');
    console.log(`Service: ${service.name}`);
    console.log(`Status: ${service.status}`);
    console.log(`Service ID: ${service._id}\n`);

    if (service.deployments && service.deployments.length > 0) {
      console.log('Recent Deployments:\n');
      service.deployments.slice(0, 3).forEach((dep, i) => {
        console.log(`${i + 1}. Deployment ID: ${dep._id}`);
        console.log(`   Status: ${dep.status}`);
        console.log(`   Created: ${dep.createdAt}`);
        console.log(`   Finished: ${dep.finishedAt || 'N/A'}`);
        console.log('');
      });

      const latestDep = service.deployments[0];
      if (latestDep.status === 'CRASHED') {
        console.log('❌ Latest deployment CRASHED');
        console.log('\n💡 To see error logs:');
        console.log(`   Visit: https://dash.zeabur.com/projects/6988ba46ea91e8e06ef1420c/services/${SERVICE_ID}`);
        console.log('   Go to: Logs tab → Runtime Logs');
      }
    }

    console.log('\n' + '═'.repeat(60));
  });
});

req.on('error', (e) => console.error('Error:', e));
req.write(JSON.stringify({ query }));
req.end();
