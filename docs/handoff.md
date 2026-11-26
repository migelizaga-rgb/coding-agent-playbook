# Low-Token Handoff

Use one compact current-state pointer plus milestone checkpoints. The current file belongs at `./handoff.md`; history belongs in `docs/handoff/checkpoints/`.

## Current handoff shape

```md
# Agent Handoff - Current

Last updated: <ISO timestamp>
Status: <one paragraph>
Owner: <agent>
Task: <task identifier>
Branch: <branch>
Worktree: <repo path>
Head SHA: <revision>
Objective: <current objective>
Spec: <path or none>
Current checkpoint: <milestone>
Next action: <one concrete action>

## State
- <3-5 concise bullets>

## Touched Files
- <relevant files>

## Risks / Blockers
- <real blockers only>

## Resume Rules
- Read the linked spec first if one exists.
- Read checkpoint history only if current state is insufficient.
- Write the next handoff at a lifecycle checkpoint.
```

Keep the current handoff below 3.5 KB. `bin/agent-handoff` supports `read`, `start`, `checkpoint`, and `close`; defaults stay within the current repository.

## Checkpoint timing

Checkpoint before substantial work, after implementation or verification, when blocked, before risky actions, and before a likely context switch. Avoid recording every command. Preserve evidence paths, decisions, risks, changed files, and one next action.
