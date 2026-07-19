// Tests for web/lib/db.ts — rate limiting (the SQLite replacement for the Worker's KV counter)
// and the saved_drills CRUD that Phase 4 builds on. Each test gets a fresh temp database via
// DATABASE_PATH + resetDbForTests().
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyRateLimit,
  deleteDrill,
  getDb,
  listDrillsForToken,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_SECONDS,
  resetDbForTests,
  saveDrill,
} from "./db";

const HOUR_MS = RATE_LIMIT_WINDOW_SECONDS * 1000;

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rc-db-test-"));
  process.env.DATABASE_PATH = path.join(tmpDir, "test.db");
  resetDbForTests();
});

afterEach(() => {
  resetDbForTests();
  delete process.env.DATABASE_PATH;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("getDb", () => {
  it("creates the database file and parent directory, runs migrations", () => {
    const db = getDb();
    expect(fs.existsSync(process.env.DATABASE_PATH as string)).toBe(true);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as { name: string }[];
    expect(tables.map((t) => t.name)).toEqual(["rate_limits", "saved_drills"]);
  });

  it("returns the same instance on repeated calls", () => {
    expect(getDb()).toBe(getDb());
  });
});

describe("applyRateLimit", () => {
  const t0 = 1_700_000_000_000;

  it("allows the first RATE_LIMIT_MAX requests for an IP, counting up", () => {
    for (let i = 1; i <= RATE_LIMIT_MAX; i += 1) {
      const result = applyRateLimit("1.2.3.4", t0 + i * 1000);
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(i);
    }
  });

  it("denies the (RATE_LIMIT_MAX + 1)th request in the same window without consuming quota", () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      applyRateLimit("1.2.3.4", t0);
    }
    const denied = applyRateLimit("1.2.3.4", t0 + 1000);
    expect(denied.allowed).toBe(false);
    expect(denied.count).toBe(RATE_LIMIT_MAX);

    // Denied requests don't increment — still denied at the same count afterwards.
    const deniedAgain = applyRateLimit("1.2.3.4", t0 + 2000);
    expect(deniedAgain.allowed).toBe(false);
    expect(deniedAgain.count).toBe(RATE_LIMIT_MAX);
  });

  it("tracks IPs independently", () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      applyRateLimit("1.2.3.4", t0);
    }
    expect(applyRateLimit("1.2.3.4", t0).allowed).toBe(false);
    expect(applyRateLimit("5.6.7.8", t0).allowed).toBe(true);
  });

  it("resets in the next hour bucket", () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      applyRateLimit("1.2.3.4", t0);
    }
    expect(applyRateLimit("1.2.3.4", t0).allowed).toBe(false);

    const next = applyRateLimit("1.2.3.4", t0 + HOUR_MS);
    expect(next.allowed).toBe(true);
    expect(next.count).toBe(1);
    expect(next.windowStart).toBeGreaterThan(
      Math.floor(t0 / 1000 / RATE_LIMIT_WINDOW_SECONDS) * RATE_LIMIT_WINDOW_SECONDS
    );
  });
});

describe("saved drills", () => {
  it("saves and lists drills for a token, newest first", () => {
    saveDrill({ id: "a", visitorToken: "tok-1", title: "First", payload: "{}", createdAt: 1000 });
    saveDrill({ id: "b", visitorToken: "tok-1", title: "Second", payload: "{}", createdAt: 2000 });
    saveDrill({ id: "c", visitorToken: "tok-2", title: "Other", payload: "{}", createdAt: 3000 });

    const rows = listDrillsForToken("tok-1");
    expect(rows.map((r) => r.id)).toEqual(["b", "a"]);
    expect(rows[0].visitor_token).toBe("tok-1");
  });

  it("defaults created_at to now", () => {
    const before = Date.now();
    saveDrill({ id: "a", visitorToken: "tok-1", title: "T", payload: "{}" });
    const [row] = listDrillsForToken("tok-1");
    expect(row.created_at).toBeGreaterThanOrEqual(before);
  });

  it("deletes only when the token matches", () => {
    saveDrill({ id: "a", visitorToken: "tok-1", title: "T", payload: "{}" });
    expect(deleteDrill("a", "tok-2")).toBe(false);
    expect(listDrillsForToken("tok-1")).toHaveLength(1);
    expect(deleteDrill("a", "tok-1")).toBe(true);
    expect(listDrillsForToken("tok-1")).toHaveLength(0);
  });

  it("returns false when deleting a non-existent id", () => {
    expect(deleteDrill("nope", "tok-1")).toBe(false);
  });
});
