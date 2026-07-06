---
name: refactor-clean
description: Refactor cleanly instead of layering sediment. Use when a change reveals duplicated concepts, local adapters, obsolete owners, compatibility wrappers, parallel abstractions, or "just tack this on" pressure in any code area.
---

# Clean Refactoring

Replace the old shape with the simpler shape the codebase would want if it were
designed today. Refactoring is not adding a compatibility layer beside the problem;
it is moving ownership until there is one concept with clear consumers.

## Workflow

1. Name the duplicated concept. Identify the thing that should have one owner:
   environment, pricing rule, geometry source, state machine, data contract,
   renderer phase, API shape, UI state, or test oracle.
2. Find every current owner and consumer. Treat wrappers, aliases, pass-local
   constants, copied structs, and "temporary" branches as sediment until proven
   otherwise.
3. Promote the concept to its natural home. Pick the module that would own it from
   scratch, then make old call sites consume that owner directly.
4. Delete or collapse the stale path in the same pass when feasible. If a bridge must
   remain, make it tiny, named as compatibility, and give it a removal condition.
5. Verify behavior through consumers, not just the new module. A clean refactor is
   only proven when the surfaces that used to diverge now report or exercise the
   same source of truth.

## Rules

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
