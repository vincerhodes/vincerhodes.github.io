#!/usr/bin/env node
// scripts/validate-diagrams.mjs — DOMAIN.diagram-schema-valid
//
// Validates every web/content/sessions/**/diagrams/*.json against the diagram data schema defined in
// planning/06-SVG-DIAGRAM-SYSTEM.md ("Per-drill data schema") and planning/05-AI-DRILL-BUILDER-PROMPT.md
// (the `return_session_plan` tool's `drills[].diagram` schema — same shape, this is the static-library
// counterpart):
//   - non-empty players[] and arrows[]
//   - each player has id/label/color/x/y, x and y in [0,1], color in the 3-value brand enum
//   - each arrow has number/type/points, type in ["ball","movement"], each point a [x,y] pair in [0,1]
//
// This is a structural/schema check (ajv), not a domain formula — see 00-master-plan.md's "Tier: lite"
// note for why this stays out of ground-truth/*.yaml despite the `domain` tag.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SESSIONS_ROOT = path.join(REPO_ROOT, 'web', 'content', 'sessions');

// Must match the 3 brand player-marker colors (Forest Green / Muted Sage / Near-black Green) —
// see 01-BRAND-STYLE-GUIDE.md and 06-SVG-DIAGRAM-SYSTEM.md's per-drill data schema.
const BRAND_PLAYER_COLORS = ['#21472E', '#8FA893', '#152218'];

const diagramSchema = {
  type: 'object',
  required: ['title', 'players', 'arrows'],
  additionalProperties: true,
  properties: {
    title: { type: 'string', minLength: 1 },
    players: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['id', 'label', 'color', 'x', 'y'],
        properties: {
          id: { type: 'string', minLength: 1 },
          label: { type: 'string', minLength: 1 },
          color: { type: 'string', enum: BRAND_PLAYER_COLORS },
          x: { type: 'number', minimum: 0, maximum: 1 },
          y: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
    },
    arrows: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['number', 'type', 'points'],
        properties: {
          number: { type: 'integer' },
          type: { type: 'string', enum: ['ball', 'movement'] },
          points: {
            type: 'array',
            minItems: 2,
            items: {
              type: 'array',
              minItems: 2,
              maxItems: 2,
              items: { type: 'number', minimum: 0, maximum: 1 },
            },
          },
        },
      },
    },
  },
};

/** Recursively find every *.json file that lives directly inside a directory named "diagrams". */
function findDiagramFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...findDiagramFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.json') && path.basename(dir) === 'diagrams') {
      out.push(full);
    }
  }
  return out;
}

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(diagramSchema);

const files = findDiagramFiles(SESSIONS_ROOT).sort();

if (files.length === 0) {
  console.error(`validate-diagrams: no diagram JSON files found under ${path.relative(REPO_ROOT, SESSIONS_ROOT)}/**/diagrams/*.json`);
  process.exit(1);
}

let failed = false;

for (const file of files) {
  const rel = path.relative(REPO_ROOT, file);
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    failed = true;
    console.error(`✗ ${rel}: invalid JSON — ${err.message}`);
    continue;
  }

  const valid = validate(data);
  if (!valid) {
    failed = true;
    console.error(`✗ ${rel}:`);
    for (const err of validate.errors ?? []) {
      console.error(`    ${err.instancePath || '/'} ${err.message}`);
    }
  } else {
    console.log(`✓ ${rel}`);
  }
}

if (failed) {
  console.error('validate-diagrams: FAILED');
  process.exit(1);
}

console.log(`validate-diagrams: ${files.length} diagram file(s) valid`);
process.exit(0);
