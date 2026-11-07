---
name: find-state-machines
description: Find implicit state machines, where one lifecycle's state, transitions, and ownership are scattered across flags, effects, callbacks, and async work, and make them explicit. Use when auditing lifecycle coordination, async flows, impossible states, or a proposed stateful refactor.
---

# Find State Machines

Find implicit state machines: one lifecycle whose state, transitions, and ownership are spread across the code instead of held in one place. Make sure every non-terminal state has a guaranteed way out — failure, cancel, timeout, or recovery after restart — not just the happy-path callback. Make small fixes that preserve behavior or fix bugs right away; confirm larger restructures with the user first.
