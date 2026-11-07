---
name: port-features
description: Port a feature from an existing repository by copying its actual code and editing the copy, so its bug fixes and behavioral nuances survive, then naturalizing it to this project's names and environment. Use when asked to copy or port an existing feature (especially an exact copy), when moving one into a different framework or host, or when a previous reimplementation missed upstream behavior.
---

# Port Features

Upstream code is the spec for the feature's behavior. Every guard, ordering,
timeout, and odd branch in it may be a bug fix someone already paid for. A
rewrite from your understanding of the feature drops the ones you didn't notice.

A port is not a copy, though. The result must read as if this project wrote it:
the feature is *naturalized*, in its names and in the environment it runs in.

1. **Start from the code.** Get a local checkout of upstream with its history,
   pin the exact commit, and read the feature's real files, not a screenshot,
   summary, or fetched snippet. Follow imports and callers until you know which
   files make up the feature.
2. **Read the history.** Read path-scoped `git log`, following renames, for
   those files, and read the fixes. For each piece that looks unnecessary, find
   out from history why it is there, and sort it: does it serve the feature, or
   the place upstream runs (its platforms, its install story, its users'
   machines)?
3. **Copy, then edit.** Copy the exact files, with their tests, into the
   destination first. Keep upstream's structure and algorithms for the feature
   itself, even where you would have written them differently. Never write your
   own version in their place.
4. **Naturalize the names.** Convert upstream's product name and naming scheme
   to this project's everywhere: identifiers, protocol strings, event and
   storage keys, CSS ids, env vars, file names, comments, tests, and docs. Use
   the destination's existing names for a concept that already has an owner
   here. Done when a case-insensitive search for upstream's names finds them
   only in the license notice.
5. **Naturalize the environment.** Map what upstream's host gave or lacked onto
   what this project's host gives. Logic that existed only because of
   upstream's environment is deleted, not ported: a fallback for a platform we
   never run on, provisioning for something our machines already have, a
   workaround for a constraint we don't share. Touchstone: code that downloads
   and installs a tool on first use, written for user desktops, ported onto
   machines whose image already ships that tool. When unsure whether the
   destination really has it, measure on the real host instead of keeping the
   machinery.
6. **Diff back.** Diff the result against the pinned source and justify every
   change as a rename, a host binding, or an environment deletion. When a
   carried-over test fails, fix the adapter before touching the algorithm or
   the test.

## Rules

- Attribution lives in the repository's single third-party notices file, which
  carries the upstream license and lists the ported paths. No per-file license
  headers, no copied license files, no "ported from" comments.
- Names and environment change; feature behavior does not. A difference in what
  the feature does for the user is a decision to raise, not a port edit.
- Never call a rewrite a port.

Done when the destination is the pinned upstream feature, renamed and fitted to
this project, plus a diff you can account for. The handover names the upstream
commit and every deliberate difference.
