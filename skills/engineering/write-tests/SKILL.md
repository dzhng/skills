---
name: write-tests
description: Write tests that pin real behavior instead of implementation details, config values, or lucky samples. Use when adding tests for new behavior, writing a regression test, fixing a brittle or flaky test, reviewing a test diff, or when a test breaks after a refactor or config change that didn't change behavior.
---

# Write Tests

A good test fails **only** when real behavior breaks, and passes through every
refactor or config change that preserves it. Most bad tests fail the opposite
way: red on harmless changes, green while the real path is broken. Every rule
below serves that one goal.

For deciding whether coverage adds independent proof, where it belongs, or
which existing tests can go, use [audit-tests](../audit-tests/SKILL.md).

## Workflow: tracer bullets, not a batch

1. **Write ONE test at a time.** Assert first, watch it go red on the un-fixed
   code, make the code earn green, learn, then write the next. Never a batch up
   front: a batch written against *imagined* behavior pins what you guessed —
   those tests pass when the mechanism breaks and fail when it's fine. Each
   green cycle tells you what the next test should actually assert.
2. **Iterate on the fastest focused runner** (one file, one test name), and run
   the full suite only as a final gate before handing off. Check the exit code,
   not just the output — a runner that prints nothing and a green run look the
   same. On failures, read EVERY red test before fixing one; they often share a
   root cause.
3. **Before calling it done**, prove the test can fail (below) and walk the
   review checklist.

## What to assert

- **Observable behavior through the outermost practical entry point** — return
  values, exit codes, persisted rows, HTTP responses, rendered output — never
  which internal functions ran or how a value is computed. A test on the public
  surface survives a rewrite of everything underneath; a test that reaches into
  internals breaks on every refactor and pins implementation, not behavior.
  Reserve isolated unit tests for genuinely tricky pure logic (parsers,
  schedulers, state machines).
- **Nothing the compiler already guarantees.** A test that re-asserts a type
  signature — field shapes, rejected argument types — can only fail if the
  compiler failed first. Spend the budget on business rules, arithmetic,
  branching, ordering, edge cases, side effects.
- **Actual values, not collection sizes.** For dedup/normalize/idempotency
  paths, `length == 1` passes even when normalization is broken; also assert
  the stored value equals the expected canonical form.
- **The smallest scale that can show the behavior.** Two entities and one
  mechanism before crowds and integration; small tests fail fast with readable
  state and don't entangle five behaviors in one assert.
- **The design contract, not current behavior.** When a test goes red, the
  reflex is to re-measure and pin the new number — resist it: a bar calibrated
  to whatever the code currently does silently encodes bugs as baseline. Write
  the assert from the stated contract and make the code earn it; if no contract
  exists, that's a question for the owner, not a number to measure-and-pin.
  Recalibrating is legitimate only when the contract itself changed.
- **Deterministic claims tight, stochastic claims as distributions.** An
  invariant that holds every run gets an exact threshold. Anything noisy or
  tuning-dependent ("A usually beats B", "load balances evenly") must be
  asserted over a set of runs/seeds as a band — a single-sample pin on a
  stochastic outcome is not a weak test, it is a **blind** one: it certifies
  whatever the lucky sample did and can mask a systematic bias for months. If
  you must assert a noisy differential, widen the margin and name it
  chaos-marginal in a comment.

## Seams and mocks

- **Don't couple tests to config — mock the seam.** A test keyed to a live
  config value (which flag is on, which tier is default) breaks when someone
  legitimately edits config. The fix is never `skipIf`/conditionals — a skipped
  assertion hides the coupling and stops covering the path. Feed the function
  fixed inputs, or stub the lookup so fixture ids resolve to fixed values.
  Litmus: "would this break if a config value changed with no logic change?"
- **Don't over-mock — every mock is a frozen assumption.** Mock at the system's
  edges (network, clock, filesystem, third-party SDK, config lookup), never
  internal collaborators. Stubbing an internal hard-codes its current contract;
  refactor it and the test lies. Never make "was called with" the primary
  assertion when an observable outcome exists. Mocking three internal modules
  to test one function means: test one layer up, where they're real.
- **Harnesses must wire the system the way production does.** If a bug only
  showed up against a real environment, the harness skipped an input production
  always sets — fix the harness, don't just fix the bug.

## Control variables and probes

- **One variable per comparison.** Pin everything else — same seed, same
  counts, same configuration on both arms; disable mechanisms that aren't the
  subject. When a comparison test breaks, first ask whether an unrelated
  mechanism leaked into the experiment before touching the code under test.
- **Validate, don't assume.** Never reason your way to a conclusion about
  *cause* — which path fired, where the failures come from — and act on it.
  Write a throwaway probe that reads public state and prints; the plausible
  story is wrong often enough to burn a session, and one probe redirects the
  whole effort. Probes are scratch: put them where they cannot be committed,
  delete them the moment the question is answered, or promote them into a real
  test if the behavior deserves a permanent guard.

## Tests run on someone's live machine

A suite that grabs the desktop is a suite people stop running. Whatever the test
needs, it takes the least intrusive form of it:

- **Never take focus.** No activating the app, no `makeKeyAndOrderFront`, no
  raising, no moving the pointer, no simulated clicks into the session, no audio
  playback. A UI a person must not be interrupted by is still fully testable:
  build the window, drive its model, and assert on the rendered view. Where a
  screenshot is the evidence, capture the window's own image offscreen rather
  than photographing the screen. Keep activation on the code path a person
  triggers, and exercise it by calling the handler, not by launching the app
  repeatedly.
- **Write nowhere the person keeps their own state.** Point every test at a
  scratch home, a scratch preferences domain or suite, and scratch install
  locations. A test must never modify the real config, library, login items or
  installed applications. Production may read an override the tests set; it must
  behave normally when that override is absent.
- **Batch anything unavoidably visible.** If a check genuinely needs a real
  launch, do all of its observations in one run instead of one relaunch per
  assertion, and say in the evidence that it was visible.
- **Leave nothing running.** Every process, window, server and temporary file the
  test started is stopped and removed, including on failure.

## Prove the test can fail

A test you never saw fail is decoration. For any regression test — especially
one written *after* the fix — falsify it once: revert or break the production
code the way the bug would, confirm red *for the expected reason*, restore,
confirm green. Verify the revert actually took: a stash or checkout with a
wrong pathspec reverts nothing, silently, and the "red" run quietly tests the
fixed code. The tell: the "red" numbers equal the green numbers.

## When a test goes red after a change

Triage in order of likelihood before editing anything:

1. The test encodes **deleted semantics** — it pinned an accident of the old
   implementation. Re-spec it to the contract's real claim.
2. The experiment **lost control of a variable** — a new mechanism leaks in.
   Pin the variable.
3. The **margin was chaos-tight**. Widen it, with a comment saying so.
4. The code is **actually wrong**. Probe the state, find the mechanism.

Never tune constants to make one test pass without rerunning the neighbors:
coupled systems reshuffle. If two consecutive tweaks each break different
tests, stop poking — the control surface is wrong; find the mechanism.

## Review checklist

Walk this on any test diff, apply fixes in the same pass, re-run the suite:

1. Does an assertion restate a type guarantee? → delete it.
2. Would it break on a config edit with no logic change, or is it
   `skipIf`-conditional on config? → mock the seam.
3. Are assertions mostly mocked-internal "called with"? → test a layer up
   against observable output.
4. Does it pin a single sample of a stochastic outcome? → assert a
   distribution.
5. Does it assert a count without the value on a dedup/normalize path? → add
   the value assertion.
6. Is the function under test still called in production? → if the only
   callers are tests, delete the function and the test together.
7. Can it fail for the right reason? → falsify once to confirm.
8. Does it take focus, move the pointer, play sound, or write the person's real
   config, library or applications? → drive the model and a scratch location
   instead, and capture windows offscreen.
