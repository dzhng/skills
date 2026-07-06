---
name: implement-spec-with-codex
description: Run [implement-spec](../implement-spec/SKILL.md) with Codex doing the implementation passes while you orchestrate, integrate, and review. Use when the user asks to implement a spec with Codex, or to run implement-spec with Codex as the implementer.
---

# Implement Spec with Codex

Run [implement-spec](../implement-spec/SKILL.md) exactly — same loop, same
gates, same maintenance checkpoints — but Codex writes the code. Invoking this
skill IS the explicit ask that authorizes `codex exec` delegation under the
[codex](../codex/SKILL.md) skill.

## Role split

- **Codex implements — whenever possible.** Default every implementation pass
  to a `codex exec`, sliced sharp and prompted per the codex skill (prompt
  blocks, sandbox choice, exec liveness). Run independent slices as concurrent
  execs in separate worktrees, exactly where implement-spec would fan out
  subagents.
- **You orchestrate and review.** The spec loop stays yours: pick the next
  slice, reconcile plan with code, author each prompt end-to-end, integrate
  diffs, run the gates, refactor-clean and review the merged tree, commit,
  update the handoff, run maintenance checkpoints. None of that delegates.

Keep a pass yourself only when slicing it sharply would cost more than doing
it — tiny fixups, plan reconciliation, integration conflicts.

## Rules

- You own every result: read the full diff and run the verification yourself.
  "Codex says it's done" is never done.
- Visual results carry implement-spec's two extra proofs (production-route
  pixel diff + unprimed critique) with double force here: a sandboxed Codex
  never saw its change render, so a pass that misses the production render
  path entirely arrives looking fully "verified".
- A sandboxed Codex ships code it never saw run — browser-verify every visual
  slice yourself and budget fix rounds. Send a red gate back as a resumed
  follow-up with the failing evidence; fix it yourself only when that's
  smaller than re-prompting.
- Commit hygiene stays yours: review the change list of the merged tree
  before every commit, exactly as implement-spec demands of the integrating
  reviewer.
