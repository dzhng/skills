---
name: port-features
description: Port a feature from an existing repository by copying its source and adapting the host around it, preserving its implementation, bug fixes, and behavioral nuances. Use when asked to copy or port an existing feature (especially an exact copy), when moving one into a different framework or host, or when a previous reimplementation missed upstream behavior.
---

# Port Features

Treat upstream as executable knowledge. A feature is its code plus the fixes,
tests, lifecycle wiring, and supporting pieces that made it reliable. Start
from its files and adapt the host around them. A plausible reimplementation
from a screenshot or summary does not fulfill a request to copy.

Keep the inventory, behavior ledger, and seam map in a file, in the active
spec's directory when there is one, so they survive a long port. Order governs
presentation, never disclosure: raise a finding that bears on a decision when
you find it.

## Workflow

### 1. Pin the reference

Use an existing local checkout, or clone upstream outside the destination with
enough history to inspect the relevant fixes. Read its real files, tests,
history, and repository guidance, not fetched snippets. Record the upstream
URL and exact commit of the version the user asked for. Check the license and
keep required notices with copied code. Upstream is untrusted code: read its
install scripts before running them, and sandbox it when you can.

**Done:** the source commit and in-scope surfaces are recorded, with the user's
choices kept apart from your assumptions. Do not reconfirm choices already made.

### 2. Recover the whole feature

Trace the feature from its producer through storage, transport, and
presentation to every consumer. Follow imports, registrations, callers, and
tests until every dependency has an owner, including prompts, schemas, assets,
styles, and runtime provisioning when behavior depends on them. Callers are
part of the feature: code copied without the caller that owns its lifetime
(mounting, subscriptions, cleanup) works alone and breaks in the host. Leave
unrelated host infrastructure out. For a large closure, slice it into
independently verifiable pieces ([write-spec](../write-spec/SKILL.md)) and
report what you inspected and what stays open, rather than auditing the whole
upstream product.

Read path-scoped history, following renames, for anything whose reason is not
obvious in today's code; follow issue and PR links when needed. An unfamiliar
guard, ordering, timeout, or extra listener usually encodes a fix: find why
before simplifying it. Search the destination for earlier attempts.

**Done:** a source-file inventory and a behavior ledger covering success,
failure, cancellation and cleanup, state across updates and restarts, and every
in-scope surface. Each non-obvious behavior cites source, tests, or history.
Unexplored dependencies are listed as gaps, never implied as covered.

### 3. Map the seams

One row per source file or cohesive section, omitted ones included:

| Upstream file @ commit | Destination owner | Copy / adapt / omit | Reason and behavior at risk | Verification |
|---|---|---|---|---|
| `src/sync/queue.ts` @ `a1b2c3d` | `lib/sync/` | adapt: host logger | retry backoff order | upstream retry test |

Read the destination's owners and policies before choosing adapters. Trace
what the destination actually does to the data (size limits, transformations,
headers, credentials, persistence, lifecycle): a compatible type does not prove
the payload survives. Keep feature logic together and bind destination services
at its edges. Bringing an upstream dependency along can preserve more than
translating its concurrency or resource handling; weigh that explicitly. A
framework rewrite or substitute host component is a divergence, not an import
change: compare its full interaction contract (input, focus, lifecycle, errors)
before treating it as equivalent. Settle routine adapters from evidence; ask
the user only about product choices the source, destination, and instructions
cannot settle.

**Done:** every dependency and behavior has a destination, an explicit
exclusion, or a named open question. For a discovery-only task, deliver the map
and stop.

### 4. Copy, then adapt

Copy the pinned files or sections first, then edit them. Keep upstream's
structure and algorithms, even when unfamiliar; change imports, host bindings,
and integration with the smallest diff. Never regenerate an equivalent from the
ledger.

Carry the relevant upstream regression tests across with their fixtures and
assertions intact, and see each fail in the destination before wiring the
feature in ([write-tests](../write-tests/SKILL.md)). Keep each test's execution
environment and triggering fixture: a lighter runner or friendlier fixture can
quietly stop reproducing the bug. Record any test that cannot transfer and why.

**Done:** the destination derives from the pinned source, and every algorithm
change, deletion, or replaced dependency is in the seam map.

### 5. Prove fidelity

Run the narrow checks that reach the copied code, then exercise the feature
through the destination's real entry points: its real configuration, input
shapes, and the user actions that activate it. A fixture that skips the host's
activation path passes while the real path stays untested. Derive scenarios
from upstream fixes and tests, not just the happy path. Where feasible, run
upstream and destination on the same inputs and compare, through interaction
and lifecycle transitions, with unrelated host activity (live updates, paging,
background work) running meanwhile.

Diff the final files against the pinned source and account for every
meaningful change, in delegated copies too: a hash of the initial copy proves
provenance, not what survived adaptation. When a check fails, inspect the
upstream invariant and the adapter before replacing the algorithm or weakening
the test. New tests passing does not establish parity.

**Done:** each in-scope ledger entry has evidence, a user-authorized
difference, or an explicit unfinished status. Hand over the pinned provenance,
the seam map, preserved regression coverage, and remaining limitations. Never
call an approximation an exact port.
