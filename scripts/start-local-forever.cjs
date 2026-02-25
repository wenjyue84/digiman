/**
 * Start all Pelangi + Southern local dev processes under forever.
 * Run from repo root: node scripts/start-local-forever.cjs
 */
const path = require('path');
const { spawnSync } = require('child_process');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const launcher = 'scripts/forever-launcher.cjs';

const apps = [
  { uid: 'pelangi-server', script: 'dev:server' },
  { uid: 'pelangi-frontend', script: 'dev:frontend' },
  { uid: 'pelangi-rainbow', script: 'dev:pelangi-rainbow' },
  { uid: 'southern-server', script: 'dev:southern-server' },
  { uid: 'southern-frontend', script: 'dev:southern-frontend' },
  { uid: 'southern-rainbow', script: 'dev:southern-rainbow' },
  { uid: 'fleet-manager', script: null },
];

fs.mkdirSync(path.join(root, 'logs'), { recursive: true });

for (const app of apps) {
  const args = app.script
    ? ['start', '-a', '--uid', app.uid, '--interpreter', 'node', launcher, app.script]
    : ['start', '-a', '--uid', app.uid, 'fleet-manager/server.js'];
  const r = spawnSync('npx', ['forever', ...args], { stdio: 'inherit', shell: true, cwd: root });
  if (r.status !== 0) {
    console.error(`Failed to start ${app.uid}`);
    process.exit(1);
  }
}

console.log('\nAll local apps started with forever. Check: npx forever list');
console.log('Stop all: npm run local:stop');
