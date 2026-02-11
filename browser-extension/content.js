// content.js - Runs on localhost:3000, :3002, :5000 pages
// Detects ERR_CONNECTION_REFUSED and injects start button

(function() {
  'use strict';

  // Check if page shows connection error
  const isConnectionError = () => {
    const body = document.body.innerText.toLowerCase();
    return body.includes('err_connection_refused') ||
           body.includes('this site can't be reached') ||
           body.includes('unable to connect') ||
           document.title.toLowerCase().includes('connection refused');
  };

  // Inject floating button
  function injectStartButton() {
    if (document.getElementById('pelangi-launcher')) return; // Already injected

    const button = document.createElement('div');
    button.id = 'pelangi-launcher';
    button.innerHTML = `
      <style>
        #pelangi-launcher {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 999999;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px 50px;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(102, 126, 234, 0.4);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          text-align: center;
          min-width: 400px;
        }
        #pelangi-launcher h2 {
          margin: 0 0 10px 0;
          font-size: 24px;
          font-weight: 600;
        }
        #pelangi-launcher p {
          margin: 0 0 24px 0;
          opacity: 0.9;
          font-size: 14px;
        }
        #pelangi-launcher button {
          background: white;
          color: #667eea;
          border: none;
          padding: 14px 32px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        #pelangi-launcher button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }
        #pelangi-launcher button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        #pelangi-launcher .status {
          margin-top: 16px;
          font-size: 13px;
          opacity: 0.8;
        }
      </style>
      <h2>🚀 Server Not Running</h2>
      <p>PelangiManager development servers aren't running.<br>Click below to start them automatically.</p>
      <button id="start-servers-btn">Start Dev Servers</button>
      <div class="status" id="launch-status"></div>
    `;

    document.body.appendChild(button);

    // Button click handler
    document.getElementById('start-servers-btn').addEventListener('click', async () => {
      const btn = document.getElementById('start-servers-btn');
      const status = document.getElementById('launch-status');

      btn.disabled = true;
      btn.textContent = 'Starting...';
      status.textContent = 'Launching servers...';

      try {
        // Determine which server to start based on current port
        const port = window.location.port;
        let serverType = 'all';
        if (port === '3000' || port === '5000') serverType = 'main';
        if (port === '3002') serverType = 'mcp';

        const response = await fetch('http://localhost:9999/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ server: serverType })
        });

        const data = await response.json();

        if (data.success) {
          status.textContent = '✓ Servers starting... Wait 8 seconds';

          // Wait 8 seconds then reload
          let countdown = 8;
          const interval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
              status.textContent = `✓ Reloading in ${countdown} seconds...`;
            } else {
              clearInterval(interval);
              window.location.reload();
            }
          }, 1000);
        } else {
          throw new Error(data.message || 'Failed to start servers');
        }
      } catch (error) {
        console.error('[PelangiLauncher] Error:', error);
        status.textContent = '✗ Error: Is launcher running on port 9999?';
        btn.disabled = false;
        btn.textContent = 'Try Again';
      }
    });
  }

  // Check on page load
  if (isConnectionError()) {
    injectStartButton();
  }

  // Also check periodically (in case error appears after load)
  setInterval(() => {
    if (isConnectionError() && !document.getElementById('pelangi-launcher')) {
      injectStartButton();
    }
  }, 2000);
})();
