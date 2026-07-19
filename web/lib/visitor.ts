// Anonymous per-browser identity for saved drills (planning/07-VPS-MIGRATION.md Phase 4 —
// "Saved drills identity: anonymous per-browser token… No accounts, no auth"). The client
// generates a UUID once, stores it in localStorage, and sends it as the X-Visitor-Token header
// on /api/drills/ calls. Client-only: returns null during SSR/first render so callers can
// defer work to an effect or event handler.
export const VISITOR_TOKEN_KEY = "rc_visitor_token";

export function getVisitorToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let token = window.localStorage.getItem(VISITOR_TOKEN_KEY);
    if (!token) {
      token = crypto.randomUUID();
      window.localStorage.setItem(VISITOR_TOKEN_KEY, token);
    }
    return token;
  } catch {
    // localStorage can throw (private mode, disabled storage) — treat as unavailable.
    return null;
  }
}
