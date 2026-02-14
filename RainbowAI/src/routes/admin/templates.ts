/**
 * Template API Routes
 * Serves HTML templates for dynamic loading
 */

import { Router } from 'express';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { notFound, serverError } from './http-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

/**
 * GET /api/rainbow/templates/:name
 * Serve HTML template by name
 */
router.get('/:name', (req, res) => {
  const { name } = req.params;

  // Sanitize template name (prevent directory traversal)
  const safeName = name.replace(/[^a-z0-9_-]/gi, '');
  const templatePath = join(__dirname, '../../public/templates/tabs', `${safeName}.html`);

  if (!existsSync(templatePath)) {
    return notFound(res, 'Template');
  }

  try {
    const template = readFileSync(templatePath, 'utf-8');
    res.type('html').send(template);
  } catch (err) {
    serverError(res, 'Failed to load template');
  }
});

export default router;
