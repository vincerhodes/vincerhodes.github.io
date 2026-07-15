import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Cross-browser smoke test (chromium + firefox, see playwright.config.js) — loads every real page
// and asserts it renders with zero console errors and the shared nav/footer present. Not a
// per-feature regression test (those live in tests/structure/ and tests/e2e/*); this exists to catch
// browser-specific rendering or script failures the chromium-only suite wouldn't surface.

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const PAGES = [
  { name: 'home', file: path.join(REPO_ROOT, 'index.html') },
  { name: 'about', file: path.join(REPO_ROOT, 'about', 'index.html') },
  { name: 'gallery', file: path.join(REPO_ROOT, 'gallery', 'index.html') },
  { name: 'drills', file: path.join(REPO_ROOT, 'drills', 'index.html') },
  {
    name: 'session-01',
    file: path.join(REPO_ROOT, 'drills', 'session-01-straight-length-and-the-t', 'index.html'),
  },
  { name: 'drill-builder', file: path.join(REPO_ROOT, 'drill-builder', 'index.html') },
];

test.describe('cross-browser smoke', () => {
  for (const pageDef of PAGES) {
    test(`${pageDef.name} page renders with zero console errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => consoleErrors.push(err.message));

      await page.goto('file://' + pageDef.file);

      await expect(page.locator('nav')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();

      if (pageDef.name === 'gallery') {
        // Gallery's Drive iframe still points at the placeholder FOLDER_ID (see
        // planning/00-master-plan.md's "Outstanding work" list), which reliably 404s against the
        // real Google Drive endpoint — same reason tests/structure/gallery.spec.ts doesn't assert
        // on console cleanliness either. Drop this branch once the real folder id is swapped in.
        return;
      }
      expect(consoleErrors).toEqual([]);
    });
  }
});
