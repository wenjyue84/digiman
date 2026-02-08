import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createMCPHandler } from './server.js';
import { apiClient, getApiBaseUrl } from './lib/http-client.js';
import { initBaileys, getWhatsAppStatus } from './lib/baileys-client.js';
import { startDailyReportScheduler } from './lib/daily-report.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.MCP_SERVER_PORT || '3001', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'pelangi-mcp-server',
    version: '1.0.0',
    whatsapp: getWhatsAppStatus().state,
    timestamp: new Date().toISOString()
  });
});

// MCP protocol endpoint
app.post('/mcp', createMCPHandler());

// Start server - listen on 0.0.0.0 for Docker containers
app.listen(PORT, '0.0.0.0', () => {
  const apiUrl = getApiBaseUrl();
  console.log(`Pelangi MCP Server running on http://0.0.0.0:${PORT}`);
  console.log(`MCP endpoint: http://0.0.0.0:${PORT}/mcp`);
  console.log(`Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`API URL: ${apiUrl}${process.env.PELANGI_MANAGER_HOST ? ' (internal host)' : ''}`);

  // Startup connectivity check: warn if PelangiManager API is unreachable
  setImmediate(async () => {
    try {
      try {
        await apiClient.get('/api/health');
      } catch {
        await apiClient.get('/api/occupancy');
      }
      console.log('PelangiManager API reachable');
    } catch (err: any) {
      const status = err.response?.status;
      const url = `${apiUrl}/api/health`;
      console.warn('');
      console.warn('PelangiManager API not reachable.');
      console.warn(`   URL: ${url}`);
      if (status) console.warn(`   Response: ${status} ${err.response?.statusText || ''}`);
      console.warn('   Set PELANGI_API_URL in Zeabur to your deployed PelangiManager URL.');
      console.warn('   MCP tools will fail until the API is reachable.');
      console.warn('');
    }

    // Initialize WhatsApp (Baileys) connection
    try {
      await initBaileys();
      console.log('WhatsApp (Baileys) initializing...');

      // Start daily report scheduler (11:30 AM MYT)
      startDailyReportScheduler();
    } catch (err: any) {
      console.warn(`WhatsApp init failed: ${err.message}`);
      console.warn('WhatsApp tools will fail. Run: node pair-whatsapp.cjs to pair.');
    }
  });
});
