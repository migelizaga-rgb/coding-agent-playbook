#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
fail=0
check_file() {
  if [ -f "$ROOT/$1" ]; then echo "PASS file: $1"; else echo "FAIL missing: $1"; fail=1; fi
}
check_pattern() {
  if grep -Eq "$2" "$ROOT/$3" 2>/dev/null; then echo "PASS $1"; else echo "FAIL $1"; fail=1; fi
}
check_file templates/AGENTS.md
check_file templates/CLAUDE.md
check_file templates/workspace-AGENTS.md
check_file templates/knowledge/README.md
check_file templates/knowledge/always.md
check_file templates/knowledge/index.json
check_file templates/knowledge/contextual/branch-finishing.md
check_file scripts/agent-run-compact.sh
check_file scripts/agent-deploy-compact.sh
check_file scripts/deploy-coordinator.js
check_pattern "repo instructions link to work tiers" 'docs/work-tiers\.md' templates/AGENTS.md
check_pattern "knowledge describes contextual retrieval" 'contextual note' templates/knowledge/README.md
check_pattern "knowledge has a write policy" 'Write rarely|Add contextual notes only' docs/knowledge-retrieval.md
check_pattern "deploy coordinator is referenced" 'deploy-coordinator\.js' templates/AGENTS.md
check_pattern "compact runner is referenced" 'agent-run-compact\.sh' templates/AGENTS.md
if [ "$fail" -eq 0 ]; then echo "agent workflow audit: PASS"; else echo "agent workflow audit: FAIL"; fi
exit "$fail"
