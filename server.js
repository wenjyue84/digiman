import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Serve static files
app.use(express.static(path.join(__dirname, 'dist/public')));

// Simple health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'PelangiManager is running!',
    timestamp: new Date().toISOString(),
    port: port
  });
});

// API endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working!', 
    version: '1.0.0'
  });
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/public/index.html'));
});

app.listen(port, () => {
  console.log(`PelangiManager running on port ${port}`);
});

export default app;