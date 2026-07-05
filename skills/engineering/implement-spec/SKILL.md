---
name: implement-spec
description: Implement an existing spec through committed passes. Use for long or multi-pass specs that need maintenance checkpoints to periodically clean code, handoffs, priorities, and plan bloat before drift accumulates.
---

# Implement Spec

Build the active spec to completion, one reviewable pass at a time. The spec is
the source of truth, but the architecture is allowed to improve when the code
teaches you the plan is stale.

A pass (usually one slice) is a **commit checkpoint, not a stopping point.** The
job is the whole spec — every slice, every global TODO — not the first green
commit. Finishing a pass means starting the next one, not handing back to the
user. Only stop when the spec is fully implemented (or a genuine blocker needs a
decision only the user can make).

**Work in parallel wherever the graph allows.** Do not walk the ladder one slice
at a time when slices are independent. Read the spec's dependency graph as a
wavefront and **delegate independent passes to subagents that run concurrently**
(see Rules) — you orchestrate and integrate; only serialize what genuinely
depends on prior work.

## Workflow

1. Read the repo README, the spec README, and the next slice before editing.
   Load any skills named by the spec. Identify the current pickup point, global
   TODOs, required gates, and what must stay green. If a multi-slice spec lacks
   a live handoff prompt, add one before the first pass ends.
2. Reconcile the plan with the current code. If the slice would preserve a
   development-only shim, duplicated type, weak wrapper, or obsolete path,
   replace it with the simpler architecture and update the spec handoff.
3. Implement one coherent pass: usually one slice, one vertical checkpoint, or
   one architecture correction. Keep the review surface small enough to audit.
4. Verify the actual contract. For behavior changes, run the focused unit tests
   first; for browser-visible work, use the real browser/harness and inspect
   screenshots so the subject is framed and readable, not merely nonblank.
   Never weaken an existing default gate or repin a failing contract without
   proving the old contract is wrong.
5. **Review the change list and clean up after every pass, before committing.**
   Read `git status`/`git diff --stat` line by line and account for every path:
   one-off probes, shot scripts, scratch files, `nohup.out`, ad-hoc screenshot
   dirs, and SPIKE/debug notes never enter a commit — scratch stays out of the
   tree; review evidence belongs in the spec's `assets/`; anything else gets
   deleted. A file you can't name the durable purpose of does not ship.
   Delegated agents leak these; the integrating reviewer re-checks the merged
   tree with the same eye.
6. Run [refactor-clean](../refactor-clean/SKILL.md) at the end of every pass,
   before reviewing: collapse any sediment this pass introduced — dev-only shims,
   duplicated concepts, parallel abstractions, compatibility wrappers — into the
   clean contract with one owner, so the code reads as designed today, not tacked
   on. Then run a code-review pass. Apply the fixes from both, rerun the
   affected checks, then commit only the focused changes from this pass.
7. Update the spec README's "Next Agent Prompt": status, completed work, next
   pickup point, blockers, changed gates, and any architecture decision that
   changed the plan.
8. Run a **maintenance checkpoint** as part of the loop, not as endgame cleanup.
   Trigger it after a red pass, after every two or three slice commits, after a
   rebase/resume/compaction, before changing feature areas, when evidence
   invalidates the plan, when the handoff contradicts the TODO/graph, or when the
   active prompt grows hard to scan. Long specs bloat repeatedly; cleanup is a
   normal pass, not a cosmetic chore.

   A checkpoint cleans both plan and code before more feature work:
   - Shorten the README handoff to one current pickup, one priority order, and
     one compact evidence ledger; move play-by-play into slice files or assets.
   - Correct completed/rejected/next markers; delete stale TODOs, stale
     acceptance claims, duplicated status sections, and obsolete prompts.
   - Re-rank remaining work so the next red/high-risk contract is explicit, and
     demote branches that are not on that path.
   - Reslice any still-red, overloaded, or foggy slice into smaller independently
     verifiable passes before implementing past it.
   - Delete or collapse scaffolding from earlier passes when it no longer owns a
     real contract.
   - If the work feels off-track, ask a fresh review/subagent to audit spec shape
     and priority order, then apply the fixes.

   Commit the checkpoint as its own focused pass when cleanup changes the spec,
   code shape, or handoff enough that future agents would otherwise inherit stale
   context. It is done only when a fresh agent can read the README handoff, TODO,
   and slice graph and choose the same next action without conversation history.
9. **Continue.** If any slice or global TODO is still open, go straight back to
   step 1 for the next one — same session, no pause for acknowledgement. Keep
   looping until every TODO is closed. When the last slice lands, close the spec
   with [close-spec](../close-spec/SKILL.md).

## Rules

- **Delegate independent work to subagents so passes run in parallel.** The
  spec's dependency graph is the map: whenever two or more slices, branches (e.g.
  frontend vs backend), sub-slices, replication spikes, or recon tasks have no
  unmet dependency on each other, hand them to subagents that run concurrently
  (spawn them in one message) instead of doing them yourself in sequence. Give
  each subagent its own git worktree when they touch files in parallel so their
  diffs don't collide, and keep work that shares the same files or API seam on a
  single agent to avoid merge chaos. Each delegated unit still owns its full pass
  — implement, verify, refactor-clean, review, focused commit — and you integrate
  the results, resolve conflicts, rerun the affected gates on the merged tree, and
  keep the Next Agent Prompt coherent. Only serialize what the graph says must be
  serial; never idle a lane waiting on an unrelated one.
- Treat backward compatibility as non-goal for unshipped/dev scaffolding. Delete
  old paths, wrappers, aliases, fallback modes, and stale tests when the new
  architecture replaces them.
- Do not let tests get easier by accident. A split harness or new runner must
  preserve the old default coverage unless the spec explicitly changes it.
- Commit every clean pass, then immediately begin the next one. A green commit is
  a checkpoint, not permission to stop. If a pass is not green, do not commit it
  as finished; report the failing contract and exact evidence.
- Do not stop while work remains. "Slice N is done and committed" is not a
  finished task while later slices or TODOs are open — a single completed slice is
  a reason to continue, never to hand back. The only legitimate early stops are: a
  hard blocker that needs a user-only decision, a gate that cannot be made green
  with an honest fix, or the user interrupting. Running low on context is not a
  stop — update the handoff and keep going. When you must stop, say exactly which
  slice is next and why you paused.
- Keep visual evidence honest: contact sheets, GIFs, screenshots, and
  baselines must show the thing being judged at the intended camera/framing.
- Sweep every user-visible surface implied by the slice. A model, state, or
  data change is not done if the main view, cards, menus, reports, and
  verification fixtures now tell different stories.
- When the implementation touches shared behavior, leave docs or spec rationale
  using [write-docs](../write-docs/SKILL.md) principles: durable invariants and
  pointers, not copied inventories.
- For long specs, keep the spec itself reviewable as an invariant. Do not let
  the README become a transcript of every attempt; keep one current handoff, one
  TODO/graph, and one compact evidence ledger, with details in slice files or
  assets.
- **Human checkpoints never block.** At a slice's review or sign-off gate, open
  the relevant shots with [preview-shots](../../visual/preview-shots/SKILL.md),
  state the decision and the options, and give the user ~5 minutes to weigh in —
  keep building other non-blocked work meanwhile, never idle. If they don't
  answer, make the call yourself on the evidence, record the decision and its
  rationale in the spec (the checkpoint's resolution), and keep going — and close
  the shots you opened (preview-shots cleans up Preview) so a long unattended run
  never piles up windows. A goal or implementation NEVER stops to wait on the
  user; it documents the assumption, keeps it reversible, and lets the user
  course-correct later.

## Done

A **pass** is done when code, spec handoff, verification evidence, refactor-clean
and review cleanup, and a focused commit all agree on the same current truth —
then you start the next pass.

The **spec** is done — and only then is this skill done — when every slice and
global TODO is closed, all gates are green, the handoff shows nothing left to
pick up, and the spec has been archived with [close-spec](../close-spec/SKILL.md).
Anything short of that is mid-implementation: keep going.
