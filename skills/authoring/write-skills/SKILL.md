---
name: write-skills
description: Create or revise agent skills. Use when adding a new skill file, renaming a skill, simplifying an existing skill, improving trigger descriptions, or deciding what belongs in a skill versus references, scripts, assets, or ordinary docs.
---

# Write Skills

A skill is not documentation. It is compressed operational memory for an
agent that already knows how to code and reason. Its job is
**predictability** — the agent taking the same *process* every run, not
producing the same output. Put only the context that changes what the agent
will do.

## First Principles

1. **Trigger from the description.** The frontmatter `description` is the
   only part read before the skill loads. Say what the skill does and the
   concrete situations that should trigger it. Do not hide trigger rules in
   the body.

2. **Spend tokens like they are scarce.** Assume the agent is already good at
   general reasoning. Keep only non-obvious workflow, domain constraints,
   tool choices, failure modes, and validation rules. Delete background,
   motivation, and generic advice.

3. **Write procedures, not essays.** Prefer imperative rules, decision
   points, and small examples. A good skill changes behavior in the next
   turn; it does not merely explain the topic. And match the procedure to
   the deliverable's shape: a catalog of techniques with "pick what fits"
   produces tool-picking, not a flow — if the job is a shaped interaction
   (an interview, a staged walk), the workflow must *be* that shape, with
   the techniques demoted to steps inside it.

4. **Use progressive disclosure.** Keep the main skill file short. Push long
   schemas, examples, provider docs, or variant-specific guidance out into
   linked `references/` files, reached by a pointer that fires only when
   needed. Put repeatable fragile operations in `scripts/`. Put reusable
   output material in `assets/`.

5. **Validate by use.** A skill is good when a fresh agent applies it
   correctly on a realistic task — run it blind, and on the weakest model
   that will run it; a skill that only drives correct behavior on the
   frontier model that authored it is too fragile to ship. After editing,
   read it as if you had no conversation history and remove anything that
   would not affect action.

6. **Examples document the PROBLEM, not the solution.** An example earns its
   tokens by teaching the agent to *recognise a recurring problem* — the smell,
   the symptom, how you knew it was wrong. That is durable. The fix you happened
   to apply is not: code changes, and a baked-in solution goes stale, or worse
   prescribes a move that won't fit next time. Write the failure mode and its
   tell; let the agent derive the fix fresh against the current code. "A
   directional question gated on a centroid distance read wrong from every
   bearing" teaches; "so we keyed it on FRONT_ARC" rots. When in doubt, state
   what was broken and how you spotted it, and stop there.

## Leading Words

A **leading word** is a compact concept already in the model's pretraining
that the agent thinks with while running the skill (e.g. *fog of war*,
*tracer bullets*, *red*, *tight*). One word recruits priors the model
already holds and anchors a whole region of behavior in the fewest tokens.

- It anchors **execution** in the body (same word → same behavior every
  time) and **invocation** in the description (when that word also lives in
  the user's prompts, docs, and code, the skill fires more reliably).
- Hunt for restatements that a leading word retires. "fast, deterministic,
  low-overhead" → a *tight* loop. "a loop you believe in" → the loop goes
  *red*. You win twice: fewer tokens and a sharper hook.
- A weak leading word is a no-op (`be thorough` when the agent already is).
  The fix is a stronger word (*relentless*), not more sentences.

## Invocation

Choose how the skill is reached; each choice spends a different cost.

- **Model-invoked** (default): keep a `description` so the agent can fire it
  on its own and other skills can reach it. Costs **context load** — the
  description sits in the window every turn. Write rich trigger phrasing.
- **User-invoked**: set `disable-model-invocation: true`. Only the user
  typing its name can invoke it; zero context load, but the user must
  remember it exists. The `description` becomes a human-facing one-liner.

Pick model-invocation only when the agent or another skill must reach it
unprompted. When user-invoked skills pile up past memory, add a **router
skill** that names the others and when to reach for each.

## Description

The description does two jobs: state what the skill is, and list the
distinct situations (**branches**) that trigger it.

- Front-load the leading word — invocation work happens here.
- One trigger per branch. Synonyms that rename one branch are duplication;
  collapse them and keep only genuinely distinct branches.
- Cut identity already in the body. Keep triggers plus any "when another
  skill needs…" reach clause.

## Information Hierarchy

A skill is **steps** and **reference**, mixed freely. Rank each piece by how
immediately the agent needs it:

1. **In-skill step** — an ordered action in `SKILL.md`. Each ends on a
   **completion criterion**: make it *checkable* (can the agent tell done
   from not-done?) and, where it matters, *exhaustive* ("every modified
   model accounted for", not "produce a change list"). A vague criterion
   invites premature completion.
2. **In-skill reference** — a definition or rule consulted on demand. A flat
   peer-set of rules is fine, not a smell.
3. **External reference** — pushed out of `SKILL.md` into a linked file,
   loaded only when its pointer fires.

Keep a concept's definition, rules, and caveats under one heading
(**co-location**) so reading one part brings its neighbors. Push too little
down and the top bloats; push too much down and you hide what the agent needs.

## When to Split

Each cut spends a cost, so split only when it earns it:

- **By invocation** — split off a model-invoked skill when a distinct
  leading word should trigger it alone, or another skill must reach it. You
  pay context load for the new always-loaded description.
- **By sequence** — split a run of steps when the steps still ahead tempt
  the agent to rush the one in front of it. Hiding later steps forces more
  work on the current one. The tell is **stage compression**: several steps'
  work lands in one message, or the agent narrates a later step as complete
  without ever having opened it. A "when you enter a step, read its file"
  pointer in the main skill fires reliably, even on weaker models.

## Failure Modes

Diagnose a misbehaving skill against these:

- **Premature completion** — ending a step before it's done. Fix the
  completion criterion first (cheap); only split to hide later steps if the
  criterion is irreducibly fuzzy *and* you see the rush. When the skill's
  job ends in a handover artifact, name it as the *only* skill-level
  done-condition — otherwise runs end at whichever intermediate artifact
  feels finished.
- **Embargo** — an ordered workflow over-obeyed: the agent withholds a
  finding made early to honor a later step's choreography, so the user
  decides something while the agent sits on information that bears on it.
  Any skill that sequences steps needs the escape valve stated: order
  governs presentation, never disclosure.
- **Lucky pass** — a validation run that succeeds only because the user or
  world volunteered a critical input unprompted. The outcome was right but
  the process didn't produce it; encode the eliciting probe as an explicit
  step instead of banking on the luck recurring.
- **Duplication** — the same meaning in two places. Keep a **single source
  of truth**.
- **Sediment** — stale layers that accumulate because adding feels safe.
  Prune deliberately.
- **War story** — a lesson written as the play-by-play of the change that
  taught it: function names, tuned values, one bug's trajectory. Those
  specifics date fast and bury the transferable rule. State the principle and
  the smell to watch for; let the codebase hold the mechanics. One concrete
  touchstone grounds it; a paragraph of them drowns it.
- **Implementation index** — a skill that points at today's source files, line
  numbers, current literals, or exact internal functions when its job is really
  to teach judgment. Those locators rot and make agents chase old mechanics.
  Keep durable principles, symptoms, acceptance criteria, and reference assets
  in the skill; put task-specific implementation notes in the active spec. If
  code location matters, tell the agent to find the current owner in the
  codebase.
- **Sprawl** — too long even when every line is live. Cure with the ladder:
  disclose reference behind pointers, split by branch or sequence.
- **No-op** — a line the model already obeys by default. Test each sentence
  in isolation; when it fails, delete the whole sentence, don't trim words.

## Shape

Use this structure unless there is a strong reason not to:

```markdown
---
name: short-verb-phrase
description: What this does. Use when ...
---

# Skill Title

One short paragraph defining the job.

## Workflow

1. Do the first load-bearing thing.
2. Make the key decision.
3. Produce or verify the artifact.

## Rules

- Keep the constraints that prevent common mistakes.
- Link only the references that should be loaded conditionally.
```

## Edit Pass

When creating or revising a skill:

- Name it with lowercase hyphen-case; keep the folder name identical.
- Make the description specific enough to trigger without the body.
- Remove any "when to use" section from the body.
- Remove stale history, attribution, placeholders, and setup notes.
- Remove file paths, line numbers, current constants, and implementation knobs
  unless the skill is explicitly a code-navigation runbook. Prefer durable
  principles plus a directive to inspect the current code.
- Prefer one strong rule over several overlapping bullets.
- Refactor restatements into a leading word where one fits.
- Keep examples tiny and realistic.
- Add no README, changelog, or auxiliary docs unless they are actual
  references the skill tells the agent when to read.
- Run the skill validator when available.

## Done

The skill is done when its metadata triggers correctly, its body is short
enough to read in one pass, and a fresh agent can follow it without asking
why the skill exists.
