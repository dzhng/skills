---
name: refactor-codebase
description: Untangle a whole codebase in one run, so a typical change lands in one place.
disable-model-invocation: true
---

# Refactor Codebase

Refactor this whole codebase until a typical change lands in one place. Treat
this as a goal and run it to the end. If I named an area, start there.

Ask one question of everything: **should these pieces change together?** The
code gets the answer wrong in three ways:

- **Hidden links** — pieces that must change together, where nothing shows it:
  copied logic or values, a module reading state another module sets, one
  feature spread across folders by layer, a call order callers just have to
  know.
- **Needless links** — pieces tied together that change for different reasons:
  callers reaching into internals, stable code importing volatile code, a
  general function with a parameter only one caller understands, a shallow
  module whose interface changes whenever its internals do.
- **Surplus** — pieces with no reason of their own to change: pass-through
  wrappers, extension points and config for things that never vary, dead code.

## Workflow

1. **List every problem before changing anything.** Go through the whole
   codebase and write down each place it gets the question wrong. List every
   **special case** too: an `if` for one value, a parameter for one caller, a
   swallowed exception, a retry or sleep, a disabled test. Each one is a
   requirement the design never accounted for. To reason across all of it at
   once, script a skeleton with the function bodies stripped and a graph of
   what imports what, and use git history as evidence of what really changes
   together. Keep the list in a file so it survives compaction.
2. **Redesign from the list.** Work out the system as if it had known today's
   requirements from the start. Look for the one fix behind several problems;
   it often looks nothing like them. Never patch special cases one by one.
   Write each fix above the problems it removes:

   ```md
   - Make `Dialog` give focus back to whatever had it before it opened.
     - `LogoutDialog` waits 100ms after closing and hopes the input can take focus.
     - `SettingsDialog` sets a global `skipRefocus` flag to stop that refocus.
   - Make every user action one command with a name, a handler and an undo.
     - Toolbar and menu call the same actions, each with its own disabled check.
     - The keymap has a switch with one case per action.
     - The command palette keeps its own action list, missing the newer ones.
     - Undo has a special case for every action.
   ```

   Each fix is one mechanism that lands as one commit. Land nothing until the
   list is only fixes: every problem and special case sits under the fix that
   removes it, or under Kept with the reason the system still needs it.
3. **Land one fix at a time,** each time the one that removes the most of what
   is left; it often makes smaller ones moot. Follow
   [refactor-change](../refactor-change/SKILL.md) for each, then audit its
   diff with [code-review](../code-review/SKILL.md) and fix what it finds.
   Commit each fix on its own with the project's checks passing, and name any
   behavior it changes in the commit message, so a behavior change traces to
   one fix. Tests are the safety net here: leave pruning them to
   [audit-tests](../audit-tests/SKILL.md), afterwards.
4. **Search again.** Have fresh subagents hunt for hidden links, needless
   links, surplus and special cases, and return to step 1 with what they find.

Done when subagents find nothing worth fixing, a typical change lands in one
place, nothing imports anything more volatile than itself, and behavior is the
same as when you started, apart from bugs the refactor fixed. The number of
special cases left is the best measure of how close you are.
