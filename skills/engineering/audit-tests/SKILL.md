---
name: audit-tests
description: Audit whether tests earn their maintenance cost and which suite owns each contract. Use when pruning redundant tests, investigating implementation coupling or test-only production hooks, reviewing the value of proposed coverage, or auditing an entire subsystem. Use write-tests to implement the resulting test changes.
---

# Audit Tests

Audit **independent proof**: what bug would escape if this test disappeared?
The result is a map of contracts to their surviving tests, with evidence for
what to keep, repair, combine, or remove. Fewer tests is not the objective;
less maintenance for the same or better confidence is.

[write-tests](../write-tests/SKILL.md) owns how to write and falsify a test.
This skill owns whether that test adds proof and where that proof belongs.
[review](../review/SKILL.md) owns closing out the resulting changes.

## Workflow

1. **Bound the audit.** Read the repository and scoped instructions, then pick
   a production responsibility. Find its tests, fixtures, shared suites, and
   CI selection rules. Record the starting revision, local changes, and test
   results before editing. Distinguish existing failures from checks that
   could not run. For a focused audit, choose a few substantiated candidates;
   for a subsystem sweep, use the completeness rules below.
2. **Trace the claim.** Read each candidate in full, including parameter rows,
   beside the production entry point and the code it reaches. Inspect callers,
   sibling implementations, overlapping coverage, and the history explaining
   why the test exists. Inspect dependency code or types when the claim rests
   on dependency behavior. Write down what the assertions actually detect,
   even when the test's name promises something else.
3. **Record a disposition before editing.** Use the evidence record below.
   Share findings as they become clear; the workflow must not hold back a
   material discovery. An audit-only request ends with this evidence and a
   proposed batch, not with deletions.
4. **Choose the surviving owner.** Look across the records for whole redundant
   layers, not just individual weak assertions. Name the suite that will own
   each contract and every unique case it must absorb. Prefer a real path with
   controlled external dependencies over replaying internal collaborators.
   Another layer earns coverage only for a failure the chosen owner cannot
   expose, such as routing or lifecycle behavior.
5. **Change one coherent boundary.** When implementation is in scope, carry
   unique cases into the surviving suite using [write-tests](../write-tests/SKILL.md)
   before removing their old home. Extend existing cases and fixtures instead
   of cloning setup. Remove newly unneeded test hooks and support code in the
   same batch; verify production consumers before deleting an export, wrapper,
   reset function, global, or injection parameter. Update test discovery and
   CI registration when moving suites.
6. **Prove preservation.** Compare the removed assertions with the survivors,
   looking for lost contracts and assertions that cannot fail for the intended
   reason. Falsify repaired or transferred regression coverage using
   [write-tests](../write-tests/SKILL.md). Isolate temporary production changes,
   restore the original bytes without disturbing other work, and confirm the
   targeted proof passes. Report baseline failures separately; investigate any
   new failures. Run owner and sibling suites, then required repository checks.
   When replacing static checks, exercise the actual command or dry-run whose
   contract they claimed. Keep files stable while a runner reads them.
7. **Close the batch.** Run [review](../review/SKILL.md), then reconcile the
   evidence record with what shipped. Report unresolved failures and unrun
   checks explicitly. A clean smaller suite does not prove removed coverage
   was redundant; the contract map and preservation evidence do.

## Evidence record

For each candidate, record its location and name, actual detectable failure,
reason for existing, production consumers of any supporting hook, and decision:

- **Keep:** identify the independently protected contract. A file move alone
  does not change this decision.
- **Repair:** preserve the contract but replace an assertion that is weak,
  misleading, or attached to the wrong boundary.
- **Combine:** identify the destination suite and the unique cases it must
  prove before the original goes away.
- **Remove:** identify stronger surviving proof, or demonstrate that there is
  no contract to protect. Suspicion of duplication is insufficient.

Include the supporting source/history evidence, cleanup unlocked, risk, and
validation command. Missing evidence stays an open question, not a deletion.

## False confidence

Use these as investigation prompts, not automatic removal rules:

- **Circular evidence.** Expected output comes from the same helper being
  tested; a fixture copies an inventory from production; a test compares a
  value with itself. Find an expectation independent of the implementation.
- **An exercise without a claim.** Executing lines, copying identities, or
  listing exports may raise coverage without detecting a credible defect.
  Determine whether execution itself enforces anything meaningful.
- **The harness does the job.** A mock implements the promised behavior, a
  fixture supplies the acknowledgement or ordering production must generate,
  or a persistence assertion reads a store the real path never writes. Using
  one identical fake for different dependency APIs can hide their differences.
- **The wrong cause goes red.** A negative case hits a different guard or never
  reaches the intended branch. Verify the failing condition, not merely that
  something rejected the input. Check that every parameter row reaches its claim.
- **Declarations posing as behavior.** Source greps, import lists, capability
  flags, and internal call shapes can certify the declaration while the user
  path is broken. Trace the behavior the declaration promises.
- **One proof repeated.** Private helper tests, per-provider replays of shared
  logic, and multiple layers exercising the same regression can all protect
  one contract. Keep distinct transport and lifecycle risks, not copies of the
  same scenario under different filenames.
- **Tests keeping code alive.** A helper or production escape hatch exists only
  because tests call it. Move proof to the real entry point and remove the
  abandoned mechanism; do not replace it with another test-only abstraction.

## What earns retention

Behavior includes compatibility and operational contracts: API and SDK shape,
wire bytes, prompts, defaults, configuration, migrations, storage, security,
platform behavior, generated cross-language agreement, package contents,
release rules, and architectural boundaries. A static assertion can be their
cheapest independent proof. Observable ordering also belongs here.

Ask whether the test survives an internal rename while detecting a broken
external promise. Exact bytes may be essential to a protocol; exact private
identifiers usually are not. Neither slowness nor resemblance to implementation
is sufficient evidence for deletion. Do not add refactor-sensitive coverage
when the real contract can be exercised directly.

An existing failure may be a product defect. Reproduce and investigate it;
never remove a valid claim to make the audit green. Repair in-scope defects
separately, with a failing control and passing fix on the same harness. Record
unrelated defects as follow-ups and keep their coverage.

## Whole-subsystem sweeps

Scale the accounting before scaling the edits:

- Inventory every owned test, including cases in shared suites and integration,
  QA, or live harnesses. Assign each to one production responsibility, even
  when file prefixes disagree. Record baseline outcomes and test/support size.
- Give every declaration a disposition and evidence. A parameter table can
  share one record only if all rows deserve the same decision. Then make a
  second pass across the records to choose surviving suites and retired layers.
- Delegate read-only discovery by responsibility when agents are available.
  Keep edits to shared fixtures under one owner. Each batch must introduce no
  unexplained failures; tracked baseline failures remain visible for repair.
- Use an independent reviewer to compare removed coverage with its new owners.
  Resolve every reported gap with restored proof or source evidence rejecting
  it. Demonstrate that each restored contract catches a deliberate defect.
- If the base advances, inspect new cases in any file being removed and carry
  their contracts forward. Follow the repository's integration policy, then
  rerun the subsystem and required integration checks on the resulting revision.
  Refresh discovery before starting the next batch.

## Done

Hand off the contract map, decisions and reasons, production simplifications,
valuable tests deliberately retained, preservation gaps and their resolution,
and verification actually run. For broad sweeps, include before/after size for
production, tests, and support separately, plus remaining batches and integration
state. Size describes the outcome; it never sets the deletion target. Claim a
complete subsystem audit only when the inventory has no unexamined entries.
