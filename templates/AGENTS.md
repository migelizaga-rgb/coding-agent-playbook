# Agent Instructions

Treat repository-local instructions as the source of truth for commands, safety rules, handoff behavior, and verification gates.

## Exploration

- Use indexed discovery tools when available.
- Prefer narrow reads and searches before broad scans.
- Keep command output bounded; retain full logs in ignored artifacts.

## Work Tiers

- Tiny: self-check and one relevant deterministic check.
- Normal: compact intent, targeted verification, and self-review.
- Risky: compact spec, one bounded opposite-family review, and affected checks.
- Enterprise: full spec and evidence manifest only when explicitly requested or spanning systems.

See `docs/work-tiers.md` and `docs/review-policy.md`.

## Token Efficiency

- Use `bash scripts/agent-run-compact.sh --name <label> -- <command...>` for noisy commands.
- Adapt `scripts/agent-deploy-compact.sh` to the repository before use.
- After eligible merge, enqueue deployment intent through `scripts/deploy-coordinator.js`.
- The designated coordinator owns serialized deployment execution.
- Use the cheap worker for mechanical tasks; reserve strong judgment for hard correctness, security, rollback, and live decisions.
- Do not paste raw logs unless asked. Never read image bytes as text.

## Handoff

Keep `handoff.md` below 3.5 KB. Store milestone history under `docs/handoff/checkpoints/`. Checkpoint at lifecycle boundaries.

## Branch Finishing

For Tiny and Normal changes, inspect the diff, run targeted checks, and finish the branch when assigned. Human review usually gates deployment, not preparation of a ready branch. Stop for explicit holds, unresolved failures, private-data risk, destructive actions, costly ambiguity, or protected live actions.
