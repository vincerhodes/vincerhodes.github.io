---
name: verify-rightcourtsc
description: Verify any change to rightcourtsc before declaring it done. Use after EVERY implementation task — features, fixes, refactors — even if the change seems trivial or purely visual. Do not report a task complete until the gate exits 0.
---

# Verify rightcourtsc

**Do not read this file to decide whether the work is done. Run the gate. Green is a number.**

```bash
.claude/verify/run.sh --tags <phase tags>
echo $?          # 0 = green. Nothing else is green.
cat .claude/verify/last-run.json
```

`--tags` selects a phase's checks (e.g. `static,phase1`). Every check tagged `always` (integrity,
ratchet) runs regardless — you cannot select your way around the gate. See
`planning/00-master-plan.md` for the full phase → tags mapping.

| | |
|---|---|
| `.claude/verify/checks.yaml` | the registry. The **only** definition of green. |
| `.claude/verify/last-run.json` | the result. Read this, not the terminal scrollback. |
| `.claude/integrity/protected.txt` | what you may not write (unarmed as `.pending` until a human runs `--gt-approve`). |

## This project is `lite` tier

No `ground-truth/*.yaml` package exists — see `planning/00-master-plan.md`'s "Tier: lite" section for
why. `JUDGE.live-generation-quality` (Phase 4) is the one check that needs a model to evaluate; it
makes real, billed OpenRouter API calls (~$0.25/run) — don't rerun it needlessly.

## Rules

1. **Never declare done from a summary.** Run the gate, read the exit code.
2. **Never edit** `checks.yaml`, `run.sh`, `integrity.sh`, `_runner.py`, or anything matched by
   `protected.txt`/`protected.txt.pending`. These are write-blocked once armed, and the integrity
   check is tagged `always` — a modification does not make the loop finish, it makes the loop unable
   to finish.
3. **Never** widen a tolerance, add `.skip`/`.only`, set `strict: false`, pass `--passWithNoTests`,
   or delete a test to reach green. The ratchet (test count non-decreasing, skipped non-increasing)
   is checked numerically on every run.
4. A check that only passes on retry is **FLAKY** — not green. Do not "fix" it by deleting it.
5. **`webkit` is deliberately absent from `E2E.cross-browser-smoke`** — confirmed at `/verify-init`
   time that it cannot launch in this sandboxed environment (missing system deps, no sudo). Don't
   re-add it without first confirming `playwright install-deps` actually succeeds here.

## If you believe a check is *wrong*, not merely unmet

This project has no `ground-truth/*.yaml` (lite tier), so `CHALLENGE.json`'s `gt:<table>#<case>`
mechanism doesn't have a target here — there's no fixture to dispute. If a *check itself* turns out
to be unsatisfiable (e.g. a threshold that can never be hit on this machine, the way `webkit` turned
out to be), that surfaces through `STUCK` after `stuck_after` identical failures, and the fix is a
**plan amendment** to `planning/00-master-plan.md` — same rule as ground truth elsewhere: the loop may
conclude the *plan* is wrong, it may never conclude the *test* is wrong and quietly route around it.
A human commits the amendment; the check registry above is updated to match afterward.
