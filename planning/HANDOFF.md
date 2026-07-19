# Handoff — Right Court SC build state

> Living doc for resuming in a fresh session. Read this + `~/.claude/CLAUDE.md` before touching
> anything. Last updated: 2026-07-18.

## VERCEL MIGRATION — V0+V1 DONE (2026-07-19), V2–V4 need the user's accounts

**Direction changed 2026-07-19:** hosting is Vercel hobby, NOT a VPS. `planning/08-VERCEL-MIGRATION.md`
supersedes 07's Phase 6/7 (the VPS `web/deploy/` artifacts were deleted unused). Read 08 first.

Done in V0+V1: `web/lib/db.ts` is now on `@libsql/client` (async API, same schema/semantics) —
`file:./data/drills.db` locally, `TURSO_DATABASE_URL`+`TURSO_AUTH_TOKEN` in prod; `better-sqlite3`
gone; `maxDuration = 300` on `/api/generate` (hobby+Fluid Compute cap; drop to 60 if a deploy
rejects it). Verified: build ✓, vitest 77/77, eslint clean, file-mode round-trip + 429-at-31 all
green locally.

Remaining (user steps, runbook is in 08's V2–V4): ~~create Vercel project~~ **V2 mostly done
2026-07-19 via Vercel MCP** — project `rightcourtsc` (`prj_eJTNoVDkcysihGQ39hfklEohjKpk`, team
`vincerhodes-projects`) exists, `OPENROUTER_API_KEY` set, preview deploys green (all pages 200,
diagrams SSR'd), **live OpenRouter generation confirmed working on Vercel** via a temporary
`web/app/api/selftest/` route (runtime logs show 200; DELETE that route at cutover). Deploys run
via `node scripts/vercel-api-deploy.mjs --target preview` (local-only, gitignored). Preview
protection disabled. Still needed from the user: (1) Turso account → `turso db create
rightcourtsc` → URL + token (set as `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` in Vercel — without
them `/api/drills*` 500s on Vercel's read-only FS, expected for now); (2) `GOOGLE_DRIVE_API_KEY` +
`GALLERY_FOLDER_ID` from the Cloudflare Worker dashboard; (3) at cutover: DNS changes + add the
custom domain in Vercel (apex A → 76.76.21.21, www CNAME → cname.vercel-dns.com) and Worker/GitHub
Pages retirement.

## Where we are

- **Site (Phases 0–5): done and live.** `https://rightcourtsc.com/` and all real pages
  (`/about/`, `/gallery/`, `/drills/`, `/drill-builder/`, `/founding-squashers/`) return `200`.
- **AI Drill Builder Worker: deployed and live** at `api.rightcourtsc.com`. `MAX_TOKENS = 12000` in
  `worker/src/schema.js` (empirically tuned, do not lower without re-running the stress test —
  8192 failed ~1/3 of attempts on the worst case). `npm test` → 46 passing (`worker/src/lib.test.js`).
- **System prompt has a "HOUSE IN-JOKES" section** (`worker/src/schema.js` `SYSTEM_PROMPT`,
  mirrored in `planning/05-AI-DRILL-BUILDER-PROMPT.md`): Pinball level → "Jonny Short Shorts";
  Exhibition Shots theme → Joe "Skid Boast" Cash; boast drills → Jimmy "The Boaster" Rhodes; drop
  drills → Adam "Soft Hands" Turner. Verified live — these show up "sparingly," not every
  generation, by design. This "sparingly" pattern is the template the next task should follow.
- **Squash-ball loader: built, modularized, done.** Lives in `assets/css/ball-loader.css` +
  `assets/js/ball-loader.js` (`window.RCBallLoader`). Demo/QA page at `/loader-demo/` (not linked
  from nav, `noindex`). Not touched recently, no open work here.
- **Founding Squashers page** (`founding-squashers/index.html`): 4 founders — Jimmy "The Boaster"
  Rhodes, Joe "Skid Boast" Cash, Adam "Soft Hands" Turner, Jonny "The Diplomat" Brooks. Jonny Short
  Shorts is a separate person who only exists in AI-generated pinball copy, not a founder.
- **Drills & Sessions library: COMPLETE, all 9 themes covered.** 8 sessions total, all in the same
  2–4-player / 1-court format (2-player base + inline 3-player/4-player adaptation notes per
  drill/game — not separate parallel sessions):
  - `session-01-straight-length-and-the-t` (length, movement) — originally 8p/2-courts, **rescaled**
    to the shared format on 2026-07-18 (commit `257238a`).
  - `session-02-volley-pressure` (volleys) through `session-08-exhibition-flair`
    (exhibition-shots) — built 2026-07-18 (commit `1a063e1`).
  - Every session: `web/content/sessions/session-NN-slug/session.md` +
    `diagrams/drill-1.json`/`drill-2.json`, a rendered page at
    `drills/session-NN-slug/index.html`, and a card in `drills/index.html`'s `#session-grid` with a
    matching `.theme-filter` button. All 9 filter buttons (`length` through `exhibition-shots`) now
    show at least one card. Verified live in-browser: filters isolate correctly, diagrams render.
  - `node scripts/validate-diagrams.mjs` → 16/16 valid. `npm test` → 46/46. No open work here.

## Verify on entry

```sh
cd /home/vincerhodes/dev/rightcourtsc
git status --porcelain              # should be empty
npm test                            # worker unit tests — expect 46 passing
node scripts/validate-diagrams.mjs  # expect 16 diagram file(s) valid
curl -sI https://rightcourtsc.com/drill-builder/ | head -1   # expect 200
curl -sI https://api.rightcourtsc.com/generate -X POST | head -1  # expect a real response, not connection error
```

## Decisions taken (not otherwise recorded in code)

- **Model for AI Drill Builder:** `anthropic/claude-haiku-4.5:exacto` via OpenRouter, non-
  streaming call — see `planning/05-AI-DRILL-BUILDER-PROMPT.md`.
- **Content folder layout:** `/web/content/sessions/session-NN-slug/session.md` + one
  `diagrams/drill-N.json` per drill, a rendered page at `drills/session-NN-slug/index.html`, and a
  card in `drills/index.html`'s `<div class="session-grid">` — three artifacts per session. Full
  process: `CONTENTS-HOWTO.md`.
- **Theme naming inconsistency — read before touching `data-themes`:** the AI Drill Builder's
  `THEMES` array (`worker/src/schema.js`) uses `'serves/returns'` (slash) — this is also the exact
  string required in a session's `session.md` front-matter `theme:` field. The static
  `drills/index.html` filter buttons and every card's `data-themes` attribute use
  `data-theme="serves-returns"` (hyphen) instead. All other theme names are spelled identically in
  both places.
- **`data-themes` on a session card must be a single primary theme token, not the session's full
  `tags` list.** Bug found and fixed 2026-07-18: an earlier pass set `data-themes` from each
  session's front-matter `tags` array (e.g. `tags: [front-court, movement]` → `data-themes=
  "front-court movement"`), which made session-05 (Front-Court Touch) incorrectly appear under the
  unrelated "Movement" filter alongside session-01. `data-themes` should only ever contain the
  theme(s) that have their own `.theme-filter` button and that the session is actually meant to be
  filed under — don't derive it mechanically from `tags`.
- **Branch/PR rule override, scoped:** direct pushes to `main` are authorized for this repo only
  (root user-site GitHub Pages, no PR workflow available) — not a general license elsewhere.
- **Rate limiting:** Cloudflare KV counter, 30 req/IP/hour, deliberately generous (shared
  clubhouse wifi).

## Repo map

```
worker/src/{index,schema,lib}.js     # Worker: fetch handler, THEMES/LEVELS/SYSTEM_PROMPT/MAX_TOKENS, pure logic
worker/src/lib.test.js               # 46 vitest unit tests
drill-builder/index.html, drills/index.html   # both embed the same form (assets/js/drill-builder.js)
assets/js/drill-builder.js           # form logic; calls window.RCBallLoader for the loading state
assets/js/nav.js                     # shared header/footer, generated ONCE per page load into
                                      # #site-header / #site-footer (footerHtml string ~line 38-55)
                                      # — the cheapest way to add something to every page
assets/css/ball-loader.css, assets/js/ball-loader.js   # modular loader
loader-demo/index.html               # loader QA/demo page, not in nav
web/content/sessions/session-0[1-8]-.../ # all 8 hand-authored sessions, 2-4p/1-court format
drills/session-0[1-8]-.../index.html # their rendered pages
CONTENTS-HOWTO.md                    # the 6-step process for adding a new session (content + page + card)
founding-squashers/index.html        # 4 founders — Jonny Short Shorts is NOT one of them
scripts/validate-diagrams.mjs        # validates diagrams/drill-N.json files
scripts/validate-tool-schema.mjs     # validates worker/src/schema.js's RETURN_SESSION_PLAN_TOOL
.env                                 # OPENROUTER_API_KEY (gitignored, don't commit)
```

## Next task: scatter funny injury-claim references, linking to Turner & Rhodes Solicitors

**The ask, verbatim from the user:** add in some reference to injury claims throughout the site,
they should be funny and link to `https://rightcourtsc.com/turnerandrhodes/`.

**Context gathered so far (don't re-derive, it's already confirmed):**
- `https://rightcourtsc.com/turnerandrhodes/` is **already live** (`curl -I` → `HTTP/2 200`,
  confirmed 2026-07-18). It's a fully-built parody law-firm site — "Turner & Rhodes Solicitors,
  Sports & Personal Injury Specialists, London" — built from a **separate local repo at
  `~/dev/turnerandrhodes`**, which is **not part of this rightcourtsc repo**. Do not build, edit, or
  touch that repo — this task is purely about adding outbound links to it from rightcourtsc.com's
  existing pages.
- The name is a house in-joke: Turner & Rhodes are two of this site's own founding squashers —
  Jimmy "The Boaster" Rhodes and Adam "Soft Hands" Turner (see `founding-squashers/index.html` and
  the existing `HOUSE IN-JOKES` section in `worker/src/schema.js`'s `SYSTEM_PROMPT`).
- The parody site's tone (for reference/flavor, read `practice-areas.html#squash` on the live site
  if useful): deadpan legal language applied to squash injuries — "Player-to-player racquet or ball
  collisions," "Glass-back-wall impact injuries," an "ocular trauma unit," etc.
- This task is intentionally light on specifics — the user called it "quite simple" and left
  exact wording/placement/count to judgement. Keep it **sparing and funny**, matching the site's
  established in-joke restraint (the `SYSTEM_PROMPT`'s "sparingly, not every generation" pattern for
  Jonny Short Shorts / Skid Boast Cash is the template — don't put this on every single page or make
  it heavy-handed).

**Candidate injection points (pick some, not necessarily all — use judgement):**
1. `assets/js/nav.js` (~line 38–55): the shared `footerHtml` string, rendered once into every
   page's `#site-footer`. Cheapest way to get a joke link genuinely site-wide in one edit. Currently
   ends with a `<p class="copyright">` line — a short line/link could go alongside it. Note: the
   existing footer links use a `prefix` variable for path-correct *internal* links
   (`prefix + 'drill-builder/index.html'` etc.) — `turnerandrhodes/` is an external top-level site
   path, not a page inside this repo, so decide whether `prefix + 'turnerandrhodes/'` (relies on
   both sites sharing a domain root) or the absolute `https://rightcourtsc.com/turnerandrhodes/` is
   more correct/robust, and check how the existing Drill Builder Worker links (if any) to
   `api.rightcourtsc.com` handle the same cross-origin-ish concern for precedent.
2. `founding-squashers/index.html`: has bio cards for both "Jimmy 'The Boaster' Rhodes" and "Adam
   'Soft Hands' Turner" — natural spot for a joke tying their names to the firm.
3. `worker/src/schema.js` `SYSTEM_PROMPT`'s `HOUSE IN-JOKES` section: optional — could add Turner &
   Rhodes as a new sparing in-joke the AI Drill Builder surfaces occasionally, matching the existing
   pattern exactly. Read that section in full before touching it; also update
   `planning/05-AI-DRILL-BUILDER-PROMPT.md`'s mirror of it if changed, per the existing convention
   noted above.
4. `web/content/sessions/*/session.md` Coach's notes, and/or `gallery/index.html` captions: possible
   additional light-touch spots if more than one or two references feels right.

### Entry checklist

1. Confirm `https://rightcourtsc.com/turnerandrhodes/` is still live (`curl -sI` → `200`) before
   relying on it.
2. Decide how many/which of the candidate spots to use — this is a judgement call, not a checklist
   to complete in full.
3. Read `worker/src/schema.js`'s `SYSTEM_PROMPT` `HOUSE IN-JOKES` section in full if touching it —
   match its exact style/restraint.
4. Make the edits. For any internal-repo change touching the footer, verify on at least 2 pages at
   different nesting depths (e.g. `/index.html` and `/drills/session-01.../index.html`) that the
   `prefix`-relative logic still resolves correctly and the link actually reaches
   `https://rightcourtsc.com/turnerandrhodes/`.
5. Run `npm test` and `node scripts/validate-diagrams.mjs` (unrelated to this task, but confirms
   nothing else broke) if any `web/content/sessions/*` or `worker/src/schema.js` files were touched.
6. Check in browser: load the site, confirm the reference(s) read as funny/in-tone and the link(s)
   work.
7. Commit and push (direct-to-`main` is authorized for this repo — see "Decisions taken").

## Open questions / not done

- Exact wording, count, and placement of the injury-claim references — not decided, that's this
  task. Use judgement; check with the user if genuinely unsure, but this was scoped as low-stakes.
- Whether to touch the AI Drill Builder's `SYSTEM_PROMPT` house in-jokes (candidate #3 above) is
  optional, not required — don't feel obligated to add an AI-generation-time in-joke if the
  static-page references alone satisfy "throughout."
