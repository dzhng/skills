---
name: handoff-spec
description: Hand a spec that is mid-implementation to another machine or another agent.
disable-model-invocation: true
---

# Handoff Spec

I'm moving this spec's work to another machine or another agent. The next
session starts **cold**: it has the repository and nothing else. It has none
of this conversation, none of this machine's files and none of your memory.
Leave the spec so that session can carry on as if it had been here.

Collect what this session knows and the spec doesn't yet say, from the
discussion and from the work itself, and put it in the spec:

- what is done, what is half-done and exactly where it stopped, and what is
  next;
- what I decided or corrected along the way, and how I want the work done;
- calls you made where I was silent, and anything still waiting on me;
- what is known to be broken or unverified, with what you already found out
  about it;
- anything that lives only on this machine and the next session needs:
  unpushed branches, uncommitted work, scratch results worth keeping.

Write it into the spec's own handoff, in place: the spec stays one current
account, not a transcript with a new note on top. Then push, so everything
the spec points at exists on the remote.

Done when a fresh agent, given only the repository, would pick the same next
step you would, and would not repeat a question I've already answered.
