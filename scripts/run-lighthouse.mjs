#!/usr/bin/env node
// scripts/run-lighthouse.mjs — serves the site locally, runs Lighthouse against Home, Drills, and
// Drill Builder, asserts Performance >= 90 and CLS < 0.1 on each.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4173;
const PERF_THRESHOLD = 0.9;
const CLS_THRESHOLD = 0.1;

const PAGES = [
  { name: 'Home', path: '/' },
  { name: 'Drills', path: '/drills/' },
  { name: 'Drill Builder', path: '/drill-builder/' },
];

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

function startServer() {
  const server = createServer(async (req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const filePath = path.join(REPO_ROOT, urlPath);
    if (!filePath.startsWith(REPO_ROOT)) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      await stat(filePath);
      const body = await readFile(filePath);
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

async function auditPage(chrome, page) {
  const result = await lighthouse(
    `http://localhost:${PORT}${page.path}`,
    { port: chrome.port, output: 'json', logLevel: 'silent', onlyCategories: ['performance'] }
  );
  const lhr = result.lhr;
  const perfScore = lhr.categories.performance.score;
  const cls = lhr.audits['cumulative-layout-shift'].numericValue;
  return { ...page, perfScore, cls };
}

const server = await startServer();
const chrome = await chromeLauncher.launch({
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
});

let failures = [];
try {
  for (const page of PAGES) {
    const { perfScore, cls } = await auditPage(chrome, page);
    const perfPct = Math.round(perfScore * 100);
    console.log(`${page.name}: performance ${perfPct}, CLS ${cls.toFixed(3)}`);
    if (perfScore < PERF_THRESHOLD) {
      failures.push(`${page.name}: performance ${perfPct} < ${PERF_THRESHOLD * 100}`);
    }
    if (cls >= CLS_THRESHOLD) {
      failures.push(`${page.name}: CLS ${cls.toFixed(3)} >= ${CLS_THRESHOLD}`);
    }
  }
} finally {
  await chrome.kill();
  server.close();
}

if (failures.length > 0) {
  console.error('\nFAIL:');
  failures.forEach((f) => console.error(`  ${f}`));
  process.exit(1);
}

console.log('\nAll pages meet performance and CLS thresholds.');
