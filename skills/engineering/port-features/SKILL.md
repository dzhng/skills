---
name: port-features
description: Copy features from an existing repository while preserving their implementation, bug fixes, and behavioral nuances. Use when asked to copy, port, transplant, or bring over an existing feature, especially an exact copy, or when a previous reimplementation missed upstream behavior.
---

# Port Features

Treat upstream as executable knowledge. A feature includes the fixes, tests,
lifecycle behavior, and supporting code that made it reliable. Start from its
files; adapt the host around them. A plausible implementation from a screenshot
or architectural summary does not fulfill a request to copy.

## Workflow

### 1. Pin the reference

Reuse an existing local checkout, or clone the upstream repository into a
suitable local reference directory before exploring. Keep its Git history
available; deepen a shallow clone when needed to inspect relevant fixes.
Browse actual files, tests, and history rather than relying on fetched snippets
or a screenshot. Read its repository guidance. Check branch, remote, and local
modifications before updating; preserve other work. Follow the user's requested
version, pulling when asked, and record the upstream URL and exact commit.
Check the license and retain required notices with copied code.

**Done:** the source version and requested surfaces are explicit. Distinguish
user choices from assumptions; do not reconfirm choices already made.

### 2. Recover the whole feature

Trace the producer through storage, transport, and presentation to its consumers.
Read the implementation and follow imports, registrations, callers, and tests
until every feature dependency has an owner. Include prompts/tool descriptions,
schemas, asset handling, styles, and runtime provisioning when behavior depends
on them. Separate feature dependencies from unrelated host infrastructure. A copied
callback without its caller’s lifetime wiring can leave viewers unmounted or
background updates moving the page; include those callers in the closure.
For a large dependency closure, investigate independently verifiable slices;
report inspected coverage and unresolved edges instead of expanding into an
audit of the entire upstream product.

Read path-scoped git history, including renames, and inspect fixes/refactors
whose rationale is unclear in today's code. Follow issue/PR references when
needed to recover a constraint. Search for prior attempts in the destination.
An unfamiliar guard, ordering rule, timeout, or extra listener may encode a fix;
find its reason before simplifying it.

**Done:** a source-file inventory and behavior ledger cover successful output,
failure, cancellation/cleanup, state across updates/remounts, and applicable
surfaces. Each non-obvious behavior cites source, tests, or history. Unexplored
dependencies remain explicit gaps, never implied coverage.

### 3. Map the seams

For each source file or cohesive feature section, record:

| Upstream source + commit | Destination owner | Copy / adapt / omit | Reason + behavior at risk | Verification |
|---|---|---|---|---|

Classify omitted sections too; do not silently drop inconvenient behavior.
Read the destination's owners and policies before choosing adapters. Trace actual
wire limits, compaction, headers, credentials, lifecycle, and persistence: a
compatible type does not prove that the payload survives or executes correctly.

Keep feature logic together and bind existing destination services at its edges.
Adding an upstream runtime dependency may preserve more fidelity than translating
its concurrency or resource management; assess that tradeoff explicitly. A
framework rewrite is a substantive divergence, not an import adjustment.
Treat a replacement host component the same way: a viewer or dialog can hide
zoom, keyboard, focus and lifecycle behavior. Compare its complete interaction
contract before classifying the substitution as a primitive/import change.
Resolve routine adapters from evidence. Ask only about material product choices
the source, destination, and user instructions cannot settle. Disclose findings
when they affect a decision; workflow order never delays disclosure.

**Done:** every dependency and behavior has a destination, an explicit exclusion,
or a named unresolved question. If the task is discovery only, deliver this map
and stop; otherwise proceed within the existing authorization.

### 4. Copy, then adapt

Actually copy the pinned files or cohesive sections before editing them. Retain
the upstream structure and algorithms wherever possible, even when unfamiliar.
Change imports, host bindings, and necessary product integration with the
smallest practical diff. Do not regenerate an equivalent implementation from the
ledger. Keep unrelated upstream product code out of the dependency closure.

Carry relevant upstream regression tests across with their fixtures and failure
conditions. Establish the missing destination behavior before wiring it in,
following the repository's test-first workflow. Keep assertions intact while
adapting test infrastructure; record any case that cannot transfer and why.
Preserve the test's execution surface and triggering fixture. A browser-named
file running parsers or server rendering does not transfer mounted-browser
coverage; a friendlier fixture may stop exposing the upstream regression.

**Done:** the destination derives from the pinned implementation, and every
algorithm change, deletion, or replaced dependency appears in the seam map.

### 5. Prove fidelity

Run the narrow checks that reach the copied behavior, then exercise it through
the destination's real transport and UI. Derive scenarios from upstream fixes
and tests, not just the happy path visible in the user's example. Compare actual
upstream and destination behavior for the same inputs where feasible; for UI,
include interaction and lifecycle transitions as well as screenshots. Exercise
unrelated live updates and paged data while an interaction is active; isolated
component checks miss caller-level ownership and anchoring.

Build destination fixtures with its real configuration and input envelopes,
including child creation and the user actions that activate lazy views. A bare
prompt or always-visible component can pass while the host takes an untested
path. Preserve source loading behavior when correcting a test driver.

Diff the final files back against the pinned source. Account for every meaningful
change. Audit delegated copies by this same comparison: initial copy hashes
prove provenance, not what survived adaptation. If a check fails, inspect the upstream invariant and the adapter before
replacing the algorithm or weakening the test. Passing new tests alone does not
establish parity. Mark unavailable reference runs and unverified cases plainly.

**Done:** each in-scope ledger entry has evidence, a user-authorized difference,
or an explicit unfinished status. Hand over the pinned provenance, copy/adaptation
map, preserved regression coverage, and remaining limitations. Never call an
approximation an exact port.
