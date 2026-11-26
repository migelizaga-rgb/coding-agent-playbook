# Deploy Coordination

Feature workers may enqueue deployment intent after an eligible merge. A designated coordinator batches and serializes the actual deployment so multiple branches do not deploy concurrently.

```bash
node scripts/deploy-coordinator.js enqueue --pr <url> --merge-sha <sha> --risk <tier>
node scripts/deploy-coordinator.js status
node scripts/deploy-coordinator.js drain --dry-run
node scripts/deploy-coordinator.js run-once
```

The coordinator deduplicates by merge revision, batches by `DEPLOY_BATCH_SIZE`, waits up to `DEPLOY_IDLE_MINUTES` for a batch, and supports urgent work. It uses queue and deployment locks; stale locks are reclaimed according to `DEPLOY_LOCK_STALE_MINUTES`. Queue records and lock files live in `.deploy-coordinator/` by default. Set `DEPLOY_COORDINATOR_DIR` to override the location.

`DEPLOY_COORDINATOR_DEPLOY_CMD` selects the command executed by the coordinator. Defaults are `bash scripts/agent-deploy-compact.sh`, batch size 3, idle window 15 minutes, and stale-lock age 60 minutes. Use a temporary queue directory and harmless command for local development.

Allowed from ordinary feature work: enqueue, inspect status, and dry-run drain. Only the designated coordinator context runs `run-once`. Never bypass locks, deploy after failed checks, or deploy a sensitive change without its required approval. Stop and report deployment failure, rollback signals, health timeouts, and safety ambiguity.
