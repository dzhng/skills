---
name: find-state-machines
description: Find implicit state machines in an app and show where their state, transitions, and ownership are spread across the code. Use when auditing lifecycle coordination, async UI flows, or a proposed stateful refactor.
---

# Find State Machines

Map the behavior before suggesting a design.

1. Trace related fields, refs, effects, callbacks, async work, timers, and cleanup.
2. Describe the meaningful states, transitions, and current owner in plain language.
3. Separate one lifecycle from independent facts that only happen to be nearby.
4. Report a compact inventory with evidence and a disposition such as keep, clarify, or refactor.

Preserve existing behavior and public contracts unless a correction is explicitly requested. Let the codebase determine the shape of any cleanup.
