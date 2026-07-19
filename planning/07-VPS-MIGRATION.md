# 07 — VPS Migration Plan: Next.js + SQLite

> Executable by any LLM without prior conversation context. Read `planning/HANDOFF.md` first for
> current build state. This plan supersedes nothing — the existing static site stays live until
> Phase 7 cutover.

## Goal

Rebuild rightcourtsc.com as a Next.js app on a VPS, folding in:

1. The existing static site (all pages under repo root: `index.html`, `about/`, `gallery/`,
   `drills/`, `drill-builder/`, `founding-squashers/`).
2. The Cloudflare Worker AI Drill Builder (`worker/src/`) → becomes a Next.js API route.
3. The Turner & Rhodes parody site (separate repo `~/dev/turnerandrhodes`, currently 5 static
   pages: `index`, `about`, `practice-areas`, `team`, `contact`) → becomes a `/turnerandrhodes`
   route group in the same app.
4. A new "saved drills" feature backed by SQLite on the VPS.

## Decisions (confirmed with user, 2026-07-19)

- **Stack:** Next.js (App Router) + `better-sqlite3`. SQLite is a single file on the VPS.
- **Worker:** folded into the VPS backend. Generation moves to `POST /api/generate`. Worker is
  retired after cutover. `api.rightcourtsc.com` DNS record deleted at cutover.
- **Saved drills identity:** anonymous per-browser token. Client generates a UUID, stores it in
  `localStorage`, sends it as `X-Visitor-Token` header. No accounts, no auth.
- **Hosting:** plain Linux VPS (Hetzner or DigitalOcean), node + Caddy (TLS + reverse proxy) +
  systemd service.
- **Repo:** the Next app lives in this repo at `web/`. The static site at repo root stays
  untouched and keeps deploying to GitHub Pages until cutover.

## Hard constraints (do NOT violate)

- `worker/src/schema.js`: `MAX_TOKENS = 12000` — empirically tuned; do not lower without
  re-running the stress test (8192 failed ~1/3 of attempts on the worst case).
- Model stays `anthropic/claude-haiku-4.5:exacto` via OpenRouter, non-streaming.
- `SYSTEM_PROMPT` `HOUSE IN-JOKES` section is ported verbatim (in-jokes appear "sparingly", by
  design). Keep `planning/05-AI-DRILL-BUILDER-PROMPT.md` in sync if it ever changes.
- Rate limiting: 30 req/IP/hour on generation, deliberately generous (shared clubhouse wifi).
  Reimplement in SQLite (the Cloudflare KV counter dies with the Worker).
- Theme naming inconsistency is load-bearing: worker `THEMES` uses `'serves/returns'` (slash);
  static page filters use `serves-returns` (hyphen). Port both exactly as-is unless deliberately
  unifying with a migration of all content files.
- `data-themes` on session cards is a single primary theme token, never derived from front-matter
  `tags`. See HANDOFF "Decisions taken".
- Do not commit `.env` / `.dev.vars`. `OPENROUTER_API_KEY` moves to the VPS as a systemd
  `EnvironmentFile`.
- Turner & Rhodes source repo is `~/dev/turnerandrhodes` — read-only source for the port; do not
  modify it.

## Target structure

```
web/                          # the Next.js app (new)
  app/
    page.tsx                  # home (port of index.html)
    about/page.tsx
    gallery/page.tsx
    founding-squashers/page.tsx
    drill-builder/page.tsx
    drills/page.tsx           # session grid + theme filters
    drills/[slug]/page.tsx    # renders content/sessions/*/session.md + diagrams
    saved-drills/page.tsx     # NEW: lists drills saved by this browser token
    turnerandrhodes/
      page.tsx                # port of T&R index.html
      about/page.tsx
      practice-areas/page.tsx
      team/page.tsx
      contact/page.tsx
    api/
      generate/route.ts       # POST — port of worker fetch handler
      drills/route.ts         # GET (list by token), POST (save)
      drills/[id]/route.ts    # DELETE
  lib/
    schema.ts                 # port of worker/src/schema.js (THEMES/LEVELS/SYSTEM_PROMPT/MAX_TOKENS/tool schema)
    generate.ts               # port of worker/src/lib.js pure logic
    db.ts                     # better-sqlite3 connection + migrations
    sessions.ts               # reads content/sessions/*.md + diagrams (gray-matter)
  public/                     # assets/logos, partners, favicon, fonts
  content/sessions/           # sessions markdown + diagrams — moved inside web/ (was repo-root,
                              # read via ../content) so web/ is self-contained for Vercel deploys
worker/                       # untouched until Phase 7, then deleted
```

URL redirects (next.config `redirects()`): every legacy `.html` URL → clean URL, e.g.
`/about/index.html` → `/about/`, `/turnerandrhodes/practice-areas.html` →
`/turnerandrhodes/practice-areas/`. Enumerate the full list during Phase 2 by crawling the live
site's internal links.

## SQLite schema (web/lib/db.ts, run as migration on boot)

```sql
CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT NOT NULL,
  window_start INTEGER NOT NULL,   -- unix epoch of hour bucket
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip, window_start)
);
CREATE TABLE IF NOT EXISTS saved_drills (
  id TEXT PRIMARY KEY,             -- uuid
  visitor_token TEXT NOT NULL,
  title TEXT NOT NULL,
  payload TEXT NOT NULL,           -- full generated session plan JSON
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_saved_drills_token ON saved_drills(visitor_token);
```

DB file lives outside the repo on the VPS (e.g. `/var/lib/rightcourtsc/drills.db`), path from
`DATABASE_PATH` env var, default `./data/drills.db` for local dev.

## Phases

Each phase ends green: `cd web && npm run build && npm test` plus the phase's acceptance checks.
Branch per phase; merge when green (direct-to-`main` authorization applies to the *static site*
repo workflow — for this build use branches and merge locally, no PR ceremony).

### Phase 0 — Scaffold

- `npx create-next-app@latest web --typescript --app --no-tailwind --eslint --src-dir=false
  --import-alias "@/*"` (no Tailwind: port the existing CSS design system as global CSS first;
  adding Tailwind is scope creep).
- Copy `assets/css/*` into `web/app/globals.css` (or split by concern, matching existing files).
  Copy `assets/logos`, `assets/partners`, `assets/favicon.png` into `web/public/`.
- Add `better-sqlite3`, `gray-matter` deps. Port `worker/src/lib.test.js` (46 vitest tests) to
  `web/lib/generate.test.ts` — they must pass unchanged in behaviour.
- Acceptance: `cd web && npm run build` succeeds; `npx vitest run` → 46 passing.

### Phase 1 — Shared layout + static pages

- Port `assets/js/nav.js` header/footer (the `footerHtml`/`headerHtml` strings) to a React
  `SiteHeader`/`SiteFooter` in `app/layout.tsx`. This includes any Turner & Rhodes footer
  in-joke links added by the pending injury-claims task.
- Port pages in this order: home, about, gallery, founding-squashers. Keep `next/image` out of
  scope unless trivial — plain `<img>` is fine for the port.
- Port `assets/js/ball-loader.js` (`window.RCBallLoader`) + `ball-loader.css` to a React
  component/hook — needed by drill-builder in Phase 3. `loader-demo/` page is dev-only; port as
  `web/app/loader-demo/page.tsx` with `noindex` metadata, or drop it (user's call).
- Acceptance: `npm run build` succeeds; `curl localhost:3000/about/` → 200; visual spot-check
  against live site.

### Phase 2 — Sessions content pipeline

- `web/lib/sessions.ts`: read `web/content/sessions/session-*/session.md` (gray-matter
  front-matter: `theme`, `tags`, etc.) + `diagrams/drill-N.json` via `generateStaticParams`.
  (Content originally lived at repo root and was read via `../content`; moved inside `web/`
  during 08 so the app is self-contained for Vercel.)
- `drills/page.tsx`: session grid with theme filter buttons — replicate current filter behaviour
  exactly, including the `data-themes` single-primary-token rule and the 9 theme buttons.
- `drills/[slug]/page.tsx`: render markdown + diagram JSON using the existing SVG diagram system
  (`planning/06-SVG-DIAGRAM-SYSTEM.md`). Port the diagram renderer from the static pages' JS.
- Add the full `.html` → clean-URL redirect map in `next.config`.
- Port `node scripts/validate-diagrams.mjs` so it runs against the same content files (CI check).
- Acceptance: all 8 session slugs render; `node scripts/validate-diagrams.mjs` → 16 valid;
  filters isolate correctly (Playwright: port relevant tests from `tests/`).

### Phase 3 — Drill generation API + builder UI

- Port `worker/src/schema.js` → `web/lib/schema.ts` **verbatim in behaviour**: THEMES (with
  `'serves/returns'` slash), LEVELS, SYSTEM_PROMPT incl. HOUSE IN-JOKES, MAX_TOKENS=12000,
  RETURN_SESSION_PLAN_TOOL.
- Port `worker/src/lib.js` → `web/lib/generate.ts`.
- `app/api/generate/route.ts`: POST handler replicating the Worker's request validation, OpenRouter
  call, tool-schema validation (`scripts/validate-tool-schema.mjs` must still pass against the
  ported schema), and error semantics.
- Rate limiting: `rate_limits` table, 30/IP/hour, keyed on `x-forwarded-for` (Caddy sets it).
- `drill-builder/page.tsx`: port `assets/js/drill-builder.js` form logic + ball loader. Point it
  at `/api/generate` (same origin — the `api.rightcourtsc.com` CORS dance disappears).
- Acceptance: `npx vitest run` → all tests pass; live generation against real OpenRouter key
  returns a valid plan; 31st request in an hour from one IP → 429.

### Phase 4 — Saved drills

- `web/lib/db.ts` migration (schema above).
- `app/api/drills/route.ts`: `GET` (list for `X-Visitor-Token`), `POST` (save `{title, payload}`).
  `app/api/drills/[id]/route.ts`: `DELETE` (only if token matches).
- Client: tiny `web/lib/visitor.ts` — read/create UUID in `localStorage` (`rc_visitor_token`).
- Drill-builder UI: "Save this drill" button after generation. `saved-drills/page.tsx`: list +
  view + delete for this browser's token.
- Acceptance: save → appears in list → survives reload → delete removes; wrong token → 403 on
  DELETE; Playwright happy-path test.

### Phase 5 — Turner & Rhodes route group

- Port `~/dev/turnerandrhodes/{index,about,practice-areas,team,contact}.html` →
  `app/turnerandrhodes/*/page.tsx`. Port `css/*.css` scoped to the route group (T&R has its own
  design system incl. fonts — keep it visually distinct from the main site; load its woff2 fonts
  from `web/public/turnerandrhodes/fonts/`).
- Port `js/calculator.js`, `js/counters.js`, `js/cases.js`, `js/memo.js` interactivity to React
  client components. `js/main.js` (nav etc.) folds into a T&R-specific layout
  (`app/turnerandrhodes/layout.tsx`) — T&R keeps its own header/footer, NOT the main site's.
- Redirects: `/turnerandrhodes/*.html` → clean URLs.
- Acceptance: 5 pages render at `/turnerandrhodes/*`; calculator + counters work; Lighthouse
  parity with current live T&R (reports exist at `~/dev/turnerandrhodes/quality_reports/lighthouse/`
  for comparison).

### Phase 6 — VPS provisioning + deploy

- Provision Ubuntu VPS. Install node LTS, Caddy.
- Caddyfile: `rightcourtsc.com { reverse_proxy 127.0.0.1:3000 }` (Caddy handles TLS).
- systemd unit `rightcourtsc.service`: `WorkingDirectory=/opt/rightcourtsc/web`,
  `ExecStart=/usr/bin/npm start`, `EnvironmentFile=/etc/rightcourtsc/env` (contains
  `OPENROUTER_API_KEY`, `DATABASE_PATH=/var/lib/rightcourtsc/drills.db`), restart=always.
- Deploy: `scripts/deploy.sh` — rsync repo to `/opt/rightcourtsc`, `npm ci && npm run build` on
  the box (or build locally + rsync `.next` if the box is small; decide by box size), `systemctl
  restart rightcourtsc`.
- Acceptance: `curl -sI https://rightcourtsc-staging.<...>` or box IP → 200; generation works
  end-to-end on the VPS.

### Phase 7 — Cutover + retirement

- DNS: point `rightcourtsc.com` A/AAAA at VPS (see `dns/rightcourtsc.com.zone`). Delete
  `api.rightcourtsc.com` record. Remove `CNAME` from repo root and disable GitHub Pages.
- Verify: every legacy URL (crawl list from Phase 2 redirects) → 200/301 correctly; drill
  generation live; save/list/delete live.
- Retire: delete `worker/`, `CNAME`, `.nojekyll` from repo. Remove OpenRouter key from Cloudflare
  dashboard. Update `planning/HANDOFF.md` repo map (delete worker references, note new stack).
- Update `package.json` root description and `CONTENTS-HOWTO.md` (session-adding process now
  targets the Next app — content files themselves are unchanged).

## Open questions

- ~~Box size/provider~~ — artifacts written for Hetzner CX22-class (4GB, enough for on-box
  `next build`); any equivalent 2vCPU/4GB Ubuntu 24.04 box works. User still needs to create it.
- Keep or drop `loader-demo/` (Phase 1).
- Whether to unify `serves/returns` vs `serves-returns` during the port (recommended: NOT in this
  migration — separate cleanup task if ever).
- Playwright test suite port scope: full `tests/` port vs happy-path only (recommend happy-path
  during migration, backfill after).
