import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Operationalizes planning/02-SITE-MAP-AND-CONTENT.md's Gallery embed pattern (see also
// planning/00-master-plan.md, Phase 2 "STATIC.gallery-iframe-present"):
//   - gallery/index.html contains exactly one <iframe> embedding a Google Drive folder view
//   - src matches https://drive.google.com/embeddedfolderview?id=* (the "#grid" view)
//   - the embed is styled full-width and borderless per the documented pattern

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GALLERY_FILE = path.join(REPO_ROOT, 'gallery', 'index.html');

test.describe('gallery page — Drive folder embed', () => {
  test('has exactly one iframe embedding a Drive embeddedfolderview URL', async ({ page }) => {
    await page.goto('file://' + GALLERY_FILE);

    const iframe = page.locator('iframe');
    await expect(iframe).toHaveCount(1);

    const src = await iframe.getAttribute('src');
    expect(src).toMatch(/^https:\/\/drive\.google\.com\/embeddedfolderview\?id=[^&#]+#grid$/);
  });

  test('embed iframe is full-width and borderless', async ({ page }) => {
    await page.goto('file://' + GALLERY_FILE);

    const iframe = page.locator('iframe');
    const box = await iframe.boundingBox();
    expect(box).not.toBeNull();

    const borderWidth = await iframe.evaluate(
      (el) => getComputedStyle(el).borderWidth
    );
    expect(borderWidth).toBe('0px');

    // "full-width" means the iframe fills its container's *content* box — the box the child's
    // width:100% actually resolves against, i.e. the container's border-box width minus its own
    // left/right padding.
    const containerContentWidth = await page.evaluate(() => {
      const container = document.querySelector('.gallery-embed');
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      const style = getComputedStyle(container);
      return rect.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    });
    expect(containerContentWidth).not.toBeNull();
    // Within 1px of rounding tolerance.
    expect(Math.abs((box as { width: number }).width - (containerContentWidth as number))).toBeLessThanOrEqual(1);
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
