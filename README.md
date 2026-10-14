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

From a clone, `npm run install-skills` does the same without the registry:

```bash
npm run install-skills              # into ~/.agents/skills, linked from ~/.claude/skills
npm run install-skills -- ../my-app # into a repo instead of the home directory
npm run install-skills -- --only write-spec,review ../my-app
npm run list-skills                 # names and categories
```

`.agents/skills/<name>/` holds the real files (flat, category-free, with
cross-category links rewritten to match); `.claude/skills/<name>` is a relative
symlink into it, so both harnesses read one copy. Re-running overwrites the
installed copies — a `.claude/skills/<name>` you keep as a real directory is
left alone, and a `.claude/skills` that is already a symlink is left as is. Add
`--dry-run` to see the plan first.

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

![A single autonomous run — 3 days, 18 minutes pursuing one goal](assets/autonomous-run.png)

> Proof: one unattended Codex run pursuing a single goal for **3d 18m** on top
> of these skills, slicing and iterating until done.

## How to use

Use a chained pipeline to build a feature, a research loop to discover what
works, or individual skills as needed. Every skill stands alone.

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

### Research — learn through fast experiments

Use [Auto Research](skills/engineering/auto-research/SKILL.md) when the next
decision needs experimental evidence. It starts with one fast, revealing task,
tests a short batch of hypotheses, checks combinations, and expands coverage as
the approach improves. New failures become the focus; earlier tasks become
regression checks.

```
/auto-research Reduce cost per task by at least 15% relative to the saved
baseline, without reducing task success. Start with one fast development task.
```

If the evaluator, metric, baseline, or required improvement is unclear, the
skill asks before experimenting. Passing an evaluation and meeting an
improvement target are separate requirements. The output includes the best
verified artifact and a **parameter-effect map**: what was tested, where it
helps or hurts, and how changes interact. Use that evidence to inform a spec
when the research is ready for implementation.

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
| [auto-research](skills/engineering/auto-research/SKILL.md) | Optimize through fast, progressive experiments, producing a verified candidate and a map of parameter effects and tradeoffs. |
| [write-spec](skills/engineering/write-spec/SKILL.md) | Break a large feature into independently verifiable, human-reviewable slices with API seams and playable checkpoints. |
| [implement-spec](skills/engineering/implement-spec/SKILL.md) | Build an existing spec to completion, one reviewable pass at a time, delegating independent slices in parallel. |
| [implement-spec-with-goal](skills/engineering/implement-spec-with-goal/SKILL.md) | Use the harness's goal feature, then follow implement-spec to completion. |
| [implement-spec-with-codex](skills/engineering/implement-spec-with-codex/SKILL.md) | Run implement-spec with Codex writing the code — you orchestrate, integrate, and review every pass. |
| [close-spec](skills/engineering/close-spec/SKILL.md) | Archive a shipped spec and rewrite it from a build plan into a durable rationale record that points back at the code. |
| [handoff-spec](skills/engineering/handoff-spec/SKILL.md) | Hand a spec that is mid-implementation to another machine or agent: capture what the session knows in the spec, then push. User-invoked. |
| [refactor-clean](skills/engineering/refactor-clean/SKILL.md) | Refactor by moving ownership to one clean concept instead of layering compatibility sediment beside the problem. |
| [write-tests](skills/engineering/write-tests/SKILL.md) | Write tests one tracer bullet at a time that pin real behavior — not implementation details, config values, or lucky samples. |
| [audit-tests](skills/engineering/audit-tests/SKILL.md) | Map contracts to independent test proof, consolidate redundant coverage, and remove test-only machinery without losing regression protection. |
| [audit-performance](skills/engineering/audit-performance/SKILL.md) | Find hot paths that amplify or repeat without progress, rank them by real failure risk, and prefer the smallest bounded fix that preserves healing. |
| [write-docs](skills/engineering/write-docs/SKILL.md) | Write docs as a glossary of principles and pointers, never a mirror of the code that will rot. |
| [code-review](skills/engineering/code-review/SKILL.md) | Audit a diff for stale names, dead references, needless complexity, and comments that narrate instead of explain — ending on a clean/not-clean verdict. |
| [audit-choices](skills/engineering/audit-choices/SKILL.md) | Audit the choices an implementer made, not its diff — a pure, never-blocking audit whose ledger discloses the architecture and decisions made on the user's behalf, reviewed instead of the code. |
| [retro](skills/engineering/retro/SKILL.md) | Conduct a coding-session retrospective and suggest improvements to the agent's environment, checks, guidance, and information access. User-invoked. |
| [eli5](skills/engineering/eli5/SKILL.md) | Explain a spec or change in plain language without losing precision — the ELI5 register other skills borrow for standalone, walked-scenario explanations. |
| [review](skills/engineering/review/SKILL.md) | Closeout a finished change as one pass — refactor-clean, then code-review, then write-docs — sequenced into a single verdict. |
| [codex](skills/engineering/codex/SKILL.md) | Use the local Codex CLI as an independent second agent for review and (on explicit ask) delegated implementation. |
| [claude](skills/engineering/claude/SKILL.md) | Use Claude Code (`claude -p`) as an independent second agent for consultation and (on explicit ask) delegated implementation. |
| [marketing-pages](skills/engineering/marketing-pages/SKILL.md) | Rulebook for writing, updating, and auditing marketing pages by page class — campaign landers stay noindexed and unlinked with one CTA; everything else earns its sitemap entry, crawl-rail link, and canonical copy source. |

### Visual review — never accept visuals on vibes

| Skill | What it does |
|---|---|
| [design-with-images](skills/visual/design-with-images/SKILL.md) | Explore generated visual options, preserve the selected target, and iterate real screenshots against it until the implemented design matches. |
| [compare-screenshots](skills/visual/compare-screenshots/SKILL.md) | Compare captures against an approved design or the intended result; use telemetry to locate differences rather than treating a historical baseline as correct. Ships a reusable diff script that also measures a lone capture for flat, empty, or misframed content. |
| [screenshot-critique](skills/visual/screenshot-critique/SKILL.md) | Use an unprimed subagent as a second set of eyes on visual work before accepting it; mandatory before declaring a reported visual bug fixed. |
| [preview-shots](skills/visual/preview-shots/SKILL.md) | Open a curated set of image shots in one macOS Preview window for the user to eyeball. |

### Authoring — keep the skills themselves sharp

| Skill | What it does |
|---|---|
| [write-skills](skills/authoring/write-skills/SKILL.md) | Create or revise agent skills: triggers, leading words, progressive disclosure, and the failure modes to prune. |
| [audit-agents](skills/authoring/audit-agents/SKILL.md) | Audit or rewrite AGENTS.md so it holds only lasting principles, with iteration speed at the core. Ships an example AGENTS.md that pairs with this pack. |
| [eval-skills](skills/authoring/eval-skills/SKILL.md) | Eval a skill against golden cases — blind runs in fresh subagents, a separate judge, and gap-driven edits. |

### Graphics

| Skill | What it does |
|---|---|
| [renderer](skills/graphics/renderer/SKILL.md) | Architecture rules for GPU rendering with TypeGPU/WebGPU — one frame orchestrator, single owners, a resource registry, depth and compositing contracts, and verification that looks at pixels. |
| [launch-video](skills/graphics/launch-video/SKILL.md) | Direct a showreel-grade launch video in code — one visual concept grown from the project, picture and a synthesized score locked to one timing source, and a preview frame that survives social feeds. |
| [cinematic-shot](skills/graphics/cinematic-shot/SKILL.md) | Shoot software UI like a film — steep, oblique extreme close-up hero shots with a razor-thin focal plane, slow motivated camera drift, and UI that acts on its own, hard-cut on the action. |
| [isometric-motion](skills/graphics/isometric-motion/SKILL.md) | Build animations and interactive elements in a crafted isometric style — solid many-part figures, four-tone shading, a framed card with live readout, and calm eased motion driven by one model. |

## License

MIT

## Acknowledgements

Thanks to [Matt Pocock](https://x.com/mattpocockuk) for the
[retro skill](https://github.com/mattpocock/skills/tree/main/skills/engineering/retro),
copied here with its writing-guide references pointed at this repo's `write-skills`.
Thanks also to Matt and [Thariq](https://x.com/trq212) for the **fog of war** and
**discovering the map** concepts that helped shape these skills.
Thanks to [wheresryan22](https://github.com/wheresryan22) for the
[Anatomy skill](https://github.com/wheresryan22/anatomy), copied here as
`isometric-motion` and repurposed for animations and interactive elements.
