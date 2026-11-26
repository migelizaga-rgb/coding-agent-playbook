# Workspace Agent Instructions

Repository instructions and standing project policy are the primary authority.

## Cost-Aware Work

- Tiny: no delegation or spec.
- Normal: compact intent and targeted verification.
- Risky: compact spec and one bounded opposite-family review.
- Enterprise: full spec only when explicitly requested or spanning systems.

## Delegation

Set explicit worker budgets and context boundaries. Do not delegate when context is already near capacity. Cheap workers may run mechanical checks and summarize logs; the primary owns integration and escalation decisions.

## Compact Execution

Use `scripts/agent-run-compact.sh` for noisy checks when available. The coordinator owns deployment batching and locks. Keep full logs under ignored artifacts and transcripts bounded.

## Escalation

Escalate after non-zero exits, rollback signals, health timeouts, schema or configuration failures, invariant failures, repeated same-phase failures, or security ambiguity.

## Branch Finishing

For ordinary changes, inspect the diff, run targeted checks, and complete branch preparation when assigned. Human review does not automatically stop a ready branch. Stop for explicit holds, private-data risk, destructive actions, unresolved failures, costly ambiguity, or protected live actions.
