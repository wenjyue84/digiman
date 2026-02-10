#!/usr/bin/env node
/**
 * Automated Zeabur MCP Server Setup
 * Creates new service, configures environment, and sets up deployment
 */

const ZEABUR_TOKEN = 'sk-3rnuwvuwf33q7l44txghfkujzf2yz';
const PROJECT_ID = '6948c99fced85978abb44563';
const PELANGI_API_TOKEN = 'a30d5306-4e68-49db-9224-bb43c836fe12';

async function graphqlRequest(query, variables = {}) {
  const response = await fetch('https://gateway.zeabur.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ZEABUR_TOKEN}`
    },
    body: JSON.stringify({ query, variables })
  });

  const data = await response.json();

  if (data.errors) {
    console.error('GraphQL Errors:', JSON.stringify(data.errors, null, 2));
    throw new Error('GraphQL request failed');
  }

  return data.data;
}

// Step 1: Create service from Git repository
async function createService() {
  console.log('Step 1: Creating MCP service from Git repository...');

  const query = `
    mutation CreateService($projectID: ObjectID!, $template: ServiceTemplate!) {
      createService(projectID: $projectID, template: $template) {
        _id
        name
        status
      }
    }
  `;

  try {
    const result = await graphqlRequest(query, {
      projectID: PROJECT_ID,
      template: {
        code: {
          type: "GIT",
          gitProvider: "GITHUB",
          repoOwner: "wenjyue84",
          repoName: "PelangiManager-Zeabur",
          repoBranch: "main",
          rootDirectory: "mcp-server"
        }
      }
    });

    console.log('✅ Service created:', result.createService._id);
    return result.createService._id;
  } catch (error) {
    console.error('❌ Failed to create service:', error.message);
    throw error;
  }
}

// Step 2: Set environment variables
async function setEnvironmentVariables(serviceID) {
  console.log('\nStep 2: Setting environment variables...');

  const query = `
    mutation UpdateServiceEnvironments($serviceID: ObjectID!, $environments: [UpdateServiceEnvironmentInput!]!) {
      updateServiceEnvironments(serviceID: $serviceID, environments: $environments)
    }
  `;

  const environments = [
    { key: 'PELANGI_API_URL', value: 'https://pelangi.zeabur.app' },
    { key: 'PELANGI_API_TOKEN', value: PELANGI_API_TOKEN },
    { key: 'MCP_SERVER_PORT', value: '3001' },
    { key: 'NODE_ENV', value: 'production' }
  ];

  try {
    await graphqlRequest(query, {
      serviceID,
      environments
    });

    console.log('✅ Environment variables set:');
    environments.forEach(env => {
      const displayValue = env.key.includes('TOKEN') ? '***' : env.value;
      console.log(`   ${env.key}=${displayValue}`);
    });
  } catch (error) {
    console.error('❌ Failed to set environment variables:', error.message);
    throw error;
  }
}

// Step 3: Generate domain
async function generateDomain(serviceID) {
  console.log('\nStep 3: Generating domain...');

  const query = `
    mutation GenerateDomain($serviceID: ObjectID!) {
      generateDomain(serviceID: $serviceID) {
        domain
      }
    }
  `;

  try {
    const result = await graphqlRequest(query, { serviceID });
    const domain = result.generateDomain.domain;

    console.log('✅ Domain generated:', domain);
    console.log('   MCP Endpoint:', `https://${domain}/mcp`);

    return domain;
  } catch (error) {
    console.error('❌ Failed to generate domain:', error.message);
    throw error;
  }
}

// Step 4: Trigger deployment
async function deployService(serviceID) {
  console.log('\nStep 4: Triggering deployment...');

  const query = `
    mutation DeployService($serviceID: ObjectID!) {
      deployService(serviceID: $serviceID) {
        _id
        status
      }
    }
  `;

  try {
    const result = await graphqlRequest(query, { serviceID });

    console.log('✅ Deployment triggered:', result.deployService._id);
    console.log('   Status:', result.deployService.status);
  } catch (error) {
    console.error('❌ Failed to trigger deployment:', error.message);
    throw error;
  }
}

// Step 5: Get service status
async function getServiceStatus(serviceID) {
  console.log('\nStep 5: Checking service status...');

  const query = `
    query GetService($serviceID: ObjectID!) {
      service(_id: $serviceID) {
        _id
        name
        status
        domains {
          domain
          isGenerated
        }
        deployments(limit: 1) {
          _id
          status
          createdAt
          errorMessage
        }
      }
    }
  `;

  try {
    const result = await graphqlRequest(query, { serviceID });
    const service = result.service;

    console.log('📊 Service Status:');
    console.log('   Name:', service.name);
    console.log('   Status:', service.status);

    if (service.domains && service.domains.length > 0) {
      console.log('   Domains:');
      service.domains.forEach(d => {
        console.log(`     - https://${d.domain}${d.isGenerated ? ' (generated)' : ''}`);
      });
    }

    if (service.deployments && service.deployments.length > 0) {
      const latest = service.deployments[0];
      console.log('   Latest Deployment:');
      console.log('     Status:', latest.status);
      console.log('     Created:', latest.createdAt);
      if (latest.errorMessage) {
        console.log('     Error:', latest.errorMessage);
      }
    }

    return service;
  } catch (error) {
    console.error('❌ Failed to get service status:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Zeabur MCP Server Automated Setup');
  console.log('=' .repeat(60));
  console.log('Project ID:', PROJECT_ID);
  console.log('Repository: wenjyue84/PelangiManager-Zeabur');
  console.log('Root Directory: mcp-server');
  console.log('=' .repeat(60) + '\n');

  try {
    // Create service
    const serviceID = await createService();

    // Wait a bit for service to initialize
    console.log('\nWaiting for service initialization...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Set environment variables
    await setEnvironmentVariables(serviceID);

    // Generate domain
    const domain = await generateDomain(serviceID);

    // Deploy
    await deployService(serviceID);

    // Wait for deployment to start
    console.log('\nWaiting for deployment to start...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get final status
    const service = await getServiceStatus(serviceID);

    console.log('\n' + '=' .repeat(60));
    console.log('✅ SETUP COMPLETE!');
    console.log('=' .repeat(60));
    console.log('\n📝 Next Steps:');
    console.log('1. Monitor deployment at: https://dash.zeabur.com');
    console.log('2. Wait for "Running" status (may take 2-5 minutes)');
    console.log('3. Test with:');
    console.log(`   curl https://${domain}/health`);
    console.log('\n4. Configure MCP clients with URL:');
    console.log(`   https://${domain}/mcp`);
    console.log('\n5. Use the prompts in mcp-server/CLIENT-PROMPTS.txt');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();
