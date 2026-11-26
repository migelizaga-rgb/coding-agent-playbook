#!/bin/bash
# agent-deploy-compact.sh - token-bounded deploy runner for coding agents.
#
# Captures full pre-deploy/deploy output to an ignored artifact log while printing
# only phase heartbeats, warning/error summaries, and a bounded failure tail.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="${AGENT_DEPLOY_LOG_DIR:-$ROOT/artifacts/agent-deploy}"
TAIL_LINES="${AGENT_DEPLOY_TAIL_LINES:-60}"
PROGRESS_SECS="${AGENT_DEPLOY_PROGRESS_SECS:-30}"
RUN_PREDEPLOY=true
RUN_DEPLOY=true
DEPLOY_ARGS=()

usage() {
  cat <<'EOF'
Usage: bash scripts/agent-deploy-compact.sh [options] [-- deploy.sh args...]

Options:
  --pre-deploy-only       Run only scripts/pre-deploy.sh.
  --deploy-only           Run only scripts/deploy.sh.
  --tail-lines N          Lines to print from a failed stage log (default: 60).
  --log-dir DIR           Directory for full logs (default: artifacts/agent-deploy).
  --help                  Show this help.

Any other arguments are passed to scripts/deploy.sh. Use -- before deploy args
when the deploy arg could be confused with this wrapper's options.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pre-deploy-only)
      RUN_PREDEPLOY=true
      RUN_DEPLOY=false
      shift
      ;;
    --deploy-only)
      RUN_PREDEPLOY=false
      RUN_DEPLOY=true
      shift
      ;;
    --tail-lines)
      TAIL_LINES="${2:-}"
      shift 2
      ;;
    --log-dir)
      LOG_DIR="${2:-}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --)
      shift
      DEPLOY_ARGS+=("$@")
      break
      ;;
    *)
      DEPLOY_ARGS+=("$1")
      shift
      ;;
  esac
done

case "$TAIL_LINES" in
  ''|*[!0-9]*) echo "[agent-deploy] invalid --tail-lines: ${TAIL_LINES:-empty}" >&2; exit 2 ;;
esac
case "$PROGRESS_SECS" in
  ''|*[!0-9]*) echo "[agent-deploy] invalid AGENT_DEPLOY_PROGRESS_SECS: ${PROGRESS_SECS:-empty}" >&2; exit 2 ;;
esac

mkdir -p "$LOG_DIR"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"

redact() {
  sed -E \
    -e 's/((token|password|passwd|secret|api[_-]?key|authorization)[=:][[:space:]]*)[^[:space:]]+/\1[REDACTED]/Ig' \
    -e 's/(Bearer )[A-Za-z0-9._~+\/=-]+/\1[REDACTED]/g'
}

interesting_lines() {
  local log_file="$1"
  grep -Ei '(^|\b)(FAILED|FAIL:|ERROR|FATAL|WARNING|WARN:|rollback|unhealthy|timeout|schema|invariant)' "$log_file" 2>/dev/null \
    | tail -30 \
    | redact || true
}

last_phase_line() {
  local log_file="$1"
  grep -E '^\[deploy |^=== |PRE-DEPLOY RESULTS|Ready to deploy|Deploy complete|FAILED:|WARNING:' "$log_file" 2>/dev/null \
    | tail -1 \
    | redact || true
}

summarize_stage() {
  local stage="$1"
  local status="$2"
  local log_file="$3"
  local duration="$4"

  echo "[agent-deploy] ${stage}: exit=${status} duration=${duration}s log=${log_file}"
  local matches
  matches="$(interesting_lines "$log_file")"
  if [ -n "$matches" ]; then
    echo "[agent-deploy] ${stage}: warning/error summary (last 30 matches)"
    printf '%s\n' "$matches"
  fi
  if [ "$status" -ne 0 ]; then
    echo "[agent-deploy] ${stage}: failure tail (last ${TAIL_LINES} lines)"
    tail -n "$TAIL_LINES" "$log_file" | redact || true
  fi
}

run_stage() {
  local stage="$1"
  shift
  local log_file="$LOG_DIR/${RUN_ID}-${stage}.log"
  local start
  start="$(date +%s)"

  echo "[agent-deploy] ${stage}: starting"
  echo "[agent-deploy] ${stage}: full log -> ${log_file}"

  set +e
  "$@" >"$log_file" 2>&1 &
  local pid=$!
  while kill -0 "$pid" 2>/dev/null; do
    sleep "$PROGRESS_SECS"
    if kill -0 "$pid" 2>/dev/null; then
      local phase
      phase="$(last_phase_line "$log_file")"
      if [ -n "$phase" ]; then
        echo "[agent-deploy] ${stage}: still running; ${phase}"
      else
        echo "[agent-deploy] ${stage}: still running"
      fi
    fi
  done
  wait "$pid"
  local status=$?
  set -e

  local end
  end="$(date +%s)"
  summarize_stage "$stage" "$status" "$log_file" "$((end - start))"
  return "$status"
}

overall_status=0

if [ "$RUN_PREDEPLOY" = true ]; then
  if run_stage "pre-deploy" bash "$ROOT/scripts/pre-deploy.sh"; then
    :
  else
    overall_status=$?
  fi
fi

if [ "$overall_status" -eq 0 ] && [ "$RUN_DEPLOY" = true ]; then
  if run_stage "deploy" bash "$ROOT/scripts/deploy.sh" "${DEPLOY_ARGS[@]}"; then
    :
  else
    overall_status=$?
  fi
fi

if [ "$overall_status" -eq 0 ]; then
  echo "[agent-deploy] complete: all requested stages passed"
else
  echo "[agent-deploy] failed: exit=${overall_status}"
fi

exit "$overall_status"
