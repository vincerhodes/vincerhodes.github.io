import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Operationalizes planning/02-SITE-MAP-AND-CONTENT.md's Drills & Sessions landing view:
//   "Filter/tag by skill theme (length, volleys, drops, boasts, movement, front-court, deception,
//   serves/returns) — even a simple client-side filter (no backend needed) is enough for v1."
// See also planning/00-master-plan.md, Phase 3 "STATIC.theme-filter".
//
// Counts reflect the current library (drills/index.html): 8 sessions, one per theme, with
// Session 1 additionally tagged "movement".

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DRILLS_INDEX = path.join(REPO_ROOT, 'drills', 'index.html');

test.describe('drills index — client-side theme filter', () => {
  test('"All" is selected by default and every session card is visible', async ({ page }) => {
    await page.goto('file://' + DRILLS_INDEX);

    await expect(page.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.session-card:visible')).toHaveCount(8);
  });

  test('filtering by a theme shows only the session tagged with it', async ({ page }) => {
    await page.goto('file://' + DRILLS_INDEX);

    await page.getByRole('button', { name: 'Volleys' }).click();

    await expect(page.getByRole('button', { name: 'Volleys' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.session-card:visible')).toHaveCount(1);
    await expect(page.locator('.session-card:visible')).toHaveAttribute('href', /session-02/);
  });

  test('filtering by a theme the session is tagged with keeps it visible', async ({ page }) => {
    await page.goto('file://' + DRILLS_INDEX);

    await page.getByRole('button', { name: 'Length', exact: true }).click();
    await expect(page.locator('.session-card:visible')).toHaveCount(1);

    // Session 1 is also tagged "movement" (see drills/index.html data-themes).
    await page.getByRole('button', { name: 'Movement' }).click();
    await expect(page.locator('.session-card:visible')).toHaveCount(1);
  });

  test('returning to "All" shows every session again', async ({ page }) => {
    await page.goto('file://' + DRILLS_INDEX);

    await page.getByRole('button', { name: 'Volleys' }).click();
    await expect(page.locator('.session-card:visible')).toHaveCount(1);

    await page.getByRole('button', { name: 'All' }).click();
    await expect(page.locator('.session-card:visible')).toHaveCount(8);
  });
});
