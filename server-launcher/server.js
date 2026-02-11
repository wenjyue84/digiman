#!/usr/bin/env node
/**
 * Local Server Launcher - Listens on port 9999
 * Called by browser extension to start dev servers
 */

import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const app = express();
app.use(cors());
app.use(express.json());

let mainServerProcess = null;
let mcpServerProcess = null;

// Check if servers are running
app.get('/status', (req, res) => {
  const { execSync } = require('child_process');
  try {
    const output = execSync('netstat -ano | findstr ":3000 :3002 :5000" | findstr LISTENING', { encoding: 'utf-8' });
    const ports = {
      frontend: output.includes(':3000'),
      mcp: output.includes(':3002'),
      backend: output.includes(':5000')
    };
    res.json({
      running: ports.frontend || ports.mcp || ports.backend,
      ports
    });
  } catch {
    res.json({ running: false, ports: { frontend: false, mcp: false, backend: false } });
  }
});

// Start servers
app.post('/start', (req, res) => {
  const { server } = req.body; // 'main' or 'mcp' or 'all'

  if (server === 'all' || server === 'main') {
    if (!mainServerProcess) {
      console.log('[Launcher] Starting main servers (frontend + backend)...');
      mainServerProcess = spawn('npm', ['run', 'dev'], {
        cwd: PROJECT_ROOT,
        shell: true,
        detached: false,
        stdio: 'inherit'
      });

      mainServerProcess.on('exit', (code) => {
        console.log(`[Launcher] Main servers exited with code ${code}`);
        mainServerProcess = null;
      });
    }
  }

  if (server === 'all' || server === 'mcp') {
    if (!mcpServerProcess) {
      console.log('[Launcher] Starting MCP server...');
      mcpServerProcess = spawn('npm', ['run', 'dev'], {
        cwd: join(PROJECT_ROOT, 'mcp-server'),
        shell: true,
        detached: false,
        stdio: 'inherit'
      });

      mcpServerProcess.on('exit', (code) => {
        console.log(`[Launcher] MCP server exited with code ${code}`);
        mcpServerProcess = null;
      });
    }
  }

  res.json({
    success: true,
    message: `Starting ${server} server(s)...`,
    note: 'Wait 5-8 seconds before refreshing browser'
  });
});

// Stop servers
app.post('/stop', (req, res) => {
  const { server } = req.body;

  if (server === 'all' || server === 'main') {
    if (mainServerProcess) {
      mainServerProcess.kill();
      mainServerProcess = null;
    }
  }

  if (server === 'all' || server === 'mcp') {
    if (mcpServerProcess) {
      mcpServerProcess.kill();
      mcpServerProcess = null;
    }
  }

  res.json({ success: true, message: `Stopped ${server} server(s)` });
});

const PORT = 9999;
app.listen(PORT, () => {
  console.log(`🚀 Server Launcher running on http://localhost:${PORT}`);
  console.log('   Available endpoints:');
  console.log('   - GET  /status       - Check server status');
  console.log('   - POST /start        - Start servers');
  console.log('   - POST /stop         - Stop servers');
});
