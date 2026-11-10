---
name: audit-performance
description: Audit and prioritize performance work through bounded-work and forward-progress checks. Use when asked to find performance issues, investigate freezes/500s/OOMs, review retries or polling for no-progress loops, rank a performance backlog, or implement the next simple performance fixes.
---

# Audit Performance

Find work that grows without a useful bound or repeats without progress. Produce an evidence-backed
ledger or report, then prefer the smallest fix that preserves recovery.

## Workflow

1. **Trace hot paths.** Find recurring syncs, polls, streams, retries, queues, scheduled jobs,
   filesystem walks, and request-time reads. Follow each through its production caller; ignore
   test-only paths.
2. **Compute the amplification.** State the trigger and worst-case work in concrete units: rows,
   queries, pages, entries, bytes, jobs, retries, or full-file rewrites. Distinguish a bounded large
   constant from work that grows with history, tenants, paths, or outage duration.
3. **Check forward progress.** For every retry, fixed-prefix batch, cutoff, or transitional poll,
   identify what changes before the next attempt. If nothing must change, it can loop or starve
   forever. Check that partial fixes do not merely delay the same work.
4. **Falsify severity.** Inspect existing caps, indexes, backoff, deadlines, healing owners, and
   caller frequency. Dismiss findings already bounded cheaply enough or continuously healing.
5. **Record before fixing.** If the project keeps a performance ledger, append every supported
   finding and important dismissal using its existing convention. Otherwise return a compact report.
   Include priority, trigger, impact, current owner, acceptance seam, and evidence.
6. **Prioritize with the policy below.** If implementation is authorized, invoke the project's
   test-writing workflow and prove the old behavior red at the outermost practical seam. Fix, review,
   and update the ledger or report with verification evidence.

## Priority Policy

Rank highest when the issue can cause a user-visible freeze or error, memory/disk growth, blocked
request processing, data loss, fleet-wide amplification, or a poison item that prevents later work.

Prefer low-risk fixes that bound existing work: stream pagewise, honor backpressure, coalesce
schedules, move poison rows aside, skip proven no-ops, or make one exhaustive search end in a
terminal verdict. A safety cap is a pathology guard, not a normal product limit: set it above
legitimate large workloads, emit actionable telemetry when reached, and define what happens next.

Do not prioritize by scary-looking counts alone:

- Polling may continue forever when the polled state has a real recovery owner and can eventually
  change. Fix states that can never heal, not timers that are merely long-lived.
- Cheap bounded database work is acceptable without production evidence. Do not build a projection,
  cache, cursor state machine, or alternate read model just to reduce a modest fixed query count.
- Do not optimize information away when it may soon support product UI or behavior.

## Guardrails

- Preserve healing. A cache or no-op shortcut must retain cheap recovery signals and fall back to
  ordinary reconciliation on drift, uncertainty, restart, or prior failure.
- A recovery scan must either finish or persist forward progress. For a local, prunable namespace,
  prefer one complete pass with a ceiling high enough to indicate pathology rather than an ordinary
  large project. For a legitimately huge namespace, persist a cursor and resume after it. Finding the
  target updates identity; an exhaustive miss or abnormal ceiling produces the domain's terminal
  verdict. Never restart the same partial prefix forever.
- Separate retryable failures from terminal ones. A permanent rejection must not sit at a queue head
  or fixed prefix forever.
- Bound both sides of a transport and every durable/in-memory queue. State the overflow behavior;
  never silently drop accepted durable data.
- Judge a cache, an index or a delta protocol by its worst edit, not its quiet average: an insertion
  into a long retained collection, a change far from the active view, a move, a deletion. Assert the
  bounded work alongside the exact result.
- Check that a measured workload does what it claims before trusting its numbers: that the forces
  meet, the route is travelled, the failure arm runs. Measure the failure arm too.
- Isolate a cost measurement from everything else running in the process.
- Match compatibility work to the product lifecycle. In prelaunch code, prefer direct changes and
  add no legacy branches or migrations unless real persisted data requires them.
- Every limit introduced or changed must have an observable log or metric with the limit kind,
  configured bound, affected owner, and overload outcome.

## Done

The audit is complete only when every finding has a production trigger, quantified amplification,
priority rationale, acceptance seam, and recorded disposition; every dismissed candidate says which
bound or healing mechanism makes it acceptable. An implementation is complete only when its
red/green proof shows bounded work **and** continued recovery.
