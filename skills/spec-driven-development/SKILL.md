---
name: spec-driven-development
description: Plan ambiguous features, significant refactors, migrations, or risky rollouts; keep routine changes inline.
---

# Spec-Driven Development

State the desired outcome and an observable acceptance check in the task or existing plan. Reuse agreed scope. Clear settings changes, mechanical edits, and bounded fixes need no separate spec.

Save one compact spec when material risk, unresolved requirements, significant refactoring, or work spanning sessions makes the existing task insufficient. Use `docs/spec-packet.md` only when its structure helps. Cover behavior, boundaries, acceptance criteria, validation, and rollout or rollback for persistent changes.

Keep evidence with existing test output and review records. Use `docs/evidence-manifest.md` only when a substantial rollout or handoff needs an index to scattered evidence. Do not duplicate receipts or create ceremony solely because this skill was loaded.

Review and verification follow `docs/review-policy.md`. Preserve authorization boundaries and required repository gates. Clarify only decisions that materially affect the result; make routine reversible choices within scope.
