import { test, expect } from '@playwright/test';
import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Operationalizes planning/00-master-plan.md's Phase 4 "E2E.drill-builder-flow":
//   "runs against `wrangler dev` with the OpenRouter call stubbed (a test-mode env flag the Worker
//   must support — real API calls don't belong in a check that reruns on every loop iteration)."
//
// Two local processes are started for the duration of this file:
//   1. `wrangler dev` running worker/src/index.js with TEST_MODE=true (stubbed generation, see
//      worker/src/index.js's stubGeneration) and EXTRA_ALLOWED_ORIGIN set to the static server's
//      origin below (worker/src/lib.js's CORS only allows the two production origins otherwise).
//   2. `serve` (already a devDependency) serving the repo root statically, so drill-builder/index.html
//      is loaded over http:// with a real Origin header — not file://, which would defeat the CORS
//      check this flow depends on in production.

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const WORKER_PORT = 8792;
const STATIC_PORT = 4180;
const WORKER_ORIGIN = `http://127.0.0.1:${WORKER_PORT}`;
const STATIC_ORIGIN = `http://127.0.0.1:${STATIC_PORT}`;

let workerProc: ChildProcess | undefined;
let staticProc: ChildProcess | undefined;

function spawnDetached(command: string, args: string[]): ChildProcess {
  const child = spawn(command, args, {
    cwd: REPO_ROOT,
    detached: true, // own process group, so cleanup can kill the whole tree (npx -> wrangler -> workerd)
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout?.on('data', (d) => { output += d.toString(); });
  child.stderr?.on('data', (d) => { output += d.toString(); });
  (child as ChildProcess & { _output: () => string })._output = () => output;
  return child;
}

function killTree(child: ChildProcess | undefined) {
  if (!child || child.pid == null || child.killed) return;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    // Process group already gone — nothing to clean up.
  }
}

async function waitForReady(url: string, timeoutMs: number, label: string, proc: ChildProcess) {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404 || res.status === 405) return; // any response = server is up
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  const output = (proc as ChildProcess & { _output?: () => string })._output?.() ?? '';
  throw new Error(`${label} did not become ready within ${timeoutMs}ms.\nLast error: ${lastError}\nOutput:\n${output}`);
}

test.describe('AI Drill Builder — end-to-end generate flow (stubbed OpenRouter)', () => {
  test.beforeAll(async () => {
    workerProc = spawnDetached('npx', [
      'wrangler', 'dev',
      '--port', String(WORKER_PORT),
      '--var', 'TEST_MODE:true',
      '--var', `EXTRA_ALLOWED_ORIGIN:${STATIC_ORIGIN}`,
    ]);
    staticProc = spawnDetached('npx', ['serve', REPO_ROOT, '-l', String(STATIC_PORT)]);

    await Promise.all([
      waitForReady(`${WORKER_ORIGIN}/generate`, 30_000, 'wrangler dev', workerProc),
      waitForReady(STATIC_ORIGIN, 30_000, 'static server', staticProc),
    ]);
  });

  test.afterAll(() => {
    killTree(workerProc);
    killTree(staticProc);
  });

  test('generating a plan renders plan text and every drill diagram with zero console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    // Point the page at the local wrangler dev instance instead of the production API — set before
    // navigation so the page's own script (which reads window.DRILL_BUILDER_API_BASE once, at load)
    // picks it up.
    await page.addInitScript((base) => {
      (window as unknown as { DRILL_BUILDER_API_BASE: string }).DRILL_BUILDER_API_BASE = base;
    }, WORKER_ORIGIN);

    await page.goto(`${STATIC_ORIGIN}/drill-builder/index.html`);

    await page.locator('#field-players').fill('6');
    await page.locator('#field-courts').fill('2');
    await page.locator('#field-theme').selectOption('length');
    await page.locator('#field-level').selectOption('intermediate');
    await page.locator('#field-duration').fill('120');
    await page.locator('#field-notes').fill('low turnout expected');

    await page.getByRole('button', { name: 'Generate session plan' }).click();

    await expect(page.locator('#plan-result')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#builder-status')).toBeHidden();

    // Plan text rendered from plan_markdown.
    await expect(page.locator('#plan-markdown h1, #plan-markdown h2').first()).toBeVisible();
    await expect(page.locator('#plan-markdown')).toContainText('length');

    // Every drill in the stubbed response has a well-formed diagram, so every slot should render
    // an actual svg.court-diagram, not the graceful-degrade fallback message.
    const diagramSlots = page.locator('.drill-diagram-slot');
    await expect(diagramSlots).toHaveCount(1);
    await expect(page.locator('svg.court-diagram')).toHaveCount(1);
    await expect(page.locator('.diagram-unavailable')).toHaveCount(0);

    // "Save this session plan" packaging is available once a plan has rendered.
    await expect(page.getByRole('button', { name: 'Download session.md' })).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test('the form rejects submitting without a theme selected the same way the Worker would', async ({ page }) => {
    await page.addInitScript((base) => {
      (window as unknown as { DRILL_BUILDER_API_BASE: string }).DRILL_BUILDER_API_BASE = base;
    }, WORKER_ORIGIN);

    await page.goto(`${STATIC_ORIGIN}/drill-builder/index.html`);

    // The <select> always has a value (native HTML select defaults to its first option), so this
    // proves the Worker's own validation independently, decoupled from the browser's form UI:
    // a request missing `theme` is rejected with a 4xx and a plain-language error, not a 5xx/crash.
    const response = await page.evaluate(async (workerOrigin) => {
      const res = await fetch(`${workerOrigin}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: 6, courts: 2, duration_minutes: 120 }),
      });
      return { status: res.status, body: await res.json() };
    }, WORKER_ORIGIN);

    expect(response.status).toBe(400);
    expect(String(response.body.error)).toContain('theme');
  });
});
