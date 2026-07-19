// POST /api/generate — port of the Cloudflare Worker's /generate route (worker/src/index.js)
// to a Next.js route handler, per planning/07-VPS-MIGRATION.md Phase 3. Same request validation,
// same OpenRouter forced-tool-use call, same response shape and error semantics as the Worker:
//   400 { error: "Request body must be valid JSON" }
//   400 { error: "Invalid request: <errors joined with '; '>" }
//   429 { error: "Rate limit exceeded (30 generations/hour) — try again later." }
//   502 { error: "<openrouter/config failure message>" }
//   200 { plan_markdown, drills }  (drills post-filterValidDiagrams — malformed diagrams → null)
// Rate limiting moves from Cloudflare KV to SQLite (web/lib/db.ts), keyed on x-forwarded-for
// (Caddy sets it in prod; 'unknown' locally). Semantics preserved: the limit is applied AFTER
// body validation, so malformed requests never consume quota. CORS is gone — post-cutover this
// is same-origin; Next auto-answers OPTIONS preflights.
import {
  MAX_TOKENS,
  MODEL,
  RETURN_SESSION_PLAN_TOOL,
  SYSTEM_PROMPT,
} from "@/lib/schema";
import { buildUserMessage, filterValidDiagrams, validateRequestBody } from "@/lib/generate";
import { applyRateLimit } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // better-sqlite3 is native — never the edge runtime.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

interface ValidatedBody {
  players: number;
  courts: number;
  theme: string;
  level: string;
  duration_minutes: number;
  notes?: string;
}

/**
 * Test-mode stub, ported from worker/src/index.js — used only when TEST_MODE === 'true'. Real
 * API calls don't belong in checks that rerun on every loop iteration. Produces a response
 * shaped exactly like a real forced-tool-use OpenRouter reply so the rest of the pipeline
 * (clamping, drill_name matching, client rendering) is exercised for real.
 */
function stubGeneration(body: ValidatedBody) {
  const drillName = `Stub Drill: ${body.theme} focus`;
  const plan_markdown = [
    `# Session theme`,
    ``,
    `${body.theme} — a stubbed plan generated in TEST_MODE for ${body.players} players on ` +
      `${body.courts} court(s), ${body.duration_minutes} minutes.`,
    ``,
    `## ${drillName}`,
    ``,
    `Setup: stub setup text. Pattern: stub pattern text.`,
    ``,
    `## Coach's notes`,
    ``,
    `Stub notes.${body.notes ? ` Additional notes received: ${body.notes}` : ""}`,
  ].join("\n");

  return {
    plan_markdown,
    drills: [
      {
        drill_name: drillName,
        diagram: {
          title: drillName,
          players: [
            { id: "A", label: "Feeder", color: "#8FA893", x: 0.3, y: 0.5 },
            { id: "B", label: "Hitter", color: "#21472E", x: 0.3, y: 0.85 },
          ],
          arrows: [{ number: 1, type: "ball", points: [[0.3, 0.5], [0.3, 0.85]] }],
        },
      },
    ],
  };
}

/** Calls OpenRouter with forced tool-use and returns { plan_markdown, drills }. Throws on any failure. */
async function callOpenRouter(body: ValidatedBody) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Server is not configured (missing OPENROUTER_API_KEY)");
  }

  const userMessage = buildUserMessage(body);

  const response = await fetch(OPENROUTER_URL, {
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
        { role: "user", content: userMessage },
      ],
      tools: [RETURN_SESSION_PLAN_TOOL],
      tool_choice: { type: "function", function: { name: "return_session_plan" } },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter request failed (${response.status})`);
  }

  const data = await response.json();
  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.function?.name !== "return_session_plan") {
    throw new Error("OpenRouter response did not include the forced tool call");
  }

  let args;
  try {
    args = JSON.parse(toolCall.function.arguments);
  } catch {
    throw new Error("OpenRouter tool call arguments were not valid JSON");
  }

  if (typeof args.plan_markdown !== "string" || !Array.isArray(args.drills)) {
    throw new Error("OpenRouter tool call arguments did not match the expected shape");
  }

  return { plan_markdown: args.plan_markdown as string, drills: args.drills as unknown[] };
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON", 400);
  }

  const validation = validateRequestBody(body);
  if (!validation.valid) {
    return errorResponse(`Invalid request: ${validation.errors.join("; ")}`, 400);
  }

  // Rate limit AFTER validation, exactly like the Worker — invalid requests never consume quota.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const decision = applyRateLimit(ip);
  if (!decision.allowed) {
    return errorResponse("Rate limit exceeded (30 generations/hour) — try again later.", 429);
  }

  let generated;
  try {
    generated =
      process.env.TEST_MODE === "true"
        ? stubGeneration(body as ValidatedBody)
        : await callOpenRouter(body as ValidatedBody);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Generation failed", 502);
  }

  const { drills } = filterValidDiagrams(generated.drills, generated.plan_markdown);

  return Response.json({ plan_markdown: generated.plan_markdown, drills });
}

export function GET(): Response {
  return errorResponse("Method not allowed", 405);
}
