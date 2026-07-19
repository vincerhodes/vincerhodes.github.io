#!/usr/bin/env node
// web/scripts/validate-tool-schema.mjs — DOMAIN.tool-schema-valid
//
// Validates web/lib/schema.ts's RETURN_SESSION_PLAN_TOOL — the single source of truth for the
// AI drill builder's tool schema since the Cloudflare Worker was retired (V4 cutover,
// 2026-07-19). Performs three checks:
//   1. `parameters` compiles as a valid JSON Schema (ajv.compile doesn't throw).
//   2. The tool's structural shape matches the spec exactly (function name, required fields at
//      every level, the color/type enums, x/y bounds).
//   3. A known-good sample payload validates; known-bad payloads each fail.
//
// web/lib/schema.ts is TypeScript, so it is bundled to a temp file with esbuild (already a vitest
// dependency) before import. ajv resolves from the repo-root node_modules. Run from anywhere:
//   node web/scripts/validate-tool-schema.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Ajv from 'ajv';
import { build as esbuild } from 'esbuild';

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_PATH = path.join(WEB_ROOT, 'lib', 'schema.ts');

// Bundle the TS schema module to a temp ESM file so plain node can import it.
const tmpFile = path.join(os.tmpdir(), `rc-schema-${process.pid}.mjs`);
await esbuild({
  entryPoints: [SCHEMA_PATH],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: tmpFile,
  logLevel: 'silent',
});
const { ARROW_TYPES, PLAYER_COLORS, RETURN_SESSION_PLAN_TOOL } = await import(pathToFileURL(tmpFile).href);
fs.unlinkSync(tmpFile);

const failures = [];

function check(label, condition) {
  if (!condition) failures.push(label);
}

// --- 1. Top-level tool shape ---------------------------------------------------------------------
check('type is "function"', RETURN_SESSION_PLAN_TOOL?.type === 'function');
check('function.name is "return_session_plan"', RETURN_SESSION_PLAN_TOOL?.function?.name === 'return_session_plan');
check(
  'function.description is a non-empty string',
  typeof RETURN_SESSION_PLAN_TOOL?.function?.description === 'string' &&
    RETURN_SESSION_PLAN_TOOL.function.description.length > 0
);

const params = RETURN_SESSION_PLAN_TOOL?.function?.parameters;
check('parameters.type is "object"', params?.type === 'object');
check(
  'parameters.required includes plan_markdown and drills',
  Array.isArray(params?.required) &&
    params.required.includes('plan_markdown') &&
    params.required.includes('drills')
);
check('properties.plan_markdown.type is "string"', params?.properties?.plan_markdown?.type === 'string');

const drillsSchema = params?.properties?.drills;
check('properties.drills.type is "array"', drillsSchema?.type === 'array');
check('properties.drills.minItems is 1', drillsSchema?.minItems === 1);

const drillItem = drillsSchema?.items;
check(
  'drills.items.required includes drill_name and diagram',
  Array.isArray(drillItem?.required) &&
    drillItem.required.includes('drill_name') &&
    drillItem.required.includes('diagram')
);
check('drills.items.properties.drill_name.type is "string"', drillItem?.properties?.drill_name?.type === 'string');

const diagramSchema = drillItem?.properties?.diagram;
check(
  'diagram.required includes title, players, arrows',
  Array.isArray(diagramSchema?.required) &&
    ['title', 'players', 'arrows'].every((k) => diagramSchema.required.includes(k))
);

const playersSchema = diagramSchema?.properties?.players;
check('diagram.properties.players.type is "array"', playersSchema?.type === 'array');
check('diagram.properties.players.minItems is 1', playersSchema?.minItems === 1);

const playerItem = playersSchema?.items;
check(
  'players.items.required includes id, label, color, x, y',
  Array.isArray(playerItem?.required) &&
    ['id', 'label', 'color', 'x', 'y'].every((k) => playerItem.required.includes(k))
);
check(
  'players.items.properties.color.enum matches the 3-value brand palette',
  Array.isArray(playerItem?.properties?.color?.enum) &&
    playerItem.properties.color.enum.length === PLAYER_COLORS.length &&
    PLAYER_COLORS.every((c) => playerItem.properties.color.enum.includes(c))
);
check(
  'players.items.properties.x is a number in [0,1]',
  playerItem?.properties?.x?.type === 'number' &&
    playerItem.properties.x.minimum === 0 &&
    playerItem.properties.x.maximum === 1
);
check(
  'players.items.properties.y is a number in [0,1]',
  playerItem?.properties?.y?.type === 'number' &&
    playerItem.properties.y.minimum === 0 &&
    playerItem.properties.y.maximum === 1
);

const arrowsSchema = diagramSchema?.properties?.arrows;
check('diagram.properties.arrows.type is "array"', arrowsSchema?.type === 'array');
check('diagram.properties.arrows.minItems is 1', arrowsSchema?.minItems === 1);

const arrowItem = arrowsSchema?.items;
check(
  'arrows.items.required includes number, type, points',
  Array.isArray(arrowItem?.required) &&
    ['number', 'type', 'points'].every((k) => arrowItem.required.includes(k))
);
check('arrows.items.properties.number.type is "integer"', arrowItem?.properties?.number?.type === 'integer');
check(
  'arrows.items.properties.type.enum matches ["ball","movement"]',
  Array.isArray(arrowItem?.properties?.type?.enum) &&
    arrowItem.properties.type.enum.length === ARROW_TYPES.length &&
    ARROW_TYPES.every((t) => arrowItem.properties.type.enum.includes(t))
);

const pointsSchema = arrowItem?.properties?.points;
check('arrows.items.properties.points.type is "array"', pointsSchema?.type === 'array');
check('arrows.items.properties.points.minItems is 2 (an arrow needs at least 2 points)', pointsSchema?.minItems === 2);
check(
  'each point is a 2-tuple of numbers in [0,1]',
  pointsSchema?.items?.minItems === 2 &&
    pointsSchema?.items?.maxItems === 2 &&
    pointsSchema?.items?.items?.type === 'number' &&
    pointsSchema?.items?.items?.minimum === 0 &&
    pointsSchema?.items?.items?.maximum === 1
);

// --- 2. The schema compiles as valid JSON Schema (structural sanity, not just shape-matching) -----
const ajv = new Ajv({ allErrors: true, strict: false });
let validate;
try {
  validate = ajv.compile(params);
} catch (err) {
  failures.push(`parameters failed to compile as a JSON Schema: ${err.message}`);
}

// --- 3. Behavioral proof: a good payload passes, bad payloads each fail for the right reason ------
if (validate) {
  const goodPayload = {
    plan_markdown: '# Session theme\n\n## Drill 1: Test\n',
    drills: [
      {
        drill_name: 'Drill 1: Test',
        diagram: {
          title: 'Drill 1: Test',
          players: [{ id: 'A', label: 'Player A', color: PLAYER_COLORS[0], x: 0.3, y: 0.5 }],
          arrows: [{ number: 1, type: 'ball', points: [[0.1, 0.1], [0.2, 0.2]] }],
        },
      },
    ],
  };
  check('a well-formed sample payload validates', validate(goodPayload) === true);

  const badCases = {
    'missing drills': { plan_markdown: 'x', drills: undefined },
    'empty drills array (violates minItems: 1)': { plan_markdown: 'x', drills: [] },
    'player color outside the brand enum': {
      plan_markdown: 'x',
      drills: [
        {
          drill_name: 'D',
          diagram: {
            title: 'D',
            players: [{ id: 'A', label: 'A', color: '#FF0000', x: 0.1, y: 0.1 }],
            arrows: [{ number: 1, type: 'ball', points: [[0, 0], [1, 1]] }],
          },
        },
      ],
    },
    'x coordinate out of [0,1] bounds': {
      plan_markdown: 'x',
      drills: [
        {
          drill_name: 'D',
          diagram: {
            title: 'D',
            players: [{ id: 'A', label: 'A', color: PLAYER_COLORS[0], x: 1.5, y: 0.1 }],
            arrows: [{ number: 1, type: 'ball', points: [[0, 0], [1, 1]] }],
          },
        },
      ],
    },
    'arrow type outside ["ball","movement"]': {
      plan_markdown: 'x',
      drills: [
        {
          drill_name: 'D',
          diagram: {
            title: 'D',
            players: [{ id: 'A', label: 'A', color: PLAYER_COLORS[0], x: 0.1, y: 0.1 }],
            arrows: [{ number: 1, type: 'smash', points: [[0, 0], [1, 1]] }],
          },
        },
      ],
    },
  };

  for (const [label, payload] of Object.entries(badCases)) {
    const valid = validate(payload);
    check(`rejects invalid payload — ${label}`, valid === false);
  }
}

// --- Report -----------------------------------------------------------------------------------
const rel = path.relative(WEB_ROOT, SCHEMA_PATH);

if (failures.length > 0) {
  console.error(`validate-tool-schema: FAILED (${rel})`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}

console.log(`validate-tool-schema: ${rel} — matches the spec, schema compiles, and enforces its constraints`);
process.exit(0);
