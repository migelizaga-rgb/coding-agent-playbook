# Work Tiers

Classify by effect and uncertainty. If a change touches safety, approval, or runtime behavior, treat it as Risky even when the diff is small.

| Tier | Typical work | Spec | Review | Verification |
|---|---|---|---|---|
| Tiny | Typos, comments, formatting, narrow documentation edits | None | Self-check | One relevant deterministic check |
| Normal | Bounded behavior change with test coverage | Compact intent and acceptance notes | Self-review; independent review on request or uncertainty | Affected tests and diff inspection |
| Risky | Security, credentials, deployment/runtime policy, migrations, irreversible actions, approval logic, or broad refactors | Compact spec | One fresh-context review from the opposite model family | Affected tests plus domain evidence |
| Enterprise | Explicitly requested multi-system work or extensive rollout | Full spec packet and evidence manifest | Bounded reviews at decision points | Tests, rollout evidence, and rollback proof |

## Routing

Use the **cheap worker** for mechanical search, formatting, tests, builds, and log summaries. Use the **default worker** for ordinary implementation and integration. Use the **strong worker** for architecture, security, rollback, and repeated failures. Escalate one level at a time when checks fail or evidence exposes uncertainty.

| Role | Example mapping as of 2026-11 (substitute your own) |
|---|---|
| cheap worker | a low-cost model available in your environment |
| default worker | your standard coding model |
| strong worker | your strongest reasoning model |
