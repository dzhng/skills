---
name: review
description: Closeout pass on a finished substantive change — sequence refactor-change (shape), code-review (diff), and write-docs (docs) so all three run, in the order where each feeds the next. Use after implementing a slice or feature and before calling it done or committing; when the user asks for a final review, a cleanup-and-document pass, or to "review everything." For a diff-only audit, reach code-review directly.
---

# Review

A finished change earns "done" only after three lenses pass: its **shape**, its
**diff**, and its **docs**. Each has a specialist skill. This skill owns only
what they can't — the order they run in, the loop between them, and one verdict.

## Workflow

1. **Scope.** Fix the diff under review and confirm it's substantive; skip the
   whole pass for trivial edits.
2. **Shape — [refactor-change](../refactor-change/SKILL.md).** Run it first, while
   restructuring is cheap and before you audit a diff that's about to move.
3. **Diff — [code-review](../code-review/SKILL.md).** Audit the settled shape. A
   finding that forces a structural change sends you back to step 2, not onward.
4. **Docs — [write-docs](../../implement/write-docs/SKILL.md).** Update the docs this change
   touched. Then trace the link chain from the root README down to each one:
   every link on the path still resolves, and the hub-to-leaf flow still reads
   in order.
5. **Report.** One verdict across all three passes — what each found, what you
   changed, what you left and why. Done only when every pass is clean or
   resolved.

## Rules

- When you enter a pass, read its skill — the rules live there, not here.
- Order governs presentation, not disclosure: surface a finding the moment you
  hit it, even when a later pass owns it.
- Loop, don't cascade: a later fix that reopens an earlier pass returns there.
  Stop when a full pass adds nothing.
