# Handoff — Right Court SC build state

> Living doc for resuming in a fresh session. Read this + `~/.claude/CLAUDE.md` +
> `planning/00-master-plan.md` before touching anything. Last updated: 2026-07-15, mid-Phase-0.

## Where we are

- **Planning:** complete. `planning/00-master-plan.md` is the loop-ready spec (authoritative over
  `04-BUILD-PHASES-FOR-CLAUDE-CODE.md`'s prose where they'd otherwise conflict). Tier is `lite` — no
  `ground-truth/*.yaml` package exists by design (see that doc's "Tier: lite" section for why).
- **`/verify-init`:** complete. `.claude/verify/{checks.yaml,run.sh,_runner.py,integrity.sh}` generated,
  22 checks across phases 0–5, every check probed once to confirm it actually runs on this machine.
  `protected.txt` stays **unarmed** (`.claude/integrity/protected.txt.pending`) until a human runs
  `.claude/verify/run.sh --gt-approve` — not yet done, not urgent (lite tier has no ground truth to
  protect; the checks registry itself is the main thing it would freeze).
- **`/plan-preflight`:** PASS. `planning/PREFLIGHT.json` — `status: PASS`, `plan_hash: cb41467bb03cbadc`.
  Went through 7 rounds of adversarial contradiction-hunting + constructive-witness verification before
  reaching a clean PASS (0 confirmed contradictions, all 6 phases proven satisfiable). Two blocking OPENs
  from the plan were resolved: GitHub repo is `vincerhodes.github.io` (root-site pattern), and the
  OpenRouter key lives in `.env` as `OPENROUTER_API_KEY` (gitignored).
- **Phase 0 (Design direction):** **GREEN**, committed at `e19fe39`. Two design-mockup directions
  (`design-mockups/direction-a/`, `direction-b/`, each with `homepage.html`/`card.html`/`navbar.html`)
  plus `tests/responsive/mockups.spec.ts` (18 assertions, no-horizontal-overflow at 375/768/1280px).
  `.claude/verify/run.sh --tags phase0` exits 0. **Not yet run through `/converge`'s audit + final-verify
  steps** — see "Next task" below; the phase is functionally done but not yet formally closed out via the
  converge pipeline's own SUCCESS status.
- **Phases 1–5:** not started. No `index.html`, `about/`, `gallery/`, `drills/`, `content/`, `worker/`,
  `drill-builder/` exist yet — confirmed clean as of this handoff (see "Do NOT" section below for why
  this needs saying explicitly).

## Verify on entry

```sh
cd /home/vincerhodes/dev/rightcourtsc
git status --porcelain        # must be empty
.claude/verify/run.sh --tags phase0
echo $?                        # must be 0
```

## Decisions taken (not otherwise recorded in code)

- **Model for AI Drill Builder:** `anthropic/claude-haiku-4.5:exacto` via OpenRouter, decided (not
  provisional) — see `planning/05-AI-DRILL-BUILDER-PROMPT.md`'s "Notes for implementation". Comparing
  `gpt-5.4-mini:exacto`/`gemini-3.1-flash-lite` is optional post-launch work, not a Phase-4 blocker.
- **GitHub repo:** `vincerhodes.github.io` (root user-site pattern, zero Pages config needed).
- **Content folder layout:** `/content/sessions/session-XX-slug/session.md` + `diagrams/drill-N.json`
  per drill — this exact convention resolved a 5-way disagreement across the planning docs during
  preflight; don't reintroduce a flat-file or `images/`-based layout.
- **Rate limiting:** Cloudflare KV counter (not the built-in rate-limiting product), 30 req/IP/hour —
  deliberately generous because members hit this from shared clubhouse wifi.
- **2026-07-15, mid-session:** discovered and fixed a real bug in the shared `/converge` workflow (see
  "Tooling fix" below) — not a Right-Court-SC-specific decision, but directly affects how the next
  session should invoke `/converge`.

## Repo map

```
planning/00-master-plan.md          # THE spec — phases, tags, check-ids, loop budgets (authoritative)
planning/00-06-*.md                 # component specs (brand, sitemap, architecture, AI prompt, SVG system)
planning/04-BUILD-PHASES-...md      # prose rationale only; master-plan wins on conflicts
planning/PREFLIGHT.json             # PASS — the loop's entry permit; void if the plan changes
planning/content-source/session-01-straight-length-and-the-t/   # staged content, moves to content/
                                     #   sessions/ in Phase 3 (see master-plan Phase 3 section)
.claude/verify/checks.yaml          # the 22-check registry — the ONLY definition of green
.claude/verify/run.sh               # entry point: --tags <phaseN>, --list, --self-test, --gt-approve
assets/logos/                       # real logo files (.png source + .webp optimized), already in place
design-mockups/direction-{a,b}/     # Phase 0 output — GREEN, committed
tests/responsive/mockups.spec.ts    # Phase 0's test — GREEN
.env                                # OPENROUTER_API_KEY (gitignored, do not commit)
```

## Tooling fix this session (affects how you invoke /converge)

`~/.claude/workflows/converge.js` (shared across all projects, not RightCourtSC-specific) had a real bug:
the `args` object passed to `Workflow({name:"converge", args:{...}})` was arriving at the script as an
**unparsed JSON string** in every observed case — including when the caller wrote a literal object in
the tool call. This is a tool-boundary behavior, not a caller mistake (confirmed across 4 separate
invocations). The script now defensively `JSON.parse`s a string `args` before reading any field off it —
fixed, verified, and the same fix was applied to `audit-pattern.js` and `branch-review.js`, which had the
identical latent bug. **You should not need to work around this** — just call `Workflow({name:"converge",
args:{phase:N, tags:"phaseN", maxIterations:10, stuckAfter:4}})` normally. See
`~/.claude/projects/-home-vincerhodes-dev-rightcourtsc/memory/feedback_workflow_args_must_be_object.md`
for the full incident writeup if something looks off again.

**Separately (still correct, independent of the bug above):** when scoping `tags` for a single-phase
converge run, pass **only** `"phaseN"` — never combine it with a category tag like `"static"` or
`"domain"`. Every check in this project's `checks.yaml` carries both a category tag and a unique
`phaseN` tag together, and tag-select is a union (OR), not an intersection — `"static,phase0"` would
pull in every other phase's `static`-tagged checks too, not just Phase 0's. `converge.js` now warns
loudly if it detects this combination, but don't rely on the warning — just don't combine them.

## Key contracts for the next phase (Phase 1 — Static scaffold)

- `writable`: `["index.html", "about/**", "assets/css/**", "assets/js/nav.js", "tests/responsive/**", "tests/structure/**"]`
- `frozen`: `["design-mockups/**"]` (Phase 0's approved direction — reference, don't redesign)
- Checks: `STATIC.html-valid`, `STATIC.responsive-no-overflow` (`--grep "home|about"`), `STATIC.nav-footer-structure`
- Nav must be exactly 4 items (Home, Drills & Sessions, Gallery, About/Join); footer needs a "Drill
  Builder" link (no nav entry — deliberate, keeps mobile nav at 4 items), the monogram logo (not the
  full badge — see `01-BRAND-STYLE-GUIDE.md`'s corrected footer-logo guidance), and contact info
  (`mailto:info@rightcourtsc.com`, placeholder — swap for the club's real address before launch).
- Human checkpoint at Phase 1 end: confirm GitHub Pages deploys and is reachable at
  `https://vincerhodes.github.io/` — external deploy timing, not scriptable.

## Next phase entry checklist

1. **Formally close Phase 0** via `/converge`: `Workflow({name:"converge", args:{phase:0, tags:"phase0",
   maxIterations:10, stuckAfter:4}})`. The gate is already GREEN and committed, so this should sail
   straight through preconditions → verify (green immediately) → audit → final-verify → SUCCESS with
   no fix-agent work needed. This step exists to get a clean SUCCESS status recorded, not because more
   building is expected.
2. Per CLAUDE.md: `/model sonnet` before the converge call, `/model opus` after.
3. Once Phase 0 formally SUCCEEDs, move to Phase 1 using the same pattern with `tags:"phase1"`.
4. Continue phase-by-phase through Phase 5, always with tags scoped to exactly one `phaseN`.

## Open questions / not done

- `planning/PREFLIGHT.json`'s ground-truth freeze (`protected.txt`) is still unarmed — fine for now
  (lite tier), but if this project ever gains a `ground-truth/*.yaml` package, arm it via
  `.claude/verify/run.sh --gt-approve` (TTY-gated, type `!.claude/verify/run.sh --gt-approve` in chat).
- Gallery's Google Drive folder ID is still the placeholder from planning — swap before Phase 2 is
  considered fully done for real use (the check only validates the URL pattern, not a real folder).
- `about/`'s contact email (`info@rightcourtsc.com`) is a placeholder — needs the club's real address.
- No `ground-truth/*.yaml` exists (by design, lite tier) — don't add one without updating the plan's
  tiering section first.
