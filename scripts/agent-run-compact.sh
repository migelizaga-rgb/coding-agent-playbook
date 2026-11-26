#!/bin/bash
# agent-run-compact.sh - token-bounded runner for noisy coding-agent commands.
#
# Captures full command output to an ignored artifact log while printing only
# compact progress, warning/error summaries, and a bounded failure tail.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="${AGENT_RUN_LOG_DIR:-$ROOT/artifacts/agent-run}"
TAIL_LINES="${AGENT_RUN_TAIL_LINES:-80}"
SUMMARY_LINES="${AGENT_RUN_SUMMARY_LINES:-40}"
PROGRESS_SECS="${AGENT_RUN_PROGRESS_SECS:-30}"
RUN_NAME="command"
CMD=()

usage() {
  cat <<'EOF'
Usage: bash scripts/agent-run-compact.sh [options] -- command [args...]

Options:
  --name NAME             Label for progress and log file names.
  --tail-lines N          Lines to print from a failed command log (default: 80).
  --summary-lines N       Warning/error matches to print after completion (default: 40).
  --log-dir DIR           Directory for full logs (default: artifacts/agent-run).
  --progress-secs N       Progress heartbeat interval (default: 30).
  --help                  Show this help.

Use this for noisy tests, builds, container logs, and long shell jobs. It is not
a general shell replacement; keep simple commands direct.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name)
      RUN_NAME="${2:-}"
      shift 2
      ;;
    --tail-lines)
      TAIL_LINES="${2:-}"
      shift 2
      ;;
    --summary-lines)
      SUMMARY_LINES="${2:-}"
      shift 2
      ;;
    --log-dir)
      LOG_DIR="${2:-}"
      shift 2
      ;;
    --progress-secs)
      PROGRESS_SECS="${2:-}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --)
      shift
      CMD+=("$@")
      break
      ;;
    *)
      echo "[agent-run] unexpected argument before --: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

case "$TAIL_LINES" in
  ''|*[!0-9]*) echo "[agent-run] invalid --tail-lines: ${TAIL_LINES:-empty}" >&2; exit 2 ;;
esac
case "$SUMMARY_LINES" in
  ''|*[!0-9]*) echo "[agent-run] invalid --summary-lines: ${SUMMARY_LINES:-empty}" >&2; exit 2 ;;
esac
case "$PROGRESS_SECS" in
  ''|*[!0-9]*) echo "[agent-run] invalid --progress-secs: ${PROGRESS_SECS:-empty}" >&2; exit 2 ;;
esac
if [ -z "$RUN_NAME" ]; then
  echo "[agent-run] --name cannot be empty" >&2
  exit 2
fi
if [ "${#CMD[@]}" -eq 0 ]; then
  echo "[agent-run] missing command after --" >&2
  usage >&2
  exit 2
fi

mkdir -p "$LOG_DIR"
SAFE_NAME="$(printf '%s' "$RUN_NAME" | tr -c 'A-Za-z0-9._-' '-')"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
LOG_FILE="$LOG_DIR/${RUN_ID}-${SAFE_NAME}.log"

redact() {
  sed -E \
    -e 's/((token|password|passwd|secret|api[_-]?key|authorization)[=:][[:space:]]*)[^[:space:]]+/\1[REDACTED]/Ig' \
    -e 's/(Bearer )[A-Za-z0-9._~+\/=-]+/\1[REDACTED]/g'
}

interesting_lines() {
  grep -Ei '(^|\b)(FAILED|FAIL:|ERROR|FATAL|WARNING|WARN:|rollback|unhealthy|timeout|schema|invariant|exception|traceback)' "$LOG_FILE" 2>/dev/null \
    | tail -n "$SUMMARY_LINES" \
    | redact || true
}

last_progress_line() {
  grep -Eiv '^[[:space:]]*$' "$LOG_FILE" 2>/dev/null \
    | tail -1 \
    | redact || true
}

echo "[agent-run] ${RUN_NAME}: starting"
echo "[agent-run] ${RUN_NAME}: full log -> ${LOG_FILE}"

start="$(date +%s)"
set +e
"${CMD[@]}" >"$LOG_FILE" 2>&1 &
pid=$!
last_heartbeat=0
while kill -0 "$pid" 2>/dev/null; do
  sleep 1
  if kill -0 "$pid" 2>/dev/null; then
    now="$(date +%s)"
    if [ "$((now - start))" -ge "$((last_heartbeat + PROGRESS_SECS))" ]; then
      last_heartbeat="$((now - start))"
      phase="$(last_progress_line)"
      if [ -n "$phase" ]; then
        echo "[agent-run] ${RUN_NAME}: still running; ${phase}"
      else
        echo "[agent-run] ${RUN_NAME}: still running"
      fi
    fi
  fi
done
wait "$pid"
status=$?
set -e
end="$(date +%s)"

echo "[agent-run] ${RUN_NAME}: exit=${status} duration=$((end - start))s log=${LOG_FILE}"
matches="$(interesting_lines)"
if [ -n "$matches" ]; then
  echo "[agent-run] ${RUN_NAME}: warning/error summary (last ${SUMMARY_LINES} matches)"
  printf '%s\n' "$matches"
fi
if [ "$status" -ne 0 ]; then
  echo "[agent-run] ${RUN_NAME}: failure tail (last ${TAIL_LINES} lines)"
  tail -n "$TAIL_LINES" "$LOG_FILE" | redact || true
fi

exit "$status"
