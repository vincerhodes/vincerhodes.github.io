// DELETE /api/drills/[id] — removes a saved drill owned by the caller's X-Visitor-Token
// (planning/07-VPS-MIGRATION.md Phase 4: "only if token matches"). A missing id and a wrong
// token both return 403 — the API deliberately doesn't leak whether an id exists.
//   204  deleted
//   400 { error }  missing X-Visitor-Token header
//   403 { error }  no such drill for this token
import { deleteDrill } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // @libsql/client — never the edge runtime.

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const token = request.headers.get("x-visitor-token")?.trim();
  if (!token) {
    return errorResponse("Missing X-Visitor-Token header", 400);
  }

  const { id } = await context.params;
  if (!(await deleteDrill(id, token))) {
    return errorResponse("No saved drill with that id for this token", 403);
  }

  return new Response(null, { status: 204 });
}
