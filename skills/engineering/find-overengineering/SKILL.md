---
name: find-overengineering
description: Find overengineering — checks, guards, fallbacks, compatibility branches and options that protect nothing — and cut it, starting with any check that can stop a component from receiving its own fix. Use when reviewing a diff or subsystem for unnecessary machinery, when an old client, gateway or worker rejects what a newer server sends, or when asked whether a validation, allowlist, version field or fallback is needed.
---

# Find Overengineering

Cut machinery whose deletion breaks no real outcome for any real caller. Models over-build in the same places:

- re-validating what our own code, or a producer the consumer already trusts, just wrote;
- version fields, capability flags and compatibility branches no named consumer needs;
- fallbacks, retries and options for failures or callers that don't exist;
- guards only a hand-edited database could trip. "Defense in depth" and "it could be inconsistent" are not reasons.

The worst is a consumer pinning a separately deployed producer's exact output (its inventory, count, order, or a strict response parser). When the producer ships something new and valid, older consumers reject it, and if that is the channel that delivers their update, the fleet can never heal. Report that first.

Keep checks at a real boundary: untrusted input, users, external APIs, and our own bytes after a network, disk or platform could corrupt them. Make small cuts right away; confirm with the user before changing a contract between deployed components, where old copies still enforce the check.
