// GET/POST /api/drills — the shared club drill library. Saving and deleting still need the
// anonymous per-browser X-Visitor-Token header (see web/lib/visitor.ts); listing is public.
// Every save names one of the four founding squashers as saved_by. Response shapes:
//   GET  200 { drills: SavedDrillRow[] }        (newest first; never includes visitor_token;
//                                                `mine` per row only when a token is sent)
//   POST 201 SavedDrillRow                      (the saved row, id generated server-side)
//   400 { error }  missing token / invalid JSON / invalid title, payload, or saved_by
//   413 { error }  payload over ~256KB
import { listAllDrills, saveDrill, type SavedDrillRow } from "@/lib/db";
import { FOUNDERS } from "@/lib/founders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // @libsql/client — never the edge runtime.

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
 * under ~256KB; saved_by must be one of the four founding squashers. Returns the trimmed
 * title + payload + saved_by, or an error message + status.
 */
function validateSaveBody(body: unknown):
  | { ok: true; title: string; payload: SessionPlanPayload; savedBy: string }
  | { ok: false; error: string; status: number } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Request body must be an object", status: 400 };
  }
  const { title, payload, saved_by } = body as {
    title?: unknown;
    payload?: unknown;
    saved_by?: unknown;
  };

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

  if (typeof saved_by !== "string" || !(FOUNDERS as readonly string[]).includes(saved_by)) {
    return { ok: false, error: `saved_by must be one of: ${FOUNDERS.join(", ")}`, status: 400 };
  }

  return { ok: true, title: title.trim(), payload: payload as SessionPlanPayload, savedBy: saved_by };
}

export async function GET(request: Request): Promise<Response> {
  return Response.json({ drills: await listAllDrills(visitorToken(request) ?? undefined) });
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
    title: validated.title,
    payload: JSON.stringify(validated.payload),
    saved_by: validated.savedBy,
    created_at: Date.now(),
  };
  await saveDrill({
    id: row.id,
    visitorToken: token,
    title: row.title,
    payload: row.payload,
    savedBy: validated.savedBy,
    createdAt: row.created_at,
  });

  return Response.json(row, { status: 201 });
}
