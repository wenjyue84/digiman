const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

// Health check for AWS load balancer
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'PelangiManager is running on AWS!',
    timestamp: new Date().toISOString(),
    port: port,
    environment: process.env.NODE_ENV || 'production'
  });
});

// API test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working on AWS!', 
    version: '1.0.0'
  });
});

// Simple root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to PelangiManager!',
    status: 'running',
    endpoints: ['/health', '/api/test']
  });
});

// Catch-all for any other routes
app.get('*', (req, res) => {
  res.json({ 
    message: 'PelangiManager API', 
    requestedPath: req.path,
    availableEndpoints: ['/', '/health', '/api/test']
  });
});

app.listen(port, () => {
  console.log(`🚀 PelangiManager running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
});

module.exports = app;