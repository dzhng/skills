---
name: context-checkpoint
description: >
  Generates a Minimum Viable Context (MVP Context) block at the end of a session 
  to preserve context across context-window resets or new chat threads. Prevents 
  the AI from losing track of architectural decisions and current goals between days.
---

# Context Checkpoint

Context is your most valuable asset. On Day 1, you know everything about the feature. On Day 2, the context window resets and you know nothing. 

This skill runs at the end of a session or when context is getting too large, to compress the current state into a portable checkpoint.

## What to Generate

When triggered, generate a 3-line Minimum Viable Context (MVP Context) block that the user can copy and paste into a new session:

```text
## MVP Context
Current Goal: [what we are trying to ship this session]
Latest Decision: [the most recent architectural or technical decision]
Next Step: [exactly what needs to be done next]
```

## First Principles

1. **Compress relentlessly:** Do not summarize the entire chat history. Distill it to only what is needed to resume work in a blank thread.
2. **Focus on decisions:** The code speaks for itself, but *why* a path was chosen is often lost. Document the tradeoff or decision so the next agent doesn't undo your work.
