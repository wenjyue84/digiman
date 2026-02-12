/**
 * Verify Knowledge Base is the default sub-tab and all KB features work
 */
import { test, expect } from '@playwright/test';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const SCREENSHOT_DIR = join(process.cwd(), 'tests', 'screenshots');

test.describe('Rainbow KB Default Verification', () => {
  test.use({ baseURL: 'http://localhost:3002' });

  test.beforeAll(() => {
    if (!existsSync(SCREENSHOT_DIR)) mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test('KB is default, info banner, file list, category switch, pricing.md, Quick Replies', async ({ page }) => {
    // 1. Navigate with cache buster (query before hash so #responses is parsed correctly)
    await page.goto('/dashboard?_=nocache#responses');

    // 2. Wait for Responses tab and KB to load
    await page.waitForSelector('#tab-responses:not(.hidden)', { timeout: 15000 });
    await page.waitForSelector('#knowledge-base-tab:not(.hidden)', { timeout: 5000 });
    await page.waitForTimeout(1500);

    // 3. Screenshot initial state
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '04-kb-default-initial.png'),
      fullPage: true,
    });

    // 4a. Verify Knowledge Base is active (blue underline / primary styles)
    const kbTab = page.locator('[data-response-tab="knowledge-base"]');
    await expect(kbTab).toHaveClass(/text-primary-600|border-primary-500/);

    // 4b. Verify blue info banner
    const infoBanner = page.locator('.bg-blue-50.border-blue-200').filter({ hasText: /Rainbow reads|LLM Reply/ });
    await expect(infoBanner).toBeVisible();

    // 4c. Verify KB file list (Core Identity: AGENTS.md, soul.md, users.md)
    const fileList = page.locator('#kb-file-list');
    await expect(fileList).toBeVisible();
    await expect(fileList.getByText('AGENTS.md')).toBeVisible();
    await expect(fileList.getByText('soul.md')).toBeVisible();
    await expect(fileList.getByText('users.md')).toBeVisible();

    // 4d. Click Knowledge category
    await page.locator('[data-kb-cat="knowledge"]').click();
    await page.waitForTimeout(400);

    // Verify knowledge files
    await expect(fileList.getByText('pricing.md')).toBeVisible({ timeout: 3000 });
    await expect(fileList.getByText('checkin.md')).toBeVisible();

    // 5. Click pricing.md (button in file list)
    await page.locator('#kb-file-list button:has-text("pricing.md")').click();

    // 6. Wait for editor content, screenshot
    await page.waitForSelector('#kb-editor-panel:not(.hidden)', { timeout: 5000 });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: join(SCREENSHOT_DIR, '05-pricing-editor.png'),
      fullPage: true,
    });

    const editorContent = await page.locator('#kb-file-editor').inputValue();
    expect(editorContent.length).toBeGreaterThan(0);

    // 7. Click Quick Replies sub-tab
    await page.locator('[data-response-tab="quick-replies"]').click();

    // 8. Wait and screenshot
    await page.waitForSelector('#quick-replies-tab:not(.hidden)', { timeout: 3000 });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: join(SCREENSHOT_DIR, '06-quick-replies-after-switch.png'),
      fullPage: true,
    });

    const qrTab = page.locator('[data-response-tab="quick-replies"]');
    await expect(qrTab).toHaveClass(/text-primary-600|border-primary-500/);
  });
});
