---
name: refactor-clean
description: Refactor cleanly instead of layering sediment. Use for rename requests, stale or misleading names, legacy leftovers, changed scope, or when a change reveals duplicated concepts, local adapters, obsolete owners, redundant inputs or guards, compatibility wrappers, parallel abstractions, an over-large module that has accreted many responsibilities, or "just tack this on" pressure in any code area.
---

# Clean Refactoring

Replace the old shape with the simpler shape the codebase would want if it were
designed today. Refactoring is not adding a compatibility layer beside the problem;
it is moving ownership until every concept has exactly one clear home. That cuts
both ways: merging N duplicated owners into one, and splitting one over-loaded
module into the several owners it was hiding.

## Workflow

1. Sweep names in every touched path, even when no structural refactor is needed.
   Ask whether each name describes the concept's current scope. Rename misleading
   files, symbols, imported bindings and shared exports immediately; update every
   consumer, test, doc and agent instruction in the same pass. Keep scenario names
   only for scenario-specific code, then search again for stale references.
2. Name the concept that lacks one clear owner — duplicated across several owners,
   or several concepts fused into one over-loaded module. Identify the thing(s)
   that should each have one owner: environment, pricing rule, geometry source,
   state machine, data contract, renderer phase, API shape, UI state, or test
   oracle.
3. Find every current owner and consumer. Treat wrappers, aliases, pass-local
   constants, copied structs, migration comments and "temporary" branches as
   sediment until proven otherwise.
4. Run a deletion pass before relaxing checks or making inputs optional. For each
   input, flag, guard, fallback, and adapter in the affected path, ask what required
   behavior breaks if it disappears. Trace its writers, transport, readers,
   validators, and consumers; compare them with the authoritative owner. Making a
   redundant input optional is not completion. If removing it preserves required
   behavior, delete the mechanism and its call-site, test, and documentation residue.
5. Promote any remaining concept to its natural home. Pick the module that would
   own it from scratch, then make old call sites consume that owner directly.
   Delete or collapse the stale path in the same pass.
6. Retain compatibility only for an identified consumer and a concrete behavior
   that removal would break. Old inputs that can safely be ignored need no parser,
   validator, or adapter just because they may still arrive. If a bridge is needed,
   keep it tiny and give it a removal condition; hypothetical callers do not count.
7. Verify behavior through consumers, including affected failure and retry paths.
   Search again for the removed mechanism across code, tests, docs, and agent
   instructions. Finish only when each retained mechanism in the affected path
   has a named consumer and behavior it preserves; report retained bridges and
   their removal conditions.

## Rules

- **Every line is debt — the best mechanism is the one you don't write.**
  Before building any guard, validator, convergence protocol, or cleanup
  path, two checks gate it:
  1. **Does the platform already do this?** Read the component/framework you
     are working around before coding around it — its crons, retries,
     defaults, and lifecycles. A hand-built janitor beside a component that
     already vacuums itself is pure debt, and it will be debugged by someone
     who doesn't know the component made it unnecessary.
  2. **Does the failure it guards change any real outcome?** Trace the
     guarded condition to its consumer. If the consumer is indifferent — an
     ordering check feeding a consumer that doesn't care about order, a
     validation on data only our own code produces — the guard tests nothing
     and must not be written. A common shape: an invariant re-checked at read
     time that the single write path already establishes, so the branch can
     only fire on hand-corrupted rows. Ask which caller could produce the bad
     state; if the honest answer is "none, short of someone editing the
     database", delete the branch. "It could be inconsistent" is not a reason;
     "the consumer would then do the wrong thing" is.
  The bar is not "is this correct?" — defensive code is usually correct.
  The bar is "what breaks, for whom, if this line doesn't exist?" No
  concrete answer → no line.
- **Measure the change, and treat a bad size-to-behaviour ratio as a shape
  defect.** Before accepting a change, count what it actually cost — production
  code apart from tests and docs, and comments apart from logic, because a
  diff dominated by explanation is not the same as one dominated by machinery:

  ```
  git diff --numstat <base> -- ':!specs' ':!*.test.*' ':!**/test-harness'
  ```

  Then read the added lines, not just the total. **A small behavioural change
  that costs a large number of lines is a red flag** — it is the most reliable
  signal that the fix is fighting the existing shape rather than fitting it:
  a special case layered where the general case belongs, a second owner
  introduced beside the real one, or a wrapper bridging two things that should
  have been merged. The correct response is to rework it from the shape the
  code would want, **not** to commit it with a paragraph explaining why it had
  to be big; that explanation is the smell, not the mitigation.

  Two honesty rules, or the number means nothing: formatter churn in files the
  change did not otherwise touch is not part of the change and must stay out of
  the commit; and a net count near zero can still hide real weight — a new
  cron, table column, index, endpoint, dependency, or config flag is a surface
  someone now owns and maintains, so name those separately from the count.
- **Do not over-weigh the sunk cost of the existing architecture.** "It already
  exists and works" is not an argument for keeping a shape — coding agents make
  large architecture switches cheap, so size a refactor by the quality of the end
  state, not by the volume of code it replaces. When behavior must survive, pin it
  with tests at the consumer surface and swap the architecture underneath — though
  most of the time even the old seams shouldn't survive verbatim: a big refactor is
  the chance to redraw them into the shape the codebase would want today, not to
  faithfully rebuild the old interfaces on a new foundation.
- Prefer one shared primitive over N adapters. An adapter is acceptable only at an
  external boundary or as a short-lived migration seam.
- **Split a module that owns too many concepts — decomposition is refactoring
  too.** The dual of merging duplicates: when one file or function has accreted
  unrelated responsibilities, divide it along ownership seams so each piece owns a
  coherent slice a reader can name and the original thins to composition. **Past
  ~1000 lines a file is a smell, not a verdict** — some modules earn their size (a
  cohesive state machine, a generated table, one algorithm with tight internal
  coupling), but a god-file that registers dozens of routes or handles many domains
  inline is accreted responsibility, not cohesion. The split is right only when
  each new module owns a nameable responsibility and import pressure drops because
  dependencies moved with it; it's wrong when it's line-count relief that scatters
  one concept across files a reader must reassemble.
- **Know what already exists before you build something new.** Before writing a
  new mechanism — a shape, computation, asset, state machine, data contract —
  search the codebase for one that already does this, or something close enough
  to share. Only once you know what's there can you make the real decision:
  reuse it, consolidate two near-duplicates, or extract the shared core into an
  independent module both call — and that decision belongs *before* you start,
  not bolted on after. Reuse is not automatically the answer; the existing thing
  may be wrong, or genuinely different, and then you build new deliberately. The
  failure this prevents is building in ignorance of what's already there: two
  implementations that must agree then silently drift, each re-deriving details
  the other already settled (orientation, units, edge cases, ordering).
- Do not preserve dev-only compatibility by default. Unshipped scaffolding should
  move to the clean contract immediately.
- **Zero lineage signaling: name things for what they are, never for where they
  came from.** A name that encodes history — a slice file prefixed with the
  mega-file it was split from, `foo-v2`/`foo-new`/`foo-legacy`, a module named
  after the experiment that produced it, a wrapper named after the API it
  replaced — carries no information to a reader who wasn't there, and actively
  misleads the one who was once the old thing is gone. The test: would someone
  who joined today, knowing nothing of the history, choose this name? If the
  name only makes sense with the backstory, rename it; history lives in git,
  not in identifiers. The same rule kills lineage comments ("previously this
  was...", "moved from X") — they describe the diff, not the code, and rot the
  moment the referent disappears.
  Renaming is routine maintenance, not a separate project or a reason to ask for
  permission. Do it proactively at whatever scale the consumers require; a large
  mechanical diff is not a reason to retain a misleading name. Distinguish internal
  identifiers from persisted keys and external contracts: retain the latter only
  for an identified consumer, under the compatibility rule above. Do not leave
  internal aliases that preserve the old vocabulary.
- **Prefer the idempotent contract over the refusal.** When an operation can be
  asked for twice — a retry after a lost response, a user clicking the same
  button again, a replayed webhook — reaching the requested end state should
  succeed, not error. "Install X" where X is already installed at the place it
  belongs is a success: return the thing. Refusal is correct only when the
  second request means something genuinely different from the first — a
  DIFFERENT thing already occupies the name, so honoring the request would
  destroy or shadow it. The tell that you have it backwards: a caller has to
  special-case your error code to recover normal behavior, or a retry path
  needs a pre-flight "does it already exist?" read that races. Applies beyond
  writes: deletes of absent things, unsubscribes, and "mark complete" toggles
  are all idempotent by nature, and making them 404 or 409 pushes bookkeeping
  onto every caller.
- **Constrain the model to what production actually writes.** A schema that
  permits more than any writer produces — a list where every flow stores one
  element, a state nothing reaches — taxes every consumer with the general
  case. The tell: a consumer asking "but which one?" when the data can only
  contain one. Enforce the constraint at the write path; widen when a real
  use arrives.
- Make ownership visible in stats, tests, or debug output when divergence was the
  bug class.
- **A check that RE-DERIVES a value the code already computes will drift from
  it.** A test or second consumer that recomputes geometry, state, or a derived
  quantity independently can disagree with the code over a difference invisible
  on paper — an operation-order or rounding subtlety — and fire false verdicts.
  Export the owner's computed value and have the check consume that, so it
  enforces exactly what the code produced: one owner for the computation, not two
  that happen to mostly agree.
- **A symmetric or featureless placeholder can hide an orientation or coordinate
  bug in the thing it stands in for.** A symmetric stand-in renders the same
  whether or not the coordinate frame is flipped, so the defect stays invisible
  until a real asymmetric asset exposes it. When you swap a placeholder for the
  real asset, re-verify orientation and framing, not just that it renders.
- Update the spec or handoff with the new invariant, not the mechanical file list.
- If the refactor starts widening into unrelated behavior, slice it: land the shared
  contract first, then port consumers in reviewable passes.
