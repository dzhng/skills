# Skills

[![skills.sh](https://skills.sh/b/dzhng/skills)](https://skills.sh/dzhng/skills)

![AI skills for building software factories](assets/hero.jpg)

**AI skills for building software factories.** My personal library of
domain-agnostic agent skills, reused across every project. Small, composable,
and hackable — works with any harness that supports skills: Claude Code, Codex,
opencode, Cursor, [duet](https://duet.so), and
[70+ others](https://github.com/vercel-labs/skills).

```bash
npx skills add dzhng/skills
```

Add `--list` to pick individual skills, or copy any `skills/<category>/<name>/`
folder into your harness's skills directory (e.g. `.claude/skills/`).

## Why

Software is moving from tasks to **factories**: agents that pursue a goal
autonomously until the output can be trusted. The hard part isn't breaking the
goal into tasks — it's breaking it into **independently verifiable pieces**, and
knowing where the pieces even are.

These skills run that loop. Treat the unknown as **fog of war**: map the
terrain, carve it into territories that build and verify in isolation, and
recursively re-slice whatever hides more map. And re-planning doesn't stop when
planning ends — the spec is a living document, updated and re-sliced
mid-implementation whenever the work teaches the agent that the plan is stale.
Every piece must prove itself — architecture review, code review, and visual
review against a baseline — before the loop moves on. Each iteration gets *less
wrong*, until the goal is done.

![A single autonomous run — 1 day, 16 hours pursuing one goal](assets/autonomous-run.png)

> Proof: one unattended Codex run pursuing a single goal for **1d 16h** on top
> of these skills, slicing and iterating until done.

## How to use

1. **Plan.** Ask your agent to `/write-spec` the goal. It interviews you,
   researches the unknowns, and materializes a spec under `specs/<feature>/` —
   a slice graph where every slice is independently verifiable.

2. **Build.** Kick off the loop:

   ```
   /goal /implement-spec specs/<feature>
   ```

   Add whatever framing fits: `on the xyz branch`, or `using /codex as the
   implementer while you stay the parent orchestrator and reviewer`.

3. **The rest fires on its own.** The spec tells the loop when to call the
   other skills — `/refactor-clean` and a `/code-review` pass at the end of every
   slice, `/screenshot-critique` and `/compare-screenshots` on anything
   visual, `/close-spec` when the last slice lands — and to update and
   re-slice the plan whenever implementation proves it stale. Every skill is
   also independently useful: invoke any of them manually whenever you want.

## Skills

### Engineering — slice, build, verify, repeat

| Skill | What it does |
|---|---|
| [explore-unknowns](skills/engineering/explore-unknowns/SKILL.md) | Walk the user through mapping a task's unknowns quadrant by quadrant — known knowns first, then interviews, reactable artifacts, and blindspot passes — ending with a complete four-quadrant map. |
| [write-spec](skills/engineering/write-spec/SKILL.md) | Break a large feature into independently verifiable, human-reviewable slices with API seams and playable checkpoints. |
| [implement-spec](skills/engineering/implement-spec/SKILL.md) | Build an existing spec to completion, one reviewable pass at a time, delegating independent slices in parallel. |
| [implement-spec-with-codex](skills/engineering/implement-spec-with-codex/SKILL.md) | Run implement-spec with Codex writing the code — you orchestrate, integrate, and review every pass. |
| [close-spec](skills/engineering/close-spec/SKILL.md) | Archive a shipped spec and rewrite it from a build plan into a durable rationale record that points back at the code. |
| [refactor-clean](skills/engineering/refactor-clean/SKILL.md) | Refactor by moving ownership to one clean concept instead of layering compatibility sediment beside the problem. |
| [write-tests](skills/engineering/write-tests/SKILL.md) | Write tests one tracer bullet at a time that pin real behavior — not implementation details, config values, or lucky samples. |
| [write-docs](skills/engineering/write-docs/SKILL.md) | Write docs as a glossary of principles and pointers, never a mirror of the code that will rot. |
| [codex](skills/engineering/codex/SKILL.md) | Use the local Codex CLI as an independent second agent for review and (on explicit ask) delegated implementation. |
| [claude](skills/engineering/claude/SKILL.md) | Use Claude Code (`claude -p`) as an independent second agent for consultation and (on explicit ask) delegated implementation. |

### Visual review — never accept visuals on vibes

| Skill | What it does |
|---|---|
| [compare-screenshots](skills/visual/compare-screenshots/SKILL.md) | Judge which image is *less wrong* against a target you establish — telemetry to locate divergence, not a baseline match. Ships a reusable diff script. |
| [screenshot-critique](skills/visual/screenshot-critique/SKILL.md) | Use an unprimed subagent as a second set of eyes on visual work before accepting it; mandatory before declaring a reported visual bug fixed. |
| [preview-shots](skills/visual/preview-shots/SKILL.md) | Open a curated set of image shots in one macOS Preview window for the user to eyeball. |

### Authoring — keep the skills themselves sharp

| Skill | What it does |
|---|---|
| [write-skills](skills/authoring/write-skills/SKILL.md) | Create or revise agent skills: triggers, leading words, progressive disclosure, and the failure modes to prune. |
| [eval-skills](skills/authoring/eval-skills/SKILL.md) | Eval a skill against golden cases — blind runs in fresh subagents, a separate judge, and gap-driven edits. |

### Graphics

| Skill | What it does |
|---|---|
| [renderer](skills/graphics/renderer/SKILL.md) | Build, debug, or review WebGPU renderer work — three.js/TSL scene layers, node materials, WGSL passes, depth semantics, and browser-verified visuals. |

## License

MIT
