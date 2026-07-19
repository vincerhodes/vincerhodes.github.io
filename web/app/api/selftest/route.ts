// GET /api/selftest — TEMPORARY deployment verification (delete after cutover smoke tests).
// This machine cannot reach *.vercel.app for POSTs, so live /api/generate can't be smoke-tested
// externally yet. This route replicates the generate route's OpenRouter call with a canned valid
// body and reports the outcome — proving env var, model access, tool-call parsing and diagram
// filtering all work in the Vercel environment. Runs the same validation pipeline as
// /api/generate but bypasses the rate limiter (it doesn't touch the DB).
import {
  MAX_TOKENS,
  MODEL,
  RETURN_SESSION_PLAN_TOOL,
  SYSTEM_PROMPT,
} from "@/lib/schema";
import { buildUserMessage, filterValidDiagrams } from "@/lib/generate";
import { deleteDrill, listDrillsForToken, saveDrill } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// DB round-trip against whatever backend the env selects (Turso in prod, file: locally):
// save → list → delete with a probe token. Returns a small report object.
async function checkDb() {
  const probe = `selftest-probe-${Date.now()}`;
  try {
    await saveDrill({
      id: crypto.randomUUID(),
      visitorToken: probe,
      title: "selftest",
      payload: JSON.stringify({ plan_markdown: "x", drills: [] }),
    });
    const listed = await listDrillsForToken(probe);
    const other = await listDrillsForToken("selftest-someone-else");
    const deletedWrong = await deleteDrill(listed[0]?.id ?? "nope", "selftest-someone-else");
    const deleted = listed[0] ? await deleteDrill(listed[0].id, probe) : false;
    const after = await listDrillsForToken(probe);
    const ok =
      listed.length === 1 && other.length === 0 && deletedWrong === false && deleted === true && after.length === 0;
    return { ok, listed: listed.length, deletedWrong, deleted, remaining: after.length };
  } catch (err) {
    return { ok: false, error: String(err).slice(0, 300) };
  }
}

const CANNED_BODY = {
  players: 2,
  courts: 1,
  theme: "boasts",
  level: "improver",
  duration_minutes: 60,
};

export async function GET() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({ ok: false, stage: "env", error: "OPENROUTER_API_KEY not set" }, { status: 500 });
  }

  const started = Date.now();
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserMessage(CANNED_BODY) },
        ],
        tools: [RETURN_SESSION_PLAN_TOOL],
        tool_choice: { type: "function", function: { name: "return_session_plan" } },
      }),
    });

    const ms = Date.now() - started;
    if (!res.ok) {
      const text = await res.text();
      return Response.json(
        { ok: false, stage: "openrouter", status: res.status, ms, error: text.slice(0, 500) },
        { status: 502 },
      );
    }

    const data = await res.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return Response.json(
        { ok: false, stage: "parse", ms, error: "no tool call in response", raw: JSON.stringify(data).slice(0, 500) },
        { status: 502 },
      );
    }

    const plan = JSON.parse(toolCall.function.arguments);
    const { total, degraded } = filterValidDiagrams(plan.drills, plan.plan_markdown);
    const db = await checkDb();
    return Response.json({
      ok: db.ok,
      ms,
      model: MODEL,
      planTitle: plan.title ?? null,
      markdownChars: (plan.plan_markdown ?? "").length,
      drillsReturned: total,
      drillsValid: total - degraded,
      db,
    }, { status: db.ok ? 200 : 500 });
  } catch (err) {
    return Response.json(
      { ok: false, stage: "fetch", ms: Date.now() - started, error: String(err).slice(0, 300) },
      { status: 502 },
    );
  }
}
