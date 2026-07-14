import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Operationalizes planning/02-SITE-MAP-AND-CONTENT.md's nav spec (see also
// planning/00-master-plan.md, Phase 1 "STATIC.nav-footer-structure"):
//   - nav contains exactly 4 items: Home, Drills & Sessions, Gallery, About / Join
//   - footer contains a "Drill Builder" link, the logo monogram, and contact/join info

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const PAGES = [
  { name: 'home', file: path.join(REPO_ROOT, 'index.html') },
  { name: 'about', file: path.join(REPO_ROOT, 'about', 'index.html') },
];

const EXPECTED_NAV_LABELS = ['Home', 'Drills & Sessions', 'Gallery', 'About / Join'];

test.describe('shared nav/footer structure', () => {
  for (const pageDef of PAGES) {
    test(`${pageDef.name} — nav has exactly the 4 spec\'d items`, async ({ page }) => {
      await page.goto('file://' + pageDef.file);

      const navLinks = page.locator('nav.primary a');
      await expect(navLinks).toHaveCount(4);

      const labels = (await navLinks.allTextContents()).map((t) => t.trim());
      expect(labels).toEqual(EXPECTED_NAV_LABELS);
    });

    test(`${pageDef.name} — footer has Drill Builder link, monogram, and contact info`, async ({ page }) => {
      await page.goto('file://' + pageDef.file);

      const footer = page.locator('footer');

      // "Drill Builder" link — deliberately no nav entry, footer is the persistent entry point.
      await expect(footer.getByRole('link', { name: 'Drill Builder', exact: true })).toHaveCount(1);

      // Logo monogram (not the full badge — see 01-BRAND-STYLE-GUIDE.md's footer-logo guidance).
      const monogram = footer.locator('img.monogram');
      await expect(monogram).toHaveCount(1);
      await expect(monogram).toHaveAttribute('src', /monogram\.webp$/);

      // Contact/join info.
      await expect(footer.locator('a[href^="mailto:"]')).toHaveCount(1);
    });
  }
});
