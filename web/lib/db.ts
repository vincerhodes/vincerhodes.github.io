// web/lib/db.ts — SQLite storage for the VPS backend (planning/07-VPS-MIGRATION.md Phase 3).
// better-sqlite3, single file; path from DATABASE_PATH env var, default ./data/drills.db
// (relative to web/ — the systemd unit sets DATABASE_PATH=/var/lib/rightcourtsc/drills.db on
// the VPS). Holds the rate_limits table that replaces the Worker's Cloudflare KV counter, plus
// the saved_drills table ahead of Phase 4.
//
// Rate-limit semantics mirror worker/src/lib.js's applyRateLimit: the limit is checked AFTER
// request validation in the route (invalid requests never reach here), a denied request does
// NOT consume quota (count is only incremented on allow). One deliberate difference: the Worker
// used a rolling window starting at the first request; here windows are fixed clock-hour buckets
// (window_start = unix epoch of the hour), per the plan's (ip, window_start) primary key.
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export const RATE_LIMIT_MAX = 30;
export const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

const MIGRATION = `
CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT NOT NULL,
  window_start INTEGER NOT NULL,   -- unix epoch of hour bucket
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip, window_start)
);
CREATE TABLE IF NOT EXISTS saved_drills (
  id TEXT PRIMARY KEY,             -- uuid
  visitor_token TEXT NOT NULL,
  title TEXT NOT NULL,
  payload TEXT NOT NULL,           -- full generated session plan JSON
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_saved_drills_token ON saved_drills(visitor_token);
`;

// Kept on globalThis so Next.js dev-mode module reloading doesn't open a second handle.
const globalForDb = globalThis as unknown as { __rcDb?: Database.Database };

export function getDb(): Database.Database {
  if (globalForDb.__rcDb) return globalForDb.__rcDb;

  const dbPath = process.env.DATABASE_PATH ?? "./data/drills.db";
  // turbopackIgnore: DATABASE_PATH is a runtime env var — the path can't be statically traced.
  const resolved = path.resolve(/*turbopackIgnore: true*/ dbPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });

  const db = new Database(resolved);
  db.exec(MIGRATION);
  globalForDb.__rcDb = db;
  return db;
}

/** Test-only: close the singleton so the next getDb() re-opens (e.g. with a new DATABASE_PATH). */
export function resetDbForTests(): void {
  if (globalForDb.__rcDb) {
    globalForDb.__rcDb.close();
    delete globalForDb.__rcDb;
  }
}

// -----------------------------------------------------------------------------------------------
// Rate limiting — 30 generations/IP/hour (see worker/src/lib.js RATE_LIMIT_* and 03-TECHNICAL-
// ARCHITECTURE.md). Deliberately generous: shared clubhouse wifi means many users behind one IP.
// -----------------------------------------------------------------------------------------------

export interface RateLimitResult {
  allowed: boolean;
  /** Count for this IP in the current window, after this request (unchanged when denied). */
  count: number;
  /** Unix epoch of the current hour bucket. */
  windowStart: number;
}

/**
 * Applies the rate limit for `ip` in the current hour bucket. Like the Worker's
 * computeRateLimitDecision, a denied request leaves the count untouched; an allowed one
 * increments it atomically (better-sqlite3 transactions are synchronous, so no race).
 */
export function applyRateLimit(ip: string, now: number = Date.now()): RateLimitResult {
  const db = getDb();
  const windowStart =
    Math.floor(now / 1000 / RATE_LIMIT_WINDOW_SECONDS) * RATE_LIMIT_WINDOW_SECONDS;

  const apply = db.transaction((): RateLimitResult => {
    const row = db
      .prepare("SELECT count FROM rate_limits WHERE ip = ? AND window_start = ?")
      .get(ip, windowStart) as { count: number } | undefined;
    const count = row ? row.count : 0;

    if (count >= RATE_LIMIT_MAX) {
      return { allowed: false, count, windowStart };
    }

    db.prepare(
      `INSERT INTO rate_limits (ip, window_start, count) VALUES (?, ?, 1)
       ON CONFLICT(ip, window_start) DO UPDATE SET count = count + 1`
    ).run(ip, windowStart);

    return { allowed: true, count: count + 1, windowStart };
  });

  return apply();
}

// -----------------------------------------------------------------------------------------------
// Saved drills (Phase 4) — anonymous per-browser token identity, no auth. See the plan's
// "Saved drills identity" decision: the client sends an X-Visitor-Token header.
// -----------------------------------------------------------------------------------------------

export interface SavedDrillRow {
  id: string;
  visitor_token: string;
  title: string;
  /** Full generated session plan JSON ({ plan_markdown, drills }) as a string. */
  payload: string;
  /** Unix epoch milliseconds. */
  created_at: number;
}

export function saveDrill(input: {
  id: string;
  visitorToken: string;
  title: string;
  payload: string;
  createdAt?: number;
}): void {
  getDb()
    .prepare(
      `INSERT INTO saved_drills (id, visitor_token, title, payload, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(input.id, input.visitorToken, input.title, input.payload, input.createdAt ?? Date.now());
}

/** All drills saved by this browser token, newest first. */
export function listDrillsForToken(visitorToken: string): SavedDrillRow[] {
  return getDb()
    .prepare(
      `SELECT id, visitor_token, title, payload, created_at FROM saved_drills
       WHERE visitor_token = ? ORDER BY created_at DESC`
    )
    .all(visitorToken) as SavedDrillRow[];
}

/**
 * Deletes a saved drill only when it belongs to this token. Returns true when a row was
 * deleted, false when the id doesn't exist or belongs to a different token (callers should
 * map both to the same 403/404 behaviour — see Phase 4 acceptance: wrong token → 403).
 */
export function deleteDrill(id: string, visitorToken: string): boolean {
  const result = getDb()
    .prepare("DELETE FROM saved_drills WHERE id = ? AND visitor_token = ?")
    .run(id, visitorToken);
  return result.changes > 0;
}
