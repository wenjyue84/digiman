/**
 * Launcher for forever: runs an npm script and keeps the process alive until it exits.
 * Usage: node scripts/forever-launcher.cjs <npm-script-name>
 */
const path = require('path');
const { spawn } = require('child_process');

const script = process.argv[2];
if (!script) {
  console.error('Usage: node scripts/forever-launcher.cjs <npm-script-name>');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const child = spawn('npm', ['run', script], {
  stdio: 'inherit',
  shell: true,
  cwd: root,
});

child.on('exit', (code, signal) => {
  process.exit(code !== null ? code : signal ? 1 : 0);
});
