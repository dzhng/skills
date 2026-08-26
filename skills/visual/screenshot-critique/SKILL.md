---
name: screenshot-critique
description: Use the unprimed sub agent as a second set of eyes before accepting visual work — MANDATORY before declaring any user-reported visual bug fixed or claiming a visual change verified; primed eyes pass defects fresh eyes catch.
---

# Screenshot Critique

Use an unprimed sub-agent as a second set of eyes before accepting visual work.
This is for visual defects, not pixel metrics; pair it with
`compare-screenshots` when you also need numbers — including on a single shot
with nothing to compare against, whose scene metrics say whether the frame has
any content in it at all.

## Workflow

1. Capture or locate the exact PNGs/GIF frames under review.
2. Create tight 2x-4x crops for every key feature under judgment, plus the full
   screenshot for context. Crop selected units, city/town stacks, flags/poles,
   shadows, selection rings, labels/icons, roads, terrain features, water, and
   any artifact-prone area. If the complaint is about "too faint", "wrong
   order", or "not in perspective", the crop is mandatory.
3. Spawn one fresh explorer with `fork_context: false`; pass only the full
   images, the crops, and a short neutral task. Do not include the main thread
   history, implementation details, or expected answer.
4. Ask for concrete visible defects with confidence levels. Name likely risk
   categories: unit/prop depth ordering, layering, shadows, selection-marker
   contrast, ground-plane perspective, flag/pole attachment, label style and
   icon readability, blur, scale, lighting, artifacts, missing models, terrain
   feature readability, roads, water, and overall scan readability.
5. Run the returned critique through `scripts/receipts.mjs`. Every number it
   flags is a claim the critique cannot support; strike those claims or
   re-measure them yourself before any of them reach a decision.
6. Compare the sub-agent's critique against your own inspection. Treat overlap
   as high-priority evidence. Treat novel high-confidence findings as bugs to
   inspect, not as taste notes to dismiss.
7. Record actionable findings in the spec, visual report, or next task plan
   before claiming the screenshot is accepted.

## Sub-Agent Prompt

Use this shape, replacing the bracketed surface and attaching local images:

```text
Fresh visual critique task. You have no project backstory and should only
inspect the supplied screenshots and crops. First inspect the full screenshot
for context, then inspect each crop at zoomed scale. Look for concrete
visual/layout defects in [surface], especially unit/prop depth ordering,
layering, shadows, selection-marker contrast, ground-plane perspective,
flag/pole attachment, label style/icons, blur, scale, lighting, artifacts,
missing models, terrain feature readability, roads, water, and scan
readability. Do not assume these are correct. Return a concise list of issues
you can see, with confidence and whether the issue is visible in the full image,
the crop, or both.

Describe what you see in words. You are looking at these images, not measuring
them, so state no pixel value, luminance, percentage, ratio, count, or offset
unless you ran a command that produced it and you quote that command and its
output beside the number. "The hem reads clearly darker than the floor beside
it" is a finding; "44.0 versus 33.6" without a receipt is a fabrication. The
same goes for files: name no artifact you did not create with a tool you
actually have.
```

Spawn config:

- `agent_type`: `explorer`
- `fork_context`: `false`
- attach screenshots as `local_image` items
- omit model overrides unless the user explicitly requests one
- grant a measurement tool whenever you want numbers back — see Receipts

## Receipts

A number in a critique is a **receipt or a guess**, and the two are
indistinguishable once they are written down. An agent handed images and asked
for defects will answer in whatever register the question was posed in: ask it
how much darker the hem is and it returns a luminance mean, because that is
what the answer is shaped like — not because it measured anything. Sometimes
the estimate lands close and sometimes it inverts the finding; nothing in the
report tells you which, and it reads as the strongest evidence there precisely
because it is numeric. The same reflex names the crops and dumps it says it
wrote.

- **Match the tool surface to the output contract.** Before spawning, read your
  own prompt and ask which tool produces each claim you demanded. A judge with
  images and no shell can report what it sees and nothing else. If you want
  measurements, grant the tool that measures and name it in the prompt;
  otherwise stop asking for them.
- **A number without its command is not a finding.** Every quantity must arrive
  with the command that produced it and that command's output, close enough to
  read together. Findings that fail this are struck, not discounted.
- **Verify, don't trust the eye of the verifier.** Run `scripts/receipts.mjs`
  over the returned report — `node scripts/receipts.mjs <report.md>` — before
  you read the findings, so an unsupported number never gets to be persuasive
  first. It exits nonzero and prints each unbacked quantity with its line.
  `scripts/receipts.eval.mjs` is its own eval, over reports written in the eval
  whose right answer is known by construction, both directions pinned: run it
  after changing the checker, and never widen what counts as a receipt to make
  a failing case pass.
- **Ordinal words are still findings; numbers are not.** "Clearly darker",
  "roughly a third of the panel", "the left edge is cut off" are what an eye can
  honestly report. Push the critique toward that register rather than trying to
  make its arithmetic more careful.
- **The measured pass is a separate run.** When the words justify numbers, take
  the measurement yourself with `compare-screenshots`, or re-run the critic with
  a shell and this same receipt rule. Never repair a report by asking its author
  to double-check its own figures.

## Rules

- **Mandatory before "fixed":** never declare a user-reported visual bug fixed
  on your own inspection — your eyes are primed by the fix you just made. Run
  the unprimed critique on the candidate shot first; "mild residue" you are
  tempted to wave through is exactly what it exists to catch. (Recorded
  failure: a "fixed" sky that an unprimed agent identified as the terrain
  mesh's underside filling the entire sky region.)
- **Reproduce the reporter's framing.** When the user supplied a screenshot,
  the critique must include a capture at that framing (same camera/zoom/spot,
  or as close as reproducible) — a defect that lives at their framing can be
  invisible at yours. Your chosen probe framing is a supplement, never the
  substitute.
- **Prove the change is real before critiquing it.** Byte/pixel-diff the
  candidate against the pre-change baseline first: a critique of an unchanged
  image "verifies" a no-op. (Recorded failure: a palette pass that never
  reached the production render path — before/after were byte-identical and
  only the diff caught it.)
- **Hand over the complete capture set, never a curated one.** Every state you
  captured, every viewport, desktop and mobile. Choosing which shots to show is
  the same bias the fresh pass exists to remove: you will pick the ones you
  already believe are fine, and the weak state is exactly the one that gets
  left out. If a state is hard to reach by hand, drive it deterministically and
  capture it rather than omitting it.
- **When no sub-agent is available, argue the other side yourself.** For each
  feature under judgment, write one sentence making the strongest case that it
  is broken, citing only what is visible in the shot — then decide. Writing the
  case first is what makes it adversarial; deciding first and justifying after
  is the primed inspection this skill exists to replace. Include those
  sentences in the report so the reasoning is reviewable.
- Never tell the sub-agent the defect you expect it to find.
- Use the current candidate screenshot, not a stale report or baseline image.
- Do not rely on full-page report scale for small visual features. Attach
  crops around the exact features a player would read: selected army/city,
  label/icon clusters, flags, shadows, ring edges, road crossings, terrain
  feature patches, water labels, and suspicious debug/artifact regions.
- If the sub-agent says a crop reveals an issue that is weak or invisible in
  the full shot, treat it as a real usability defect when the player can zoom
  to that scale in-game.
- For animation, attach a short set of deterministic still frames first; GIFs
  are useful for human review, but still frames make specific defects easier to
  name.
- A passing sub-agent critique does not replace direct inspection by the main
  agent or screenshot regression gates.
- If the sub-agent catches an issue the main agent missed, add that failure mode
  to the relevant feature plan or visual checklist immediately.
