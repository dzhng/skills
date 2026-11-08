---
name: find-overengineering
description: Find overengineering — checks, guards, compatibility branches and options that protect nothing — and cut it, starting with any check that can stop a component from receiving its own fix. Use when reviewing a diff or subsystem for unnecessary machinery, when an old client, gateway or worker rejects what a newer server sends, or when asked whether a validation, allowlist, version field or fallback is needed.
---

# Find Overengineering

Hunt for machinery that earns nothing: a line whose deletion breaks no real
outcome for any real caller. The worst kind is not merely dead weight — it is
**second-guessing**: a consumer re-checking what a trusted producer already
decides, which turns ordinary version skew into an outage.

## Workflow

1. **List the machinery in scope.** Every validator, allowlist, enum of
   accepted values, exact count, version field, capability flag, fallback,
   retry, option and wrapper in the diff or area. Done when each has a line.
2. **Name its writer.** For each check, find who produces the data it checks.
   If the producer is our own code, or a party the consumer already trusts
   with more than the check protects (it ships the code the consumer runs, it
   owns the database), the check guards nothing — unless the data crossed a real
   boundary on the way (see Rules). Mark the rest for deletion.
3. **Run the skew test** on every check at a boundary between components that
   deploy separately (server and client, API and VM agent, app and CLI): when
   the producer ships something new and valid, does an older consumer reject
   it? Then ask whether the rejected message is also the channel that would
   deliver the consumer's update. If it is, that is the most severe finding: the
   fleet can never heal itself. Report it before anything else.
4. **Run the deletion test** on everything else: what breaks, for whom, if
   this line is gone? No concrete answer means delete it. A hypothetical
   caller, "it could be inconsistent" or "defense in depth" is not an answer.
5. **Cut or plan.** Delete what only the current change has shipped. Where an
   already-deployed consumer carries the check, removing it from the new code
   is not enough: old copies still enforce it. Plan the smallest bridge that
   gets old consumers onto the new code, give it a removal condition, and
   confirm it with the user if it changes a wire contract.

## Rules

- The bar is not "is this correct?" — defensive code usually is. The bar is
  "what does it protect, from whom?" (refactor-clean's *every line is debt*.)
- Keep checks that guard a real boundary: untrusted input, a user, an external
  API, data written by someone we don't control — and our own bytes after they
  cross a network, disk or platform that can corrupt or rewrite them (a hash on
  a download, a check that a deployed file is still what the build wrote). Say
  which boundary in the report, so the keep is as justified as the cut.
- Tells: a consumer pinning the producer's exact inventory, count or order; a
  test whose only job is to prove that pinning; a guard only a hand-edited
  database could trip; a compatibility branch no named consumer needs; an
  option with one caller.
- Report each finding as the problem and its tell, with the file. Small cuts
  happen in the pass; anything that changes a contract between deployed
  components waits for the user.
