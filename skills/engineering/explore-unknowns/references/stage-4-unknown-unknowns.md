# Stage 4 — Unknown Unknowns: Hunt the Landmines

What neither of you knows to ask, the territory often does. This stage sweeps
the code the task will touch and turns silent traps into map entries.

## Procedure

1. Sweep every file the task touches (state the coverage: "the sweep covered
   the N files this task touches"). Hunt for:
   - **Landmines** — things that bite silently: wrong-by-default data,
     stale denormalizations, filters that pass bad rows, escaping that
     corrupts output.
   - **Unwritten conventions** — rules the code enforces that no doc states.
   - **Half-built or reverted prior attempts** at the same job, and *why*
     they died — the reason is usually your landmine.
   - **Findings beyond the feature** — latent bugs the task's code path
     inherits; escalate them to the map rather than silently absorbing them.
2. Report each finding as a card: the **evidence** (file and line), **why it
   bites**, and **what it changes** about the task. Worst first.
3. A finding that needs a decision follows the stage-2 closure rules,
   including preference-based delegation when applicable. If asking the user,
   give lettered options with your recommendation. A finding that only needs
   awareness goes straight on the map as a sharp edge.

Remember the global rule: findings that bear on decisions already in flight
should have been disclosed when found — this stage is where the *systematic*
sweep happens, not where disclosures wait.

**Done when** the sweep has covered the code the task will touch and every
finding is on the map — decided, OPEN, or noted as a sharp edge.

## Technique

- **Blindspot pass** — the sweep packaged for reaction: landmine cards, each
  with the evidence, why it bites, and a copyable prompt fix; assembled into
  one better implementation prompt at the end.
