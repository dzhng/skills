---
name: audit-agents
description: Audit or rewrite AGENTS.md so it holds only lasting principles. Run it only when the user asks for it by name; never invoke it on your own.
disable-model-invocation: true
---

# Audit Agents

AGENTS.md is read by everyone who will ever work on the project. Picture the next thousand contributors over the next hundred years: a line belongs only if it is still true, and still changes what they do, after every file, tool and dependency has been replaced.

## Workflow

1. Read the AGENTS.md and the root readme. This is a document audit: run no builds and no tests.
2. Give every line one verdict, using the tests below.
   - **Keep**: a principle that passes every test.
   - **Rephrase**: a lasting lesson worded in today's mechanics, or too vague to act on.
   - **Move**: a detail someone needs. Name the owner it belongs to: a readme, a manifest, a skill or a spec.
   - **Delete**: repetition, history, or a line that changes nothing.
3. Check the shape against the example below.
4. Report the findings, highest impact first. Quote each line, give its verdict and the replacement text, and group repeats. Report no finding you can't quote.
5. Edit only when the user asks for a rewrite. Then start from the example, write the file, and reread it as a newcomer with no history of this session.

## Tests for a line

- **A hundred years.** No commands, flags, paths, file or function names, dependency choices, tuned values, plans, status or bug stories. Keep the lesson and move the mechanics to their owner. The one exception is a pointer to an owner (a readme or a skill), which exists so the detail can live there.
- **A thousand people.** A newcomer can act on it without knowing this session, this author or this month's work.
- **Changes what they do.** Delete a line a capable contributor already follows.
- **Plain and concrete.** A principle is not an abstraction. "Look at the picture" works; "match verification to the claim" doesn't. Prefer a short sentence with its consequence, and one example from the product over a general noun.
- **Iteration speed.** This is the core principle and must be stated outright: optimize the time to feedback you can trust, run the narrowest check that answers the question, and run everything once, when the spec's implementation is finished. Flag any rule that adds process to every loop, puts the full run before a commit, merge, push or finished feature, or names checkpoints for it along the way. The full run comes earlier only when the next piece of work can't be trusted without it. Never trade away a real acceptance requirement for speed.

## Shape

[`assets/example-agents.md`](assets/example-agents.md) is an AGENTS.md any project can adopt, and it owns the section order. Read it before judging the shape or rewriting.

To adopt it, copy it and resolve every `<…>`; none may survive into the project's file.

- `<skill: name>` names a skill from the pack this skill ships in. Replace it with a link to that skill where the project installs it. If the project doesn't have the skill, drop the pointer and keep the principle.
- `<skill: the project's own …>` stands for a skill only this project has. Link it, or delete the sentence.
- Every other `<…>` is filled from the project's readme.

Delete a section the project doesn't need; add one only for a principle that fits nowhere else.
