// @ts-check
import { defineConfig, devices } from '@playwright/test';

// No default browserName restriction on the "chromium" project so every existing test command
// (which always targets an explicit spec file) keeps behaving exactly as before this file existed.
// "firefox" is scoped to only the cross-browser smoke test via testMatch — webkit is omitted because
// it can't launch on this machine (missing system deps that need `sudo apt-get install`; see
// planning/00-master-plan.md's Phase 5 section).
export default defineConfig({
  testDir: 'tests',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testMatch: 'e2e/smoke.spec.ts' },
  ],
});
