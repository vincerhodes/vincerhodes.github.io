# 08 — Vercel Migration Plan (supersedes 07's VPS hosting decision)

> Executable by any LLM without prior conversation context. Read `planning/HANDOFF.md` and
> `planning/07-VPS-MIGRATION.md` first. **Decision change (2026-07-19, user):** hosting moves to
> Vercel hobby plan, NOT a VPS. Everything else from 07 stands: the Next.js app in `web/` (Phases
> 0–5, complete and committed), the Worker fold-in, saved drills, T&R route group. Phase 6/7 of 07
> (VPS provisioning, Caddy, systemd, tarball deploys) are dead — `web/deploy/` gets deleted in V1.

## Why the DB must change

Vercel serverless functions have an ephemeral filesystem — a local SQLite file is wiped between
invocations and never shared across instances. `better-sqlite3` (synchronous, file-based) is out.

**Chosen DB: Turso (hosted libSQL).** Rationale:
- SQLite dialect — the existing schema (`rate_limits`, `saved_drills`) ports as-is, zero redesign.
- `@libsql/client` supports `file:` URLs for local dev — dev keeps working with NO Turso account,
  same as today; prod uses `libsql://…turso.io` from env vars.
- Free tier comfortably covers a club site (rate-limit writes + saved drills are tiny).

Rejected: Vercel Postgres/Neon (requires pg rewrite, overkill), Upstash-only (rate limiting fine
but saved drills want real queries), staying on better-sqlite3 (impossible on Vercel).

## Key facts (verified 2026-07-19)

- Vercel hobby + Fluid Compute (default for new projects since 2025-04): function timeout up to
  **300s** ([Vercel limits doc](https://vercel.com/docs/functions/limitations)). Older reports say
  hobby caps `maxDuration` at 60 — so set `export const maxDuration = 300` on the generate route;
  **if the deploy rejects it, drop to 60 and measure**. The haiku generation call is the only
  long-running route; it must complete within the limit.
- `vercel` and `turso` CLIs are NOT installed/authed on the dev machine. Account/project creation
  is a user step (or `npm i -g vercel` + `vercel login`, `curl … turso CLI` + `turso auth signup`).
- Vercel project root directory = `web/`. `content/` has been moved inside `web/`
  (`web/content/sessions/`), so `web/lib/sessions.ts` reads `content/sessions` relative to
  `process.cwd()` and the app is fully self-contained — a file-upload deploy of `web/` alone
  works, no repo-root dependency at build time.
- GitHub Pages stays live until DNS cutover. Vercel preview URLs (`*.vercel.app`) give a full
  pre-cutover smoke-test venue — and Vercel's infra is NOT OpenRouter-region-blocked like the dev
  machine, so live `/api/generate` is finally testable there.

## Phases

### V0 — Port db.ts to libsql (code, no accounts needed)

- `cd web && npm uninstall better-sqlite3 && npm install @libsql/client`
  (also remove `@types/better-sqlite3`).
- Rewrite `web/lib/db.ts` on `@libsql/client`:
  - URL selection: `process.env.TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` when set (prod),
    else `file:./data/drills.db` (local dev; keep the mkdir-sync + gitignored `data/`).
  - API becomes async: `saveDrill`, `listDrillsForToken`, `deleteDrill`, `applyRateLimit` all
    return Promises; same signatures/semantics otherwise.
  - Same migration SQL (CREATE TABLE IF NOT EXISTS …) run once per cold start — cheap, keep the
    on-boot pattern.
- Update callers to `await`: `app/api/drills/route.ts`, `app/api/drills/[id]/route.ts`,
  `app/api/generate/route.ts` (rate limit).
- Port `web/lib/db.test.ts` (10 tests) and `web/lib/drillsApi.test.ts` (14 tests) to async — same
  assertions, file-mode DB in a tmp dir per test run.
- Acceptance: `npm run build` ✓; `npx vitest run` → 77/77 (same count); full local round-trip
  (save/list/delete, 429 at 31st) still passes against `next start` in file-mode.

### V1 — Deploy config + VPS cleanup (code, no accounts needed)

- `app/api/generate/route.ts`: add `export const maxDuration = 300;` (see "Key facts" fallback).
- Delete `web/deploy/` entirely (VPS artifacts: Caddyfile, systemd unit, provision.sh, deploy.sh,
  README). Replace with `web/deploy/README.md` — no: deployment is now "push to main" + the
  runbook lives in THIS file's V2–V4. Just delete `web/deploy/` and put the runbook here.
- Keep `output` default (NO standalone) — Vercel wants the standard build. Verify
  `web/next.config.ts` has no `output: 'standalone'` (it was never committed; confirm).
- `web/ENV.md`: replace `DATABASE_PATH` with `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`
  (prod-only; local dev defaults to file-mode, nothing to set). Note these go in the Vercel
  dashboard (Project → Settings → Environment Variables), not a systemd file.
- Root `package.json` description + `planning/HANDOFF.md`: update to reflect Vercel direction.
- Acceptance: build + 77/77 green; `git grep -n better-sqlite3 web/` empty;
  `git grep -n DATABASE_PATH web/` only in historical docs if anywhere.

### V2 — Vercel project + first preview deploy (needs user accounts)

**STATUS 2026-07-19: mostly DONE via Vercel MCP + REST API.** Project `rightcourtsc`
(`prj_eJTNoVDkcysihGQ39hfklEohjKpk`) created in team `vincerhodes-projects`; preview deploys via
`node scripts/vercel-api-deploy.mjs --target preview` (local-only script, gitignored — reads the
MCP OAuth token; `mcp__vercel__deploy_to_vercel` can't take a multi-MB file tree in one call).
`OPENROUTER_API_KEY` set via the REST API. Preview protection (`ssoProtection`) disabled for now.
Latest preview: all pages 200 (verified via `web_fetch_vercel_url`).

**Live generation CONFIRMED:** this dev machine can't reach `*.vercel.app` at all (network block)
and can't POST through MCP, so a temporary `web/app/api/selftest/route.ts` (GET) replicates the
generate route's OpenRouter call server-side — Vercel runtime logs show `GET /api/selftest/ 200`,
and that route only returns 200 when env key → OpenRouter → tool-call parse → diagram filter all
succeed. **Delete `web/app/api/selftest/` at cutover (V4).**

Still user steps (below): Turso account + the two Drive secrets from the Cloudflare dashboard.
Until Turso env vars are set, `/api/drills*` and the `/api/generate` rate limiter run in file-mode,
which FAILS on Vercel's read-only FS — expected, don't debug it.

Original step list (for reference):
1. Create Vercel account (hobby) → New Project → import the GitHub repo → **Root Directory:
   `web/`**. Framework preset Next.js, defaults otherwise.
2. Env vars (Production + Preview): `OPENROUTER_API_KEY` (from repo-root `.env`),
   `GOOGLE_DRIVE_API_KEY`, `GALLERY_FOLDER_ID` (from Cloudflare Worker secrets).
3. Turso: create account → `turso db create rightcourtsc` → `turso db show --url rightcourtsc`
   + `turso db tokens create rightcourtsc` → set `TURSO_DATABASE_URL` (`libsql://…`) and
   `TURSO_AUTH_TOKEN` in Vercel. The app's on-boot migration creates the tables on first hit.
4. Trigger a deploy (push to main or `vercel --prod` for preview).

Smoke tests against the preview URL (THE venue for the checks the dev machine can't do):
```sh
BASE=https://<preview>.vercel.app
curl -sI $BASE/ | head -1; curl -sI $BASE/turnerandrhodes/ | head -1
curl -sI $BASE/drills/session-01-straight-length-and-the-t/ | head -1   # 8 slugs prerendered?
# THE critical one — live generation, region-block-free:
time curl -s -X POST $BASE/api/generate/ -H 'Content-Type: application/json' \
  -d '{"players":2,"courts":1,"theme":"boasts","level":"improver","duration_minutes":60}'
# ^ note the wall time vs maxDuration. Then gallery, saved-drills round-trip (V0 acceptance
# list, but against $BASE), and a browser click-through incl. save→reload persistence.
```
Also verify in Vercel dashboard: build output shows all 8 `/drills/[slug]` pages prerendered
(proves `web/content` resolution worked).

### V3 — Custom domain on Vercel

- Vercel dashboard → Domains → add `rightcourtsc.com` + `www.rightcourtsc.com`. Vercel tells you
  the records: apex `A 76.76.21.21`, www `CNAME cname.vercel-dns.com`.
- Don't change the registrar yet — that's cutover.

### V4 — DNS cutover + retirement (replaces 07 Phase 7)

**STATUS 2026-07-19: cutover DONE.** Domains added via REST API (both verified), production
deploy live at https://rightcourtsc.com (all smoke tests green incl. generation + Turso via the
selftest route, since deleted). Repo cleanup done: `CNAME`, `.nojekyll`, `worker/`,
`scripts/validate-tool-schema.mjs`, and `web/app/api/selftest/` deleted; `web/lib/schema.ts` is
now canonical (drift guard removed); root `npm test` delegates to web. Still open at time of
writing: deleting the Cloudflare Worker itself, the `api.rightcourtsc.com` DNS record, and
disabling GitHub Pages in repo settings.

Original step list (for reference):

1. Registrar: apex A → `76.76.21.21` (delete the 4 GitHub Pages A + 4 AAAA), www CNAME →
   `cname.vercel-dns.com`. Vercel issues TLS automatically.
2. `curl -sI https://rightcourtsc.com/ | head -1` → 200; re-run the V2 smoke list against the
   apex; legacy `.html` URLs → 308.
3. Retire: delete `api.rightcourtsc.com` record (wherever the Worker route lives), delete the
   Cloudflare Worker + secrets, delete `CNAME`/`.nojekyll`/`worker/` from repo root, disable
   GitHub Pages in repo settings.
4. Update `planning/HANDOFF.md` repo map (worker gone, hosting = Vercel, DB = Turso) and root
   `package.json` description; sanity-check `CONTENTS-HOWTO.md`.

Rollback before step 3: point apex back at the GitHub Pages IPs — old static site untouched in
git history. After step 3: rollback is re-enabling Pages + reverting the cleanup commit.

## Constraints carried from 07 (unchanged)

- `MAX_TOKENS = 12000`, model `anthropic/claude-haiku-4.5:exacto`, SYSTEM_PROMPT verbatim,
  `'serves/returns'` slash in THEMES vs hyphen in filter tokens, `data-themes` editorial rule.
- Rate limit stays 30/IP/hour, generous on purpose; counts AFTER validation; 31st → 429.
- No secrets in git. `.env`/`web/.env.local` stay local-only; Vercel env via dashboard.
- Don't touch `~/dev/turnerandrhodes` (source repo) or the static site at repo root until V4.

## Open questions

- Hobby maxDuration: 300 vs 60 — resolved empirically at V2 (set 300, drop to 60 if rejected).
  If generation wall-time ever approaches the cap, options are streaming the response or Pro —
  not a redesign now.
- ~~Whether to move `content/` inside `web/`~~ — DONE (2026-07-19): content moved to
  `web/content/sessions/`, `web/lib/sessions.ts` resolves `content/sessions` from `process.cwd()`,
  and `scripts/validate-diagrams.mjs` + docs were updated to match. `web/` is self-contained.
