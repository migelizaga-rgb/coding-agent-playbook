---
name: codex-delegate
description: Delegate bounded implementation or verification work with a compact packet and inspect returned changes and evidence.
---

# Delegate Work

Use delegation only when requested or when repository workflow instructions call for it. Keep the task packet short and bounded:

```text
OBJECTIVE: <one observable outcome>
FILES: <exact paths>
CONSTRAINTS: <must-not-change, dependencies, and landing limits>
DONE WHEN: <checks and expected evidence>
REPORT: <changed files, commands, results, blockers>
```

Pin the worker role appropriate to the task. Use the cheap worker for mechanical implementation, tests, and logs; use the default worker for ordinary coding; use the strong worker for hard reasoning or risky correctness. Preserve integration, security, rollback, deployment, and landing authority with the primary.

Inspect returned changes and receipts under `docs/review-policy.md`. Re-run only missing, stale, or failed checks. Keep independent review read-only.
