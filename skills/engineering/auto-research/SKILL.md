---
name: auto-research
description: Run fast, progressive experiments to map tunable parameters and their effects. Use when optimizing code, prompts, configurations, or other artifacts against a goal or benchmark, or when a long research run needs a planned hypothesis queue, focused trials, and durable findings.
---

# Auto Research

Optimize **learning per unit of time**. Start with one fast, revealing task,
plan competing hypotheses, test them separately, combine verified winners, then
expand coverage. The durable result is a **parameter-effect map** plus the best
verified artifact. An experiment is a checkpoint, not a stopping point.

## Workflow

1. **Recover the research state.** Read the objective, user feedback, project
   instructions, and existing research records. Reconcile the handoff with actual
   artifacts and running jobs; collect a pending attempt before launching another.
   Identify the best verified artifact (the incumbent), active task, regression
   set, hypothesis queue, and remaining budget. Reuse existing record locations.

2. **Clarify success before experimenting.** Recover any already agreed criteria;
   do not ask the user to repeat them. If the evaluator, metric, comparison
   baseline, or required improvement is unclear, ask focused questions and wait
   for answers before editing candidates or launching evaluations. Inspect
   existing artifacts and propose concrete options to make answering easier;
   do not silently choose what success means. Continue clarification until the
   answers define a checkable criterion, including evaluation scope, aggregation,
   and non-regression gates. Restate that criterion in the research contract.

   Distinguish passing correctness gates from achieving the optimization target.
   Specify whether the target is an absolute score, an absolute change, or a
   relative improvement against a named baseline. “Improve accuracy by 5%” is
   ambiguous: from 60%, five percentage points means 65%, while 5% relative means
   63%. Clarify the units and direction; record the formula when needed. A
   baseline's value may be measured next, but its identity and the comparison rule
   must be settled first. Accept open-ended optimization only when that is the
   user's intent; do not invent a threshold or substitute any improvement for
   the requested improvement.

   **Then define the smallest useful loop.** Record mutable parameters and the
   fixed evaluator and select **one cheap task that exposes the behavior being
   improved**. Measure its turnaround and remove
   unnecessary setup, models, cases, and implementation work from the inner loop.
   Prefer an architectural spike when the uncertainty is architectural.
   Available benchmark tasks are a pool, not a requirement to run them all;
   choose validation coverage to support the intended claim and user's scope.

   Record the evaluation command, timeout, repair allowance, resource limits,
   promotion rule, and confirmation plan. Separate research spend from the cost
   or runtime being optimized. Done means the success criterion is resolved and
   the next trial is cheap to run with an unambiguous decision rule; do not build
   a large benchmark matrix before testing the first hypothesis.

3. **Establish the active task's baseline.** Run the unchanged artifact once, or
   reuse its compatible recorded result and traces. Verify the evaluator measures
   the intended outcome; use a known failing control if detection is unproven.
   Keep the baseline fixed for this task/model/harness; do not rerun it per variant.
   For noisy measurements, plan only the repeats needed to distinguish an effect,
   respecting any user instruction to reuse a single baseline and reporting that
   limitation. Save exact inputs, artifact identity, and raw output.

4. **Plan a small hypothesis batch.** Before editing, list distinct explanations
   of the current bottleneck and the parameters or strategies that could test
   them. Inspect actual failure traces and matched baseline behavior instead of
   guessing from aggregate scores. For each hypothesis, record:
   - Parameter/change and mechanism: why it might affect the outcome.
   - Predicted observation, falsifying result, and cheapest discriminating test.
   - Fixed comparison parent, expected trial cost, and dependencies or likely
     interactions with other hypotheses.

   Rank by information gained per unit of time. Test alternatives one by one
   against the same parent so their effects remain interpretable. Avoid exhaustive
   parameter grids. Keep the queue short and revise it after results; planning
   is part of every research cycle, not a one-time backlog or a reason to delay
   the first trial.

5. **Test one hypothesis on the active task.** Preserve the incumbent and isolate
   the candidate from unrelated work. Change one conceptual factor; if a coupled
   bundle is necessary, attribute the result to that bundle. Record the candidate
   identity and prediction before running. Use cheap checks first, then the
   focused task; do not run the broad suite for every variant. Save uniquely
   identified raw output and inspect relevant traces. Bound crashes and repairs;
   a repaired candidate gets a new identity. Missing results are unknown, not zero.

   Compare observation with prediction, including regressions and null results.
   Record `keep`, `discard`, `inconclusive`, or `invalid` and update the map.
   Restore the parent between alternatives; retain reproducible snapshots or
   patches and evidence outside rollback scope. Rejecting a candidate does not
   disprove its entire strategy: diagnose a promising partial win and plan a
   targeted follow-up when evidence supports one.

6. **Combine and promote.** Test compatible winners together against the strongest
   individual candidate. Do not assume gains add: check interactions, and remove
   one change at a time when attribution is unclear. A combination that loses
   to a simpler candidate does not become the incumbent.

   A focused win is provisional. Before promotion, check the candidate against
   previously solved tasks in the accumulated regression set, using their saved
   baselines and the declared tolerances. Reject or repair regressions rather
   than hiding them in an average. Confirm noisy wins with the planned evidence,
   including all planned attempts and costs. Bank the verified candidate and
   update the parameter-effect map with interactions and task-specific limits.

7. **Expand only after progress.** Once the active task meets its local criterion
   and prior tasks remain green, add one task or a small batch that probes a new
   failure mode or an uncertain effect in the map. Establish missing baselines
   only for those tasks. If a new task fails, make it the active task, return to
   hypothesis planning, and retain the old tasks as regression checks. Do not
   repeatedly run the expanded suite while debugging that one failure.

   This curriculum changes discovery coverage, not the overall success criteria.
   Reserve broader evaluation for coverage-expansion checkpoints and final
   confirmation. A single-task win cannot complete a broader objective.

8. **Replan from what was learned.** After a hypothesis batch, a new failure, or
   several non-improving trials, consolidate the map and choose the next most
   informative batch. Change the suspected mechanism or experiment design when
   the evidence contradicts it; do not endlessly retune one family or rerun the
   same tests. Revisit a rejected idea only with a changed premise. Continue
   without asking whether to proceed after each experiment.

## Durable research record

Use the project's existing format; keep these views compact and linked to evidence:

- **Contract:** objective, fixed evaluation rules, budgets, current task and
  regression set, and final validation scope. Version protocol changes; do not
  mix incompatible scores or weaken the user's criteria to make a result pass.
- **Hypothesis queue:** the planned batch, priorities, dependencies, predictions,
  and tested/rejected/next status. Retire stale entries as the map improves.
- **Parameter-effect map:** one row per meaningful parameter or strategy: tested
  settings/range, observed effect on quality/cost/runtime, applicable task types,
  tradeoffs, interactions, confidence, evidence links, and remaining uncertainty.
  Distinguish measured effects from suspected mechanisms; include harmful and
  null effects. This synthesis is a primary deliverable, not just a leaderboard
  or chronological experiment log.
- **Attempt ledger:** hypothesis, parent/candidate identity, protocol version,
  task, command/configuration, metrics, gate results, resource use, verdict, and
  evidence paths. Capture model/prompt/data versions and seeds when relevant.
- **Handoff:** incumbent, active task, pending job/output location, remaining
  budget, and the next concrete test with its reason. Update after each verdict
  and before a turn boundary; never leave only “continue optimizing.”

## Evidence discipline

- Optimize the actual outcome. A smaller output or faster microbenchmark is a
  diagnostic until end-to-end quality and cost gates pass. Reduce trial scope
  while preserving the behavior under study; never hardcode a task's answer.
- Keep comparisons matched. Freeze candidates within a cohort, avoid resource
  contention, and never select a favorable baseline or repeat after seeing scores.
- Keep development and confirmation separate. Repeatedly tuned cases are
  development evidence. Use untouched cases for generalization claims; keep
  hidden answers and evaluator-only inputs out of candidate work.
- Account for failed trials and retries in research spend. State objective cost
  inclusions/exclusions and reconcile incomplete bills before claiming savings.
  Infrastructure failures are neither wins nor measured candidate regressions.
- Disclose material findings immediately; workflow order never delays disclosure.

## Stopping

Continue within the authorized session and limits until the target passes its
required validation, the user stops the work, a budget is exhausted, or a genuine
external blocker prevents useful progress. A plateau calls for replanning, not
an invented claim of optimality. Preserve research state across continuations;
this skill does not itself schedule future work.

At a stopping boundary, leave the incumbent recoverable and account for pending
jobs. Deliver the parameter-effect map, baseline versus best verified results,
coverage and limitations, budget consumed, stop reason, and exact next experiment
if unfinished. Meeting a score does not replace recording what the experiments
established; an unfinished run still leaves a useful map of what is known.
