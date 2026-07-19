// web/lib/generate.ts — pure(ish) logic for the AI Drill Builder, ported verbatim (behaviour) from
// worker/src/lib.js as part of the VPS migration (planning/07-VPS-MIGRATION.md Phase 0). Kept free
// of any Cloudflare/Next runtime dependency so `npx vitest run` exercises it directly.
//
// Covers (per planning/00-master-plan.md Phase 4):
//   - coordinate clamping to [0,1]
//   - drill_name matching against plan_markdown headings
//   - request validation (rejects missing players/courts/theme/duration_minutes)
//   - the rate-limit counter logic (storage itself is mocked in tests, not the unit under test)

import { LEVELS, SURPRISE_ME, THEMES } from './schema';

// -----------------------------------------------------------------------------------------------
// Shared loose types — the originals were plain JS objects; these keep the port faithful without
// pretending the model's JSON is more structured than it is.
// -----------------------------------------------------------------------------------------------

export interface Diagram {
  title?: string;
  players?: Array<Record<string, unknown>>;
  arrows?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface Drill {
  drill_name?: string;
  diagram?: Diagram | null;
}

export interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  record: RateLimitRecord;
}

/** Any object implementing the Cloudflare KV get/put shape (tests pass an in-memory mock). */
export interface KvLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

// -----------------------------------------------------------------------------------------------
// Request validation
// -----------------------------------------------------------------------------------------------

/**
 * Validates the drill-builder POST body per planning/05-AI-DRILL-BUILDER-PROMPT.md's "Inputs from
 * the form". Returns { valid: boolean, errors: string[] }.
 */
export function validateRequestBody(body: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (body == null || typeof body !== 'object') {
    return { valid: false, errors: ['request body must be a JSON object'] };
  }

  const b = body as Record<string, unknown>;

  if (!Number.isInteger(b.players) || (b.players as number) < 1) {
    errors.push('players is required and must be a positive integer');
  }

  if (!Number.isInteger(b.courts) || (b.courts as number) < 1) {
    errors.push('courts is required and must be a positive integer');
  }

  if (typeof b.theme !== 'string' || b.theme.trim() === '') {
    errors.push('theme is required');
  } else if (b.theme !== SURPRISE_ME && !THEMES.includes(b.theme)) {
    errors.push(`theme must be one of: ${THEMES.join(', ')}, or "${SURPRISE_ME}"`);
  }

  if (typeof b.level !== 'string' || b.level.trim() === '') {
    errors.push('level is required');
  } else if (!LEVELS.includes(b.level)) {
    errors.push(`level must be one of: ${LEVELS.join(', ')}`);
  }

  if (!Number.isFinite(b.duration_minutes) || (b.duration_minutes as number) <= 0) {
    errors.push('duration_minutes is required and must be a positive number');
  }

  if (b.notes != null && typeof b.notes !== 'string') {
    errors.push('notes must be a string when present');
  }

  return { valid: errors.length === 0, errors };
}

// -----------------------------------------------------------------------------------------------
// Coordinate clamping (defense in depth — see 06-SVG-DIAGRAM-SYSTEM.md "Validation")
// -----------------------------------------------------------------------------------------------

/** Clamps a value to [0, 1]. Non-finite input (NaN, undefined, strings, ...) clamps to 0. */
export function clamp01(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** Returns a new diagram with every player x/y and arrow point clamped to [0,1]. Does not mutate. */
export function clampDiagram<T>(diagram: T): T {
  if (!diagram || typeof diagram !== 'object') return diagram;

  const d = diagram as Diagram;

  const players = Array.isArray(d.players)
    ? d.players.map((p) => ({ ...p, x: clamp01(p && p.x), y: clamp01(p && p.y) }))
    : d.players;

  const arrows = Array.isArray(d.arrows)
    ? d.arrows.map((a) => ({
        ...a,
        points: Array.isArray(a && a.points)
          ? (a.points as unknown[]).map((pt) => [
              clamp01(pt && (pt as unknown[])[0]),
              clamp01(pt && (pt as unknown[])[1]),
            ])
          : a && a.points,
      }))
    : d.arrows;

  return { ...d, players, arrows } as T;
}

// -----------------------------------------------------------------------------------------------
// drill_name <-> plan_markdown matching (see 06-SVG-DIAGRAM-SYSTEM.md "Validation")
// -----------------------------------------------------------------------------------------------

/**
 * True if drillName matches a Markdown heading in planMarkdown (a line starting with one or more
 * `#` whose remaining text equals drillName, case-insensitive, ignoring surrounding whitespace and
 * markdown emphasis markers). This is intentionally forgiving of minor punctuation drift since the
 * model writes both plan_markdown and drill_name in the same response but isn't guaranteed to copy
 * the string byte-for-byte.
 */
export function drillNameMatchesPlan(drillName: unknown, planMarkdown: unknown): boolean {
  if (typeof drillName !== 'string' || drillName.trim() === '') return false;
  if (typeof planMarkdown !== 'string' || planMarkdown.trim() === '') return false;

  const normalize = (s: string) =>
    s
      .replace(/[*_`]/g, '')
      .trim()
      .toLowerCase();

  const target = normalize(drillName);
  const headingPattern = /^#{1,6}\s+(.*)$/;

  return planMarkdown
    .split('\n')
    .some((line) => {
      const match = headingPattern.exec(line.trim());
      if (!match) return false;
      return normalize(match[1]) === target;
    });
}

/**
 * Applies coordinate clamping and drill_name matching to every drill. Drills whose diagram still
 * fails validation after clamping (drill_name doesn't match any heading, or diagram is structurally
 * missing) are degraded: the drill_name is kept but diagram is set to null, per the "Malformed-
 * diagram fallback" graceful-degrade path in planning/05-AI-DRILL-BUILDER-PROMPT.md — render the
 * drill's text, drop just that diagram, no blocking, no automatic re-prompt.
 *
 * Returns { drills, total, degraded } where degraded is the count of drills whose diagram was
 * dropped.
 */
export function filterValidDiagrams(
  drills: unknown,
  planMarkdown: unknown
): { drills: Drill[]; total: number; degraded: number } {
  const list: Drill[] = Array.isArray(drills) ? drills : [];
  let degraded = 0;

  const out = list.map((drill) => {
    const hasDiagram =
      drill &&
      drill.diagram &&
      Array.isArray(drill.diagram.players) &&
      drill.diagram.players.length > 0 &&
      Array.isArray(drill.diagram.arrows) &&
      drill.diagram.arrows.length > 0;

    const nameMatches = drillNameMatchesPlan(drill && drill.drill_name, planMarkdown);

    if (!hasDiagram || !nameMatches) {
      degraded += 1;
      return { drill_name: drill && drill.drill_name, diagram: null };
    }

    return { drill_name: drill.drill_name, diagram: clampDiagram(drill.diagram) };
  });

  return { drills: out, total: out.length, degraded };
}

// -----------------------------------------------------------------------------------------------
// User message template (see 05-AI-DRILL-BUILDER-PROMPT.md "User message template")
// -----------------------------------------------------------------------------------------------

export function buildUserMessage({
  players,
  courts,
  theme,
  level,
  duration_minutes,
  notes,
}: {
  players: number;
  courts: number;
  theme: string;
  level: string;
  duration_minutes: number;
  notes?: string;
}): string {
  const lines = [
    `Confirmed players: ${players}`,
    `Courts booked: ${courts}`,
    `Theme: ${theme}`,
    `Target level: ${level}`,
    `Session length: ${duration_minutes} minutes`,
    `Additional notes: ${notes && String(notes).trim() ? notes : 'none'}`,
  ];

  if (theme === SURPRISE_ME) {
    lines.push(
      `Pick a theme not commonly repeated week-to-week (${THEMES.join(', ')}) and state which you ` +
        'chose at the top of the plan.'
    );
  }

  lines.push('', 'Please produce the full session plan.');

  return lines.join('\n');
}

// -----------------------------------------------------------------------------------------------
// Rate limiting — 30 generations/IP/hour (see 03-TECHNICAL-ARCHITECTURE.md). The Cloudflare KV
// counter dies with the Worker; Phase 3 reimplements storage in SQLite — this pure logic is the
// part that carries over unchanged.
// -----------------------------------------------------------------------------------------------

export const RATE_LIMIT_MAX = 30;
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/**
 * Pure decision function: given the existing record (or null) and the current time, decides
 * whether this request is allowed and what the new record should be. No storage access here — this
 * is what makes the rate-limit *logic* unit-testable without a real (or even mocked) store.
 */
export function computeRateLimitDecision(record: unknown, now: number): RateLimitDecision {
  const r = record as RateLimitRecord | null;
  if (!r || typeof r.count !== 'number' || typeof r.resetAt !== 'number' || now >= r.resetAt) {
    return {
      allowed: true,
      record: { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS },
    };
  }

  if (r.count >= RATE_LIMIT_MAX) {
    return { allowed: false, record: r };
  }

  return {
    allowed: true,
    record: { count: r.count + 1, resetAt: r.resetAt },
  };
}

/**
 * Applies the rate limit for `ip` against a Cloudflare KV namespace binding (or any object
 * implementing the same get/put(key, value, {expirationTtl}) shape — tests pass an in-memory
 * mock of that interface, not a mock of computeRateLimitDecision itself).
 */
export async function applyRateLimit(kv: KvLike, ip: string, now: number = Date.now()): Promise<RateLimitDecision> {
  const key = `ratelimit:${ip}`;
  const raw = await kv.get(key);
  const record = raw ? JSON.parse(raw) : null;

  const decision = computeRateLimitDecision(record, now);

  if (decision.allowed) {
    const ttlSeconds = Math.max(60, Math.ceil((decision.record.resetAt - now) / 1000));
    await kv.put(key, JSON.stringify(decision.record), { expirationTtl: ttlSeconds });
  }

  return decision;
}

// -----------------------------------------------------------------------------------------------
// CORS
// -----------------------------------------------------------------------------------------------

// Restricted to the production custom domain and the root-site GitHub Pages URL used during
// development before the custom domain is cut over (see 03-TECHNICAL-ARCHITECTURE.md "Security
// notes"). Anything beyond this list must be supplied per-environment via env.EXTRA_ALLOWED_ORIGIN
// (e.g. a local dev/test server URL) — never hardcoded here.
export const ALLOWED_ORIGINS = ['https://rightcourtsc.com', 'https://vincerhodes.github.io'];

export function isAllowedOrigin(origin: unknown, extraAllowedOrigins: string[] = []): boolean {
  if (!origin || typeof origin !== 'string') return false;
  return ALLOWED_ORIGINS.includes(origin) || extraAllowedOrigins.includes(origin);
}

export function corsHeaders(origin: unknown, extraAllowedOrigins: string[] = []): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  if (isAllowedOrigin(origin, extraAllowedOrigins)) {
    headers['Access-Control-Allow-Origin'] = origin as string;
    headers['Vary'] = 'Origin';
  }
  return headers;
}

// -----------------------------------------------------------------------------------------------
// Gallery — Google Drive folder listing (see gallery/index.html, assets/js/gallery.js)
// -----------------------------------------------------------------------------------------------

const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';

/**
 * Builds a Google Drive API v3 files.list URL for images directly inside `folderId`. The folder is
 * shared "anyone with the link can view", so a plain (unauthenticated-user) API key restricted to
 * the Drive API is enough — no OAuth flow needed. See wrangler.toml for how GOOGLE_DRIVE_API_KEY
 * is provisioned.
 */
export function buildDriveListUrl(folderId: string, apiKey: string, pageToken?: string): string {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
    key: apiKey,
    fields: 'nextPageToken, files(id, name, imageMediaMetadata(width, height))',
    orderBy: 'name',
    pageSize: '1000',
  });
  if (pageToken) params.set('pageToken', pageToken);
  return `${DRIVE_FILES_URL}?${params.toString()}`;
}

/**
 * Google's stable image-proxy thumbnail URL — works for any publicly-viewable Drive file without
 * needing the API key client-side, and accepts an arbitrary target width via `sz=wNNN`.
 */
export function buildThumbnailUrl(fileId: string, width: number): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`;
}

export interface DriveFileEntry {
  id?: unknown;
  name?: unknown;
  imageMediaMetadata?: { width?: unknown; height?: unknown };
}

export interface GalleryPhoto {
  id: string;
  name: string;
  thumb: string;
  full: string;
  width: number | null;
  height: number | null;
}

/**
 * Shapes raw Drive `files` entries into what the gallery client renders: a small thumb for the
 * grid, a larger full for the slideshow/lightbox. Drops anything without a usable id (defensive —
 * malformed API response shouldn't crash the page).
 */
export function shapeGalleryPhotos(files: unknown): GalleryPhoto[] {
  const list: DriveFileEntry[] = Array.isArray(files) ? files : [];
  return list
    .filter((f) => f && typeof f.id === 'string' && f.id.trim() !== '')
    .map((f) => ({
      id: f.id as string,
      name: typeof f.name === 'string' && f.name.trim() !== '' ? f.name : (f.id as string),
      thumb: buildThumbnailUrl(f.id as string, 500),
      full: buildThumbnailUrl(f.id as string, 1800),
      width: f.imageMediaMetadata && Number.isFinite(f.imageMediaMetadata.width) ? (f.imageMediaMetadata.width as number) : null,
      height: f.imageMediaMetadata && Number.isFinite(f.imageMediaMetadata.height) ? (f.imageMediaMetadata.height as number) : null,
    }));
}
