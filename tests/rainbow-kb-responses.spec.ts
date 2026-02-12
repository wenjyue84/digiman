/**
 * Rainbow Dashboard - Responses tab & Knowledge Base sub-tab test
 * Navigate to http://localhost:3002/dashboard#responses and verify KB functionality
 */
import { test, expect } from '@playwright/test';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const SCREENSHOT_DIR = join(process.cwd(), 'tests', 'screenshots');

test.describe('Rainbow Responses tab - Knowledge Base', () => {
  test.use({
    baseURL: 'http://localhost:3002',
  });

  test.beforeAll(() => {
    if (!existsSync(SCREENSHOT_DIR)) {
      mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('navigate to responses, open Knowledge Base, load file', async ({ page }) => {
    // Step 1: Navigate to dashboard#responses
    await page.goto('/dashboard#responses');

    // Wait for Responses tab content to load (template fetches)
    await page.waitForSelector('#tab-responses:not(.hidden)', { timeout: 15000 });

    // Wait for sub-tab content
    await page.waitForSelector('[data-response-tab="knowledge-base"]', { timeout: 5000 });

    // Take screenshot of initial state
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '01-responses-initial.png'),
      fullPage: true,
    });

    // Step 2: Find and click Knowledge Base sub-tab
    const kbTabBtn = page.locator('[data-response-tab="knowledge-base"]');
    await expect(kbTabBtn).toBeVisible();
    await kbTabBtn.click();

    // Wait for KB tab content to be visible
    await page.waitForSelector('#knowledge-base-tab:not(.hidden)', { timeout: 3000 });

    // Take screenshot after clicking Knowledge Base
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '02-knowledge-base-tab.png'),
      fullPage: true,
    });

    // Step 3: Core Identity category (loadKB selects 'core' by default)
    const coreBtn = page.locator('[data-kb-cat="core"]');
    await expect(coreBtn).toBeVisible();
    await coreBtn.click();

    // Wait for file list to populate
    const fileList = page.locator('#kb-file-list');
    await expect(fileList).toBeVisible();
    await page.waitForTimeout(600);

    // Expect files: AGENTS.md, soul.md, users.md (core category)
    const soulButton = page.locator('#kb-file-list button:has-text("soul.md")');
    await expect(soulButton).toBeVisible({ timeout: 3000 });

    // Step 4: Click soul.md to load content
    await soulButton.click();

    // Wait for editor to show content
    await page.waitForSelector('#kb-editor-panel:not(.hidden)', { timeout: 5000 });

    // Wait for textarea to have content (API fetch)
    await page.waitForTimeout(800);
    const editor = page.locator('#kb-file-editor');
    const content = await editor.inputValue();

    // Take screenshot of editor state
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '03-kb-editor-soul.png'),
      fullPage: true,
    });

    expect(content.length).toBeGreaterThan(0);
  });
});
