#!/usr/bin/env node
/**
 * Zeabur Deployment Logs Fetcher
 * Usage: node scripts/zeabur-logs.js [deploymentId]
 */

const ZEABUR_TOKEN = process.env.ZEABUR_TOKEN || 'sk-3rnuwvuwf33q7l44txghfkujzf2yz';
const PROJECT_ID = '6948c99fced85978abb44563';
const SERVICE_ID = '6948cacdaf84400647912aab';

async function graphqlQuery(query, variables = {}) {
  const response = await fetch('https://gateway.zeabur.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ZEABUR_TOKEN}`
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function getRecentDeployments() {
  const query = `
    query GetProject($projectId: ObjectID!) {
      project(_id: $projectId) {
        name
        services {
          _id
          name
          deployments(limit: 5) {
            _id
            status
            createdAt
            finishedAt
            errorMessage
          }
        }
      }
    }
  `;

  return graphqlQuery(query, { projectId: PROJECT_ID });
}

async function getDeploymentLogs(deploymentId) {
  const query = `
    query GetDeployment($deploymentId: ObjectID!) {
      deployment(_id: $deploymentId) {
        _id
        status
        createdAt
        finishedAt
        errorMessage
        buildLogs
        runtimeLogs
      }
    }
  `;

  return graphqlQuery(query, { deploymentId });
}

async function main() {
  const deploymentId = process.argv[2];

  try {
    console.log('Fetching Zeabur deployment data...\n');

    // Get recent deployments
    const projectData = await getRecentDeployments();

    if (projectData.errors) {
      console.error('GraphQL Errors:', JSON.stringify(projectData.errors, null, 2));
      return;
    }

    const project = projectData.data?.project;
    if (!project) {
      console.log('No project found');
      return;
    }

    console.log(`Project: ${project.name}`);
    console.log('='.repeat(60));

    for (const service of project.services || []) {
      console.log(`\nService: ${service.name}`);
      console.log('-'.repeat(40));

      for (const dep of service.deployments || []) {
        const status = dep.status;
        const statusIcon = status === 'RUNNING' ? '✅' : status === 'FAILED' ? '❌' : '⏳';
        console.log(`${statusIcon} ${status} | ${dep.createdAt} | ID: ${dep._id}`);

        if (dep.errorMessage) {
          console.log(`   Error: ${dep.errorMessage.substring(0, 100)}...`);
        }
      }
    }

    // If specific deployment ID provided, get detailed logs
    if (deploymentId) {
      console.log('\n' + '='.repeat(60));
      console.log(`Fetching logs for deployment: ${deploymentId}`);
      console.log('='.repeat(60));

      const logData = await getDeploymentLogs(deploymentId);

      if (logData.errors) {
        console.error('Log fetch errors:', JSON.stringify(logData.errors, null, 2));
        return;
      }

      const deployment = logData.data?.deployment;
      if (deployment) {
        console.log(`\nStatus: ${deployment.status}`);
        console.log(`Created: ${deployment.createdAt}`);
        console.log(`Finished: ${deployment.finishedAt || 'N/A'}`);

        if (deployment.errorMessage) {
          console.log('\n--- ERROR MESSAGE ---');
          console.log(deployment.errorMessage);
        }

        if (deployment.buildLogs) {
          console.log('\n--- BUILD LOGS ---');
          console.log(deployment.buildLogs);
        }

        if (deployment.runtimeLogs) {
          console.log('\n--- RUNTIME LOGS ---');
          console.log(deployment.runtimeLogs);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
