---
name: plan-review
description: Review a plan when requested or when a risky approach or rollback needs independent judgment.
---

# Plan Review

Follow `docs/review-policy.md`. Review only on request or when a risky approach or rollback needs independent judgment. Reuse an accepted-plan receipt while its assumptions remain current. Plan review does not add a final-diff gate.

Inspect the plan and the smallest current evidence needed for scope, dependencies, sequencing, acceptance checks, observability, rollback, and approval boundaries. Supply one fresh opposite-family reviewer with the plan and relevant evidence. Apply the shared failure and repeat rules; report an unavailable required review as a blocker, never as approval.

Preserve human approval for outbound actions and deployment where required. Stop on deployment failure, rollback signals, health timeouts, or safety ambiguity.
