// Tests for web/lib/db.ts — rate limiting (the SQLite replacement for the Worker's KV counter)
// and the saved_drills CRUD. Each test gets a fresh temp database via DATABASE_PATH +
// resetDbForTests() (file-mode libsql — no Turso account needed for tests).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyRateLimit,
  deleteDrill,
  getDb,
  listAllDrills,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_SECONDS,
  resetDbForTests,
  saveDrill,
} from "./db";

const HOUR_MS = RATE_LIMIT_WINDOW_SECONDS * 1000;

let tmpDir: string;

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rc-db-test-"));
  process.env.DATABASE_PATH = path.join(tmpDir, "test.db");
  await resetDbForTests();
});

afterEach(async () => {
  await resetDbForTests();
  delete process.env.DATABASE_PATH;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("getDb", () => {
  it("creates the database file and parent directory, runs migrations", async () => {
    const db = await getDb();
    expect(fs.existsSync(process.env.DATABASE_PATH as string)).toBe(true);
    const rs = await db.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
    );
    expect(rs.rows.map((t) => t.name)).toEqual(["rate_limits", "saved_drills"]);
    // The saved_by follow-up migration has run too.
    const cols = await db.execute("PRAGMA table_info(saved_drills)");
    expect(cols.rows.map((c) => c.name)).toContain("saved_by");
  });

  it("returns the same instance on repeated calls", async () => {
    expect(await getDb()).toBe(await getDb());
  });
});

describe("applyRateLimit", () => {
  const t0 = 1_700_000_000_000;

  it("allows the first RATE_LIMIT_MAX requests for an IP, counting up", async () => {
    for (let i = 1; i <= RATE_LIMIT_MAX; i += 1) {
      const result = await applyRateLimit("1.2.3.4", t0 + i * 1000);
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(i);
    }
  });

  it("denies the (RATE_LIMIT_MAX + 1)th request in the same window without consuming quota", async () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      await applyRateLimit("1.2.3.4", t0);
    }
    const denied = await applyRateLimit("1.2.3.4", t0 + 1000);
    expect(denied.allowed).toBe(false);
    expect(denied.count).toBe(RATE_LIMIT_MAX);

    // Denied requests don't increment — still denied at the same count afterwards.
    const deniedAgain = await applyRateLimit("1.2.3.4", t0 + 2000);
    expect(deniedAgain.allowed).toBe(false);
    expect(deniedAgain.count).toBe(RATE_LIMIT_MAX);
  });

  it("tracks IPs independently", async () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      await applyRateLimit("1.2.3.4", t0);
    }
    expect((await applyRateLimit("1.2.3.4", t0)).allowed).toBe(false);
    expect((await applyRateLimit("5.6.7.8", t0)).allowed).toBe(true);
  });

  it("resets in the next hour bucket", async () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      await applyRateLimit("1.2.3.4", t0);
    }
    expect((await applyRateLimit("1.2.3.4", t0)).allowed).toBe(false);

    const next = await applyRateLimit("1.2.3.4", t0 + HOUR_MS);
    expect(next.allowed).toBe(true);
    expect(next.count).toBe(1);
    expect(next.windowStart).toBeGreaterThan(
      Math.floor(t0 / 1000 / RATE_LIMIT_WINDOW_SECONDS) * RATE_LIMIT_WINDOW_SECONDS
    );
  });
});

describe("saved drills", () => {
  it("lists every saved drill newest first, with saved_by and no visitor token", async () => {
    await saveDrill({ id: "a", visitorToken: "tok-1", title: "First", payload: "{}", savedBy: "Jimmy", createdAt: 1000 });
    await saveDrill({ id: "b", visitorToken: "tok-1", title: "Second", payload: "{}", savedBy: "Joe", createdAt: 2000 });
    await saveDrill({ id: "c", visitorToken: "tok-2", title: "Other", payload: "{}", savedBy: "Adam", createdAt: 3000 });

    const rows = await listAllDrills();
    expect(rows.map((r) => r.id)).toEqual(["c", "b", "a"]);
    expect(rows.map((r) => r.saved_by)).toEqual(["Adam", "Joe", "Jimmy"]);
    expect(rows.every((r) => !("visitor_token" in r))).toBe(true);
    expect(rows.every((r) => !("mine" in r))).toBe(true);
  });

  it("flags mine when a visitor token is passed, still without leaking tokens", async () => {
    await saveDrill({ id: "a", visitorToken: "tok-1", title: "Mine", payload: "{}", savedBy: "Jimmy" });
    await saveDrill({ id: "b", visitorToken: "tok-2", title: "Theirs", payload: "{}", savedBy: "Jonny" });

    const rows = await listAllDrills("tok-1");
    expect(rows.find((r) => r.id === "a")?.mine).toBe(true);
    expect(rows.find((r) => r.id === "b")?.mine).toBe(false);
    expect(rows.every((r) => !("visitor_token" in r))).toBe(true);
  });

  it("deletes only when the token matches", async () => {
    await saveDrill({ id: "a", visitorToken: "tok-1", title: "T", payload: "{}", savedBy: "Jimmy" });
    expect(await deleteDrill("a", "tok-2")).toBe(false);
    expect(await listAllDrills()).toHaveLength(1);
    expect(await deleteDrill("a", "tok-1")).toBe(true);
    expect(await listAllDrills()).toHaveLength(0);
  });

  it("returns false when deleting a non-existent id", async () => {
    expect(await deleteDrill("nope", "tok-1")).toBe(false);
  });
});
