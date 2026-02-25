// Simple test server for AWS deployment verification
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Serve static files
app.use(express.static(path.join(__dirname, '../dist/public')));

// Health check endpoint (required for AWS)
app.get('/api/database/config', (req, res) => {
  res.json({ 
    status: 'ok', 
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// API test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'digiman API is working!',
    version: '2.0.0-test',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/public/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 digiman Test Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;