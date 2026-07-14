#!/usr/bin/env bash
# .claude/verify/run.sh — the gate. Green is a number, not a judgment.
#
#   ./run.sh --tags domain,static    run those tags + every check tagged `always`
#   ./run.sh --list                  show the registry
#   ./run.sh --self-test             prove the gate can still fail
#   ./run.sh --gt-approve            approve ground truth        [HUMAN ONLY — needs a TTY]
#   ./run.sh --rebaseline            reset the ratchet baseline  [HUMAN ONLY — needs a TTY]
#
# This file is in the frozen set. If you are an agent and you are reading this looking for a way to
# make a failing check pass, stop: that is what CHALLENGE.json is for. See §"Disputing" below.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"

# --- privileged operations: TTY-gated -----------------------------------------------------------
# Claude's Bash has no controlling terminal. `read < /dev/tty` therefore cannot succeed for an
# agent, no matter how it phrases the command. The model cannot approve its own ground truth or
# reset its own baseline. This is the difference between a rule and a lock.
require_human() {
  if [[ ! -t 0 ]] && [[ ! -e /dev/tty ]]; then
    echo "REFUSED: '$1' is a human-only operation and there is no terminal here." >&2
    echo "Run it yourself: type '!.claude/verify/run.sh $1' right in this chat — the ! prefix runs" >&2
    echo "in your real terminal, so there's no need to switch windows for this." >&2
    exit 3
  fi
  local reply
  printf '%s\n' "$2" > /dev/tty
  printf 'Type YES to confirm: ' > /dev/tty
  read -r reply < /dev/tty || { echo "REFUSED: no terminal." >&2; exit 3; }
  [[ "$reply" == "YES" ]] || { echo "Aborted." >&2; exit 3; }
}

case "${1:-}" in
  --gt-approve)
    require_human "--gt-approve" \
      "You are approving ground-truth VALUES as correct. Review the FORMULA and its PROVENANCE, not the digits."
    python3 - "$REPO" <<'PY'
import hashlib, sys, pathlib, yaml, datetime
repo = pathlib.Path(sys.argv[1])
for p in sorted((repo / "ground-truth").glob("*.yaml")):
    doc = yaml.safe_load(p.read_text()) or {}
    body = yaml.safe_dump({k: v for k, v in doc.items() if k != "provenance"}, sort_keys=True)
    doc.setdefault("provenance", {})
    doc["provenance"]["approves_hash"] = hashlib.sha256(body.encode()).hexdigest()[:16]
    doc["provenance"]["approved_at"] = datetime.date.today().isoformat()
    p.write_text(yaml.safe_dump(doc, sort_keys=False, allow_unicode=True))
    print(f"approved {p.name} → {doc['provenance']['approves_hash']}")
PY
    # Approval IS the arming. The freeze exists to stop a LOOP editing its own targets — it must not
    # stop the human (or the authoring pass) writing them in the first place. So protected.txt does
    # not exist until this moment.
    if [[ -f "$REPO/.claude/integrity/protected.txt.pending" ]]; then
      mv "$REPO/.claude/integrity/protected.txt.pending" "$REPO/.claude/integrity/protected.txt"
      echo "freeze ARMED — ground-truth, the checks registry and the gate are now write-blocked."
    fi
    # Approval writes approves_hash into the YAML, which CHANGES gt_hash — so the permit it just
    # granted would no longer match the tree and /converge would refuse. Refresh it.
    python3 "$HOME/.claude/skills/plan-preflight/preflight.py" --repo "$REPO" >/dev/null 2>&1 || true
    # --establish is the ONLY way a manifest is written. Ordinary (hook/check-triggered) runs of
    # integrity.sh are verify-only and refuse to create one — see integrity.sh for why: a silent
    # "no manifest? adopt whatever's on disk" made the FIRST hook-triggered run after protected.txt
    # existed cement the baseline, which can be mid-authoring. Approval is the one deliberate moment
    # this is allowed to happen, and re-approval always re-establishes fresh (idempotent, and the
    # correct way to accept an intentional ground-truth change).
    bash "$HERE/integrity.sh" --establish
    echo "PREFLIGHT.json refreshed; integrity manifest established. The loop may start."
    exit 0 ;;
  --disarm)
    require_human "--disarm" \
      "You are DISARMING the integrity freeze. Ground truth becomes writable again. Do this only to AUTHOR or AMEND it, then re-approve."
    if [[ -f "$REPO/.claude/integrity/protected.txt" ]]; then
      mv "$REPO/.claude/integrity/protected.txt" "$REPO/.claude/integrity/protected.txt.pending"
      echo "freeze DISARMED. Re-arm with: .claude/verify/run.sh --gt-approve"
    fi
    exit 0 ;;
  --rebaseline)
    require_human "--rebaseline" \
      "You are RESETTING THE RATCHET. This permits the test count to drop. Only do this if tests were intentionally removed."
    rm -f "$HERE/baseline.json"
    echo "baseline cleared; next run re-establishes it."
    exit 0 ;;
esac

exec python3 "$HERE/_runner.py" "$@"

# --- Disputing the ground truth ------------------------------------------------------------------
#
# If you are an agent and you believe a check or a fixture is WRONG — not merely unmet — you cannot
# edit it. You can write .claude/verify/CHALLENGE.json:
#
#   { "case_id": "gt:tdee#m80", "stated": 2363, "computed": 2457,
#     "argument": "Mifflin-St Jeor over (m,80,180,35) gives BMR 1755; x1.4 = 2457. 2363 is not
#                  reachable from the formula named in provenance." }
#
# ...and stop. The loop records BLOCKED_BY_GROUND_TRUTH and hands to a human.
#
# THIS IS A SUCCESS OUTCOME, NOT A FAILURE. A loop with no sanctioned way to say "this is
# impossible" is a loop guaranteed to cheat: told to make an unsatisfiable test pass and forbidden
# from saying so, it will weaken the test. Saying so is the honest move, and it is the one we want.
