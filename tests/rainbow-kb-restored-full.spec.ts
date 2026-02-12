/**
 * Thorough test of restored Knowledge Base page
 * Verifies layout, Progressive Disclosure card, editor size, tab switching
 */
import { test, expect } from '@playwright/test';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const SCREENSHOT_DIR = join(process.cwd(), 'tests', 'screenshots');

test.describe('Rainbow KB Restored - Full Verification', () => {
  test.use({ baseURL: 'http://localhost:3002' });

  test.beforeAll(() => {
    if (!existsSync(SCREENSHOT_DIR)) mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test('KB restored: layout, card, editor, preview, tab switching', async ({ page }) => {
    // 1. Navigate with cache buster
    await page.goto('/dashboard?_=reload#responses');

    // 2. Wait 3 seconds for full load
    await page.waitForTimeout(3000);

    // 3. Screenshot initial Knowledge Base view
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '07-kb-initial-restored.png'),
      fullPage: true,
    });

    // Verify elements
    // a. KB is default active
    const kbTab = page.locator('[data-response-tab="knowledge-base"]');
    await expect(kbTab).toHaveClass(/text-primary-600|border-primary-500/);

    // b. Layout: 4/12 sidebar, 8/12 editor
    const sidebar = page.locator('#knowledge-base-tab .md\\:col-span-4').first();
    const editorCol = page.locator('#knowledge-base-tab .md\\:col-span-8').first();
    await expect(sidebar).toBeVisible();
    await expect(editorCol).toBeVisible();

    // c. Purple gradient "How LLM Reply Works" card
    const llmCard = page.locator('.bg-gradient-to-br.from-purple-50').filter({ hasText: 'How LLM Reply Works' });
    await expect(llmCard).toBeVisible();

    // d. Info card: 4 steps + Token Savings
    await expect(llmCard.getByText('AGENTS.md')).toBeVisible();
    await expect(llmCard.getByText('soul.md')).toBeVisible();
    await expect(llmCard.getByText('Generate answer')).toBeVisible();
    await expect(llmCard.getByText('Token Savings: ~60-70%')).toBeVisible();

    // e. Category filter buttons
    await expect(page.locator('[data-kb-cat="core"]')).toBeVisible();
    await expect(page.locator('[data-kb-cat="system"]')).toBeVisible();
    await expect(page.locator('[data-kb-cat="knowledge"]')).toBeVisible();
    await expect(page.locator('[data-kb-cat="memory"]')).toBeVisible();

    // f. File list populated (Core: AGENTS.md, soul.md, users.md)
    const fileList = page.locator('#kb-file-list');
    await expect(fileList.getByText('AGENTS.md')).toBeVisible({ timeout: 5000 });
    await expect(fileList.getByText('soul.md')).toBeVisible();
    await expect(fileList.getByText('users.md')).toBeVisible();

    // g. No File Selected placeholder with large icon
    const noFilePlaceholder = page.locator('#kb-no-file');
    await expect(noFilePlaceholder).toBeVisible();
    await expect(noFilePlaceholder.getByText('No File Selected')).toBeVisible();
    // Check for large icon (text-5xl = 3rem)
    const iconDiv = noFilePlaceholder.locator('.text-5xl');
    await expect(iconDiv).toBeVisible();

    // 4-5. Click Knowledge category, screenshot
    await page.locator('[data-kb-cat="knowledge"]').click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '08-kb-knowledge-category.png'),
      fullPage: true,
    });

    // 6-7. Click pricing.md, screenshot editor
    await page.locator('#kb-file-list button:has-text("pricing.md")').click();
    await page.waitForSelector('#kb-editor-panel:not(.hidden)', { timeout: 5000 });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: join(SCREENSHOT_DIR, '09-kb-pricing-editor.png'),
      fullPage: true,
    });

    // 8. Verify editor ~26 rows
    const textarea = page.locator('#kb-file-editor');
    const rows = await textarea.getAttribute('rows');
    expect(parseInt(rows || '0', 10)).toBe(26);

    // 9-10. Click Preview, screenshot
    await page.locator('#kb-mode-preview').click();
    await page.waitForSelector('#kb-preview-pane:not(.hidden)', { timeout: 3000 });
    await page.waitForTimeout(400);

    await page.screenshot({
      path: join(SCREENSHOT_DIR, '10-kb-preview-mode.png'),
      fullPage: true,
    });

    // 11. Switch to Quick Replies
    await page.locator('[data-response-tab="quick-replies"]').click();
    await page.waitForSelector('#quick-replies-tab:not(.hidden)', { timeout: 3000 });
    await expect(page.locator('[data-response-tab="quick-replies"]')).toHaveClass(/text-primary-600|border-primary-500/);

    // 12. Switch back to Knowledge Base (preserve state)
    await page.locator('[data-response-tab="knowledge-base"]').click();
    await page.waitForSelector('#knowledge-base-tab:not(.hidden)', { timeout: 3000 });
    // pricing.md should still be selected (state preserved)
    await page.waitForTimeout(400);
    const editorStillVisible = await page.locator('#kb-editor-panel:not(.hidden)').isVisible();
    expect(editorStillVisible).toBe(true);
  });
});
