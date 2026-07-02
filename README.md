# Skills

[![skills.sh](https://skills.sh/b/dzhng/skills)](https://skills.sh/dzhng/skills)

![AI skills for building software factories](assets/hero.png)

These are the general-purpose, domain-agnostic skills I reuse across every
project. A skill is just a `SKILL.md`: frontmatter describing when the agent
should fire it, plus a procedure to follow. That format is portable, so these
work with any harness that supports skills — Claude Code, Codex, opencode,
Cursor, [duet](https://github.com/dzhng/duet-agent), and many others.

They're small, composable, and easy to adapt. Fork them, rename them, make them
your own.

## Why these skills exist

Software development is moving to **factories and loops**. The unit of work is no
longer a single task an agent completes and hands back — it's a *goal* pursued
autonomously, iterating without a human in the loop until it's done and the
output is good enough to trust.

The hard part isn't breaking a goal into tasks. It's breaking it into
**independently verifiable pieces** — and knowing where the pieces even are. So
the loop starts by getting a lay of the land, then treats everything it doesn't
yet understand as **fog of war**: map the terrain, carve it into independent
territories that can be built and checked in isolation, and keep scouting the
edges — recursively re-slicing any territory that turns out to hide more map —
until the whole thing is uncovered.

Then every piece has to *prove itself* before the loop moves on. Not a green
test — it has to survive **architecture review, code review, and visual / image
review against a baseline**. Each verified piece narrows the fog; each iteration
optimizes for *less wrong*. Run that recursively and a goal too big to hold in
one context gets built, checked, and trusted one independent territory at a time
— until the final goal is done. These skills are that discipline.

![A single autonomous run — 1 day, 16 hours pursuing one goal](assets/autonomous-run.png)

> Proof it works: a single unattended run in [duet](https://github.com/dzhng/duet-agent)
> pursuing one goal for **1d 16h**, breaking it into steps and iterating on top
> of these skills until done.

Concretely, coding agents are strong at writing code and weak at *process*. Left
to their own devices they rush to a green checkmark, pile new code beside the old
instead of replacing it, accept visual work on vibes, and let docs — and their
own instructions — quietly rot. Each skill here encodes one piece of discipline
that pushes back on a specific failure mode:

- **Rushing to "done."** [feature-slicing](skills/engineering/feature-slicing/SKILL.md),
  [implement-spec](skills/engineering/implement-spec/SKILL.md), and
  [close-spec](skills/engineering/close-spec/SKILL.md) keep work sliced into
  independently verifiable steps and honest about what actually shipped.
- **Sediment.** [refactor-clean](skills/engineering/refactor-clean/SKILL.md)
  moves ownership to one clean concept instead of layering adapters and
  compatibility shims beside the problem.
- **Accepting visuals on vibes.** [compare-screenshots](skills/visual/compare-screenshots/SKILL.md),
  [screenshot-critique](skills/visual/screenshot-critique/SKILL.md), and
  [preview-shots](skills/visual/preview-shots/SKILL.md) judge a render against a
  target you establish — with telemetry and an unprimed second opinion, not a
  glance.
- **Skills that drift.** [write-skills](skills/authoring/write-skills/SKILL.md)
  and [eval-skills](skills/authoring/eval-skills/SKILL.md) keep the skills
  themselves tight, triggerable, and tested against real cases.
- **Rotting docs.** [write-docs](skills/engineering/write-docs/SKILL.md) keeps
  documentation a glossary of *why*, never a mirror of the code that races it.

They're deliberately small and hackable rather than a framework that owns your
workflow — take the ones that fit, edit them freely, ignore the rest.

## Install

Using the [`skills`](https://github.com/vercel-labs/skills) CLI (works with 70+
agents):

```bash
npx skills add dzhng/skills
```

Add `--list` to browse and pick individual skills, or `-a <agent>` to target a
specific harness (e.g. `-a claude-code -a codex -a opencode`). Or copy any
`skills/<category>/<name>/` folder straight into the directory your harness
loads skills from (e.g. `.claude/skills/`).

## Skills

### Authoring — skills about skills

| Skill | What it does |
|---|---|
| [write-skills](skills/authoring/write-skills/SKILL.md) | Create or revise agent skills: triggers, leading words, progressive disclosure, and the failure modes to prune. |
| [eval-skills](skills/authoring/eval-skills/SKILL.md) | Eval a skill against golden cases — blind runs in fresh subagents, a separate judge, and gap-driven edits. |

### Engineering

| Skill | What it does |
|---|---|
| [feature-slicing](skills/engineering/feature-slicing/SKILL.md) | Break a large feature into independently verifiable, human-reviewable slices with API seams and playable checkpoints. |
| [implement-spec](skills/engineering/implement-spec/SKILL.md) | Build an existing spec to completion, one reviewable pass at a time, delegating independent slices in parallel. |
| [close-spec](skills/engineering/close-spec/SKILL.md) | Archive a shipped spec and rewrite it from a build plan into a durable rationale record that points back at the code. |
| [refactor-clean](skills/engineering/refactor-clean/SKILL.md) | Refactor by moving ownership to one clean concept instead of layering compatibility sediment beside the problem. |
| [write-docs](skills/engineering/write-docs/SKILL.md) | Write docs as a glossary of principles and pointers, never a mirror of the code that will rot. |
| [codex](skills/engineering/codex/SKILL.md) | Use the local Codex CLI as an independent second agent for review and (on explicit ask) delegated implementation. |

### Graphics

| Skill | What it does |
|---|---|
| [renderer](skills/graphics/renderer/SKILL.md) | Build, debug, or review WebGPU renderer work — three.js/TSL scene layers, node materials, WGSL passes, depth semantics, and browser-verified visuals. |

### Visual review

| Skill | What it does |
|---|---|
| [compare-screenshots](skills/visual/compare-screenshots/SKILL.md) | Judge which image is *less wrong* against a target you establish — telemetry to locate divergence, not a baseline match. Ships a reusable diff script. |
| [screenshot-critique](skills/visual/screenshot-critique/SKILL.md) | Use an unprimed subagent as a second set of eyes on visual work before accepting it. |
| [preview-shots](skills/visual/preview-shots/SKILL.md) | Open a curated set of image shots in one macOS Preview window for the user to eyeball. |

## License

See [LICENSE](LICENSE).
