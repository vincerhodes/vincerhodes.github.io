# Handoff — Right Court SC build state

> Living doc for resuming in a fresh session. Read this + `~/.claude/CLAUDE.md` +
> `planning/00-master-plan.md` before touching anything. Last updated: 2026-07-15.

## Where we are

- **Phases 0–4: done and live.** `npm test` (worker unit tests, 41 passing) and the Playwright suites
  under `tests/` all pass. `https://vincerhodes.github.io/`, `/gallery/`, `/drills/`, and
  `/drill-builder/` all return `200` — pushed live 2026-07-15 (repo had been 6 commits ahead of `origin`
  before that).
- **Cloudflare Worker (AI Drill Builder backend): NOT deployed.** `wrangler.toml`'s `RATE_LIMIT` KV
  namespace `id` is still a placeholder, no `OPENROUTER_API_KEY` secret is set remotely, and
  `api.rightcourtsc.com` doesn't resolve (DNS cutover is a Phase 5 checkpoint, not done). The
  drill-builder UI is live and renders, but a generate request will fail until the Worker is deployed —
  see `planning/00-master-plan.md`'s Phase 4 "Still open" list for the 3 deploy steps.
- **Phase 5 (Domain + polish): mostly done.** Favicon generated from `assets/logos/monogram.png` and
  linked on all 6 real pages, `scripts/check-image-sizes.mjs` and `scripts/run-lighthouse.mjs` both
  passing (100 Lighthouse performance, ~0 CLS on Home/Drills/Drill Builder), `tests/e2e/smoke.spec.ts`
  + `playwright.config.js` passing on chromium + firefox.
- **DNS cutover: DONE.** `rightcourtsc.com` is user-owned (registrar: Spaceship, Inc.), was sitting on
  a registrar parking page when first discovered (see incident below). Nameservers delegated to
  Cloudflare (`OLIVIA.NS.CLOUDFLARE.COM` / `YEW.NS.CLOUDFLARE.COM`), zone DNS holds the 4 GitHub Pages
  A records, 4 AAAA records, and a `www` CNAME to `vincerhodes.github.io` — all DNS-only (not proxied).
  `CNAME` file is back in the repo. HTTPS certificate issued (`CN=rightcourtsc.com`, expires
  2026-10-13), "Enforce HTTPS" is on. `https://rightcourtsc.com/`, `/gallery/`, `/drills/`, and
  `/drill-builder/` all return `200`. `http://` and the old `vincerhodes.github.io` URL both correctly
  redirect through to `https://rightcourtsc.com/`.
  - **Incident, resolved:** first CNAME add (2026-07-15) briefly broke the live site — the domain
    turned out to already be registered and parked (not unregistered as planning assumed), so GitHub's
    301 redirect sent all traffic to the parking page until reverted (commit `336e544`).
  - **Second incident, resolved:** after DNS was correctly repointed, GitHub's cert issuance sat
    stuck for ~2 hours with the `https_certificate` field entirely absent from the Pages API response
    — it had likely never properly started. Fix: `gh api -X PUT repos/vincerhodes/vincerhodes.github.io/pages`
    with `{"cname": null}` to clear the custom domain, confirm the repo falls back to serving cleanly
    on `vincerhodes.github.io`, then PUT `{"cname": "rightcourtsc.com"}` again — this reliably
    re-triggers a fresh certificate authorization (state went `authorization_created` → `approved` in
    under 2 minutes). If a future custom-domain cert ever seems stuck with no `https_certificate`
    field in the API response, this clear-and-reset is the fix, not more waiting.
- **Build-loop tooling (`/plan-preflight`, `/verify-init`, `/converge`, and everything they generated —
  `.claude/verify/**`, `.claude/integrity/**`, `.claude/skills/verify-rightcourtsc/`,
  `planning/PREFLIGHT.json`, `planning/LOOP-LOG.md`) has been removed.** It didn't work reliably and is
  gone for good, not paused — don't try to regenerate it or resurrect the phase `tags`/`loop`/`writable`/
  `frozen` YAML blocks that used to sit in `00-master-plan.md`. Verification from here is manual: run the
  commands in each phase's "Verify" table in `00-master-plan.md` directly, by hand, in this shell.
  `.claude/settings.json` was also removed (it only existed to protect the now-deleted verify files from
  edits).

## Verify on entry

```sh
cd /home/vincerhodes/dev/rightcourtsc
git status --porcelain              # should be empty (or only .wrangler/ untracked, which is fine)
npm test                            # worker unit tests
npx playwright test                 # full e2e/responsive/structure suite
curl -sI https://vincerhodes.github.io/ | head -1                # sanity: should be 200
curl -sI https://vincerhodes.github.io/drill-builder/ | head -1  # sanity: should be 200
```

## Decisions taken (not otherwise recorded in code)

- **Model for AI Drill Builder:** `anthropic/claude-haiku-4.5:exacto` via OpenRouter — see
  `planning/05-AI-DRILL-BUILDER-PROMPT.md`'s "Notes for implementation".
- **GitHub repo:** `vincerhodes.github.io`, live. Root user-site pattern — Pages auto-enables on repo
  creation, no separate Pages config API call needed, but does need `.nojekyll` (present, don't remove
  — its absence caused a Jekyll build failure once already).
- **Design direction:** Direction A ("Heritage Crest"), human-approved 2026-07-15.
  `design-mockups/direction-b/` stays as frozen reference only.
- **Content folder layout:** `/content/sessions/session-XX-slug/session.md` +
  `diagrams/drill-N.json` per drill — don't reintroduce a flat-file or `images/`-based layout.
- **Rate limiting:** Cloudflare KV counter (not the built-in rate-limiting product), 30 req/IP/hour —
  deliberately generous because members hit this from shared clubhouse wifi.
- **Branch/PR rule override, scoped:** the user explicitly authorized pushing directly to `main` for
  this repo's GitHub Pages deploy — root user-site Pages serves from `main` with no PR workflow
  available. Scoped to this repo's deploy mechanics only, not a general license to skip branch+PR
  elsewhere.

## Repo map

```
planning/00-master-plan.md          # THE spec — phases, deliverables, verify commands (authoritative)
planning/00-06-*.md                 # component specs (brand, sitemap, architecture, AI prompt, SVG system)
planning/04-BUILD-PHASES-...md      # prose rationale only; master-plan wins on conflicts
assets/logos/                       # real logo files (.png source + .webp optimized)
design-mockups/direction-{a,b}/     # Phase 0 output — direction-a is the approved direction
index.html, about/index.html        # Phase 1 output — live
gallery/index.html                  # Phase 2 output — live; FOLDER_ID still placeholder
drills/index.html, drills/session-01-.../, content/sessions/session-01-.../, assets/js/court-diagram.js
                                     # Phase 3 output — live
worker/src/{index,schema,lib}.js, drill-builder/index.html, wrangler.toml
                                     # Phase 4 output — live UI; Worker itself NOT deployed
assets/css/styles.css, assets/js/nav.js
tests/                              # responsive/, structure/, e2e/
.nojekyll                           # required for GitHub Pages to skip Jekyll processing — don't remove
.env, .dev.vars                     # OPENROUTER_API_KEY etc. (gitignored, do not commit)
```

## Next steps

1. Confirm "Verify on entry" above is clean.
2. Work through the remaining "Outstanding work" list at the bottom of `00-master-plan.md`: Drive
   folder id, contact email, Worker deploy (3 steps), live-generation quality check, mobile QA. DNS
   cutover is done (see above). Remaining items require external account access (Google Drive,
   Cloudflare Worker dashboard, real devices) that this session doesn't have on its own.
3. Update this file and commit when a checkpoint is reached.
