import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Operationalizes the gallery structure built in "Replace gallery's Google Drive iframe with a
// real slideshow/grid/lightbox" (see assets/js/gallery.js): the page ships a slideshow, a grid
// view, a lightbox, and a hidden fallback state that appears (with a Drive folder link) when the
// Worker API can't be reached. On file:// the API is unreachable, so the fallback path is what
// these tests can exercise deterministically.

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GALLERY_FILE = path.join(REPO_ROOT, 'gallery', 'index.html');

test.describe('gallery page — slideshow/grid/lightbox', () => {
  test('ships slideshow, grid, empty-fallback and lightbox regions', async ({ page }) => {
    await page.goto('file://' + GALLERY_FILE);

    // Slideshow, grid and lightbox stay hidden unless photos load; the empty fallback flips to
    // visible as soon as the API fetch fails, so assert presence rather than state for it.
    await expect(page.locator('#gallery-slideshow')).toBeHidden();
    await expect(page.locator('#gallery-grid')).toBeHidden();
    await expect(page.locator('#gallery-empty')).toHaveCount(1);
    await expect(page.locator('#lightbox')).toBeHidden();

    // Slideshow controls exist for when photos load.
    await expect(page.locator('#slide-prev')).toHaveCount(1);
    await expect(page.locator('#slide-next')).toHaveCount(1);
    await expect(page.locator('#slide-play')).toHaveCount(1);
    await expect(page.locator('#slide-viewall')).toHaveCount(1);

    // Lightbox has working chrome.
    await expect(page.locator('#lightbox-close')).toHaveCount(1);
    await expect(page.locator('#lightbox-prev')).toHaveCount(1);
    await expect(page.locator('#lightbox-next')).toHaveCount(1);
  });

  test('API failure shows the empty state with a Google Drive fallback link', async ({ page }) => {
    await page.goto('file://' + GALLERY_FILE);

    const empty = page.locator('#gallery-empty');
    await expect(empty).toBeVisible();
    await expect(empty).toContainText(/couldn't load/i);

    const href = await page.locator('#gallery-fallback-link').getAttribute('href');
    expect(href).toMatch(/^https:\/\/drive\.google\.com\/drive\/folders\/.+/);
  });

  test('has instructions for members on adding their own photos', async ({ page }) => {
    await page.goto('file://' + GALLERY_FILE);

    const intro = page.locator('.gallery-intro');
    await expect(intro).toHaveCount(1);
    await expect(intro).toContainText(/add|upload/i);
  });

  test('nav and footer are present (shared partials render)', async ({ page }) => {
    await page.goto('file://' + GALLERY_FILE);

    await expect(page.locator('nav.primary a')).toHaveCount(4);
    await expect(page.locator('footer a[href^="mailto:"]')).toHaveCount(1);
  });
});
