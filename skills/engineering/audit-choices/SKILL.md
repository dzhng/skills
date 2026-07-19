---
name: audit-choices
description: Audit the choices an implementing agent made, not its diff — a pure decision audit that traces the session's history into a choices ledger, changes no code, and never blocks an unsupervised run. Working code still embeds architecture the user never chose; surface it because future work inherits it. Use when the user wants to review the decisions the AI made on their behalf, before merging or committing AI-implemented work, when integrating a delegated subagent's pass, or when a fix "works" but might be a point fix.
---

# Audit Choices

Given a good decision, an agent implements it faithfully; wherever the task is
underspecified, it makes the decision itself — silently, and the diff won't
flag it. Reviewing thousands of changed lines doesn't scale, and it inspects
the execution, which was probably fine. The audit that scales is of the
**choices**: surface every decision the implementer made on its own, judge
that list, and record the verdicts.

This is about architecture more than bugs. An implementation can work
perfectly and still rest on decisions the user never made — a data shape, a
storage location, a dependency, an API contract, a tradeoff of memory for
speed — and every one of them is load-bearing for future work. The user needs
to know them not because they're wrong, but because they now own them.

This is purely a decision audit — it is not about modifying code, and it can
be called at any time. The job is to **trace back**: walk every step this
session has taken, and every step each subagent took (a live implementer
traces its own; otherwise reconstruct from its reports, transcripts, and
diffs), and surface every single decision that was made on the user's behalf
that was not in the original spec or prompt. The ledger of those decisions
replaces reading the code as the user's review surface — that is the whole
point. Acting on the verdicts (redoing an unsound choice, applying a
provisional call) belongs to the caller: the implementing workflow mid-run,
or the user after reading the report.

Two ways in, same audit:

- **Called by a workflow** (per pass or per slice): audit that pass, append
  its entries to the ledger, and return; the workflow presents the
  accumulated ledger when it hands back.
- **Called directly by the user**: audit the whole body of work in front of
  you (session, branch, or named change) and present the report immediately.
  Recommend; change nothing.

## Workflow

1. **Elicit and trace back.** When an implementer reports done, ask: *"While
   working on this, which choices did you make that you're not confident of?
   List all."* — but treat the self-report as a starting point, not the
   boundary: agents under-report. Trace the history yourself — the session's
   steps, subagent reports, diffs, commits — and collect every decision that
   is in the work but not in the original spec or prompt. Sweep the
   architectural categories, not just the suspect fixes: data shapes and
   formats, storage and naming schemes, API contracts and their error
   behavior, dependencies added, concurrency/perf tradeoffs, scope
   interpretations, patterns future code will imitate. Auditing your own
   session, trace your own steps the same way. Choices the plan explicitly
   delegated to the implementer are discretion, not audit items.
2. **Triage each choice on evidence.** Forced by the plan, or invented?
   Invented ones get the scrutiny: is this the general solution, or a fix
   shaped to the one failing case? Verdict per choice: **sound**, **unsound**,
   or **needs-user** — and alongside the verdict, a **confidence**: how sure
   the audit is that the user would have made this same call. Confidence is
   what ranks the report. Reserve needs-user for genuinely user-only calls
   (taste, product direction, external cost); every needs-user entry records a
   recommended provisional call that is reversible, so an unsupervised caller
   can proceed without waiting. The audit never stalls a run: each entry is a
   judgment handed over for action or review, not a question that halts.
3. **State the corrected decision, don't sketch a patch.** For each unsound
   choice, the entry names the decision the work should be redone from — the
   property that must hold in general — not an edit to layer on top. A patch
   on top of a bad decision preserves the decision; the redo itself is the
   caller's, after the ledger is reviewed.
4. **Bank every choice in the ledger** (below), and promote load-bearing
   sound ones into the plan's handoff so later passes inherit them as givens
   instead of re-deciding.
5. **Present the ledger as a ranked list — least confident first.** The
   audit's deliverable is the ledger, handed to whoever acts next — the
   calling workflow mid-run, the user at run's end. Rank every choice by
   confidence, ascending: the top of the report is whatever the audit is
   least sure the user would have chosen (needs-user rows with their
   provisional calls, unsound choices with their corrected decisions), and
   confident-but-load-bearing sound decisions follow — sound is not
   skippable; those are the architecture the user now owns. The user reads
   top-down and can stop when confidence gets boring. Only trivial
   discretion (internal naming, cosmetic calls) compresses to a one-line
   count. It must stand alone without the diff.

## The Choices Ledger

A dedicated file that outlives every pass: `choices.md` beside the plan
(`specs/<feature>/choices.md` when a spec owns the work). One entry per
audited choice:

- **When** — pass or commit it landed in.
- **The choice** — one line, concrete.
- **The gap** — what the plan left unspecified that forced it.
- **The reach** — what future work this decision constrains or enables; why
  the user needs to know it exists.
- **Verdict** — sound / unsound / needs-user, with a one-line why. For
  unsound: the corrected decision to redo from. For needs-user: the
  recommended provisional call and how to reverse it.
- **Confidence** — how sure the audit is that the user would have made the
  same call (low / medium / high). Ranks the report, ascending.

Rules of the ledger:

- Banked is settled: a choice already in the ledger (or promoted into the
  plan) is a given for later passes — never re-listed, never re-decided.
- The ledger is a plan-quality signal. Entries clustering around one slice or
  area mean the plan is foggy there — reslice or send that part back through
  the spec rather than triaging the same class of choice forever.

## Rules

- **"It works" is not a verdict on the choice.** The recurring smell is the
  coincidental fix: a resized buffer, bumped timeout, or special case whose
  magnitude happens to cover the failing input while the underlying cause
  stays dormant. Ask what property *guarantees* the fix in general; if the
  answer is "this case passes," the choice is unsound even though the code is
  green.
- Declared success is the point of maximum risk — the implementer's confidence
  is highest exactly when its unexamined choices are about to be merged. Never
  skip the audit because the result looks clean.
- An empty list on nontrivial work is a red flag, not a pass. Probe: what did
  the task leave unspecified? Something filled those gaps.
- The audit changes no code, tests, or build state. Finding an unsound choice
  is the deliverable, not a license to fix it — record the corrected decision
  and leave the tree exactly as audited, so the ledger and the tree agree on
  what the caller is deciding about. Evidence-gathering is fair game: read
  anything, run the existing tests, write transient probes — but remove every
  probe before handback.

## Done

The audit is done when every invented choice in the pass has a ledger entry
with a verdict, every unsound entry names the corrected decision to redo
from, every needs-user entry carries a reversible provisional call, and the
ledger has been presented, ranked least-confident-first, to whoever acts
next — with the tree untouched. A
handback that shows the diff instead of the choices, or a "fix" applied
during the audit, is not done.
