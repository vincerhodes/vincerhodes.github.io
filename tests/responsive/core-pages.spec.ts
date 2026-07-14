import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Asserts core site pages have no horizontal overflow at 375/768/1280px viewports, same contract
// as tests/responsive/mockups.spec.ts but against the real built pages instead of Phase 0 mockups.
// Phase-scoped subsets are selected via --grep against the test title (e.g. --grep "home|about").

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const VIEWPORTS = [
  { name: '375px (mobile)', width: 375, height: 812 },
  { name: '768px (tablet)', width: 768, height: 1024 },
  { name: '1280px (desktop)', width: 1280, height: 800 },
];

const PAGES = [
  { name: 'home', file: path.join(REPO_ROOT, 'index.html') },
  { name: 'about', file: path.join(REPO_ROOT, 'about', 'index.html') },
  { name: 'gallery', file: path.join(REPO_ROOT, 'gallery', 'index.html') },
];

test.describe('core page responsiveness (no horizontal overflow)', () => {
  for (const pageDef of PAGES) {
    for (const viewport of VIEWPORTS) {
      test(`${pageDef.name} page @ ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('file://' + pageDef.file);

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        // 1px tolerance for sub-pixel rounding.
        expect(scrollWidth).toBeLessThanOrEqual(viewport.width + 1);
      });
    }
  }
});
