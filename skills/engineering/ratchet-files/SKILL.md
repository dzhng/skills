---
name: ratchet-files
description: "Ratchet source file size so every file stays small enough for an agent to read whole: find every file over a token budget, split oversized files by concept, and set up the pre-commit ratchet that stops them from growing. Use when a commit is blocked because a file is over the size budget, when asked to find or split oversized/long/god files, when a file you need to change is too large to read in one pass, or when asked to add a file-size limit or hook to a repository."
---

# Ratchet Files

A source file is over budget when it is past what an agent can read in one
pass (8,000 tokens, counted as bytes / 4, unless the repository sets
another). [`scripts/check-file-size.mjs`](scripts/check-file-size.mjs) owns
what counts as source, the budget, the ratchet, and the split rules; run it
with `--help` before anything else.

## Splitting

1. Run the script with `--all` from the repository root, passing the
   repository's `--max-tokens` if its hook sets one. Its list is the backlog.
2. Pick the files to split: the one blocking the work in front of you, or
   with no blocker, the largest ones a change is about to touch.
3. Split each one by the rules the script prints. A seam is a concept the
   file already owns, not a line count; when
   [refactor-clean](../refactor-clean/SKILL.md) is installed, use it to find
   them.
4. Prove the split changed no behaviour with the repository's own checks,
   and commit it alone, before the change that needed the room.

A file whose every split would cost more than it saves (one table or state
machine that only reads whole) may opt out instead. Put
`@ratchet-files-ignore` in a comment within its first 10 lines, in the
file's own comment syntax, followed by why splitting fails:

```js
// @ratchet-files-ignore: one opcode table; split, each half reads without the other.
```

The check then skips the file entirely, even as it grows, so opt out only
after looking for a seam and finding none worth its cost, never to get past a
refusal. Tell the user each file you opt out and why. `--all` counts
opted-out files so they stay visible.

Done when every file you picked is under budget in its own commit, the
behaviour checks pass, and `--all` no longer lists those files.

## Setting up the ratchet

Never install the hook without the user's explicit yes, even when they asked
to set up the repository. Installing it freezes every file already over
budget, so audit first and leave the repository untouched while you do:

1. Copy the script to a scratch directory outside the repository, run
   `npm install --prefix <scratch> linguist-languages` there, and run
   `node <scratch>/check-file-size.mjs --all` from the repository root (Node
   18.3 or later). The script finds the package beside itself when the
   repository lacks it.
2. Ask once, with everything the user is agreeing to: how many files the hook
   would freeze and which are largest, leaving out generated or vendored ones
   you will mark below (name those); the budget, 8,000 tokens unless they want
   another; and which pre-commit runner you will wire it into, including any
   you would add. In a repository without Node tooling, say the check adds
   it.

Once they agree, set up everything the check needs:

- **Script.** The hook runs a copy committed in the repository, so every
  clone runs the same check. If this skill folder is committed in the
  repository, point the hook at its `scripts/check-file-size.mjs`; otherwise
  copy that file to where the repository keeps its tool scripts (`scripts/`
  if it has none). The entries below use `scripts/check-file-size.mjs`;
  substitute the real path.
- **Dependency.** Add `linguist-languages` at an exact version as a dev
  dependency of the repository's root `package.json`, with the package
  manager its lockfile names, or npm if there is none. The check needs Node
  even in a repository written in another language: with no `package.json`,
  create one at the root holding only `"private": true` and what this setup
  adds, and make sure `.gitignore` covers `node_modules/`.
- **Hook.** Run the script on every staged file with `node` (or `bun` where
  the repository already runs its tools with it), appending `--max-tokens N`
  for a budget other than the default. Add it beside the existing entries of
  the pre-commit runner the repository already has:

  | Runner | Where | Entry |
  |---|---|---|
  | lint-staged | its config | `"*": "node scripts/check-file-size.mjs"` |
  | lefthook | `pre-commit.commands` | `run: node scripts/check-file-size.mjs {staged_files}` |
  | pre-commit | `.pre-commit-config.yaml`, `repo: local` | `id: ratchet-files`, `name: source file size`, `entry: node scripts/check-file-size.mjs`, `language: system` |
  | husky or a plain hook | the `pre-commit` script | `git diff --cached --name-only -z \| xargs -0 node scripts/check-file-size.mjs` |

  With no runner, add husky with lint-staged as dev dependencies, run
  `npx husky init`, replace the whole of `.husky/pre-commit` (it starts as
  `npm test`) with `npx lint-staged` or the package manager's equivalent, and
  add the lint-staged entry above. Husky installs the hook on each clone's
  package install.
- **Exclusions.** Mark generated and vendored code `linguist-generated` or
  `linguist-vendored` in `.gitattributes` instead of adding skip lists. The
  script reads the staged `.gitattributes`, so stage it before rerunning
  `--all`.
- **Docs.** Document the budget, the opt-out pragma, and that a clone needs a
  package install for the hook, where the repository documents its other
  hooks; failing that, in a section of its README, creating one if needed.

Commit the setup through the new hook, without `--no-verify`.

Done when the setup commit passed the hook, and the installed hook refuses
`git commit` both of a staged new source file over the budget (a `.js` file
of more than four bytes per token of budget) and of a line added to a file the audit
listed, printing the split rules. Unstage and discard both probes afterwards.
