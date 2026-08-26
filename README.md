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

Two shapes: one chained pipeline for a big feature, or à la carte whenever the
AI touches code. Every skill stands alone — chain them when the work is big,
call one when it isn't.

### The full loop — a big feature, start to finish

![The full loop — explore, spec, build unattended, review the choices](assets/full-loop.png)

1. **Map the fog.** `/explore-unknowns` on the idea. It interviews you quadrant
   by quadrant and hands you rendered options, mocks, and decision tables to
   react to instead of asking you to imagine. By the end you know what the
   feature does.

2. **Codify.** `/write-spec` on that map. Most decisions were already made
   upstream, so this pass is transcription — I don't read the spec. Anything
   genuinely new it hits, it asks about instead of deciding.

3. **Build.** Kick off the loop:

   ```
   /goal /implement-spec specs/<feature>
   ```

   `/goal` is what puts the harness in loop mode — same move in Claude Code or
   Codex — and the spec drives it from there. A couple of hours for a small
   feature, two or three days for a large one. Add whatever framing fits: `on
   the xyz branch`, or `using /codex as the implementer while you stay the
   parent orchestrator and reviewer`.

4. **Review the choices, not the diff.** The run ends by consolidating
   `specs/<feature>/choices.md` — every decision the agent made where the spec
   was silent, ranked least-confident first. That's the review surface. Send
   changes back and the next pass re-audits: every time the AI writes code, you
   audit what it chose.

   The rest fires on its own: a `/review` pass at the end of every slice,
   `/screenshot-critique` and `/compare-screenshots` on anything visual,
   `/close-spec` when the last slice lands, and a re-slice of the plan whenever
   implementation proves it stale.

Budget: 30 minutes to a few hours on steps 1–2, 30 minutes to a few hours on
step 4. A run that goes two days is more like 2–3 hours on each end. Your time
is in the bookends; the middle is unattended.

### À la carte — the spontaneous path

- **A brainstorm turns out to be a feature.** `/explore-unknowns` works at the
  end of a discussion as well as at the start — run it to sweep for the angles
  neither of you thought of, then pick the loop up at step 2.

- **Any code change that didn't come from a spec.** An ad hoc fix that touched
  more than expected: `/review` first (refactor-clean → code-review →
  write-docs), then `/audit-choices`. When the diff is too big to read, the
  choices ledger is how you still understand what is now in your codebase.

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
| [audit-performance](skills/engineering/audit-performance/SKILL.md) | Find hot paths that amplify or repeat without progress, rank them by real failure risk, and prefer the smallest bounded fix that preserves healing. |
| [write-docs](skills/engineering/write-docs/SKILL.md) | Write docs as a glossary of principles and pointers, never a mirror of the code that will rot. |
| [code-review](skills/engineering/code-review/SKILL.md) | Audit a diff for stale names, dead references, needless complexity, and comments that narrate instead of explain — ending on a clean/not-clean verdict. |
| [audit-choices](skills/engineering/audit-choices/SKILL.md) | Audit the choices an implementer made, not its diff — a pure, never-blocking audit whose ledger discloses the architecture and decisions made on the user's behalf, reviewed instead of the code. |
| [eli5](skills/engineering/eli5/SKILL.md) | Explain a spec or change in plain language without losing precision — the ELI5 register other skills borrow for standalone, walked-scenario explanations. |
| [review](skills/engineering/review/SKILL.md) | Closeout a finished change as one pass — refactor-clean, then code-review, then write-docs — sequenced into a single verdict. |
| [codex](skills/engineering/codex/SKILL.md) | Use the local Codex CLI as an independent second agent for review and (on explicit ask) delegated implementation. |
| [claude](skills/engineering/claude/SKILL.md) | Use Claude Code (`claude -p`) as an independent second agent for consultation and (on explicit ask) delegated implementation. |
| [marketing-pages](skills/engineering/marketing-pages/SKILL.md) | Rulebook for writing, updating, and auditing marketing pages by page class — campaign landers stay noindexed and unlinked with one CTA; everything else earns its sitemap entry, crawl-rail link, and canonical copy source. |

### Visual review — never accept visuals on vibes

| Skill | What it does |
|---|---|
| [compare-screenshots](skills/visual/compare-screenshots/SKILL.md) | Judge which image is *less wrong* against a target you establish — telemetry to locate divergence, not a baseline match. Ships a reusable diff script that also measures a lone capture for flat, empty, or misframed content. |
| [screenshot-critique](skills/visual/screenshot-critique/SKILL.md) | Use an unprimed subagent as a second set of eyes on visual work before accepting it; mandatory before declaring a reported visual bug fixed. Ships a checker that strikes any number the critique cannot show a command for. |
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
