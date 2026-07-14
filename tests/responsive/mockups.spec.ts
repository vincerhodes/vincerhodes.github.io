import { test, expect } from '@playwright/test';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Asserts every Phase 0 mockup file has no horizontal overflow at 375/768/1280px viewports —
// "so the responsive behavior can be judged early rather than retrofitted" (planning/00-master-plan.md).

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MOCKUP_ROOT = path.join(REPO_ROOT, 'design-mockups');

const VIEWPORTS = [
  { name: '375px (mobile)', width: 375, height: 812 },
  { name: '768px (tablet)', width: 768, height: 1024 },
  { name: '1280px (desktop)', width: 1280, height: 800 },
];

function findHtmlFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...findHtmlFiles(full));
    } else if (entry.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

const mockupFiles = findHtmlFiles(MOCKUP_ROOT);

test.describe('mockup responsiveness (no horizontal overflow)', () => {
  for (const file of mockupFiles) {
    const relPath = path.relative(REPO_ROOT, file);

    for (const viewport of VIEWPORTS) {
      test(`${relPath} @ ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('file://' + file);

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        // 1px tolerance for sub-pixel rounding.
        expect(scrollWidth).toBeLessThanOrEqual(viewport.width + 1);
      });
    }
  }
});
