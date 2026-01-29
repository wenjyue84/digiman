import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createMCPHandler } from './server.js';

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
    timestamp: new Date().toISOString()
  });
});

// MCP protocol endpoint
app.post('/mcp', createMCPHandler());

// Start server - listen on 0.0.0.0 for Docker containers
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Pelangi MCP Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 MCP endpoint: http://0.0.0.0:${PORT}/mcp`);
  console.log(`💚 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🔗 API URL: ${process.env.PELANGI_API_URL || 'http://localhost:5000'}`);
});
