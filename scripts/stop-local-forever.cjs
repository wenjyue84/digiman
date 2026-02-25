/**
 * Stop all Pelangi + Southern local dev processes managed by forever.
 * Run from repo root: node scripts/stop-local-forever.cjs
 */
const { spawnSync } = require('child_process');

const uids = [
  'pelangi-server', 'pelangi-frontend', 'pelangi-rainbow',
  'southern-server', 'southern-frontend', 'southern-rainbow',
  'fleet-manager',
];

for (const uid of uids) {
  spawnSync('npx', ['forever', 'stop', uid], { stdio: 'inherit', shell: true });
}

console.log('Done. Run "npx forever list" to confirm.');
