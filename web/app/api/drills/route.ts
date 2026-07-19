// GET/POST /api/drills — saved-drills API (planning/07-VPS-MIGRATION.md Phase 4). Identity is an
// anonymous per-browser UUID sent as the X-Visitor-Token header (see web/lib/visitor.ts); no
// accounts, no auth. Response shapes:
//   GET  200 { drills: SavedDrillRow[] }        (newest first; payload is the plan JSON string)
//   POST 201 SavedDrillRow                      (the saved row, id generated server-side)
//   400 { error }  missing token / invalid JSON / invalid title or payload shape
//   413 { error }  payload over ~256KB
import { listDrillsForToken, saveDrill, type SavedDrillRow } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // better-sqlite3 is native — never the edge runtime.

const TITLE_MAX_LENGTH = 200;
const PAYLOAD_MAX_BYTES = 256 * 1024;

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

function visitorToken(request: Request): string | null {
  const token = request.headers.get("x-visitor-token")?.trim();
  return token || null;
}

interface SessionPlanPayload {
  plan_markdown: string;
  drills: unknown[];
}

/**
 * Validates the POST body: title must be a non-empty string ≤200 chars; payload must be a
 * session-plan object ({ plan_markdown: string, drills: array }) whose serialized size stays
 * under ~256KB. Returns the trimmed title + payload, or an error message + status.
 */
function validateSaveBody(body: unknown):
  | { ok: true; title: string; payload: SessionPlanPayload }
  | { ok: false; error: string; status: number } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Request body must be an object", status: 400 };
  }
  const { title, payload } = body as { title?: unknown; payload?: unknown };

  if (typeof title !== "string" || title.trim().length === 0) {
    return { ok: false, error: "title must be a non-empty string", status: 400 };
  }
  if (title.trim().length > TITLE_MAX_LENGTH) {
    return { ok: false, error: `title must be ${TITLE_MAX_LENGTH} characters or fewer`, status: 400 };
  }

  if (typeof payload !== "object" || payload === null) {
    return { ok: false, error: "payload must be a session-plan object", status: 400 };
  }
  const plan = payload as { plan_markdown?: unknown; drills?: unknown };
  if (typeof plan.plan_markdown !== "string" || !Array.isArray(plan.drills)) {
    return {
      ok: false,
      error: "payload must be a session-plan object ({ plan_markdown: string, drills: array })",
      status: 400,
    };
  }

  if (JSON.stringify(payload).length > PAYLOAD_MAX_BYTES) {
    return { ok: false, error: "payload is too large", status: 413 };
  }

  return { ok: true, title: title.trim(), payload: payload as SessionPlanPayload };
}

export function GET(request: Request): Response {
  const token = visitorToken(request);
  if (!token) {
    return errorResponse("Missing X-Visitor-Token header", 400);
  }
  return Response.json({ drills: listDrillsForToken(token) });
}

export async function POST(request: Request): Promise<Response> {
  const token = visitorToken(request);
  if (!token) {
    return errorResponse("Missing X-Visitor-Token header", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON", 400);
  }

  const validated = validateSaveBody(body);
  if (!validated.ok) {
    return errorResponse(validated.error, validated.status);
  }

  const row: SavedDrillRow = {
    id: crypto.randomUUID(),
    visitor_token: token,
    title: validated.title,
    payload: JSON.stringify(validated.payload),
    created_at: Date.now(),
  };
  saveDrill({
    id: row.id,
    visitorToken: row.visitor_token,
    title: row.title,
    payload: row.payload,
    createdAt: row.created_at,
  });

  return Response.json(row, { status: 201 });
}
