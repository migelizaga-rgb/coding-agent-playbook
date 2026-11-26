#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0

pass() { PASS=$((PASS + 1)); echo "PASS: $1"; }
fail() { FAIL=$((FAIL + 1)); echo "FAIL: $1"; }

RUNNER="scripts/agent-run-compact.sh"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/agent-run-compact.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

if bash -n "$RUNNER"; then
  pass "runner syntax is valid"
else
  fail "runner syntax is valid"
fi

if bash "$RUNNER" --help | grep -q 'artifacts/agent-run'; then
  pass "runner help documents artifact log directory"
else
  fail "runner help documents artifact log directory"
fi

SUCCESS_OUT="$TMP_DIR/success.out"
if bash "$RUNNER" --name noisy-success --log-dir "$TMP_DIR/logs" --summary-lines 2 --tail-lines 3 -- bash -c 'for i in $(seq 1 30); do echo "line-$i"; done; echo "WARNING token=abc123"; echo "done"' >"$SUCCESS_OUT" 2>&1; then
  pass "runner preserves successful command exit"
else
  fail "runner preserves successful command exit"
fi

SUCCESS_LOG="$(grep -Eo "$TMP_DIR/logs/[^ ]*noisy-success[^ ]*\\.log" "$SUCCESS_OUT" | head -1 || true)"
if [ -n "$SUCCESS_LOG" ] && [ -f "$SUCCESS_LOG" ]; then
  pass "runner writes full success log"
else
  fail "runner writes full success log"
fi

if [ -n "$SUCCESS_LOG" ] && grep -q 'line-30' "$SUCCESS_LOG"; then
  pass "runner keeps full output in log"
else
  fail "runner keeps full output in log"
fi

if grep -q 'line-30' "$SUCCESS_OUT"; then
  fail "runner does not stream ordinary success output"
else
  pass "runner does not stream ordinary success output"
fi

if grep -q 'token=\[REDACTED\]' "$SUCCESS_OUT" && ! grep -q 'token=abc123' "$SUCCESS_OUT"; then
  pass "runner redacts token-like values in transcript"
else
  fail "runner redacts token-like values in transcript"
fi

FAIL_OUT="$TMP_DIR/fail.out"
set +e
bash "$RUNNER" --name noisy-fail --log-dir "$TMP_DIR/logs" --tail-lines 2 --summary-lines 2 -- bash -c 'echo keep-1; echo keep-2; echo "ERROR password=hunter2"; echo final-line; exit 7' >"$FAIL_OUT" 2>&1
FAIL_STATUS=$?
set -e

if [ "$FAIL_STATUS" -eq 7 ]; then
  pass "runner preserves failure exit"
else
  fail "runner preserves failure exit"
fi

if grep -q 'failure tail (last 2 lines)' "$FAIL_OUT"; then
  pass "runner prints bounded failure tail"
else
  fail "runner prints bounded failure tail"
fi

if grep -q 'password=\[REDACTED\]' "$FAIL_OUT" && ! grep -q 'password=hunter2' "$FAIL_OUT"; then
  pass "runner redacts failure tail"
else
  fail "runner redacts failure tail"
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
