#!/usr/bin/env bash
# .claude/verify/integrity.sh — is the frozen set still the frozen set?
#
# Tagged `always` in checks.yaml, so it runs on EVERY invocation of run.sh regardless of --tags.
# You cannot select your way around it.
#
# The manifest lives OUTSIDE the repo (~/.claude/integrity/<project>.sha256) so that reverting,
# rewriting or `git checkout`-ing the repo cannot also rewrite the record of what it should contain.
#
# This is DETECTION, and it is vector-independent: it does not care whether a protected file was
# changed by Edit, Write, sed -i, python, cp, or a git operation. It only cares that the bytes moved.
set -uo pipefail

# --establish: ONLY passed by run.sh --gt-approve, at the moment a human confirms ground truth.
# Any other invocation (checks.yaml's INTEGRITY.frozen check, the PreToolUse/Stop hooks, a human
# running this by hand) is verify-only and MUST NOT be able to create or silently adopt a manifest.
#
# Why this matters: this hook fires automatically after every Edit/Write/Bash tool call. Before this
# fix, "no manifest yet? silently write whatever's on disk right now" meant the FIRST hook-triggered
# run after protected.txt existed — which can be mid-authoring, before ground truth or checks.yaml
# even exist — cemented an incomplete snapshot as the trusted baseline. That is not a hypothetical:
# it is exactly what happened building this tool. Establishing trust must be a single, human-gated,
# repeatable action — never an accidental side effect of a race with automation.
MODE="${1:-verify}"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
PROJECT="$(basename "$REPO")"
MANIFEST_DIR="${HOME}/.claude/integrity"
MANIFEST="${MANIFEST_DIR}/${PROJECT}.sha256"
PROTECTED="${REPO}/.claude/integrity/protected.txt"

[[ -f "$PROTECTED" ]] || { echo "integrity: no protected.txt — nothing frozen (run /verify-init)"; exit 0; }
mkdir -p "$MANIFEST_DIR"

# Expand the globs in protected.txt to a stable, sorted file list.
files=()
while IFS= read -r glob; do
  [[ -z "$glob" || "$glob" == \#* ]] && continue
  while IFS= read -r -d '' f; do files+=("$f"); done \
    < <(cd "$REPO" && find . -path "./node_modules" -prune -o -path "./$glob" -type f -print0 2>/dev/null)
done < "$PROTECTED"

# Defense in depth: these are the gate's OWN RUNTIME OUTPUT, not its code or ground truth. It writes
# them on every run by design — the loop reads last-run.json to decide green, _runner.py establishes
# baseline.json to run the ratchet. A protected.txt glob like `.claude/verify/**` (broad, and the
# obvious thing to write) sweeps these up too, and the gate becomes unable to ever pass: running it
# is exactly what "changes a protected file". Exclude them unconditionally, regardless of what any
# project's protected.txt says — this landmine should not be re-discoverable per project.
RUNTIME_OUTPUT_RE='/(last-run\.json|baseline\.json|CHALLENGE\.json)$|\.pending$'
kept=()
for f in "${files[@]}"; do
  [[ "$f" =~ $RUNTIME_OUTPUT_RE ]] || kept+=("$f")
done
files=("${kept[@]}")

if [[ ${#files[@]} -eq 0 ]]; then
  echo "integrity: protected globs matched no files"; exit 0
fi

current="$(cd "$REPO" && printf '%s\n' "${files[@]}" | sort -u | xargs sha256sum 2>/dev/null)"

if [[ "$MODE" == "--establish" ]]; then
  printf '%s\n' "$current" > "$MANIFEST"
  echo "integrity: manifest ESTABLISHED at $MANIFEST (${#files[@]} files) — this is now the trusted baseline"
  exit 0
fi

if [[ ! -f "$MANIFEST" ]]; then
  cat >&2 <<EOF
✗ integrity: no baseline manifest exists for this project.

This is a verify-only run and cannot create one — that would let a manifest be established from
whatever happens to be on disk at an arbitrary moment (mid-authoring, mid-attack, doesn't matter).
A baseline is established exactly once, deliberately, by a human:

    .claude/verify/run.sh --gt-approve     (needs a real terminal)
EOF
  exit 1
fi

if diff_out=$(diff <(sort "$MANIFEST") <(printf '%s\n' "$current" | sort)); then
  echo "integrity: OK (${#files[@]} protected files unchanged)"
  exit 0
fi

cat >&2 <<EOF
✗ INTEGRITY VIOLATION — a protected file changed.

$diff_out

The frozen set (ground truth, the checks registry, the gate itself, build config) is not writable
during a loop. It changed anyway.

Integrity is a clause in the win condition, not a rule we asked nicely about: this check is tagged
\`always\`, so the loop CANNOT go green while it fails. Weakening a test does not end the loop — it
prevents the loop from ending.

  To restore:  git checkout -- <the file>
  To dispute:  write .claude/verify/CHALLENGE.json and stop. That is a SUCCESS outcome — it is the
               sanctioned way to say "this fixture is wrong", and the only one.
  If a human intentionally changed ground truth, they re-approve:
               .claude/verify/run.sh --gt-approve     (needs a real terminal)
EOF
exit 1
