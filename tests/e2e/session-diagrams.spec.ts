import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Operationalizes planning/00-master-plan.md's Phase 3 "STATIC.diagram-render-smoke":
//   - loads the session-01 page
//   - asserts exactly 2 svg.court-diagram elements render (one per drills/**/diagrams/*.json)
//   - asserts zero console errors while rendering

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SESSION_PAGE = path.join(
  REPO_ROOT,
  'drills',
  'session-01-straight-length-and-the-t',
  'index.html'
);

test.describe('session-01 page — court diagram render smoke', () => {
  test('renders exactly 2 court diagrams with zero console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('file://' + SESSION_PAGE);

    const diagrams = page.locator('svg.court-diagram');
    await expect(diagrams).toHaveCount(2);

    expect(consoleErrors).toEqual([]);
  });

  test('each diagram has its caption and at least one player marker', async ({ page }) => {
    await page.goto('file://' + SESSION_PAGE);

    const figures = page.locator('.court-diagram-figure');
    await expect(figures).toHaveCount(2);

    for (const figure of await figures.all()) {
      await expect(figure.locator('figcaption.court-diagram-caption')).toHaveCount(1);
      const playerCount = await figure.locator('g.player').count();
      expect(playerCount).toBeGreaterThan(0);
    }
  });
});
