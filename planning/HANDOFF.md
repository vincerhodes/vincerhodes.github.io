# Handoff — Right Court SC build state

> Living doc for resuming in a fresh session. Read this + `~/.claude/CLAUDE.md` before touching
> anything. Last updated: 2026-07-16.

## Where we are

- **Site (Phases 0–5): done and live.** `https://rightcourtsc.com/` and all real pages
  (`/about/`, `/gallery/`, `/drills/`, `/drill-builder/`, `/founding-squashers/`) return `200`.
  DNS/HTTPS cutover complete (see prior incidents below — resolved, no action needed).
- **AI Drill Builder Worker: deployed and live** at `api.rightcourtsc.com`. Was previously
  broken (placeholder KV id, no secret, `MAX_TOKENS` too low causing intermittent generation
  failures) — all fixed. Current state: `MAX_TOKENS = 12000` in `worker/src/schema.js`
  (empirically tuned — 4096 truncated on complex requests, 8192 still failed ~1/3 of the time on
  the worst case, 12000 passed 4/4 stress-test attempts; kept under ~16K since the Worker calls
  OpenRouter non-streaming). `npm test` → 46 passing (`worker/src/lib.test.js`).
- **System prompt has a "HOUSE IN-JOKES" section** (`worker/src/schema.js` `SYSTEM_PROMPT`,
  mirrored in `planning/05-AI-DRILL-BUILDER-PROMPT.md`): Pinball level → "Jonny Short Shorts"
  (NOT founding squasher Jonny "The Diplomat" Brooks — these are two different people, confirmed
  by the user after an earlier mix-up); Exhibition Shots theme → Joe "Skid Boast" Cash; boast
  drills → Jimmy "The Boaster" Rhodes; drop drills → Adam "Soft Hands" Turner. Verified live —
  these show up "sparingly," not every generation, by design.
- **Squash-ball loader: built, modularized, and iterated on extensively.** Now lives entirely in
  `assets/css/ball-loader.css` + `assets/js/ball-loader.js` (`window.RCBallLoader` —
  `.markup(message, theme)`, `.markupForPattern(message, pattern)`, `.mount(container, options)`),
  fully decoupled from `drill-builder.js`. Isometric court-corner scene: wood floor (with plank
  lines), side wall + front wall in white with a forest-green outline ("green surround," not the
  original two-tone green), tin line, ball with two yellow speed dots and **no seam** (a real
  squash ball is smooth rubber — this was explicitly corrected). 9 tracer patterns, each named
  after and modeled on a real squash shot, each one's *final* impact on the front wall (the actual
  rule — every legal shot must reach the front wall): `drive`, `boast` (2-wall), `drop`, `volley`,
  `lob`, `nick` (dies in the wall-meets-wall-meets-floor corner), `reverse` (reverse angle boast),
  `corkscrew` (trick shot — fast inner spin), `crosscourt`. 1:1 theme→pattern map in
  `THEME_PATTERN`. Demo/QA page at `/loader-demo/` (not linked from nav, `noindex`) shows all
  patterns + a theme picker. **If the user says "still looks the same" after a fix**: it's a
  browser cache issue, not a deploy issue — confirmed the deployed `ball-loader.js` had the new
  code within seconds of pushing. Tell them to hard-refresh (`Cmd/Ctrl+Shift+R`) or use a private
  window.
- **Founding Squashers page**: Jimmy "The Boaster" Rhodes, Joe "Skid Boast" Cash, Adam "Soft
  Hands" Turner, Jonny "The Diplomat" Brooks. **Jonny Short Shorts is a different, separate
  person** who only exists in the AI-generated pinball copy — not a founder, not on this page.
- **Drills & Sessions library content: sparse.** Only one real session exists:
  `content/sessions/session-01-straight-length-and-the-t/` (theme tags `length movement`,
  designed for **8 players / 2 courts** — a different scale than the new task below). The other 7
  themes (`volleys`, `drops`, `boasts`, `front-court`, `deception`, `serves/returns`,
  `exhibition-shots`) have **no** hand-authored content yet — this is the next task, see below.

## Verify on entry

```sh
cd /home/vincerhodes/dev/rightcourtsc
git status --porcelain              # should be empty
npm test                            # worker unit tests — expect 46 passing
node scripts/validate-tool-schema.mjs
curl -sI https://rightcourtsc.com/drill-builder/ | head -1   # expect 200
curl -sI https://api.rightcourtsc.com/generate -X POST | head -1  # expect a real response, not connection error
```

## Decisions taken (not otherwise recorded in code)

- **Model for AI Drill Builder:** `anthropic/claude-haiku-4.5:exacto` via OpenRouter, non-
  streaming call — see `planning/05-AI-DRILL-BUILDER-PROMPT.md`.
- **Content folder layout:** `/content/sessions/session-NN-slug/session.md` + one
  `diagrams/drill-N.json` per drill. A session also needs a rendered page at
  `drills/session-NN-slug/index.html` (copied from an existing one, diagrams inlined via
  `renderCourtDiagram(...)` calls) **and** a card added to `drills/index.html`'s
  `<div class="session-grid">` — three artifacts per session, not just the content file. Full
  process: `CONTENTS-HOWTO.md`.
- **Theme naming has a real inconsistency — read before touching `data-themes`:** the AI Drill
  Builder's `THEMES` array (`worker/src/schema.js`) uses `'serves/returns'` (slash). The static
  `drills/index.html` filter buttons use `data-theme="serves-returns"` (hyphen). When adding a
  session card's `data-themes` attribute, match the **filter buttons'** convention
  (`serves-returns`, hyphenated), not the Worker's. All other theme names are spelled identically
  in both places.
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
assets/css/ball-loader.css, assets/js/ball-loader.js   # modular loader — see "Where we are" above
loader-demo/index.html               # loader QA/demo page, not in nav
content/sessions/session-01-.../     # the one real hand-authored session (8p/2 courts, length+movement)
drills/session-01-.../index.html     # its rendered page
CONTENTS-HOWTO.md                    # the 6-step process for adding a new session (content + page + card)
founding-squashers/index.html        # 4 founders — Jonny Short Shorts is NOT one of them
scripts/validate-diagrams.mjs        # validates diagrams/drill-N.json files
scripts/validate-tool-schema.mjs     # validates worker/src/schema.js's RETURN_SESSION_PLAN_TOOL
.env                                 # OPENROUTER_API_KEY (gitignored, don't commit)
```

## Key contracts for the next task

- `session.md` front matter: `title`, `theme` (one of the 9 `THEMES` values, slash form), `tags`
  (array), `date`, `players`, `courts`, `duration_minutes`. Body sections in this exact order
  (the drills page layout expects it): Session theme → Timeline table → Warm-up → Drill details
  (name/setup/pattern/coaching points/success criterion/regression/progression/duration per
  drill) → Games details → Court split → Coach's notes.
- `diagrams/drill-N.json`: `title`, `players[]` (each `{id, label, color, x, y}` — `color` must be
  exactly one of `#21472E` / `#8FA893` / `#152218`, `x`/`y` in `[0,1]`), `arrows[]` (each
  `{number, type: "ball"|"movement", points: [[x,y],...]}`). Validate with
  `node scripts/validate-diagrams.mjs`.
- Drill/game coaching principles the content should follow (already established in
  `SYSTEM_PROMPT`, worth matching for voice/quality consistency even though this content is
  hand-authored, not AI-generated): drills are cooperative, not competitive, with a quality cue;
  each drill needs a regression and progression; games are conditioned to force the practiced
  skill.

## Next task: default drill-library content for every theme, scaled 2–4 players / 1 court

**The ask, verbatim from the user:** build good default drills for each theme category. At the
moment there's only real content for `length`/`movement` (combined into session-01, and that one
is 8p/2 courts — a different scale). New requirements:

1. Cover the remaining 7 themes: `volleys`, `drops`, `boasts`, `front-court`, `deception`,
   `serves/returns`, `exhibition-shots`. (`length`/`movement` already covered — don't duplicate
   unless the existing session turns out to need rescoping too; check it first.)
2. **Every new default session is for 2, 3, or 4 players on ONE court** — small-group scale, not
   the existing session's 8p/2-court scale.
3. **Author each as base-2-player, with explicit adjustment/variation notes for scaling to 3 or 4**
   — not three separate drill sets per theme. E.g. a rotation note like "3 players: rotate feeder
   every 2 reps instead of every set" or "4 players: run two pairs simultaneously, swap ends every
   6 min" attached to each drill/game, not a whole parallel session.

### Entry checklist

1. Read `content/sessions/session-01-straight-length-and-the-t/session.md` and its
   `diagrams/drill-1.json` / `drill-2.json` fully as the format template (already read once this
   session — see the "Key contracts" section above for the summary, but read the real file before
   writing, formatting details matter).
2. Read `CONTENTS-HOWTO.md` in full — it's the authoritative 6-step process (content →
   diagrams → rendered page → library card → validate → check in browser).
3. Decide the per-theme session slugs and titles (e.g. `session-02-volley-pressure`,
   `session-03-drop-and-die`, ...) before writing content, so file paths are settled up front.
4. For each of the 7 themes: write `session.md` (2-player base design, 3p/4p adjustment notes
   inline per drill/game, `players: 2 (see Coach's notes for 3/4 adaptation)` style front matter
   matching session-01's convention for the player-count field), then `diagrams/drill-N.json` for
   each drill, validated with `node scripts/validate-diagrams.mjs`.
5. Build the rendered page `drills/session-NN-slug/index.html` per `CONTENTS-HOWTO.md` step 4.
6. Add each session's card to `drills/index.html`'s `session-grid`, with `data-themes` using the
   **hyphenated** `serves-returns` form where relevant (see "Decisions taken" above).
7. Run `npm test` (unrelated but confirms nothing else broke) and
   `node scripts/validate-diagrams.mjs` for every new diagram file.
8. Open `drills/index.html` in a browser, confirm all 9 (well, 8 new + 1 existing) theme filters
   now show at least one real card, and that each links through correctly with diagrams rendering.
9. Commit and push (direct-to-`main` is authorized for this repo — see "Decisions taken").

## Open questions / not done

- Whether `length`/`movement`'s existing session-01 (8p/2 courts) should also get a 2-4p/1-court
  companion for consistency, or stay as-is since it wasn't called out as broken. Not decided —
  ask the user if it comes up, don't assume.
- Exact drill content/names for each of the 7 new themes — not designed yet, that's this task.
- No decision yet on whether all 7 new sessions ship in one batch/commit or incrementally — use
  judgement, but each session should be internally complete (content + page + card + validated)
  before moving to the next, so a partial batch never leaves a broken/half-wired card in
  `drills/index.html`.
