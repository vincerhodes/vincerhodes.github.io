# Handoff — Right Court SC build state

> Living doc for resuming in a fresh session. Read this + `~/.claude/CLAUDE.md` +
> `planning/00-master-plan.md` before touching anything. Last updated: 2026-07-15, mid-Phase-1→2.

## Where we are

- **Planning:** complete. `planning/00-master-plan.md` is the loop-ready spec (authoritative over
  `04-BUILD-PHASES-FOR-CLAUDE-CODE.md`'s prose where they'd otherwise conflict). Tier is `lite` — no
  `ground-truth/*.yaml` package exists by design (see that doc's "Tier: lite" section for why).
- **`/verify-init`:** complete. `.claude/verify/{checks.yaml,run.sh,_runner.py,integrity.sh}` generated,
  22 checks across phases 0–5. `protected.txt` stays **unarmed** — fine for now (lite tier has no ground
  truth to protect).
- **`/plan-preflight`:** PASS as of this doc's last save (check `planning/PREFLIGHT.json` directly for
  the exact current `plan_hash` — **do not hardcode the hash value in this doc**, since writing it here
  changes this file's content, which changes the hash it would record — a diverging loop. See
  "Stale-permit lesson" below, **read it before editing this file again**.
- **Phase 0 (Design direction):** **SUCCESS** via `/converge` (1 iteration, commit `87ad78f` base).
  Direction A ("Heritage Crest") **explicitly approved by the human** 2026-07-15 — it is now the
  confirmed visual direction, not just a default choice. `design-mockups/direction-b/` stays as
  reference/frozen, not in active use.
- **Phase 1 (Static scaffold):** **SUCCESS** via `/converge` (2 iterations, commits `9b6b48e`/`db80c09`).
  Built `index.html`, `about/index.html`, `assets/css/styles.css`, `assets/js/nav.js`,
  `tests/responsive/core-pages.spec.ts`, `tests/structure/nav-footer.spec.ts`. Nav is exactly 4 items,
  footer has Drill Builder link + monogram + `mailto:info@rightcourtsc.com` (placeholder, still needs
  the club's real address before launch).
- **GitHub Pages: LIVE.** Repo `vincerhodes.github.io` created under the `vincerhodes` account (root
  user-site pattern), `origin` pushed, confirmed reachable — `curl -sI https://vincerhodes.github.io/`
  returns `200` and serves the real homepage. Required a `.nojekyll` file (commit `dd6c6a3`) — the
  first push errored with a generic "Page build failed." from GitHub's default Jekyll pipeline, which
  this plain-HTML/CSS/JS site has no use for. **If any future Pages build errors again, check
  `.nojekyll` is still present before debugging anything else.**
- **Phases 2–5:** not started. No `gallery/`, `drills/`, `content/`, `worker/`, `drill-builder/` exist
  yet.

## Verify on entry

```sh
cd /home/vincerhodes/dev/rightcourtsc
git status --porcelain              # must be empty
.claude/verify/run.sh --tags phase0,phase1
echo $?                              # must be 0
curl -sI https://vincerhodes.github.io/ | head -1   # sanity: should be 200
```

## Stale-permit lesson (read before editing this file)

`plan-preflight.py`'s `plan_hash` is computed over **every `.md` file under `planning/`**, sorted
(`preflight.py:661`, `rglob("*.md")`) — and `planning/HANDOFF.md` lives under `planning/`, so it is
part of its own hash input. **Editing this file changes `plan_hash`.** If you save a HANDOFF.md update
and then run `/converge`, the precondition check will REFUSE with a `plan_hash mismatch` — this
happened once already (2026-07-15) after adding this file's first version. It is not a bug; the tool is
correctly refusing to run a loop against a plan that changed after its permit was signed.

**The fix, every time this file is edited:**
1. `python3 ~/.claude/skills/plan-preflight/preflight.py --repo . --write` — deterministic pass is
   sufficient (fast) *if* only this file changed and no other planning doc's substantive content moved.
2. Cheap insurance: one agent-pair check (find-contradiction + independent refute) of HANDOFF.md's new
   content against the rest of the planning corpus, since HANDOFF.md is now itself hashed as "part of
   the plan" — a full 7-round adversarial hunt is overkill for a status-doc edit, but a single
   find/refute pair is cheap and catches an accidental factual claim that conflicts with the master plan.
3. Commit the refreshed `planning/PREFLIGHT.json` **before** the next `/converge` call.

**This handoff update itself follows steps 1–3** — `PREFLIGHT.json` was refreshed and committed
alongside this doc's final save; don't re-run preflight again on entry unless you edit this file
further.

## Decisions taken (not otherwise recorded in code)

- **Model for AI Drill Builder:** `anthropic/claude-haiku-4.5:exacto` via OpenRouter, decided (not
  provisional) — see `planning/05-AI-DRILL-BUILDER-PROMPT.md`'s "Notes for implementation".
- **GitHub repo:** `vincerhodes.github.io`, created and live (see above). Root user-site pattern — Pages
  auto-enables on repo creation, no separate Pages config API call needed, but **does** need
  `.nojekyll`.
- **Design direction:** Direction A ("Heritage Crest"), explicitly human-approved 2026-07-15.
- **Content folder layout:** `/content/sessions/session-XX-slug/session.md` +
  `diagrams/drill-N.json` per drill — resolved a 5-way disagreement across planning docs during
  preflight; don't reintroduce a flat-file or `images/`-based layout.
- **Rate limiting:** Cloudflare KV counter (not the built-in rate-limiting product), 30 req/IP/hour —
  deliberately generous because members hit this from shared clubhouse wifi.
- **Branch/PR rule override, scoped:** the user explicitly authorized pushing directly to `main` for
  this repo's GitHub Pages deploy (2026-07-15) — root user-site Pages serves from `main` with no PR
  workflow available. This override is scoped to this repo's deploy mechanics only, not a general
  license to skip branch+PR elsewhere.

## Repo map

```
planning/00-master-plan.md          # THE spec — phases, tags, check-ids, loop budgets (authoritative)
planning/00-06-*.md                 # component specs (brand, sitemap, architecture, AI prompt, SVG system)
planning/04-BUILD-PHASES-...md      # prose rationale only; master-plan wins on conflicts
planning/PREFLIGHT.json             # PASS — the loop's entry permit; void if planning/**/*.md changes
.claude/verify/checks.yaml          # the 22-check registry — the ONLY definition of green
.claude/verify/run.sh               # entry point: --tags <phaseN>, --list, --self-test, --gt-approve
assets/logos/                       # real logo files (.png source + .webp optimized)
design-mockups/direction-{a,b}/     # Phase 0 output — GREEN; direction-a is the approved direction
index.html, about/index.html        # Phase 1 output — GREEN, live on GitHub Pages
assets/css/styles.css, assets/js/nav.js
tests/responsive/, tests/structure/ # Phase 0/1 tests — GREEN
.nojekyll                           # required for GitHub Pages to skip Jekyll processing — don't remove
.env                                # OPENROUTER_API_KEY (gitignored, do not commit)
```

## Converge tooling notes (still relevant)

`~/.claude/workflows/converge.js` defensively `JSON.parse`s a string `args` — you don't need to work
around the args-arrives-as-string tool-boundary quirk, just call:
`Workflow({name:"converge", args:{phase:N, tags:"phaseN", maxIterations:10, stuckAfter:4}})`.

When scoping `tags` for a single-phase converge run, pass **only** `"phaseN"` — never combine with a
category tag like `"static"` — tag-select is a union (OR), so `"static,phase1"` would pull in every
other phase's `static`-tagged checks too.

## Key contracts for the next phase (Phase 2 — Gallery)

```yaml
tags: [static, phase2]
deliverables: [gallery/index.html]
writable: ["gallery/**", "tests/structure/**", "tests/responsive/**"]
frozen: ["design-mockups/**", "index.html", "about/**"]
```
- Checks: `STATIC.gallery-html-valid`, `STATIC.gallery-iframe-present` (asserts an `<iframe>` whose
  `src` matches `https://drive.google.com/embeddedfolderview?id=*`), `STATIC.gallery-responsive`.
- Human checkpoints at Phase 2 end (not scriptable, don't skip):
  - Swap the placeholder Drive `FOLDER_ID` for the club's real shared folder.
  - Confirm the Drive embed grid is actually usable on a real mobile device — `04` flagged this
    specifically ("Drive's embedded grid view can behave awkwardly on narrow screens").

## Next phase entry checklist

1. Confirm `git status --porcelain` is empty and `.claude/verify/run.sh --tags phase0,phase1` is green
   (see "Verify on entry" above).
2. Run Phase 2: `Workflow({name:"converge", args:{phase:2, tags:"phase2", maxIterations:10,
   stuckAfter:4}})`.
3. On SUCCESS, flag Phase 2's two human checkpoints (Drive folder ID, mobile embed check) rather than
   silently continuing to Phase 3 — same pattern as Phase 1's GitHub Pages checkpoint this session.
4. Continue phase-by-phase through Phase 5, always with tags scoped to exactly one `phaseN`.
5. **If you edit this HANDOFF.md before running the next converge call**, follow "Stale-permit lesson"
   above first — refresh + commit `PREFLIGHT.json` or the next converge call will REFUSE.

## Open questions / not done

- `planning/PREFLIGHT.json`'s ground-truth freeze (`protected.txt`) is still unarmed — fine for now
  (lite tier); arm via `.claude/verify/run.sh --gt-approve` (TTY-gated) only if a `ground-truth/*.yaml`
  package is ever added.
- Gallery's Google Drive folder ID is still the placeholder from planning — swap before Phase 2 is
  considered fully done for real use.
- `about/`'s contact email (`info@rightcourtsc.com`) is a placeholder — needs the club's real address.
- No `ground-truth/*.yaml` exists (by design, lite tier) — don't add one without updating the plan's
  tiering section first.
