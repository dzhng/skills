---
name: claude
description: Use Claude Code as an independent `claude -p` subagent when the user explicitly asks for Claude, wants a second-agent opinion from Claude, or asks to delegate a well-scoped task to Claude. Supports selecting `--model` and thinking/effort level with defaults of `opus` and `high`.
---

# Claude

Claude Code is an independent agent on PATH (`claude`), sharing this working
tree and already authenticated. Use it as a second opinion or delegated worker,
not as ground truth: verify its claims, own any changes, and keep its task
contract narrow.

## Defaults

Use `claude -p --model opus --effort high` unless the user or task calls for a
different model or thinking level.

- **Model:** accept aliases such as `opus`, `sonnet`, or `fable`, or a full
  model name. Default `opus`.
- **Thinking level:** pass Claude Code's `--effort` flag. Valid levels are
  `low`, `medium`, `high`, `xhigh`, and `max`. Default `high`.
- **Cost guard:** for exploratory asks, add `--max-budget-usd <amount>` when
  the user gives a budget or the task is likely to sprawl.

Example:

```sh
claude -p --model opus --effort high "<prompt>"
```

## Prompting Claude

Prompt Claude like an operator: compact, block-structured, and explicit about
the artifact you need. A sharper contract beats higher effort.

- **One task per run.** Split review, implementation, and docs into separate
  prompts.
- **Name repo skills when relevant.** Claude can read repo files; say "follow
  write-docs for the doc" or "obey refactor-clean: no compatibility wrappers"
  instead of pasting those skills into the prompt.
- **Blocks, added only where useful:**
  - `<task>` — the concrete job, context, and expected end state.
  - `<output_contract>` — exact response shape, highest-value first.
  - `<default_follow_through>` — take low-risk interpretations and continue;
    stop only when a missing detail changes correctness, safety, or an
    irreversible action.
  - `<verification_loop>` — inspect the result against requirements and revise
    before finalizing.
  - `<grounding>` — ground every claim in code or tool output; label
    inferences.
  - `<action_safety>` — keep the diff tightly scoped; no drive-by refactors.
- **Anti-patterns:** vague prompts, mixed jobs, no output contract, asking it
  to "think harder" instead of tightening the task, and accepting its answer
  without checking the evidence.

## Consultation

Use Claude for consultation when the user asks for Claude's view or when a
second-agent read would materially reduce risk. Keep it read-oriented unless
the user explicitly asks it to edit.

1. Ask for evidence, not vibes: require file paths, observed behavior, command
   output, or labelled inferences.
2. Prefer a read-only tool surface for reviews:
   `--tools "Read,Grep,Glob,Bash" --permission-mode dontAsk`.
3. Triage every finding against the code before acting. Report what Claude
   flagged, what you accepted, and what you dismissed.

## Implementation — explicit ask only

Delegate implementation to Claude only when the user names Claude for the task.
Never hand it work on your own initiative, and never re-delegate follow-up work
without a fresh ask.

1. Slice the task sharply: goal, constraints, allowed scope, and verification.
   An underspecified task stays with you until a fresh agent could not misread
   it.
2. Start from a clean tree or record the baseline commit so Claude's diff is
   separable from yours. Tell Claude to keep scratch files (probes, dumps,
   notes) out of the tree — its diff must contain only the deliverable.
3. Choose permissions by what the task must do:
   - Read/review: `--tools "Read,Grep,Glob,Bash" --permission-mode dontAsk`.
   - Narrow edits: add edit tools and keep the prompt's allowed paths explicit.
   - Broad autonomous work: use `--dangerously-skip-permissions` only in a
     dedicated worktree, with a self-authored prompt and a mandatory diff
     review after.
4. Capture the response with `--output-format text` by default. Use
   `--output-format json` only when the caller needs structured metadata.
5. You own the result: inspect the diff, run the relevant tests, and only then
   report it. "Claude says it's done" is not done.

## Liveness

`claude -p` is a networked, authenticated non-interactive run. If it fails,
classify the failure before retrying.

- Auth failure: do not repair credentials unless the user asks; report the
  blocker. If sandboxed `claude -p` says `Not logged in`, retry once with the
  required approval because local auth can depend on keychain/session access.
- Sandbox/network failure: rerun with the required approval if the command is
  important to the task.
- Long run: prefer `--max-budget-usd` or a narrower prompt before raising
  effort.
- Workspace trust: `-p` skips the interactive trust dialog, so run it only from
  a repo or worktree you intentionally trust.

## Rules

- Use `claude -p --model opus --effort high` as the default invocation.
- Let the user override model and effort in plain language; translate that to
  `--model` and `--effort`.
- Keep Claude's writes out of the working tree unless delegation was explicit.
- Do not touch the same working tree while Claude is making edits.
- Treat Claude output as evidence to verify, not authority to relay.
