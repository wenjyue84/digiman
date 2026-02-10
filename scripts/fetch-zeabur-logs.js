#!/usr/bin/env node
/**
 * Fetch Zeabur deployment logs
 * Usage: node scripts/fetch-zeabur-logs.js
 */

const ZEABUR_TOKEN = process.env.ZEABUR_TOKEN || 'sk-3rnuwvuwf33q7l44txghfkujzf2yz';
const PROJECT_ID = '6948c99fced85978abb44563';
const SERVICE_ID = '6948cacdaf84400647912aab';
const DEPLOYMENT_ID = '697a1c5c560650e56aac8886';
const ENV_ID = '6948c99f4947dd57c4fd2583';

async function fetchDeploymentLogs() {
  const query = `
    query GetDeployment($deploymentID: ObjectID!) {
      deployment(_id: $deploymentID) {
        _id
        status
        createdAt
        finishedAt
        errorMessage
        buildLogs
        runtimeLogs
        service {
          name
        }
        project {
          name
        }
      }
    }
  `;

  try {
    const response = await fetch('https://gateway.zeabur.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZEABUR_TOKEN}`
      },
      body: JSON.stringify({
        query,
        variables: {
          deploymentID: DEPLOYMENT_ID
        }
      })
    });

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL Errors:', JSON.stringify(data.errors, null, 2));
      return;
    }

    const deployment = data.data?.deployment;
    if (!deployment) {
      console.log('No deployment found');
      return;
    }

    console.log('='.repeat(60));
    console.log('ZEABUR DEPLOYMENT DETAILS');
    console.log('='.repeat(60));
    console.log(`Project: ${deployment.project?.name || 'N/A'}`);
    console.log(`Service: ${deployment.service?.name || 'N/A'}`);
    console.log(`Status: ${deployment.status}`);
    console.log(`Created: ${deployment.createdAt}`);
    console.log(`Finished: ${deployment.finishedAt || 'N/A'}`);

    if (deployment.errorMessage) {
      console.log('\n' + '='.repeat(60));
      console.log('ERROR MESSAGE');
      console.log('='.repeat(60));
      console.log(deployment.errorMessage);
    }

    if (deployment.buildLogs) {
      console.log('\n' + '='.repeat(60));
      console.log('BUILD LOGS');
      console.log('='.repeat(60));
      console.log(deployment.buildLogs);
    }

    if (deployment.runtimeLogs) {
      console.log('\n' + '='.repeat(60));
      console.log('RUNTIME LOGS');
      console.log('='.repeat(60));
      console.log(deployment.runtimeLogs);
    }

  } catch (error) {
    console.error('Fetch error:', error.message);
  }
}

// Also try to get project and service info
async function fetchProjectInfo() {
  const query = `
    query GetProject($projectID: ObjectID!) {
      project(_id: $projectID) {
        _id
        name
        services {
          _id
          name
          status
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

  try {
    const response = await fetch('https://gateway.zeabur.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZEABUR_TOKEN}`
      },
      body: JSON.stringify({
        query,
        variables: {
          projectID: PROJECT_ID
        }
      })
    });

    const data = await response.json();

    if (data.errors) {
      console.error('Project Query Errors:', JSON.stringify(data.errors, null, 2));
      return;
    }

    const project = data.data?.project;
    if (project) {
      console.log('\n' + '='.repeat(60));
      console.log('PROJECT INFO');
      console.log('='.repeat(60));
      console.log(`Name: ${project.name}`);
      console.log(`ID: ${project._id}`);

      if (project.services && project.services.length > 0) {
        console.log('\nServices:');
        project.services.forEach((svc, i) => {
          console.log(`  ${i + 1}. ${svc.name} (${svc.status})`);
          if (svc.deployments && svc.deployments.length > 0) {
            console.log('     Recent deployments:');
            svc.deployments.forEach((dep, j) => {
              console.log(`       - ${dep.status} at ${dep.createdAt}${dep.errorMessage ? ' [ERROR]' : ''}`);
              if (dep.errorMessage) {
                console.log(`         Error: ${dep.errorMessage.substring(0, 100)}...`);
              }
            });
          }
        });
      }
    }

  } catch (error) {
    console.error('Project fetch error:', error.message);
  }
}

// Try alternative endpoint for logs
async function fetchLogsViaREST() {
  console.log('\n' + '='.repeat(60));
  console.log('TRYING REST API FOR LOGS');
  console.log('='.repeat(60));

  try {
    // Try different log endpoints
    const endpoints = [
      `https://gateway.zeabur.com/v1/projects/${PROJECT_ID}/services/${SERVICE_ID}/deployments/${DEPLOYMENT_ID}/logs`,
      `https://gateway.zeabur.com/v1/deployments/${DEPLOYMENT_ID}/logs`,
      `https://api.zeabur.com/v1/projects/${PROJECT_ID}/services/${SERVICE_ID}/deployments/${DEPLOYMENT_ID}/logs`
    ];

    for (const url of endpoints) {
      console.log(`\nTrying: ${url}`);
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${ZEABUR_TOKEN}`
        }
      });

      console.log(`Status: ${response.status}`);
      if (response.ok) {
        const data = await response.text();
        console.log('Response:', data.substring(0, 500));
      }
    }
  } catch (error) {
    console.error('REST API error:', error.message);
  }
}

async function main() {
  console.log('Fetching Zeabur deployment information...\n');

  await fetchProjectInfo();
  await fetchDeploymentLogs();
  await fetchLogsViaREST();
}

main();
