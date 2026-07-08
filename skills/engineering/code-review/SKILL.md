---
name: code-review
description: Review changed code for naming, stale references, unnecessary complexity, and comment quality. Use after completing implementation work, before committing, or when the user asks to review or audit code.
allowed-tools: Read Grep Glob Bash
---

# Code Review

Review the diff or specified files against these principles.

## 1. Names must reflect current reality

- Variable and function names should describe what they ARE, not what they used to be.
- If the underlying mechanism changed (e.g. FUSE → NFS), all related names must update.
- Ask: would a new reader be confused by this name?

## 2. No stale references

- After refactoring, grep for references to the old approach — dead detection logic, abandoned feature flags, comments mentioning removed code.
- If something was tried and reverted, remove ALL traces. The codebase should look like the current approach was always the plan.

## 3. Simplify detection and guard logic

- A gate like "can this feature run" should check the ONE thing that actually matters.
- Don't chain fallback detections (binary exists OR source exists OR toolchain exists) when one check covers it.

## 4. Comments document WHY, not WHAT HAPPENED

- **Keep:** non-obvious technical discoveries, platform quirks, "if you remove this, X breaks because Y."
  - Good: `// com.apple.provenance causes SIGKILL when spawned as child process`
  - Good: `// umount while server is alive panics the macOS NFS client`
  - Good: `// NFS client uses cookie verifier to decide if cached readdir is valid`
- **Remove:** narrative of what was tried, what was abandoned, what was renamed.
  - Bad: `// We changed this from cp to cat to work around the provenance issue`
  - Bad: `// Wrapper added because FUSE-T was zero-padding (see commit abc123)`
  - Bad: `// Previously this was called fuseAvailable but we renamed it`
- **Remove:** comments that just restate what the code does without adding reasoning.
- Often no comment is needed at all.

## 5. Separate install-time from runtime

- Install scripts set up prerequisites (toolchains, system deps).
- Runtime commands handle compilation, caching, binary management.
- Don't mix these. If the install script is compiling binaries that the runtime also compiles, one of them is wrong.

## 6. No intermediary artifacts

- After iterating through multiple approaches, audit for logic that only existed as a stepping stone.
- If a workaround was added for approach A and you switched to approach B, remove the workaround even if it's harmless.
- The code should read as if written from scratch by someone who already knew the right answer.

## 7. Tighten guarantees after changes

- When a change makes something guaranteed (e.g. a variable is now always set, a file is always created, a function always returns), audit downstream code that still guards against the old "maybe" state.
- Redundant null checks, fallback defaults, and `if (x)` guards on values that can no longer be null are misleading — they imply a possibility that doesn't exist.
- Prefer `const` over `let` when reassignment is no longer needed.
- **Never suppress a signal — fix the root cause.** `_` prefix on unused params, `// @ts-ignore`, `eslint-disable`, `as any` — these all hide real issues. If a parameter is unused, DELETE it and cascade the removal to every caller. If a type doesn't match, fix the type. Run the checker, fix every error, repeat. Mechanical changes across many files is exactly what an agent excels at — there is no "too many callers."

## 8. When changes are tangled, start clean

- If a file has been through 3+ rounds of conflicting edits, `git restore` it and re-apply only what's needed.
- Don't try to surgically fix a mess — starting clean is faster and less error-prone.

## 9. Tests must verify actual values, not just collection sizes

- When testing deduplication, normalization, or idempotent operations, assert on the **stored value**, not just `toHaveLength(1)`.
- Length alone doesn't prove the logic worked — a broken normalizer could silently drop one input, or store two different normalized forms that happen to match.
- Pattern: add value in format A, re-add in format B, then assert both that the count is 1 AND that the stored value equals the expected normalized form.
- Bad: `expect(data.phones).toHaveLength(1)` — passes even if normalization is broken
- Good: `expect(data.phones).toHaveLength(1); expect(data.phones[0]).toBe('+12125551234')` — proves normalization recognized both formats

## 10. No thin wrappers or re-export-only modules

- If a module only forwards another package's functions or types, delete it and import the original package directly.
- Do not preserve local compatibility shims for scaffold code or unshipped branch work. Replace the scaffold outright.
- Re-export barrels are not useful unless they define a real public boundary with project-specific semantics. Avoid creating files whose only job is `export * from ...`.
- Prefer using the upstream API name directly over inventing local aliases like `discoverAll()` for `loadSkills()`.

## 11. Extract only around real ownership boundaries

- Do not split files just to reduce line count. A new file should own a coherent responsibility that a reader can name.
- Extract modules when they concentrate related policy, state transitions, resource handling, or domain-specific behavior.
- Avoid moving one-off helper functions into a new file if the caller still needs to understand all the details to use them.
- A good split usually reduces import pressure in the original file because dependencies move with the responsibility they serve.
- If extraction increases total indirection without clarifying ownership, keep the code local.

## 12. Decouple tests from implementation — drive the system end-to-end

The most valuable test suite is the one most decoupled from the implementation it covers. Decoupled to the point where you exercise the backend by driving the frontend, and exercise a module by going through the same entry point a user goes through. A test that pokes at internals freezes the internals; a test that drives the public surface frees you to refactor everything underneath.

- **Prefer the outermost entry point that still gives a fast, deterministic signal.** CLI binary > top-level exported function > internal helper > private method. If the CLI is what users invoke, write the test against the CLI. If a TUI is what users see, drive it through the same input pipeline real keystrokes hit, and assert on the rendered frame, not on intermediate state.
- **Test behavior, not structure.** Assert on observable outcomes — exit codes, stdout, rendered output, files on disk, HTTP responses, persisted rows. Do not assert on which functions were called, in what order, with which intermediate shapes. Those are implementation details that should be free to change.
- **A passing test should mean a real user gets the right result.** If a test can pass while the production path is broken, the test is wired wrong. Common smells: stubbing the thing under test, bypassing the router/dispatcher/parser, hand-constructing internal events that production would have built from input.
- **Harnesses must wire the system the way production wires it.** Optional inputs that are always set in practice are part of the contract — pass equivalents in the harness (e.g. a settled status stream, the modal config, the same env vars). If you found a bug only by running against a real environment, the harness skipped something production sets; fix the harness so the next regression in the same shape is caught by the test suite, not by a user.
- **Coupled tests are a refactor tax.** When renaming an internal function or moving a module breaks dozens of tests without changing any user-visible behavior, the suite is testing the wrong layer. Rewrite those tests against the outer surface and delete the brittle ones.
- **Reserve unit tests for genuinely tricky pure logic** — parsers, normalizers, schedulers, state machines with subtle invariants. Everything else earns more value as an integration or end-to-end test.

## 13. A failing check can be a toolchain defect, not a code defect

Before hand-writing a type, adding a cast, pinning a value, or restructuring code to make a checker (type-checker, compiler, linter, test runner, build) pass, confirm the failure is a CODE defect and not a toolchain/environment artifact. Patching code to satisfy a broken or mismatched tool is a workaround that masks the real problem — the never-suppress-a-signal rule, one level up.

- **Reproduce under the exact toolchain that reports the failure** — the CI/deploy version and config, not just your local one. A green local check proves nothing if it ran a different version: a pinned prerelease, a preview build, or version drift between your machine and CI can pass locally and fail in CI on identical source (or the reverse).
- **If the same source passes under the real/pinned tool, the code is correct** — the fix belongs in the toolchain (pin the version, fix the config), not the code. When the output is ambiguous, probe the tool directly — force it to print the value, type, or error it actually computed — instead of guessing at the cause.
- **Keep local == CI.** Confirm the checks that gate merge/deploy run the same toolchain the deploy runs; version drift makes every green check suspect, and "it passed locally" stops being evidence the deploy will.

## Your task

Review: $ARGUMENTS

If no arguments given, review `git diff --staged` or `git diff` (unstaged changes).

For each issue found, cite the file and line number. Group by category. End with a clean/not-clean verdict.
