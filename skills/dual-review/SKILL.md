---
name: dual-review
description: Apply risk-tiered review and verification to a bounded change.
---

# Dual Review

Use the policy in `docs/review-policy.md` for tier selection, reviewer routing, receipt reuse, bounded repeats, and failure handling. Repository instructions take precedence where more specific.

Inspect the bounded artifact and existing check receipts first. Keep independent reviewers read-only and fixes with the primary. Include code and documentation in the same final artifact; commits and pushes do not require another review of unchanged content.

Report findings, checks, reviewer status, and remaining blockers. If a required review is unavailable, state that plainly; never imply approval.
