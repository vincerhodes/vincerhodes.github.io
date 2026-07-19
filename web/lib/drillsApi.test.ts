// Tests for the saved-drills API routes (app/api/drills, app/api/drills/[id]) — request
// validation, the shared-library public listing (with the token-based `mine` flag), and delete
// semantics. Handlers are called directly with web Request objects against a fresh temp
// database per test (DATABASE_PATH + resetDbForTests).
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
  it("saves a valid drill and returns the row (with saved_by, no token) with 201", async () => {
    const res = await postDrills(
      { title: "  Length night  ", payload: VALID_PLAN, saved_by: "Jimmy" },
      TOKEN_A
    );
    expect(res.status).toBe(201);
    const row = await res.json();
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(row.title).toBe("Length night"); // trimmed
    expect(row.saved_by).toBe("Jimmy");
    expect(JSON.parse(row.payload)).toEqual(VALID_PLAN);
    expect(row.created_at).toBeGreaterThan(0);
    expect(row.visitor_token).toBeUndefined();
  });

  it("rejects a missing token with 400", async () => {
    const res = await postDrills({ title: "T", payload: VALID_PLAN, saved_by: "Jimmy" });
    expect(res.status).toBe(400);
  });

  it("rejects invalid JSON with 400", async () => {
    const res = await postDrills("not json{", TOKEN_A);
    expect(res.status).toBe(400);
  });

  it("rejects an empty or non-string title with 400", async () => {
    for (const title of ["", "   ", 42, undefined]) {
      const res = await postDrills({ title, payload: VALID_PLAN, saved_by: "Jimmy" }, TOKEN_A);
      expect(res.status).toBe(400);
    }
  });

  it("rejects a title over 200 chars with 400", async () => {
    const res = await postDrills(
      { title: "x".repeat(201), payload: VALID_PLAN, saved_by: "Jimmy" },
      TOKEN_A
    );
    expect(res.status).toBe(400);
    const ok = await postDrills(
      { title: "x".repeat(200), payload: VALID_PLAN, saved_by: "Joe" },
      TOKEN_A
    );
    expect(ok.status).toBe(201);
  });

  it("rejects a payload that isn't a session-plan shape with 400", async () => {
    for (const payload of [null, "string", {}, { plan_markdown: 1, drills: [] }, { drills: [] }]) {
      const res = await postDrills({ title: "T", payload, saved_by: "Jimmy" }, TOKEN_A);
      expect(res.status).toBe(400);
    }
  });

  it("rejects an oversize payload with 413", async () => {
    const big = { plan_markdown: "x".repeat(300 * 1024), drills: [] };
    const res = await postDrills({ title: "T", payload: big, saved_by: "Jimmy" }, TOKEN_A);
    expect(res.status).toBe(413);
  });

  it("rejects a missing or non-founder saved_by with 400", async () => {
    for (const savedBy of [undefined, "", "Dave", 42, "jimmy"]) {
      const res = await postDrills({ title: "T", payload: VALID_PLAN, saved_by: savedBy }, TOKEN_A);
      expect(res.status).toBe(400);
    }
    // Every founder is accepted.
    for (const name of ["Jimmy", "Joe", "Adam", "Jonny"]) {
      const res = await postDrills({ title: "T", payload: VALID_PLAN, saved_by: name }, TOKEN_A);
      expect(res.status).toBe(201);
    }
  });
});

describe("GET /api/drills", () => {
  it("is public: lists everyone's drills newest first, with no visitor_token and no mine", async () => {
    await postDrills({ title: "One", payload: VALID_PLAN, saved_by: "Jimmy" }, TOKEN_A);
    await postDrills({ title: "Two", payload: VALID_PLAN, saved_by: "Joe" }, TOKEN_B);

    const res = await getDrills();
    expect(res.status).toBe(200);
    const { drills } = await res.json();
    expect(drills.map((d: { title: string }) => d.title)).toEqual(["Two", "One"]);
    expect(drills.map((d: { saved_by: string }) => d.saved_by)).toEqual(["Joe", "Jimmy"]);
    expect(drills.every((d: object) => !("visitor_token" in d))).toBe(true);
    expect(drills.every((d: object) => !("mine" in d))).toBe(true);
  });

  it("flags mine per row when a token is sent, still without leaking tokens", async () => {
    await postDrills({ title: "Mine", payload: VALID_PLAN, saved_by: "Jimmy" }, TOKEN_A);
    await postDrills({ title: "Theirs", payload: VALID_PLAN, saved_by: "Adam" }, TOKEN_B);

    const { drills } = await (await getDrills(TOKEN_A)).json();
    expect(drills.find((d: { title: string }) => d.title === "Mine").mine).toBe(true);
    expect(drills.find((d: { title: string }) => d.title === "Theirs").mine).toBe(false);
    expect(drills.every((d: object) => !("visitor_token" in d))).toBe(true);

    const other = await (await getDrills(TOKEN_B)).json();
    expect(other.drills.find((d: { title: string }) => d.title === "Mine").mine).toBe(false);
    expect(other.drills.find((d: { title: string }) => d.title === "Theirs").mine).toBe(true);
  });

  it("returns an empty list when the library is empty", async () => {
    const res = await getDrills();
    expect(res.status).toBe(200);
    const { drills } = await res.json();
    expect(drills).toEqual([]);
  });
});

describe("DELETE /api/drills/[id]", () => {
  it("deletes with the right token (204) and the drill is gone", async () => {
    const created = await (
      await postDrills({ title: "T", payload: VALID_PLAN, saved_by: "Jimmy" }, TOKEN_A)
    ).json();
    const res = await deleteDrillRequest(created.id, TOKEN_A);
    expect(res.status).toBe(204);

    const { drills } = await (await getDrills()).json();
    expect(drills).toEqual([]);
  });

  it("returns 403 for the wrong token or a non-existent id (no existence leak)", async () => {
    const created = await (
      await postDrills({ title: "T", payload: VALID_PLAN, saved_by: "Jimmy" }, TOKEN_A)
    ).json();
    expect((await deleteDrillRequest(created.id, TOKEN_B)).status).toBe(403);
    expect((await deleteDrillRequest("does-not-exist", TOKEN_A)).status).toBe(403);

    const { drills } = await (await getDrills()).json();
    expect(drills).toHaveLength(1);
  });

  it("rejects a missing token with 400", async () => {
    const res = await deleteDrillRequest("anything");
    expect(res.status).toBe(400);
  });
});
