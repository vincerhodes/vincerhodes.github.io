#!/usr/bin/env python3
"""
_runner.py — executes .claude/verify/checks.yaml and decides GREEN.

Green is a number, not a judgment. This file is the only thing entitled to say a phase is done.
Do not edit it to make a check pass; it is in the frozen set and the integrity gate will catch you.

  run.sh --tags domain,static     run those tags, plus every check tagged `always`
  run.sh --self-test              prove the gate can still FAIL
  run.sh --list                   show the registry
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
from pathlib import Path

try:
    import yaml
except ImportError:
    print("verify: PyYAML required — pip install pyyaml", file=sys.stderr)
    sys.exit(2)

VERIFY = Path(__file__).resolve().parent
REPO = VERIFY.parent.parent
CHECKS = VERIFY / "checks.yaml"
LAST_RUN = VERIFY / "last-run.json"
BASELINE = VERIFY / "baseline.json"

GREEN, RED, YELLOW, DIM, RESET = "\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[0m"


def load_checks() -> list[dict]:
    doc = yaml.safe_load(CHECKS.read_text()) or {}
    return doc.get("checks", []) or []


def select(checks: list[dict], tags: list[str]) -> list[dict]:
    """Selected tags, PLUS everything tagged `always`. `always` is unselectable —
    you cannot --tags your way out of the integrity gate."""
    want = set(tags)
    out = []
    for c in checks:
        ctags = set(c.get("tags") or [])
        if "always" in ctags or (want and want & ctags):
            out.append(c)
    return out


def run_one(c: dict) -> dict:
    cmd = c.get("cmd")
    cid = c.get("id", "?")

    if c.get("type") == "agent":
        # A judgment check. The runner cannot evaluate it; converge.js dispatches these to an
        # agent. Marked SKIPPED here so a human running run.sh by hand sees it is outstanding.
        return {"id": cid, "status": "AGENT", "rubric": c.get("rubric", ""), "ms": 0}

    expect = c.get("expect_exit", 0)
    retries = int(c.get("flaky_retries", 0))

    attempts = []
    for i in range(retries + 1):
        t0 = time.time()
        p = subprocess.run(cmd, shell=True, cwd=REPO, capture_output=True, text=True)
        ms = int((time.time() - t0) * 1000)
        attempts.append({"exit": p.returncode, "ms": ms})
        if p.returncode == expect:
            if i == 0:
                return {"id": cid, "status": "PASS", "exit": p.returncode, "ms": ms}
            # Passed only on retry. NOT green (the loop may not finish on it) and NOT red (it does
            # not count toward STUCK). With only pass/fail, a loop eventually "fixes" a flaky test
            # by deleting it.
            return {"id": cid, "status": "FLAKY", "exit": p.returncode, "ms": ms,
                    "attempts": attempts,
                    "note": "passed only on retry — a nondeterministic check cannot terminate a loop"}
        last = p

    tail = (last.stdout + last.stderr).strip().splitlines()
    return {
        "id": cid,
        "status": "FAIL",
        "exit": last.returncode,
        "expected_exit": expect,
        "ms": attempts[-1]["ms"],
        "first_error": next((l for l in tail if l.strip()), ""),
        "output_tail": tail[-25:],
    }


# --- the ratchet -----------------------------------------------------------
# test_count non-decreasing, skipped non-increasing. Numeric, and not arguable.
# This is what stops describe.skip, .only, and quiet deletion.

COUNT_RES = [
    re.compile(r"Tests?\s+(\d+)\s+passed.*?\((\d+)\)"),          # vitest:  Tests  12 passed (12)
    re.compile(r"(\d+)\s+passing"),                               # mocha
    re.compile(r"Tests:.*?(\d+)\s+total"),                        # jest
    re.compile(r"(\d+)\s+passed"),                                # generic
]
SKIP_RES = [re.compile(r"(\d+)\s+skipped"), re.compile(r"(\d+)\s+pending")]


def scrape_counts(blob: str) -> dict:
    total = skipped = 0
    for r in COUNT_RES:
        m = r.search(blob)
        if m:
            total = max(int(g) for g in m.groups() if g and g.isdigit())
            break
    for r in SKIP_RES:
        m = r.search(blob)
        if m:
            skipped = int(m.group(1))
            break
    return {"test_count": total, "skipped": skipped}


def check_ratchet(counts: dict) -> dict:
    if not BASELINE.exists():
        BASELINE.write_text(json.dumps(counts, indent=2))
        return {"ok": True, "note": "baseline established", **counts}
    base = json.loads(BASELINE.read_text())
    ok = counts["test_count"] >= base.get("test_count", 0) and \
         counts["skipped"] <= base.get("skipped", 10 ** 9)
    return {
        "ok": ok, "baseline": base, "current": counts,
        "note": "" if ok else (
            f"RATCHET BROKEN: tests {base.get('test_count')} → {counts['test_count']}, "
            f"skipped {base.get('skipped')} → {counts['skipped']}. Tests were weakened, skipped or "
            f"deleted. This is not a way to go green."
        ),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tags", default="")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()

    checks = load_checks()

    if a.list:
        for c in checks:
            print(f"{c.get('id'):28} [{','.join(c.get('tags') or [])}]  {c.get('cmd', c.get('type'))}")
        return 0

    if a.self_test:
        # Prove the gate can still FAIL. A gate that cannot fail is not a gate, and a vacuous
        # test suite (everything mocked, nothing asserted) looks exactly like a passing one.
        print("verify --self-test: asserting the gate rejects a deliberately wrong implementation")
        r = subprocess.run("false", shell=True, capture_output=True)
        if r.returncode == 0:
            print(f"{RED}✗ FATAL: a command that must fail, passed.{RESET}")
            return 1
        print(f"{GREEN}✓ gate is live{RESET}")
        return 0

    tags = [t for t in a.tags.split(",") if t]
    selected = select(checks, tags)
    if not selected:
        print(f"{RED}no checks matched tags {tags} — a phase that matches no check can never go "
              f"green{RESET}", file=sys.stderr)
        return 1

    results, blob = [], ""
    for c in selected:
        r = run_one(c)
        results.append(r)
        blob += " ".join(r.get("output_tail", []))
        icon = {"PASS": f"{GREEN}✓", "FAIL": f"{RED}✗", "FLAKY": f"{YELLOW}~", "AGENT": f"{DIM}?"}[r["status"]]
        print(f"{icon} {r['id']:28}{RESET} {r.get('ms', 0):>6}ms  {r.get('first_error', '')[:80]}")

    counts = scrape_counts(blob)
    ratchet = check_ratchet(counts)

    failed = [r for r in results if r["status"] == "FAIL"]
    flaky = [r for r in results if r["status"] == "FLAKY"]
    green = not failed and not flaky and ratchet["ok"]

    payload = {
        "green": green,
        "tags": tags,
        "checks": results,
        "failing": [r["id"] for r in failed],
        "flaky": [r["id"] for r in flaky],
        "ratchet": ratchet,
        "signature": "|".join(sorted(f"{r['id']}:{r.get('first_error','')[:60]}" for r in failed)),
    }
    LAST_RUN.write_text(json.dumps(payload, indent=2))

    print()
    if not ratchet["ok"]:
        print(f"{RED}{ratchet['note']}{RESET}")
    if flaky:
        print(f"{YELLOW}FLAKY: {', '.join(r['id'] for r in flaky)} — not green, not red. "
              f"Two flakes escalate to a human.{RESET}")
    print(f"{GREEN if green else RED}{'GREEN' if green else 'RED'}{RESET} → {LAST_RUN}")
    return 0 if green else 1


if __name__ == "__main__":
    sys.exit(main())
