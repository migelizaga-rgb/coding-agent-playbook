# Review Policy

Repository instructions take precedence where more specific. Scale review to risk: executable checks are the primary evidence, and independent review is for judgment tests cannot supply.

| Tier | Independent review | Re-review |
|---|---|---|
| Tiny | None | Not applicable |
| Normal | Optional; use when requested or uncertainty remains | Only after a material change |
| Risky | Exactly one fresh-context reviewer from the opposite model family on the final code and documentation | One targeted repeat only if a fix changes logic or an invariant |
| Enterprise | Bounded review at spec and final-diff decision points | Maximum two review rounds |

Inspect the bounded artifact and existing check receipts first. Reuse valid evidence for unchanged content. Keep reviewers read-only; the primary agent owns fixes and integration. Include code and documentation in the same final artifact. Do not review unchanged content again at midpoint, after commit, or before push.

Report findings, check results, reviewer status, and remaining blockers. If a required reviewer is unavailable, say so; never imply approval. Stop after one targeted repeat if a blocker remains. Human approval remains required for outbound communication, purchases, irreversible live actions, and deployment where the project requires it. Never bypass branch protections or overwrite live state.
