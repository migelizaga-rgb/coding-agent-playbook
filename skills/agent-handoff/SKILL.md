---
name: agent-handoff
description: Preserve current work state across coding-agent sessions with a compact pointer and milestone checkpoints.
---

# Agent Handoff

Use for non-trivial work, session fragility, or when asked to pause, wrap up, save state, switch sessions, or resume. Skip for a tiny one-off task.

Before substantial work, read the current handoff if present:

```bash
bin/agent-handoff read
```

Write only at lifecycle checkpoints: before substantial work, after implementation or verification, when blocked, before risky actions, or before a likely context switch. Avoid checkpointing every response.

```bash
bin/agent-handoff start --objective "..." --spec "..." --agent "..." --next "..."
bin/agent-handoff checkpoint --milestone "..." --status "..." --evidence "..." --next "..."
bin/agent-handoff close --status "..." --evidence "..."
```

Keep `handoff.md` concise, evidence-backed, and below 3.5 KB. Put durable milestone history in `docs/handoff/checkpoints/`. Include current status, objective, spec path, changed files, risks, and one next action.
