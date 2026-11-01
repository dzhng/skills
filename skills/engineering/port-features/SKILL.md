---
name: port-features
description: Port a feature from an existing repository by copying its actual code and editing the copy, so its bug fixes and behavioral nuances survive. Use when asked to copy or port an existing feature (especially an exact copy), when moving one into a different framework or host, or when a previous reimplementation missed upstream behavior.
---

# Port Features

Upstream code is the spec. Every guard, ordering, timeout, and odd branch in it
may be a bug fix someone already paid for. A rewrite from your understanding of
the feature drops the ones you didn't notice.

1. **Start from the code.** Get a local checkout of upstream with its history,
   pin the exact commit, and read the feature's real files, not a screenshot,
   summary, or fetched snippet. Follow imports and callers until you know which
   files make up the feature.
2. **Read the history.** Read path-scoped `git log`, following renames, for
   those files, and read the fixes. Before changing or dropping anything that
   looks unnecessary, find out from history why it is there.
3. **Copy, then edit.** Copy the exact files, with their tests, into the
   destination first. Then delete what the destination does not need and change
   imports and host bindings. Keep upstream's structure and algorithms even
   where you would have written them differently. Never write your own version
   in their place.
4. **Diff back.** Diff the result against the pinned source and justify every
   change. When a carried-over test fails, fix the adapter before touching the
   algorithm or the test.

Done when the destination is the pinned upstream code plus a diff you can
account for, and the handover names the upstream commit and every deliberate
difference. Never call a rewrite a port.
