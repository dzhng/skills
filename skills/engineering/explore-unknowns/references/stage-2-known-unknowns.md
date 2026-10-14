# Stage 2 — Known Unknowns: The Questions You Can Name

The questions that must be answered but aren't yet. You know the question;
the answer lives with the user or in the territory.

## Procedure

1. Inventory the questions the task cannot proceed without, and disclose the
   queue ("still queued after this: …") so the user sees how much walk
   remains.
2. Before asking another question, apply the main skill's preference
   checkpoint when due. Otherwise resolve them **one at a time, highest
   architectural blast radius first** — never a wall of questions. Give your
   recommended answer with each, as lettered options the user can answer in
   a few characters, so they react
   rather than compose.
3. Close every question one of four ways:
   - **Answered by the user.**
   - **Answered by the agent on the user's behalf** — only under the
     preference checkpoint's opt-in and disclosure rules.
   - **Answered by the territory** — go read it instead of asking, then show
     the user the question and the found answer. A question closed off-screen
     isn't closed.
   - **Recorded as OPEN on the map** — explicitly deferred, with what
     unblocks it.

**Done when** every named question is closed one of those ways, in front of
the user. Announce the stage closed (a small decisions table recaps it well)
before crossing into stage 3.

## Techniques

- **The interview** — the stage's default mechanic: one question per turn,
  ordered by blast radius, each with a recommendation; end with a decisions
  table.
- **Brainstorm the intervention** — when the question is "which solution?":
  search the codebase first, then plot ~10 interventions from
  ship-this-afternoon to quarter-long bet, each grounded in what actually
  exists (half-built features behind flags and disconnected wiring are the
  cheapest wins); resonate-checkboxes assemble the reply.
- **Point at a reference** — when an existing implementation encodes the
  wanted behavior: produce a semantics map proving you understood it — what
  it does with excerpts, how each behavior maps to the target stack, every
  place the port cannot be literal. Nothing gets ported until sign-off.
