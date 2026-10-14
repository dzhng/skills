# Working in this repo

Read the root readme first: what the product is, how the repo fits together, and how to build and check it. Active plans live with their specs, and each one says what to do next. If a folder you're working in has a readme, read it before continuing. The readmes are written for you.

These are the principles. Commands, flags and paths live with the code that owns them: the readmes, the manifests, and each tool's own usage text.

## Talking to the user

The user is very technical but doesn't read the code day to day. Pointing at code is fine; introduce a variable, function or module briefly the first time you mention it.

Lead with contracts. When work touches an interface between components (<two or three of this product's interfaces>, a module boundary), say what the contract looks like and how it changed before anything else.

Answer routine questions from the evidence. Ask the user only when the answer changes a decision that matters and can't be settled any other way.

## Proving a change

Optimize for iteration speed. The measure is the time to feedback you can trust, not the amount of process you ran.

Run the narrowest check that answers your question: one test, then one file, then one package. That is the proof for everyday work, including a commit, a merge and a push.

**Run everything once, when a spec's implementation is finished.** Running everything is slow and saturates the machine. Until then a change is checked by what it can move: its own tests and the output it touches. That is enough for a commit, a merge, a push and a finished feature. A failure that only the full run finds is fixed at the end; that is cheaper than gating every step.

A change that reaches the whole system does not bring that run forward on its own. While more work is coming, the full run still waits for the end. Run it sooner only when the next piece of work can't be trusted without it.

Every expensive run must answer a question a cheaper one can't. <Name this product's expensive runs>; do only the ones a change can move. Reuse a result that is still valid, and rerun only what a change could have invalidated. Docs and data that no code reads need no run at all.

Write the test first. Before changing behaviour or fixing a bug, invoke <skill: write-tests> and follow its red/green workflow. Test what the product does and how it fails, not how the code is shaped.

A change that shouldn't alter behaviour (a refactor, a performance change) must leave the output unchanged, or be a named decision.

A failure you see is yours to fix, whether or not your change caused it. Fix an unrelated failure in its own commit.

Never loosen a requirement to make a check pass. A narrow pass proves a narrow claim: say what you verified, what you assumed and what is unfinished.

Don't wait on a long run. Start it in the background and keep working. Give it a visible sign of progress and a point where you stop, and never repeat a failure unchanged.

## What people see

Look at the actual output. A passing check is not evidence that something reads well to the person in front of it.

For any visual change:
- get an unprimed second opinion with <skill: screenshot-critique>;
- judge before against after, and our output against references, with <skill: compare-screenshots>;
- show the user with <skill: preview-shots>.

Before changing <the kind of output this product is judged on>, invoke <skill: the project's own skill for it>.

## <The product's own rules>

<The few rules that make this product what it is: what it must always do, what it must never do, and who decides. State each as a plain sentence with its consequence. Delete this section if the product has none.>

Before proposing or changing one of these rules, invoke <skill: the project's own skill for them>.

## One owner per concept

Use what the repo already chose before writing your own. Find the existing owner of a concept before creating another.

Prefer one general rule to a special case, and a simple structure to an abstraction nobody needs yet.

Spend margin on simplicity. When something has room to spare against its budget (frame time, startup, memory, bandwidth), use that room to keep the design simple. Don't add machinery to make a thing faster than it needs to be, and take such machinery out when the margin shows it wasn't needed. When something replaces an old mechanism, delete the old one. When a change exposes a duplicate or a stale owner, invoke <skill: refactor-clean>.

## Parallel work stays cheap

Every parallel checkout is a full copy, and large files, installed dependencies and build output multiply with each one.

- Fetch only the large files your task needs.
- Share what doesn't change between checkouts. Don't make another copy.
- Never share build output between checkouts whose sources differ. They overwrite each other's builds, and the symptom is an error from someone else's change.
- Remove a checkout and its build output when its branch is merged.

## Skills

Skills hold the procedures behind these principles. Load the one that covers your work before you start.

Before changing this file, invoke <skill: audit-agents>.
