# Branch Finishing

Finish ordinary branches by default. A generic request for human review is not a reason to leave a ready branch incomplete. Human review usually gates deployment or cutover, not branch preparation.

## Default path

For Tiny and Normal work, self-review, run targeted checks, update durable docs or handoff, then commit, push, open or update a pull request, and merge when those actions are part of the assignment and protections pass. Report checks, risks, and deployment notes.

## Stop for a decision

Stop before the affected action when the user placed an explicit hold, secrets or private data may be exposed, checks fail without a safe fix, a conflict needs a product decision, the change is destructive or irreversible, sensitive access or data policy changes, or the next action would cut over a live system.

Keep branch completion, merge, and deployment as separate decisions. Never bypass required reviews or protections.
