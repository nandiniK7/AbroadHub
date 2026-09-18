const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const SERVER_ENTRY = path.join(__dirname, 'index.js');
const VITE_BIN = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');

if (!fs.existsSync(VITE_BIN)) {
  console.error('Vite was not found in node_modules. Run "npm install" first.');
  process.exit(1);
}

// Spawn node.exe directly with a JS entry file instead of going through
// npm.cmd/vite.cmd shell wrappers — spawning .cmd files with shell:false
// on Windows (Node 22+) throws "spawn EINVAL". Using process.execPath
// avoids the OS shell resolution entirely and works on every platform.
const children = [
  spawn(process.execPath, [SERVER_ENTRY], { stdio: 'inherit' }),
  spawn(process.execPath, [VITE_BIN], { stdio: 'inherit', cwd: ROOT })
];

let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  children.forEach(c => { if (!c.killed) c.kill(); });
  process.exit();
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
children.forEach(c => c.on('exit', code => { if (code) stop(); }));
