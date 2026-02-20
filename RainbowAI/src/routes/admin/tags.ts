/**
 * Admin API routes for global tags management (US-008).
 *
 * Tags are stored in RainbowAI/data/tags.json as a simple string array.
 * Atomic write pattern: write to .tmp then rename (same as config-store.ts).
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const TAGS_FILE = join(process.cwd(), 'data', 'tags.json');

const router = Router();

interface TagsData {
  tags: string[];
}

function loadTags(): TagsData {
  try {
    if (!existsSync(TAGS_FILE)) return { tags: [] };
    const raw = readFileSync(TAGS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.tags)) return parsed as TagsData;
    return { tags: [] };
  } catch {
    return { tags: [] };
  }
}

function saveTags(data: TagsData): void {
  const dir = dirname(TAGS_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmpPath = TAGS_FILE + '.tmp';
  writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  renameSync(tmpPath, TAGS_FILE);
}

// GET /tags — list all global tags
router.get('/tags', (_req: Request, res: Response) => {
  const data = loadTags();
  res.json(data);
});

// POST /tags — add one or more tags to global list
router.post('/tags', (req: Request, res: Response) => {
  const { tag, tags: tagArray } = req.body;
  const data = loadTags();

  const toAdd: string[] = [];
  if (typeof tag === 'string' && tag.trim()) {
    toAdd.push(tag.trim());
  }
  if (Array.isArray(tagArray)) {
    for (const t of tagArray) {
      if (typeof t === 'string' && t.trim()) toAdd.push(t.trim());
    }
  }

  if (toAdd.length === 0) {
    res.status(400).json({ error: 'No valid tags provided' });
    return;
  }

  let added = 0;
  for (const t of toAdd) {
    // Case-insensitive duplicate check
    if (!data.tags.some(existing => existing.toLowerCase() === t.toLowerCase())) {
      data.tags.push(t);
      added++;
    }
  }

  if (added > 0) {
    data.tags.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    saveTags(data);
  }

  res.json({ tags: data.tags, added });
});

// DELETE /tags/:tag — remove a tag from global list
router.delete('/tags/:tag', (req: Request, res: Response) => {
  const tagToRemove = decodeURIComponent(req.params.tag).trim();
  if (!tagToRemove) {
    res.status(400).json({ error: 'Tag name required' });
    return;
  }

  const data = loadTags();
  const idx = data.tags.findIndex(t => t.toLowerCase() === tagToRemove.toLowerCase());
  if (idx === -1) {
    res.status(404).json({ error: 'Tag not found' });
    return;
  }

  data.tags.splice(idx, 1);
  saveTags(data);
  res.json({ tags: data.tags, removed: tagToRemove });
});

export default router;
