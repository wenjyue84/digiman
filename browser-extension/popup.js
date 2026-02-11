// popup.js - Extension popup logic

const LAUNCHER_URL = 'http://localhost:9999';

// Check server status
async function checkStatus() {
  try {
    const response = await fetch(`${LAUNCHER_URL}/status`);
    const data = await response.json();

    const statusEl = document.getElementById('status');
    const portsEl = document.getElementById('ports');

    if (data.running) {
      statusEl.className = 'status running';
      statusEl.querySelector('strong').textContent = 'Servers Running';
      const running = [];
      if (data.ports.frontend) running.push('Frontend (3000)');
      if (data.ports.backend) running.push('Backend (5000)');
      if (data.ports.mcp) running.push('MCP (3002)');
      portsEl.textContent = running.join(', ');
    } else {
      statusEl.className = 'status stopped';
      statusEl.querySelector('strong').textContent = 'All Servers Stopped';
      portsEl.textContent = 'No ports listening';
    }

    return data;
  } catch (error) {
    const statusEl = document.getElementById('status');
    statusEl.className = 'status stopped';
    statusEl.querySelector('strong').textContent = 'Launcher Not Running';
    document.getElementById('ports').textContent = 'Start: node server-launcher/server.js';
    return null;
  }
}

// Start servers
async function startServers(serverType) {
  const buttons = document.querySelectorAll('button');
  buttons.forEach(btn => btn.disabled = true);

  try {
    const response = await fetch(`${LAUNCHER_URL}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server: serverType })
    });

    const data = await response.json();

    if (data.success) {
      alert(`${data.message}\nWait 5-8 seconds before using the app.`);
      setTimeout(checkStatus, 8000); // Refresh status after 8s
    } else {
      alert(`Error: ${data.message}`);
    }
  } catch (error) {
    alert('Error: Could not connect to launcher.\nMake sure server-launcher is running on port 9999.');
  } finally {
    buttons.forEach(btn => btn.disabled = false);
  }
}

// Stop servers
async function stopServers(serverType) {
  const buttons = document.querySelectorAll('button');
  buttons.forEach(btn => btn.disabled = true);

  try {
    const response = await fetch(`${LAUNCHER_URL}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server: serverType })
    });

    const data = await response.json();

    if (data.success) {
      alert(data.message);
      setTimeout(checkStatus, 2000);
    }
  } catch (error) {
    alert('Error: Could not connect to launcher.');
  } finally {
    buttons.forEach(btn => btn.disabled = false);
  }
}

// Button handlers
document.getElementById('start-all').addEventListener('click', () => startServers('all'));
document.getElementById('start-main').addEventListener('click', () => startServers('main'));
document.getElementById('start-mcp').addEventListener('click', () => startServers('mcp'));
document.getElementById('stop-all').addEventListener('click', () => stopServers('all'));

// Check status on load
checkStatus();

// Refresh status every 3 seconds
setInterval(checkStatus, 3000);
