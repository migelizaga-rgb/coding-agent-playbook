# Review Ladder

Choose the least expensive process that matches risk.

## Tiny

No spec or independent reviewer. Run one relevant deterministic check and inspect the edit.

## Normal

Write a compact intent and acceptance note. Self-review the diff and run affected checks. Do not add plan review or extra reviewers unless requested or new risk appears.

## Risky

Write a compact spec. Use one fresh-context opposite-family reviewer for the final artifact. Add an independent plan review only when the approach or rollback needs judgment. Verify affected checks and any live evidence required by the domain.

## Enterprise

Use only when explicitly requested or work spans multiple systems. Keep a full spec packet and evidence manifest. Review scope, risk, and the final diff at bounded points. Stop after two review rounds or when no new high-severity findings appear.

## Reuse and repeats

Reuse accepted review and test receipts while their assumptions and artifact remain current. Review only changed hunks after a material fix, at most once. Fixes to formatting, labels, and test expectations need only their affected check.
