#!/bin/bash
# Install the reusable coding-agent workflow into another repository.
set -euo pipefail

SRC_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-}"

if [ -z "$TARGET" ]; then
  echo "Usage: bash scripts/install-to-repo.sh /path/to/repo" >&2
  exit 2
fi
if [ ! -d "$TARGET" ]; then
  echo "Target repo does not exist: $TARGET" >&2
  exit 2
fi

mkdir -p "$TARGET/scripts" "$TARGET/tests" "$TARGET/workspace" "$TARGET/bin" "$TARGET/workspace/knowledge"

cp "$SRC_ROOT/templates/AGENTS.md" "$TARGET/AGENTS.md"
cp "$SRC_ROOT/templates/CLAUDE.md" "$TARGET/CLAUDE.md"
cp "$SRC_ROOT/templates/workspace-AGENTS.md" "$TARGET/workspace/AGENTS.md"
cp -R "$SRC_ROOT/templates/knowledge/." "$TARGET/workspace/knowledge/"
cp "$SRC_ROOT/bin/agent-handoff" "$TARGET/bin/agent-handoff"
cp "$SRC_ROOT/scripts/agent-run-compact.sh" "$TARGET/scripts/agent-run-compact.sh"
cp "$SRC_ROOT/scripts/agent-deploy-compact.sh" "$TARGET/scripts/agent-deploy-compact.sh"
cp "$SRC_ROOT/scripts/deploy-coordinator.js" "$TARGET/scripts/deploy-coordinator.js"
cp "$SRC_ROOT/tests/test-agent-run-compact.sh" "$TARGET/tests/test-agent-run-compact.sh"
cp "$SRC_ROOT/tests/test-deploy-coordinator.js" "$TARGET/tests/test-deploy-coordinator.js"
cp "$SRC_ROOT/tests/test-deploy-coordination-policy.sh" "$TARGET/tests/test-deploy-coordination-policy.sh"
chmod +x "$TARGET/scripts/agent-run-compact.sh" \
  "$TARGET/scripts/agent-deploy-compact.sh" \
  "$TARGET/scripts/deploy-coordinator.js" \
  "$TARGET/tests/test-agent-run-compact.sh" \
  "$TARGET/tests/test-deploy-coordination-policy.sh"

chmod +x "$TARGET/bin/agent-handoff"
echo "Installed coding-agent workflow into $TARGET"
echo "Next: adapt scripts/agent-deploy-compact.sh if deploy commands differ."
