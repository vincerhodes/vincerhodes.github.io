# Right Court SC — Build Phases (instructions for Claude Code)

Read all of `00-PROJECT-BRIEF.md`, `01-BRAND-STYLE-GUIDE.md`, `02-SITE-MAP-AND-CONTENT.md`, `03-TECHNICAL-ARCHITECTURE.md`, `05-AI-DRILL-BUILDER-PROMPT.md`, and `06-SVG-DIAGRAM-SYSTEM.md` before starting — Phase 3 is built entirely on `06` and Phase 4 entirely on `05`, so don't skip them just because they're not needed until later phases. Logo files are in `assets/logos/`.

## Phase 0 — Design direction (do this before writing any site code)
Before scaffolding the repo or writing implementation code, work through the visual design direction first:
- Produce 2–3 distinct visual directions (as static HTML/CSS mockups of the homepage is fine — doesn't need to be a special tool) using the palette and type direction in `01-BRAND-STYLE-GUIDE.md`.
- Each direction should show: homepage hero, a drill/session card, and the nav bar, across both mobile and desktop widths, so the responsive behavior can be judged early rather than retrofitted.
- Get explicit sign-off on one direction (or an agreed merge of elements from a couple) before Phase 1 begins. Don't proceed to full implementation on an unapproved direction.
- This phase matters because the brand has a fairly specific heritage/crest feel (see style guide "visual tone") that's easy to lose if implementation starts from a generic template.

## Phase 1 — Static scaffold
- Set up the GitHub repo per the structure in `03-TECHNICAL-ARCHITECTURE.md`.
- Build Home and About pages, shared nav/footer, base CSS (typography, color variables, spacing scale) from the approved Phase 0 direction.
- Deploy to GitHub Pages on the default `github.io` URL (custom domain comes in Phase 5, so this can be tested immediately).
- Confirm responsive behavior at common breakpoints (mobile ~375px, tablet ~768px, desktop ~1280px+) before moving on.

## Phase 2 — Gallery
- Build the `/gallery/` page with the Google Drive iframe embed pattern from `02-SITE-MAP-AND-CONTENT.md`.
- Placeholder folder ID is fine until the club provides a real shared Drive folder — flag clearly in the code/README where that ID needs to be swapped in.
- Test the embed responsively — Drive's embedded grid view can behave awkwardly on narrow screens, so verify it's usable on mobile, not just present.

## Phase 3 — Drills & Sessions library + diagram system
- Build the `/drills/` listing page and individual session plan page template.
- Build the SVG diagram system per `06-SVG-DIAGRAM-SYSTEM.md`: the static court template and the `renderCourtDiagram` component. Do this here, not later, since Phase 4 depends on it.
- Convert the existing session plan (Session 1 — Straight Length and the T) into the site's content format as the first real entry, using its Markdown structure as the template for all future sessions. Author the diagram JSON for each of its four drills as the first worked examples of the schema.
- Implement the simple client-side theme filter (length, volleys, drops, boasts, movement, front-court, deception, serves/returns).
- Write `CONTENTS-HOWTO.md` explaining, for a non-technical committee member, how a new session plan file (and its diagram JSON files) gets added.

## Phase 4 — AI Drill Builder
- Set up the Cloudflare Worker per the architecture in `03-TECHNICAL-ARCHITECTURE.md`.
- Use the system prompt in `05-AI-DRILL-BUILDER-PROMPT.md` verbatim as the Worker's call via OpenRouter — this encodes the club's actual coaching methodology, don't paraphrase or shorten it. Call it with forced tool-use (the `return_session_plan` tool schema in that doc), not a plain-text response — the model must return `{ plan_markdown, drills[] }` as a validated tool call, not Markdown with JSON embedded in prose. Default model: `anthropic/claude-haiku-4.5:exacto` (see "Notes for implementation" in `05-AI-DRILL-BUILDER-PROMPT.md` for why, and the swap-in alternatives).
- Have the Worker clamp `drills[].diagram` coordinates to `[0,1]` as a defensive check and confirm each `drill_name` matches a heading in `plan_markdown` before returning to the client; if a drill's diagram still fails, drop just that diagram and render the drill's text anyway — no blocking, no automatic retry call to the LLM (see validation notes in `06-SVG-DIAGRAM-SYSTEM.md`).
- Build the `/drill-builder/` form and results view, rendering both the plan text and the diagrams using the same components built in Phase 3 (reuse, don't build a second layout or a second diagram renderer).
- Implement rate limiting (30 generations/IP/hour — see `03-TECHNICAL-ARCHITECTURE.md` for why this is higher than the "abuse guard" instinct) and CORS restrictions as specified.
- Add the "Save this session plan" button described in `05-AI-DRILL-BUILDER-PROMPT.md` ("Save to library"), packaging a liked generation into Phase 3's exact content-library file layout for a committee member to commit by hand. Build this after the generate/render flow works and Phase 3's file layout is finalized, not before.
- Test with realistic inputs (5, 6, 7, 8 players; each of the standard themes; wet-weather/low-turnout notes) against the model shortlist in `05-AI-DRILL-BUILDER-PROMPT.md` (`claude-haiku-4.5:exacto`, `gpt-5.4-mini:exacto`, `gemini-3.1-flash-lite`) to confirm both plan quality and diagram sanity (no overlapping markers, no out-of-bounds coordinates, low diagram-degrade rate) before locking in the default and considering this phase done.

## Phase 5 — Domain + polish
- Register and configure `rightcourtsc.com` per the DNS steps in `03-TECHNICAL-ARCHITECTURE.md`.
- Point the Worker at `api.rightcourtsc.com`.
- Full cross-device QA pass (iOS Safari, Android Chrome, desktop Chrome/Firefox/Safari at minimum).
- Basic performance pass: compress logo images (the source PNGs are large — export optimized/appropriately-sized versions for web use, and generate a small favicon from the monogram), check Lighthouse scores, confirm no layout shift on the AI drill builder's loading state.

## Out of scope for v1 (note, don't build unless asked)
- Member login/accounts
- Session booking/payment system
- CMS/admin panel — content is managed via git/Markdown files for now
