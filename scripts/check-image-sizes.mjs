#!/usr/bin/env node
// scripts/check-image-sizes.mjs — asserts every assets/**/*.webp is under 100KB.

import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS_DIR = path.join(REPO_ROOT, 'assets');
const MAX_BYTES = 100 * 1024;

function findWebpFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findWebpFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.webp')) out.push(full);
  }
  return out;
}

const webpFiles = findWebpFiles(ASSETS_DIR);
const oversized = webpFiles
  .map((file) => ({ file, size: statSync(file).size }))
  .filter(({ size }) => size > MAX_BYTES);

if (webpFiles.length === 0) {
  console.error('No .webp files found under assets/ — nothing to check.');
  process.exit(1);
}

if (oversized.length > 0) {
  for (const { file, size } of oversized) {
    console.error(`${path.relative(REPO_ROOT, file)}: ${size} bytes (max ${MAX_BYTES})`);
  }
  process.exit(1);
}

console.log(`${webpFiles.length} .webp file(s) checked, all under ${MAX_BYTES} bytes.`);
