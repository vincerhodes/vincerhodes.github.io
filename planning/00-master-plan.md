# Right Court SC — Master Plan

This is the authoritative source for phase completion. `04-BUILD-PHASES-FOR-CLAUDE-CODE.md` remains as
prose rationale and is still worth reading for the *why* behind each phase, but where it conflicts with
this document on what "done" means, **this document wins** — its acceptance criteria are the check
commands below, not sentences.

Component specs referenced by phases below are unchanged and live alongside this file:
`01-BRAND-STYLE-GUIDE.md`, `02-SITE-MAP-AND-CONTENT.md`, `03-TECHNICAL-ARCHITECTURE.md`,
`05-AI-DRILL-BUILDER-PROMPT.md`, `06-SVG-DIAGRAM-SYSTEM.md`. Real assets already exist:
`assets/logos/**` and `planning/content-source/session-01-straight-length-and-the-t/**` (the first session's
content + 2 schema-validated diagram JSONs, staged ahead of Phase 3 — see that phase below for where it
moved).

## Tier: `lite`

**Trigger rule:** `full` applies when the work produces numbers a competent human could get wrong on
paper — money, dates/timezones, health/dosage, rates, unit conversions, safety clamps. This project has
no such runtime-computed domain value: the AI Drill Builder's diagram coordinates are LLM-generated
content bounded by a schema (`minimum`/`maximum`/`enum`), not a formula a human derives by hand, and the
only numeric constants in the plan (30 req/IP/hour rate limit, `max_tokens: 4096`, Lighthouse
threshold ≥90) are fixed configuration values, not per-request computations. No `ground-truth/*.yaml`
package exists or is needed.

## Environment

```yaml
environment:
  binaries:
    - {cmd: node, min: "20.0.0"}
    - {cmd: npm, min: "10.0.0"}
    - {cmd: git, min: "2.30.0"}
```

`npm` (not `pnpm`/`yarn`) is the package manager for tooling only — the site itself has no build step
(plain HTML/CSS/JS per `03-TECHNICAL-ARCHITECTURE.md`); `npm` is only used to install dev tooling
(`html-validate`, `@playwright/test`, `ajv`, `vitest`, `lighthouse`) that the checks below invoke.

GitHub repo name is `vincerhodes.github.io` per the root-site pattern decided in
`03-TECHNICAL-ARCHITECTURE.md` — CORS allow-list and deploy target are both resolved and live.

## Test layout
```
tests/
├── responsive/     # Playwright: no-horizontal-scroll at 375/768/1280px — Phase 0
├── structure/      # Playwright: nav/footer/DOM structure assertions   — Phase 1
└── e2e/            # Playwright: user-flow smoke tests                 — Phase 3+
scripts/            # Node validation/perf scripts invoked by checks    — Phase 3+
worker/             # Cloudflare Worker source + its own vitest unit tests — Phase 4
```

---

## Phase 0 — Design direction — **DONE, live**
Deliverables:
- `design-mockups/direction-a/{homepage,card,navbar}.html`
- `design-mockups/direction-b/{homepage,card,navbar}.html`
- `package.json` (tooling: html-validate, @playwright/test, ajv, vitest)

**Verify:**
| what | cmd | expect_exit |
|---|---|---|
| mockup files exist | `test -f design-mockups/direction-a/homepage.html && test -f design-mockups/direction-a/card.html && test -f design-mockups/direction-a/navbar.html && test -f design-mockups/direction-b/homepage.html && test -f design-mockups/direction-b/card.html && test -f design-mockups/direction-b/navbar.html` | 0 |
| mockup HTML valid | `npx html-validate "design-mockups/**/*.html"` | 0 |
| mockup responsive | `npx playwright test tests/responsive/mockups.spec.ts` | 0 |

`mockup responsive` asserts `document.documentElement.scrollWidth <= viewport width` (no horizontal
overflow) for every mockup file at 375/768/1280px.

**Decision:** Direction A ("Heritage Crest") approved 2026-07-15. Direction B stays as frozen reference,
not in active use — don't redesign around it.

---

## Phase 1 — Static scaffold — **DONE, live**
Deliverables:
- `index.html`
- `about/index.html`
- `assets/css/**`
- `assets/js/nav.js` (shared nav/footer partial logic)

**Verify:**
| what | cmd | expect_exit |
|---|---|---|
| HTML valid | `npx html-validate "*.html" "about/**/*.html"` | 0 |
| responsive, no overflow | `npx playwright test tests/responsive/core-pages.spec.ts --grep "home\|about"` | 0 |
| nav/footer structure | `npx playwright test tests/structure/nav-footer.spec.ts` | 0 |

`nav/footer structure` checks `02-SITE-MAP-AND-CONTENT.md`'s nav spec: nav has exactly 4 items (Home,
Drills & Sessions, Gallery, About/Join), footer has a "Drill Builder" link, a logo monogram, and
contact/join info.

Live at `https://vincerhodes.github.io/`.

---

## Phase 2 — Gallery — **DONE, live**
Deliverables:
- `gallery/index.html`

**Verify:**
| what | cmd | expect_exit |
|---|---|---|
| HTML valid | `npx html-validate "gallery/**/*.html"` | 0 |
| iframe present | `npx playwright test tests/structure/gallery.spec.ts` | 0 |
| responsive | `npx playwright test tests/responsive/core-pages.spec.ts --grep gallery` | 0 |

`iframe present` asserts an `<iframe>` exists whose `src` matches
`https://drive.google.com/embeddedfolderview?id=*` per `02`'s embed pattern.

**Still open (not shell-checkable):**
- `gallery/index.html`'s Drive folder id is still the literal placeholder `FOLDER_ID` — swap for the
  club's real shared folder.
- Confirm the Drive embed grid is actually usable on a real mobile device, not merely present — `04`
  flagged this specifically ("Drive's embedded grid view can behave awkwardly on narrow screens").

---

## Phase 3 — Drills & Sessions library + diagram system — **DONE, live**
Deliverables:
- `drills/index.html`
- `drills/session-01-straight-length-and-the-t/index.html`
- `content/sessions/session-01-straight-length-and-the-t/session.md`
- `content/sessions/session-01-straight-length-and-the-t/diagrams/drill-1.json`
- `content/sessions/session-01-straight-length-and-the-t/diagrams/drill-2.json`
- `assets/js/court-diagram.js`
- `scripts/validate-diagrams.mjs`
- `CONTENTS-HOWTO.md`

**Verify:**
| what | cmd | expect_exit |
|---|---|---|
| diagram schema valid | `node scripts/validate-diagrams.mjs` | 0 |
| diagram render smoke | `npx playwright test tests/e2e/session-diagrams.spec.ts` | 0 |
| theme filter | `npx playwright test tests/e2e/theme-filter.spec.ts` | 0 |
| HTML valid | `npx html-validate "drills/**/*.html"` | 0 |

`diagram schema valid` validates every `content/sessions/**/diagrams/*.json` against the schema in
`05-AI-DRILL-BUILDER-PROMPT.md` / `06-SVG-DIAGRAM-SYSTEM.md` (non-empty `players`/`arrows`, `x`/`y` in
`[0,1]`, `color` in the 3-value brand enum, `type` in `["ball","movement"]`) using `ajv`. `diagram
render smoke` loads the session-01 page and asserts exactly 2 `svg.court-diagram` elements render with
zero console errors.

**Still open (not shell-checkable):** confirm `CONTENTS-HOWTO.md` reads clearly to a non-technical
committee member — a readability judgment, not scriptable.

---

## Phase 4 — AI Drill Builder — **DONE, live UI; Worker backend NOT deployed**
Deliverables:
- `worker/src/index.js`
- `worker/src/schema.js` (the `return_session_plan` tool schema, single source of truth)
- `drill-builder/index.html`
- `wrangler.toml`

**Verify:**
| what | cmd | expect_exit |
|---|---|---|
| worker unit tests | `npx vitest run worker/` (or `npm test`) | 0 |
| tool schema valid | `node scripts/validate-tool-schema.mjs` | 0 |
| drill-builder e2e | `npx playwright test tests/e2e/drill-builder.spec.ts` | 0 |

`worker unit tests` covers pure-function logic: coordinate clamping to `[0,1]`, `drill_name` matching,
request validation (rejects missing `players`/`courts`/`theme`/`duration_minutes`), and the KV
rate-limit counter logic (mocked KV) — 41 tests, all passing. `drill-builder e2e` runs against `wrangler
dev` with the OpenRouter call **stubbed** (`TEST_MODE=true` env flag the Worker supports — see
`worker/src/index.js`'s `stubGeneration`).

**Still open:**
- **Deploy the Worker**, three steps, none done yet:
  1. `wrangler kv namespace create RATE_LIMIT` against the real Cloudflare account, paste the returned
     id into `wrangler.toml` (currently a literal placeholder string).
  2. `wrangler secret put OPENROUTER_API_KEY`.
  3. `wrangler deploy`.
  Until this is done, the live `/drill-builder/` page's generate action fails against a nonexistent
  backend.
- **Live-generation quality check** (real OpenRouter calls, not free — ≈$0.28 for a full run): once the
  Worker is deployed, run the live drill-builder endpoint for 5/6/7/8 players, each of the 8 named
  themes plus "surprise me", and one wet-weather/low-turnout note (14 generations total). Confirm every
  run produces a rendered plan and the diagram-degrade rate (see `06-SVG-DIAGRAM-SYSTEM.md`'s
  graceful-degrade path) stays under 10%. This only makes sense against the real deployed Worker, not
  the stub.

---

## Phase 5 — Domain + polish — **scripted work DONE**; DNS cutover + mobile QA still open
Deliverables:
- `assets/favicon.png` — generated from `assets/logos/monogram.png` per `01-BRAND-STYLE-GUIDE.md`.
  Linked via `<link rel="icon">` on all 6 real pages.
- `scripts/check-image-sizes.mjs` — done, passing (4 webp files, all under 100KB).
- `scripts/run-lighthouse.mjs` — done, passing (100 performance, 0.000 CLS on Home/Drills/Drill
  Builder).
- `CNAME` — done, contains `rightcourtsc.com`. Tells GitHub Pages to serve the custom domain; **does
  not by itself complete DNS cutover** — that's the separate human step below.
- `tests/e2e/smoke.spec.ts` + `playwright.config.js` — done, passing on both chromium and firefox.

**Verify:**
| what | cmd | expect_exit |
|---|---|---|
| favicon present | `test -f assets/favicon.png` | 0 |
| images optimized | `node scripts/check-image-sizes.mjs` | 0 |
| lighthouse perf | `node scripts/run-lighthouse.mjs` | 0 |
| cross-browser smoke | `npx playwright test tests/e2e/smoke.spec.ts --project=chromium --project=firefox` | 0 |

`images optimized` asserts every file under `assets/**/*.webp` is under 100KB. `lighthouse perf` serves
the site locally, runs Lighthouse against Home, Drills, and Drill Builder, and asserts Performance ≥ 90
and CLS < 0.1. `cross-browser smoke` runs chromium + firefox only — webkit can't launch on this dev
machine (missing system deps needing `sudo apt-get install`); if a future environment has sudo access,
`playwright install-deps` + adding a webkit project is a two-line fix. The smoke test skips the
zero-console-errors assertion on the gallery page specifically — its Drive iframe still points at the
placeholder `FOLDER_ID`, which reliably 404s against the real Drive endpoint until that's swapped for
the real folder (see Phase 2 and the Outstanding work list below); same reason
`tests/structure/gallery.spec.ts` never asserted on console cleanliness either.

Don't touch `worker/**`, `wrangler.toml`, or `content/sessions/**` while doing polish work — those are
Phase 3/4 deliverables, unrelated to this phase's scope.

**Human checkpoints:**
- Manual QA pass on real iOS Safari and Android Chrome devices.
- DNS cutover: `rightcourtsc.com` registered and pointed per `03-TECHNICAL-ARCHITECTURE.md`, HTTPS
  certificate issuance confirmed — external registrar/Cloudflare account access required.

---

## Outstanding work, all phases (summary)

1. **Gallery** — swap placeholder Drive `FOLDER_ID` for the real one; verify mobile usability.
2. **About page** — swap placeholder contact email `info@rightcourtsc.com` for the club's real address.
3. **Worker deploy** — KV namespace, `OPENROUTER_API_KEY` secret, `wrangler deploy`. Currently the
   live drill-builder page can't actually generate anything.
4. **Live-generation quality check** — after the Worker is deployed (item 3).
5. **DNS cutover** — `rightcourtsc.com` → GitHub Pages / Cloudflare, external account access required.
   `CNAME` file is in place (Phase 5); DNS records themselves are not.
6. **Manual mobile QA** — real iOS Safari + Android Chrome.

See `planning/HANDOFF.md` for current session-to-session status.
