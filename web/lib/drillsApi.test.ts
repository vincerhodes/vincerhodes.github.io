// Tests for the Phase 4 saved-drills API routes (app/api/drills, app/api/drills/[id]) — request
// validation, per-token isolation, and delete semantics. Handlers are called directly with web
// Request objects against a fresh temp database per test (DATABASE_PATH + resetDbForTests).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/drills/route";
import { DELETE } from "@/app/api/drills/[id]/route";
import { resetDbForTests } from "./db";

const TOKEN_A = "11111111-1111-4111-8111-111111111111";
const TOKEN_B = "22222222-2222-4222-8222-222222222222";

const VALID_PLAN = {
  plan_markdown: "# Session\n\nA plan.",
  drills: [{ drill_name: "Drill 1", diagram: null }],
};

let tmpDir: string;

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rc-drills-api-test-"));
  process.env.DATABASE_PATH = path.join(tmpDir, "test.db");
  await resetDbForTests();
});

afterEach(async () => {
  await resetDbForTests();
  delete process.env.DATABASE_PATH;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function postDrills(body: unknown, token?: string): Promise<Response> {
  return POST(
    new Request("http://localhost/api/drills/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-Visitor-Token": token } : {}),
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );
}

function getDrills(token?: string): Promise<Response> {
  return GET(
    new Request("http://localhost/api/drills/", {
      headers: token ? { "X-Visitor-Token": token } : {},
    })
  );
}

function deleteDrillRequest(id: string, token?: string): Promise<Response> {
  return DELETE(
    new Request(`http://localhost/api/drills/${id}/`, {
      method: "DELETE",
      headers: token ? { "X-Visitor-Token": token } : {},
    }),
    { params: Promise.resolve({ id }) }
  );
}

describe("POST /api/drills", () => {
  it("saves a valid drill and returns the row with 201", async () => {
    const res = await postDrills({ title: "  Length night  ", payload: VALID_PLAN }, TOKEN_A);
    expect(res.status).toBe(201);
    const row = await res.json();
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(row.visitor_token).toBe(TOKEN_A);
    expect(row.title).toBe("Length night"); // trimmed
    expect(JSON.parse(row.payload)).toEqual(VALID_PLAN);
    expect(row.created_at).toBeGreaterThan(0);
  });

  it("rejects a missing token with 400", async () => {
    const res = await postDrills({ title: "T", payload: VALID_PLAN });
    expect(res.status).toBe(400);
  });

  it("rejects invalid JSON with 400", async () => {
    const res = await postDrills("not json{", TOKEN_A);
    expect(res.status).toBe(400);
  });

  it("rejects an empty or non-string title with 400", async () => {
    for (const title of ["", "   ", 42, undefined]) {
      const res = await postDrills({ title, payload: VALID_PLAN }, TOKEN_A);
      expect(res.status).toBe(400);
    }
  });

  it("rejects a title over 200 chars with 400", async () => {
    const res = await postDrills({ title: "x".repeat(201), payload: VALID_PLAN }, TOKEN_A);
    expect(res.status).toBe(400);
    const ok = await postDrills({ title: "x".repeat(200), payload: VALID_PLAN }, TOKEN_A);
    expect(ok.status).toBe(201);
  });

  it("rejects a payload that isn't a session-plan shape with 400", async () => {
    for (const payload of [null, "string", {}, { plan_markdown: 1, drills: [] }, { drills: [] }]) {
      const res = await postDrills({ title: "T", payload }, TOKEN_A);
      expect(res.status).toBe(400);
    }
  });

  it("rejects an oversize payload with 413", async () => {
    const big = { plan_markdown: "x".repeat(300 * 1024), drills: [] };
    const res = await postDrills({ title: "T", payload: big }, TOKEN_A);
    expect(res.status).toBe(413);
  });
});

describe("GET /api/drills", () => {
  it("lists only the caller's drills, newest first", async () => {
    await postDrills({ title: "One", payload: VALID_PLAN }, TOKEN_A);
    await postDrills({ title: "Two", payload: VALID_PLAN }, TOKEN_A);
    await postDrills({ title: "Other browser", payload: VALID_PLAN }, TOKEN_B);

    const res = await getDrills(TOKEN_A);
    expect(res.status).toBe(200);
    const { drills } = await res.json();
    expect(drills.map((d: { title: string }) => d.title)).toEqual(["Two", "One"]);
    expect(drills.every((d: { visitor_token: string }) => d.visitor_token === TOKEN_A)).toBe(true);
  });

  it("does not leak another token's drills", async () => {
    await postDrills({ title: "Mine", payload: VALID_PLAN }, TOKEN_A);
    const res = await getDrills(TOKEN_B);
    const { drills } = await res.json();
    expect(drills).toEqual([]);
  });

  it("rejects a missing token with 400", async () => {
    const res = await getDrills();
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/drills/[id]", () => {
  it("deletes with the right token (204) and the drill is gone", async () => {
    const created = await (await postDrills({ title: "T", payload: VALID_PLAN }, TOKEN_A)).json();
    const res = await deleteDrillRequest(created.id, TOKEN_A);
    expect(res.status).toBe(204);

    const { drills } = await (await getDrills(TOKEN_A)).json();
    expect(drills).toEqual([]);
  });

  it("returns 403 for the wrong token without deleting", async () => {
    const created = await (await postDrills({ title: "T", payload: VALID_PLAN }, TOKEN_A)).json();
    const res = await deleteDrillRequest(created.id, TOKEN_B);
    expect(res.status).toBe(403);

    const { drills } = await (await getDrills(TOKEN_A)).json();
    expect(drills).toHaveLength(1);
  });

  it("returns 403 for a non-existent id (same as wrong token — no existence leak)", async () => {
    const res = await deleteDrillRequest("does-not-exist", TOKEN_A);
    expect(res.status).toBe(403);
  });

  it("rejects a missing token with 400", async () => {
    const res = await deleteDrillRequest("anything");
    expect(res.status).toBe(400);
  });
});
