# Coding Assistant Instructions

## Model Roles

- Use the default worker for ordinary implementation.
- Use the strong worker for plan review, hard debugging, security, and production judgment.
- Use the cheap worker for mechanical search, tests, formatting, and log summaries.

## Compact Tools

```bash
bash scripts/agent-run-compact.sh --name test-suite -- npm test
bash scripts/agent-deploy-compact.sh --pre-deploy-only
node scripts/deploy-coordinator.js enqueue --pr <url> --merge-sha <sha> --risk <tier>
```

Adapt the deployment wrapper to the repository. Enqueue eligible deployment intent after merge; only the designated coordinator runs deployment.

## Output Caps

Start with bounded search and read output. Raise limits only when the summary proves relevant evidence was truncated. Do not read image files as text.

## Reporting

Report what changed, checks run, unresolved blockers, and one next action. Do not paste full logs; provide their ignored artifact paths.

## Branch Finishing

For ordinary work, self-review, run targeted checks, update durable docs or handoff, and finish the branch when assigned. Human review usually gates deployment or cutover. Follow project-specific protections and stop conditions.
