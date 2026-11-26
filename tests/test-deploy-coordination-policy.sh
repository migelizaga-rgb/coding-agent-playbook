#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0

pass() { PASS=$((PASS + 1)); echo "PASS: $1"; }
fail() { FAIL=$((FAIL + 1)); echo "FAIL: $1"; }

check_pattern() {
  local label="$1"
  local pattern="$2"
  local file="$3"
  if grep -Eq -- "$pattern" "$file"; then
    pass "$label"
  else
    fail "$label"
  fi
}

check_pattern "deploy coordination doc exists" 'Deploy Coordination' docs/deploy-coordination.md
check_pattern "deploy coordination doc has enqueue command" 'deploy-coordinator\.js enqueue --pr <url> --merge-sha <sha> --risk <tier>' docs/deploy-coordination.md
check_pattern "Codex template queues deploy intent" 'enqueue deployment intent' templates/AGENTS.md
check_pattern "Claude template queues deploy intent" 'deploy-coordinator\.js enqueue --pr <url> --merge-sha <sha> --risk <tier>' templates/CLAUDE.md
check_pattern "workspace template uses coordinator" 'deployment batching and locks' templates/workspace-AGENTS.md
check_pattern "README says coordinator owns batching" 'coordinator batches eligible intent' README.md
check_pattern "installer copies deploy coordinator" 'deploy-coordinator\.js' scripts/install-to-repo.sh

if grep -R -Eq 'Do NOT deploy|must not deploy|forbid all deploy coordination' README.md docs templates; then
  fail "no stale all-deploy-forbidden phrasing remains"
else
  pass "no stale all-deploy-forbidden phrasing remains"
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
