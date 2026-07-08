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

## 14. Identity comes from auth, never from the caller

- Resolve the acting identity — org/tenant/workspace id, user id, actor — from the authenticated request (API key, session, or a verified internal key), never from a caller-supplied argument. A public mutation that reads `actorId`/`orgId` from its args is spoofing surface, not a feature.
- The only exception is a trusted internal call: accept a caller-supplied actor ONLY when a valid internal key is present; otherwise derive it from auth and reject the supplied id.
- To scope to a child inside the authed scope (a specific channel, share, app), take the _child_ id and verify it belongs to the auth-derived parent — don't trust a parallel parent id from the body.

## 15. Public API actions are thin auth + dispatch, not inlined business logic

- A public route authenticates, validates, derives identity, and dispatches to a model function or an internal action that owns the work. Keep that wrapper thin — it is the auth/runtime boundary.
- Don't inline third-party SDK / analytics / email logic into the public boundary because "it's only 3 lines." Push it behind the dispatch.
- In Convex specifically: do NOT add `'use node'` to a file holding many actions just to satisfy one — it forces every action in the file into the Node runtime. Split: auth+dispatch (default runtime) → `services/<thing>.ts` (`'use node'`, owns the SDK call).

## 16. Public endpoints ship at minimum scope

- One route, one item per request. Don't preemptively add `/batch` variants, paginated listings, or filter params before a concrete second caller needs them.
- Inline the schema in the route; don't hoist a 4-line schema into a shared `schemas.ts` "for reuse" when nothing reuses it. Skip body-size caps unless the body is genuinely unbounded.

## 17. Reuse existing types — derive, don't redeclare

- If a type already exists upstream (a schema validator, protocol package, generated client, SDK), use it directly — don't redeclare its shape inline, even partially. Redeclared shapes drift.
- For a variant, derive it: `Pick`/`Omit`/`Partial`/`Parameters`/`ReturnType`/indexed access/`Extract`/`Exclude`; Convex/Zod equivalents `Infer<typeof V>`, `FunctionArgs<typeof api.x.y>`, `z.input/z.output`.
- Bad: `type UserSummary = { id: string; name: string; email: string }` next to an existing `User`. Good: `Pick<User, 'id' | 'name' | 'email'>`.

## 18. Filter at the index, never `take()` + post-filter

- When a list query returns rows from a sub-bucket of a table (active vs. archived, `status === X`), the **index** must do the filtering. Don't `.take(N)` the unfiltered query and `.filter()` in JS for the bucket you want.
- Why it breaks: `.take(N)` returns the N rows at the head of the index's order. If the head is full of the _other_ bucket, the post-filter returns zero even when the bucket has hundreds of older rows. `take(N*2)` only delays the failure.
- Pattern: put the discriminator in an index and use `.withIndex(..., q => q.eq(...))`, or `q.gt(field, 0)` for the "present" bucket (Convex sorts `undefined` before defined values). Same for `.first()`/`.unique()` and "is there any X" probes.

## 19. Never `.collect()` — bound the read with `.take(N)`

- Convex `.collect()` reads every matching row with no upper bound. For anything that accumulates per-tenant over time (sessions, events, ledger rows, audit rows), a query fine on day one eventually pulls thousands of rows on one reactive tick and silently degrades reactivity for the whole client.
- Replace `.collect()` with `.take(N)` where N is a safety ceiling clearly above today's working set (100, 1000) — a cap against pathological data, not a UX paginator. Same for `.withIndex(...).filter(...).collect()`.
- If you genuinely need every row (a migration, admin dump, one-shot maintenance), say so with a comment and run it from a cancellable mutation/action, never a reactive `query`.

## 20. Don't remap rows just to rename or default fields

- Object-literal `.map()`s that copy every field through to rename two or coalesce `undefined → false` are noise, and they drop new columns silently until someone updates the map. If the consumer needs every field, return the row; if a subset, `Pick`/`Omit` or destructure-and-rest. Only rename when the new name materially clarifies; only default when downstream truly can't handle absence.
- Strip storage-only fields (`_id`, `_creationTime`, internal ids) once with a destructure-rest. Good: `return rows.map(({ _id, _creationTime, ...row }) => row)`.

## Your task

Review: $ARGUMENTS

If no arguments given, review `git diff --staged` or `git diff` (unstaged changes).

For each issue found, cite the file and line number. Group by category. End with a clean/not-clean verdict.
