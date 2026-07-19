// web/lib/db.ts — SQLite storage via libSQL (planning/08-VERCEL-MIGRATION.md Phase V0).
// @libsql/client, two connection modes:
//   - TURSO_DATABASE_URL set (prod, Vercel env vars) → hosted Turso database. Vercel serverless
//     has an ephemeral filesystem, so a local SQLite file can't survive there.
//   - otherwise → file:./data/drills.db (relative to web/, gitignored; DATABASE_PATH overrides
//     the file location — used by the tests for a fresh tmp DB per test).
// Holds the rate_limits table that replaces the Worker's Cloudflare KV counter, plus the
// saved_drills table.
//
// Rate-limit semantics mirror worker/src/lib.js's applyRateLimit: the limit is checked AFTER
// request validation in the route (invalid requests never reach here), a denied request does
// NOT consume quota (count is only incremented on allow). One deliberate difference: the Worker
// used a rolling window starting at the first request; here windows are fixed clock-hour buckets
// (window_start = unix epoch of the hour), per the plan's (ip, window_start) primary key.
//
// All exported functions are async — the libsql client is promise-based (local file mode just
// resolves immediately). Everything else — SQL, signatures, decision semantics — is unchanged
// from the synchronous predecessor.
import fs from "node:fs";
import path from "node:path";
import { createClient, type Client, type InStatement } from "@libsql/client";

export const RATE_LIMIT_MAX = 30;
export const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

const MIGRATION: InStatement[] = [
  `CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT NOT NULL,
  window_start INTEGER NOT NULL,   -- unix epoch of hour bucket
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip, window_start)
)`,
  `CREATE TABLE IF NOT EXISTS saved_drills (
  id TEXT PRIMARY KEY,             -- uuid
  visitor_token TEXT NOT NULL,
  title TEXT NOT NULL,
  payload TEXT NOT NULL,           -- full generated session plan JSON
  created_at INTEGER NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS idx_saved_drills_token ON saved_drills(visitor_token)`,
];

/**
 * Idempotent follow-up migration: adds saved_by to saved_drills when it isn't there yet
 * (databases created before the library went shared). PRAGMA table_info is checked first
 * because SQLite has no ADD COLUMN IF NOT EXISTS.
 */
async function ensureSavedByColumn(client: Client): Promise<void> {
  const rs = await client.execute("PRAGMA table_info(saved_drills)");
  if (!rs.rows.some((row) => row.name === "saved_by")) {
    await client.execute("ALTER TABLE saved_drills ADD COLUMN saved_by TEXT");
  }
}

interface DbHandle {
  client: Client;
  /** Resolves once the migration has run — every use awaits this before touching the DB. */
  ready: Promise<void>;
}

// Kept on globalThis so Next.js dev-mode module reloading doesn't open a second handle, and so
// the migration runs once per process (per cold start on serverless).
const globalForDb = globalThis as unknown as { __rcDb?: DbHandle };

function getHandle(): DbHandle {
  if (globalForDb.__rcDb) return globalForDb.__rcDb;

  const tursoUrl = process.env.TURSO_DATABASE_URL;
  let client: Client;
  if (tursoUrl) {
    client = createClient({ url: tursoUrl, authToken: process.env.TURSO_AUTH_TOKEN });
  } else {
    const dbPath = process.env.DATABASE_PATH ?? "./data/drills.db";
    // turbopackIgnore: DATABASE_PATH is a runtime env var — the path can't be statically traced.
    const resolved = path.resolve(/*turbopackIgnore: true*/ dbPath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    client = createClient({ url: `file:${resolved}` });
  }

  const handle: DbHandle = {
    client,
    ready: client
      .batch(MIGRATION, "write")
      .then(() => ensureSavedByColumn(client))
      .then(() => undefined),
  };
  globalForDb.__rcDb = handle;
  return handle;
}

/** The shared client, with the migration guaranteed applied. */
export async function getDb(): Promise<Client> {
  const handle = getHandle();
  await handle.ready;
  return handle.client;
}

/** Test-only: close the singleton so the next getDb() re-opens (e.g. with a new DATABASE_PATH). */
export async function resetDbForTests(): Promise<void> {
  if (globalForDb.__rcDb) {
    globalForDb.__rcDb.client.close();
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
 * increments it inside a write transaction, so the check-and-increment is atomic.
 */
export async function applyRateLimit(
  ip: string,
  now: number = Date.now()
): Promise<RateLimitResult> {
  const db = await getDb();
  const windowStart =
    Math.floor(now / 1000 / RATE_LIMIT_WINDOW_SECONDS) * RATE_LIMIT_WINDOW_SECONDS;

  const tx = await db.transaction("write");
  try {
    const rs = await tx.execute({
      sql: "SELECT count FROM rate_limits WHERE ip = ? AND window_start = ?",
      args: [ip, windowStart],
    });
    const count = rs.rows.length > 0 ? Number(rs.rows[0].count) : 0;

    if (count >= RATE_LIMIT_MAX) {
      await tx.rollback(); // read-only on this path — nothing to commit
      return { allowed: false, count, windowStart };
    }

    await tx.execute({
      sql: `INSERT INTO rate_limits (ip, window_start, count) VALUES (?, ?, 1)
            ON CONFLICT(ip, window_start) DO UPDATE SET count = count + 1`,
      args: [ip, windowStart],
    });
    await tx.commit();

    return { allowed: true, count: count + 1, windowStart };
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

// -----------------------------------------------------------------------------------------------
// Saved drills — the shared club library. Each row carries an anonymous per-browser visitor
// token (sent as the X-Visitor-Token header; it gates deletes) plus a saved_by founder name
// for display. listAllDrills is the public read path and never returns the token.
// -----------------------------------------------------------------------------------------------

export interface SavedDrillRow {
  id: string;
  title: string;
  /** Full generated session plan JSON ({ plan_markdown, drills }) as a string. */
  payload: string;
  /** Founding-squasher display name; null only for rows saved before the library went shared. */
  saved_by: string | null;
  /** Unix epoch milliseconds. */
  created_at: number;
  /** Present only when the caller supplied a visitor token: true when the row is theirs. */
  mine?: boolean;
}

export async function saveDrill(input: {
  id: string;
  visitorToken: string;
  title: string;
  payload: string;
  savedBy: string;
  createdAt?: number;
}): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO saved_drills (id, visitor_token, title, payload, saved_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      input.id,
      input.visitorToken,
      input.title,
      input.payload,
      input.savedBy,
      input.createdAt ?? Date.now(),
    ],
  });
}

/**
 * Every drill in the shared library, newest first. The visitor_token column is selected only
 * to compute `mine` when a token is passed — it is never part of the returned rows.
 */
export async function listAllDrills(visitorToken?: string): Promise<SavedDrillRow[]> {
  const db = await getDb();
  const rs = await db.execute(
    `SELECT id, visitor_token, title, payload, saved_by, created_at FROM saved_drills
     ORDER BY created_at DESC`
  );
  return rs.rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    payload: String(row.payload),
    saved_by: row.saved_by === null ? null : String(row.saved_by),
    created_at: Number(row.created_at),
    ...(visitorToken ? { mine: String(row.visitor_token) === visitorToken } : {}),
  }));
}

/**
 * Deletes a saved drill only when it belongs to this token. Returns true when a row was
 * deleted, false when the id doesn't exist or belongs to a different token (callers should
 * map both to the same 403/404 behaviour — wrong token → 403).
 */
export async function deleteDrill(id: string, visitorToken: string): Promise<boolean> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "DELETE FROM saved_drills WHERE id = ? AND visitor_token = ?",
    args: [id, visitorToken],
  });
  return rs.rowsAffected > 0;
}
