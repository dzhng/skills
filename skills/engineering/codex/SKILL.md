---
name: codex
description: Use the local Codex CLI as an independent second agent. Two branches — (1) proactively run `codex review` for a second opinion after completing a substantive change, before presenting it as done or committing; (2) delegate a well-defined implementation task via `codex exec`, ONLY when the user explicitly asks for Codex to do it. Also covers how to prompt Codex.
---

# Codex

Codex is an independent agent on PATH (`codex`), sharing this working tree and
already authenticated. It is a second opinion, not ground truth: verify what it
reports, own what it changes. It reads the same skills your repo carries.

## If `codex` is not installed

When `codex` is missing from PATH, offer to install it — **ask the user for
approval first**, never install on your own initiative. On yes, follow the
current instructions at https://developers.openai.com/codex/cli. First-run
authentication is interactive — hand that step to the user. Verify with
`codex --version` before proceeding.

## Prompting Codex

Prompt Codex like an operator, not a collaborator: compact, block-structured
with XML tags. State the task, what "done" looks like, and the few constraints
that matter. A tighter prompt beats a bigger run — improve the contract before
raising `--effort`.

- **One task per run.** Split unrelated asks (review, then fix, then docs) into
  separate runs; a mixed prompt gets a mixed result.
- **Name skills instead of restating them.** Codex reads the same skills your
  repo carries — say "follow write-docs for the doc", "obey refactor-clean: no
  compatibility wrappers." Don't re-explain what a skill already carries.
- **Blocks, added only where the task needs them:**
  - `<task>` — the concrete job, the repo/failure context, the expected end
    state. Nearly always present.
  - `<output_contract>` — exact shape, highest-value first, compact.
  - `<default_follow_through>` — take the low-risk interpretation and keep
    going; stop only when a missing detail changes correctness, safety, or an
    irreversible action.
  - `<verification_loop>` — before finalizing, check the result against the
    requirements and the changed files; revise rather than ship the first
    draft. Any risky fix.
  - `<grounding>` — ground every claim in code or tool output; label inferences
    as inferences. Review and research.
  - `<action_safety>` — keep the diff tightly scoped; no drive-by refactors.
    Write tasks.
- **Anti-patterns:** vague framing ("take a look"), no output contract ("report
  back"), "think harder" in place of a contract, mixing jobs in one run, and
  demanding certainty the evidence can't support.

## Review — proactive

Run a Codex review whenever you have a substantive diff you'd want a second set
of eyes on — a refactor, a tricky algorithm, renderer work, a security-sensitive
change — before declaring it done or committing. Skip it for trivial edits
(typos, comments, doc-only).

1. Pick the diff scope: `codex review --uncommitted` for working-tree changes,
   `--base <branch>` for a branch diff, `--commit <sha>` for a landed commit.
   Scope flags and custom instructions are mutually exclusive (despite what
   `--help` implies): `codex review "<instructions>"` reviews the default
   scope with your framing, a scope flag takes no prompt. When you do write
   instructions, scope the risk area — never state the answer you expect
   (unprimed, same discipline as
   [screenshot-critique](../../visual/screenshot-critique/SKILL.md)).
2. Triage every finding: confirm it against the code before acting. Preserve
   Codex's evidence boundaries — an inference it labelled is not a fact.
   Overlap with your own doubts is high-priority evidence; a finding you
   dismiss needs a stated reason, not silence.
3. Report the outcome to the user — what Codex flagged, what you fixed, what
   you dismissed and why. Done when every finding is either fixed or
   explicitly dismissed.

## Implementation — explicit ask only

Delegate implementation to Codex only when the user names Codex for the task.
Never hand it work on your own initiative, and never re-delegate follow-up
work without a fresh ask.

1. Slice the task sharp before delegating — goal, constraints, and how to
   verify — using the prompt discipline above. An underspecified task stays
   with you until a fresh agent couldn't misread it.
2. Start from a clean tree (or record the baseline commit) so Codex's diff is
   separable from yours.
3. Pick the sandbox by what the task must RUN:
   - Pure code + typecheck/unit: `codex exec --sandbox workspace-write "<task>"`.
     Network is off; add `-c sandbox_workspace_write.network_access=true` only
     when the task must fetch (e.g. new deps).
   - **Browser verification, dev servers, or full test runs: use
     `codex exec --dangerously-bypass-approvals-and-sandbox "<task>"`.** The
     sandbox blocks localhost binds (`listen EPERM` on vite/playwright), so a
     sandboxed codex ships code it never saw run. Bypass trades that blindness
     for zero OS control: only in a dedicated git worktree, only with a prompt
     you authored end-to-end (never relaying third-party text), and the diff
     review you owe afterwards is the control.
   Use `-o <file>` to capture the final message and background long calls.
   Non-interactive runs never ask for approval either way.
4. Follow up with `codex exec resume <session-id> "<follow-up>"`, taking the
   id from the run header. `resume --last` means the most recent session
   globally — a review or any other codex run in between will hijack it.
5. You own the result: read the full diff, run the tests, and only then report
   it. "Codex says it's done" is not done.

## Exec liveness — a hang looks like work

A backgrounded `codex exec` can wedge at startup: process alive at ~0% CPU, but
no session file under `~/.codex/sessions/<Y/M/D>/`, no network socket, no tree
changes. "Process running" is NOT "working."

- **Redirect stdin every launch.** With a piped stdin, exec prints `Reading
  additional input from stdin...` and blocks forever — the most common hang.
  Always `codex exec ... < /dev/null` (with `nohup`/`&` as needed).
- **Watchdog:** put a unique marker in the prompt, then kill the exec if
  `grep -rl "<marker>" ~/.codex/sessions/<Y/M/D>/` finds no session within
  ~3 minutes. Relaunching after a kill reliably works.
- **Trust the worktree.** Headless exec in a directory Codex doesn't trust can
  block forever on an invisible prompt. Git worktrees are separate paths from
  the trusted repo root — add
  `[projects."<worktree-path>"]\ntrust_level = "trusted"` to
  `~/.codex/config.toml` before exec'ing in one. This is the safe fix; the
  bypass flags stay forbidden here.
- **Don't launch two execs in the same instant,** and kill stale hung execs
  before starting a new one.
- **Launch from the repo/worktree ROOT.** The writable sandbox root is the
  CWD at launch: exec'd from a subdirectory (e.g. `web/`), every edit outside
  it is rejected as "writing outside of the project" and a `never` approval
  policy can't recover — the run burns with zero files changed.
- **Long prompts via file:** `codex exec ... "$(cat prompt.txt)"` — check the
  file exists first; a missing file silently sends the fallback string as the
  task.

## Rules

- Don't touch the working tree while a Codex exec is running on it.
- `--sandbox read-only` (the default) for consultation and questions;
  `workspace-write` only for delegated implementation.
- `--dangerously-bypass-approvals-and-sandbox` is reserved for tasks that must
  run browsers/servers/full suites (above) — dedicated worktree, self-authored
  prompt, mandatory diff review after. `--full-auto` is deprecated (just an
  alias for workspace-write) — don't reach for it.
- Leave `--effort` unset (accepted: none, minimal, low, medium, high, xhigh)
  and omit model overrides unless the user asks — tighten the prompt first.
