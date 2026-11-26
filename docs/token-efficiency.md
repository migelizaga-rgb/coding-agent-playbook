# Token Efficiency

## Order of operations

1. Compact noisy output before changing models.
2. Route mechanical work to the cheap worker.
3. Keep handoffs short and lifecycle-based.
4. Avoid raw reads of binary files.
5. Narrow searches and cap broad command output.

Useful starting caps: broad search 4K-8K tokens, file reads 8K-12K, long polling 2K-6K, and failure tails 40-100 lines. Raise caps only when the compact result shows that necessary evidence is just beyond the limit.

## Compact runner

```bash
bash scripts/agent-run-compact.sh --name test-suite -- npm test
```

The runner stores full logs under ignored `artifacts/agent-run/`, prints status and bounded warning/error summaries, redacts common token-like values, and preserves the command exit code.

## Deployment runner

```bash
bash scripts/agent-deploy-compact.sh --pre-deploy-only
bash scripts/agent-deploy-compact.sh
```

Adapt the wrapper's expected pre-deployment and deployment script paths for each repository. Ordinary feature workers enqueue eligible deployment intent through the coordinator instead of running a live deployment directly.
