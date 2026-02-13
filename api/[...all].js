// Vercel serverless function that forwards all requests to the Express app
import app from '../dist/vercel-entry.js';

export default app;
