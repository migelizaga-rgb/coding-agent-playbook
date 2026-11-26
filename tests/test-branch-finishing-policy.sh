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

check_pattern "branch finishing doc says finish ordinary branches" 'Finish ordinary branches by default' docs/branch-finishing.md
check_pattern "branch finishing doc says review gates deploy" 'gates deployment or cutover' docs/branch-finishing.md
check_pattern "branch finishing doc says not merge blocker" 'not a reason to leave a ready branch incomplete' docs/branch-finishing.md
check_pattern "Codex template has branch finishing policy" 'Human review usually gates deployment' templates/AGENTS.md
check_pattern "Codex template says review is not merge blocker" 'Human review usually gates deployment' templates/AGENTS.md
check_pattern "Claude template says merge when checks pass" 'finish the branch when assigned' templates/CLAUDE.md
check_pattern "workspace template says branch can be merged" 'ready branch' templates/workspace-AGENTS.md

if grep -R -Eq 'merge/deploy gate|blocks merge/deploy|before merge or production' README.md docs templates; then
  fail "no stale review-blocks-merge phrasing remains"
else
  pass "no stale review-blocks-merge phrasing remains"
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
