---
name: audit-decisions
description: Audit the decisions an implementing agent made, not its diff — a pure audit that traces the session's history into a decisions ledger, changes no code, and never blocks an unsupervised run. Working code still embeds architecture the user never chose; surface it because future work inherits it. Use when the user wants to review the decisions the AI made on their behalf, before merging or committing AI-implemented work, when integrating a delegated subagent's pass, or when a fix "works" but might be a point fix.
---

# Audit Decisions

Given a good decision, an agent implements it faithfully; wherever the task is
underspecified, it makes the decision itself — silently, and the diff won't
flag it. Reviewing thousands of changed lines doesn't scale, and it inspects
the execution, which was probably fine. The audit that scales is of the
**decisions**: surface every one the implementer made on its own, judge
that list, and record the verdicts.

This is about architecture more than bugs. An implementation can work
perfectly and still rest on decisions the user never made — a data shape, a
storage location, a dependency, an API contract, a tradeoff of memory for
speed — and every one of them is load-bearing for future work. The user needs
to know them not because they're wrong, but because they now own them.

This is purely an audit — it is not about modifying code, and it can
be called at any time. The job is to **trace back**: walk every step this
session has taken, and every step each subagent took (a live implementer
traces its own; otherwise reconstruct from its reports, transcripts, and
diffs), and surface every single decision that was made on the user's behalf
that was not in the original spec or prompt. The ledger of those decisions
replaces reading the code as the user's review surface — that is the whole
point. Acting on the verdicts (redoing an unsound decision, applying a
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
   working on this, which decisions did you make that you're not confident
   of? List all."* — but treat the self-report as a starting point, not the
   boundary: agents under-report. Trace the history yourself — the session's
   steps, subagent reports, diffs, commits — and collect every decision that
   is in the work but not in the original spec or prompt. Sweep the
   architectural categories, not just the suspect fixes: data shapes and
   formats, storage and naming schemes, API contracts and their error
   behavior, dependencies added, concurrency/perf tradeoffs, scope
   interpretations, patterns future code will imitate. Auditing your own
   session, trace your own steps the same way. Decisions the plan explicitly
   delegated to the implementer are discretion, not audit items.
2. **Triage each decision on evidence.** Forced by the plan, or invented?
   Invented ones get the scrutiny: is this the general solution, or a fix
   shaped to the one failing case? Verdict per decision: **sound**,
   **unsound**, or **needs-user** — and alongside the verdict, a
   **confidence**: how sure the audit is that the user would have made this
   same call. Confidence is what ranks the report. Reserve needs-user for
   genuinely user-only calls (taste, product direction, external cost); every
   needs-user entry records a recommended provisional call that is
   reversible, so an unsupervised caller can proceed without waiting. The
   audit never stalls a run: each entry is a judgment handed over for action
   or review, not a question that halts.
3. **State the corrected decision, don't sketch a patch.** For each unsound
   decision, the entry names the corrected one the work should be redone from
   — the property that must hold in general — not an edit to layer on top. A
   patch on top of a bad decision preserves the decision; the redo itself is
   the caller's, after the ledger is reviewed.
4. **Bank every decision in the ledger** (below), and promote load-bearing
   sound ones into the plan's handoff so later passes inherit them as givens
   instead of re-deciding.
5. **Present the ledger: grouped by verdict, ranked by confidence.** The
   audit's deliverable is the ledger, handed to whoever acts next — the
   calling workflow mid-run, the user at run's end. Each verdict group maps
   to an action — needs-user (decide, with the provisional calls), unsound
   (redo, with the corrected decisions), sound (acknowledge: the
   architecture the user now owns) — and within each group decisions are
   ranked by confidence, least confident first. When the ledger is long,
   open the report with the two or three least-confident decisions overall,
   whatever their group: the "review these first" line. Sound is not
   skippable. Only trivial discretion (internal naming, cosmetic calls)
   compresses to a one-line count.

   **Write every entry ELI5 — by default, not on request.** The reader
   didn't live the session: write each entry in the
   [eli5](../eli5/SKILL.md) register — a concrete scenario walked end to
   end (the triggering event, what the work does today, what the unbuilt
   alternative would do), every term of art defined at first use, and
   pseudocode at the level of the decision when it is about control flow,
   ordering, or timing. "A gated ask is dropped, not deferred" is a
   headline, not an entry. A compressed entry that makes the user ask
   "explain this one" has failed; the ledger must stand alone without the
   diff, the spec, or the transcript.

## The Decisions Ledger

A dedicated file that outlives every pass: `decisions.md` beside the plan
(`specs/<feature>/decisions.md` when a spec owns the work). One entry per
audited decision:

- **When** — pass or commit it landed in.
- **The decision** — a one-line headline, then the ELI5 scenario: the
  triggering event, what the work does today, what the unbuilt alternative
  would do, with terms of art defined in place.
- **The gap** — what the plan left unspecified that forced it.
- **The reach** — what future work this decision constrains or enables; why
  the user needs to know it exists.
- **Verdict** — sound / unsound / needs-user, with a one-line why. For
  unsound: the corrected decision to redo from. For needs-user: the
  recommended provisional call and how to reverse it.
- **Confidence** — how sure the audit is that the user would have made the
  same call (low / medium / high). Ranks the report, ascending.

Rules of the ledger:

- Banked is settled: a decision already in the ledger (or promoted into the
  plan) is a given for later passes — never re-listed, never re-decided.
- The ledger is a plan-quality signal. Entries clustering around one slice or
  area mean the plan is foggy there — reslice or send that part back through
  the spec rather than triaging the same class of decision forever.
- **ELI5 survives every rewrite.** The entry format above — headline plus the
  walked scenario with terms defined in place — is the *storage* format, not
  presentation polish. When entries are consolidated, merged, re-audited at
  close, or copied into a final ledger, each surviving entry keeps (or
  regains) its full scenario. The known failure mode is exactly this
  compression: a closeout rewrite that shrinks banked entries to their
  headlines produces a ledger the reader must interrogate — "The checkpoint
  loads rows in mailbox order and rejects the list when a later reference
  has an earlier createdAt" reads as settled, but only the walked version
  (two sessions, per-session sequence numbers that can't be compared, the
  shared insert-timestamp clock) lets a reader actually judge the decision. A
  consolidation that drops scenarios has failed even if every fact survives —
  and so has one that keeps the scenario but leans on labels the build
  invented ("the retry envelope", "the evidence seam") without defining them
  where they're used.

## Rules

- **"It works" is not a verdict on the decision.** The recurring smell is the
  coincidental fix: a resized buffer, bumped timeout, or special case whose
  magnitude happens to cover the failing input while the underlying cause
  stays dormant. Ask what property *guarantees* the fix in general; if the
  answer is "this case passes," the decision is unsound even though the code
  is green.
- Declared success is the point of maximum risk — the implementer's confidence
  is highest exactly when its unexamined decisions are about to be merged.
  Never skip the audit because the result looks clean.
- An empty list on nontrivial work is a red flag, not a pass. Probe: what did
  the task leave unspecified? Something filled those gaps.
- The audit changes no code, tests, or build state. Finding an unsound
  decision is the deliverable, not a license to fix it — record the corrected
  decision and leave the tree exactly as audited, so the ledger and the tree
  agree on what the caller is deciding about. Evidence-gathering is fair game:
  read anything, run the existing tests, write transient probes — but remove
  every probe before handback.

## Done

The audit is done when every invented decision in the pass has a ledger entry
with a verdict, every unsound entry names the corrected decision to redo
from, every needs-user entry carries a reversible provisional call, and the
ledger has been presented — grouped by verdict, least-confident-first within
each group, every entry readable ELI5 without follow-up questions — to
whoever acts next, with the tree untouched. A handback that shows the diff
instead of the decisions, or a "fix" applied during the audit, is not done.
