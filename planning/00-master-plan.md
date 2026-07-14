# Right Court SC — Master Plan (loop-ready)

This is the authoritative source for phase completion. `04-BUILD-PHASES-FOR-CLAUDE-CODE.md` remains as
prose rationale and is still worth reading for the *why* behind each phase, but where it conflicts with
this document on what "done" means, **this document wins** — its acceptance criteria are check-ids, not
sentences.

Component specs referenced by phases below are unchanged and live alongside this file:
`01-BRAND-STYLE-GUIDE.md`, `02-SITE-MAP-AND-CONTENT.md`, `03-TECHNICAL-ARCHITECTURE.md`,
`05-AI-DRILL-BUILDER-PROMPT.md`, `06-SVG-DIAGRAM-SYSTEM.md`. Real assets already exist:
`assets/logos/**` and `planning/content-source/session-01-straight-length-and-the-t/**` (the first session's
content + 2 schema-validated diagram JSONs, staged ahead of Phase 3 — see that phase below for where it
moves).

## Tier: `lite`

**Trigger rule:** `full` applies when the work produces numbers a competent human could get wrong on
paper — money, dates/timezones, health/dosage, rates, unit conversions, safety clamps. This project has
no such runtime-computed domain value: the AI Drill Builder's diagram coordinates are LLM-generated
content bounded by a schema (`minimum`/`maximum`/`enum`), not a formula a human derives by hand, and the
only numeric constants in the plan (30 req/IP/hour rate limit, `max_tokens: 4096`, Lighthouse
threshold ≥90) are fixed configuration values, not per-request computations. No `ground-truth/*.yaml`
package is created. `checks.yaml` + tags + bounded loop is the full contract here.

## Environment

```yaml
environment:
  binaries:
    - {cmd: node, min: "20.0.0"}
    - {cmd: npm, min: "10.0.0"}
    - {cmd: git, min: "2.30.0"}
  preconditions:
    - "git rev-parse --is-inside-work-tree"
```

**OPEN: this repo is not yet a git repository** (`git rev-parse --is-inside-work-tree` currently exits
128 — confirmed at planning time). `/plan-preflight`'s `ENV-1`/`ENV-2` probes will fail on this until
`git init` + an initial commit happens. This is expected to be the very first action of Phase 0, not
something pre-fixed by this plan — surfacing it clearly is what preflight is for.

**ASSUMPTION:** `npm` (not `pnpm`/`yarn`) as the package manager for tooling only — the site itself has
no build step (plain HTML/CSS/JS per `03-TECHNICAL-ARCHITECTURE.md`); `npm` is only used to install dev
tooling (`html-validate`, `@playwright/test`, `ajv`, `vitest`, `lighthouse`) that the checks below invoke.

GitHub repo name is `vincerhodes.github.io` per the root-site pattern decided in
`03-TECHNICAL-ARCHITECTURE.md` — CORS allow-list and deploy target are both resolved.

## Global frozen set (every phase, in addition to phase-specific entries below)
```
.claude/verify/checks.yaml
.claude/verify/run.sh
.claude/verify/integrity.sh
*.config.*
```

## Test layout (each directory first created in the phase that first needs it — see per-phase `writable`)
```
tests/
├── responsive/     # Playwright: no-horizontal-scroll at 375/768/1280px — Phase 0
├── structure/      # Playwright: nav/footer/DOM structure assertions   — Phase 1
└── e2e/            # Playwright: user-flow smoke tests                 — Phase 3
scripts/            # Node validation/perf scripts invoked by checks (domain, static, e2e — see checks.yaml) — Phase 3
worker/              # Cloudflare Worker source + its own vitest unit tests — Phase 4
```
Every phase below introduces new spec files for its own checks (there's no pre-existing test suite to
extend — this is a from-scratch repo), so every phase is marked `test_authoring: true` and carries the
mandatory human diff review on its tests at phase end, per the contract.

---

## Phase 0 — Design direction
```yaml
phase: 0
title: Design direction
tags: [static, phase0]
deliverables:
  - design-mockups/direction-a/{homepage,card,navbar}.html
  - design-mockups/direction-b/{homepage,card,navbar}.html
  - package.json                    # tooling bootstrap: html-validate, @playwright/test, ajv, vitest
loop: {max_iterations: 10, stuck_after: 4}
writable: ["design-mockups/**", "package.json", "package-lock.json", "tests/responsive/**"]
frozen: []   # nothing project-specific yet beyond the global set
test_authoring: true
```
**Setup note (do first):** `git init` + initial commit of the current tree (this planning/ folder,
assets/, quality_reports/), then `npm init` + install the dev tooling listed above — this is what makes
the environment preconditions and every later phase's `npx …` checks executable at all.

**Checks:**
| id | tags | cmd | expect_exit |
|---|---|---|---|
| `STATIC.mockup-files` | static, phase0 | `test -f design-mockups/direction-a/homepage.html && test -f design-mockups/direction-a/card.html && test -f design-mockups/direction-a/navbar.html && test -f design-mockups/direction-b/homepage.html && test -f design-mockups/direction-b/card.html && test -f design-mockups/direction-b/navbar.html` | 0 |
| `STATIC.mockup-html-valid` | static, phase0 | `npx html-validate "design-mockups/**/*.html"` | 0 |
| `STATIC.mockup-responsive` | static, phase0 | `npx playwright test tests/responsive/mockups.spec.ts` | 0 |

`STATIC.mockup-responsive` operationalizes "so the responsive behavior can be judged early rather than
retrofitted" from `04`: asserts `document.documentElement.scrollWidth <= viewport width` (no horizontal
overflow) for every mockup file at 375/768/1280px.

**Human checkpoints:**
- Approve one visual direction (or an agreed merge of elements from both) before Phase 1 begins —
  aesthetic judgment, not scriptable.

---

## Phase 1 — Static scaffold
```yaml
phase: 1
title: Static scaffold
tags: [static, phase1]
deliverables:
  - index.html
  - about/index.html
  - assets/css/**
  - assets/js/nav.js        # shared nav/footer partial logic
loop: {max_iterations: 10, stuck_after: 4}
writable: ["index.html", "about/**", "assets/css/**", "assets/js/nav.js", "tests/responsive/**", "tests/structure/**"]
frozen: ["design-mockups/**"]   # Phase 0's approved direction is the source of truth, don't silently redesign it here
test_authoring: true
```
**Checks:**
| id | tags | cmd | expect_exit |
|---|---|---|---|
| `STATIC.html-valid` | static, phase1 | `npx html-validate "*.html" "about/**/*.html"` | 0 |
| `STATIC.responsive-no-overflow` | static, phase1 | `npx playwright test tests/responsive/core-pages.spec.ts --grep "home\|about"` | 0 |
| `STATIC.nav-footer-structure` | static, phase1 | `npx playwright test tests/structure/nav-footer.spec.ts` | 0 |

`STATIC.nav-footer-structure` operationalizes `02-SITE-MAP-AND-CONTENT.md`'s nav spec: asserts the nav
contains exactly 4 items (Home, Drills & Sessions, Gallery, About/Join) and the footer contains a
"Drill Builder" link, a logo monogram, and contact/join info.

**Human checkpoints:**
- Confirm GitHub Pages deployment is live and reachable at the public
  `https://vincerhodes.github.io/` URL (external deploy timing/DNS propagation — a sandboxed
  check has no reliable way to depend on this).

---

## Phase 2 — Gallery
```yaml
phase: 2
title: Gallery
tags: [static, phase2]
deliverables:
  - gallery/index.html
loop: {max_iterations: 10, stuck_after: 4}
writable: ["gallery/**", "tests/structure/**", "tests/responsive/**"]
frozen: ["design-mockups/**", "index.html", "about/**"]
test_authoring: true
```
**Checks:**
| id | tags | cmd | expect_exit |
|---|---|---|---|
| `STATIC.gallery-html-valid` | static, phase2 | `npx html-validate "gallery/**/*.html"` | 0 |
| `STATIC.gallery-iframe-present` | static, phase2 | `npx playwright test tests/structure/gallery.spec.ts` | 0 |
| `STATIC.gallery-responsive` | static, phase2 | `npx playwright test tests/responsive/core-pages.spec.ts --grep gallery` | 0 |

`STATIC.gallery-iframe-present` asserts an `<iframe>` exists whose `src` matches
`https://drive.google.com/embeddedfolderview?id=*` per `02`'s embed pattern.

**Human checkpoints:**
- Swap the placeholder Drive `FOLDER_ID` for the club's real shared folder.
- Confirm the Drive embed grid is actually usable on a real mobile device, not merely present —
  `04` flagged this specifically ("Drive's embedded grid view can behave awkwardly on narrow screens").

---

## Phase 3 — Drills & Sessions library + diagram system
```yaml
phase: 3
title: Drills & Sessions library + diagram system
tags: [static, domain, phase3]
deliverables:
  - drills/index.html
  - drills/session-01-straight-length-and-the-t/index.html
  - content/sessions/session-01-straight-length-and-the-t/session.md
  - content/sessions/session-01-straight-length-and-the-t/diagrams/drill-1.json
  - content/sessions/session-01-straight-length-and-the-t/diagrams/drill-2.json
  - assets/js/court-diagram.js
  - scripts/validate-diagrams.mjs
  - CONTENTS-HOWTO.md
loop: {max_iterations: 10, stuck_after: 4}
writable: ["drills/**", "content/sessions/**", "assets/js/court-diagram.js", "scripts/validate-diagrams.mjs", "CONTENTS-HOWTO.md", "tests/e2e/**"]
frozen: ["design-mockups/**", "index.html", "about/**", "gallery/**"]
test_authoring: true
```
The session-01 content and both diagram JSONs already exist at
`planning/content-source/session-01-straight-length-and-the-t/` (authored and schema-validated ahead of
this phase) — this phase's job is to move that folder to `content/sessions/`, build the page template and
`renderCourtDiagram` component around it, and write the validator script that the check below runs.

**Checks:**
| id | tags | cmd | expect_exit |
|---|---|---|---|
| `DOMAIN.diagram-schema-valid` | domain, phase3 | `node scripts/validate-diagrams.mjs` | 0 |
| `STATIC.diagram-render-smoke` | static, phase3 | `npx playwright test tests/e2e/session-diagrams.spec.ts` | 0 |
| `STATIC.theme-filter` | static, phase3 | `npx playwright test tests/e2e/theme-filter.spec.ts` | 0 |
| `STATIC.drills-html-valid` | static, phase3 | `npx html-validate "drills/**/*.html"` | 0 |

`DOMAIN.diagram-schema-valid` validates every `content/sessions/**/diagrams/*.json` against the schema
in `05-AI-DRILL-BUILDER-PROMPT.md` / `06-SVG-DIAGRAM-SYSTEM.md` (non-empty `players`/`arrows`, `x`/`y` in
`[0,1]`, `color` in the 3-value brand enum, `type` in `["ball","movement"]`) using `ajv` — this is a
structural/schema check, not a domain formula, which is why it stays inside the `lite` tier despite the
`domain` tag. `STATIC.diagram-render-smoke` loads the session-01 page and asserts exactly 2
`svg.court-diagram` elements render with zero console errors.

**Human checkpoints:**
- Confirm `CONTENTS-HOWTO.md` is understandable to a non-technical committee member — genuinely a
  readability judgment, not scriptable.

---

## Phase 4 — AI Drill Builder
```yaml
phase: 4
title: AI Drill Builder
tags: [domain, phase4]
deliverables:
  - worker/src/index.js
  - worker/src/schema.js         # the return_session_plan tool schema, single source of truth
  - drill-builder/index.html
  - wrangler.toml
loop: {max_iterations: 10, stuck_after: 4}
writable: ["worker/**", "drill-builder/**", "wrangler.toml", "scripts/validate-tool-schema.mjs", "tests/e2e/**"]
frozen: ["design-mockups/**", "index.html", "about/**", "gallery/**", "drills/**", "content/sessions/**"]
test_authoring: true
```
**Checks:**
| id | tags | cmd | expect_exit |
|---|---|---|---|
| `DOMAIN.worker-unit-tests` | domain, phase4 | `npx vitest run worker/` | 0 |
| `DOMAIN.tool-schema-valid` | domain, phase4 | `node scripts/validate-tool-schema.mjs` | 0 |
| `E2E.drill-builder-flow` | e2e, phase4 | `npx playwright test tests/e2e/drill-builder.spec.ts` | 0 |
| `JUDGE.live-generation-quality` | phase4 | *(type: agent — see rubric below)* | — |

`DOMAIN.worker-unit-tests` covers the pure-function logic: coordinate clamping to `[0,1]`, `drill_name`
matching, request validation (rejects missing `players`/`courts`/`theme`/`duration_minutes`), and the KV
rate-limit counter logic (mocked KV). `E2E.drill-builder-flow` runs against `wrangler dev` with the
OpenRouter call **stubbed** (a test-mode env flag the Worker must support — real API calls don't belong
in a check that reruns on every loop iteration). `JUDGE.live-generation-quality` is the one check that
does call the real OpenRouter endpoint:

```yaml
- id: JUDGE.live-generation-quality
  tags: [phase4]
  type: agent
  rubric: >
    Run the live drill-builder endpoint (real OpenRouter call, anthropic/claude-haiku-4.5:exacto) for:
    5, 6, 7, and 8 players; each of the 8 named themes plus "surprise me"; and one generation with a
    wet-weather/low-turnout note. For each run, confirm a plan renders and record whether every drill's
    diagram rendered or degraded (see 06-SVG-DIAGRAM-SYSTEM.md's graceful-degrade path). PASS only if
    every run produces a rendered plan (zero total failures) and the diagram-degrade rate across all
    runs is under 10%. Quote the actual failures/degraded drills as evidence for a FAIL verdict.
```
**Cost note:** this check makes real, billed OpenRouter API calls — 14 generations (4 player-count runs
+ 9 theme runs [8 named themes + "surprise me"] + 1 wet-weather run) × ≈$0.02 each ≈ $0.28 per run — and
will rerun on every phase-4 loop iteration up to `max_iterations: 10` — worst case ≈$2.80 for the phase,
trivial against the project's own cost target but worth knowing before the loop runs
unattended.

**Human checkpoints:**
- Provision `OPENROUTER_API_KEY` and the `RATE_LIMIT` KV namespace in the real Cloudflare account —
  dashboard/account access required, cannot be scripted.
- Approve production Worker secret values (TTY-gated, same as ground-truth approval elsewhere).

---

## Phase 5 — Domain + polish
```yaml
phase: 5
title: Domain + polish
tags: [static, phase5]
deliverables:
  - assets/favicon.png
  - scripts/check-image-sizes.mjs
  - scripts/run-lighthouse.mjs
  - CNAME                    # moved here from an earlier Phase-1 draft — its only purpose (03) is
                              # telling GitHub Pages to serve the custom domain, which 04 always said
                              # comes in Phase 5, not Phase 1. Not shell-tested (DNS cutover is a human
                              # checkpoint below); this just makes the deliverable list match reality.
loop: {max_iterations: 10, stuck_after: 4}
writable: ["assets/**", "index.html", "about/**", "gallery/**", "drills/**", "drill-builder/**", "README.md", "CNAME", "scripts/check-image-sizes.mjs", "scripts/run-lighthouse.mjs", "tests/e2e/**"]
# Deliberately narrower than phases 2-4's accumulating pattern: polish is cross-cutting by definition
# (favicon links, meta tags, perf tweaks) and needs every REAL site page built so far — but not
# design-mockups/** (Phase 0 reference material, never a live page) which frozen below still protects.
# An earlier draft used a blanket "**/*.html" here, which silently included design-mockups/**/*.html
# and directly contradicted the frozen line below — preflight's contradiction hunt caught it. Listing
# real page globs explicitly instead means writable and frozen can never overlap by construction.
frozen: ["design-mockups/**", "worker/**", "wrangler.toml", "content/sessions/**"]
test_authoring: true
```
**Checks:**
| id | tags | cmd | expect_exit |
|---|---|---|---|
| `STATIC.favicon-present` | static, phase5 | `test -f assets/favicon.png` | 0 |
| `STATIC.images-optimized` | static, phase5 | `node scripts/check-image-sizes.mjs` | 0 |
| `E2E.lighthouse-perf` | e2e, phase5 | `node scripts/run-lighthouse.mjs` | 0 |
| `E2E.cross-browser-smoke` | e2e, phase5 | `npx playwright test tests/e2e/smoke.spec.ts --project=chromium --project=firefox` | 0 |

`STATIC.images-optimized` asserts every file under `assets/**/*.webp` is under 100KB (the real logo webps
already measured 9–40KB during planning, so this is easily satisfiable, not aspirational).
`E2E.lighthouse-perf` serves the site locally, runs Lighthouse against Home, Drills, and Drill Builder,
and asserts Performance ≥ 90 and CLS < 0.1 from the JSON report — this is the concrete number behind
`04`'s "check Lighthouse scores" and "confirm no layout shift" language. `E2E.cross-browser-smoke` runs chromium + firefox only — webkit was tried at `/verify-init` time and
confirmed unable to launch on this machine (missing system deps that need `sudo apt-get install`,
unavailable in this sandboxed environment). Real Safari/iOS coverage was already a human checkpoint
below regardless, since WebKit-the-engine was never identical to real iOS Safari — this just makes the
gap explicit rather than carrying a check that could never pass here. If a future dev environment has
sudo access, `playwright install-deps` + re-adding `--project=webkit` is a two-line fix, not a redesign.

**Human checkpoints:**
- Manual QA pass on real iOS Safari and Android Chrome devices.
- DNS cutover: `rightcourtsc.com` registered and pointed per `03-TECHNICAL-ARCHITECTURE.md`, HTTPS
  certificate issuance confirmed — external registrar/Cloudflare account access required.

---

## Always-on check
`INTEGRITY.frozen` (`tags: [always]`, `cmd: bash .claude/verify/integrity.sh`) runs on every invocation
regardless of `--tags` selection, generated by `/verify-init`. Not listed per-phase above since it's
unconditional by design.

## Next steps
1. `/verify-init` — generate `.claude/verify/{checks.yaml,run.sh,integrity.sh}` from the checks tables
   above and confirm each command executes on this machine.
2. `/plan-preflight` — prove this plan is satisfiable (environment probes, driver-command checks, the
   `git init` precondition above, contradiction hunting) before any loop runs.
3. Human review of this document (phases, checks, tiering — the `lite` decision and its reasoning above).
4. `/model sonnet` → `/converge phase 0` → `/model opus`.
