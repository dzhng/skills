---
name: design-with-images
description: Explore UI and visual design with image generation, then iterate the real implementation against the user-selected concept. Use when brainstorming visual directions, offering mockup variants, or implementing an approved generated design; do not stop at the mockups or the first code approximation.
---

# Design With Images

The deliverable is the working design, visibly matched to the approved reference.
Image generation explores the target; real screenshots prove the implementation.
For an exploration-only request, deliver the options and wait for a selection.

## Workflow

1. **Frame the decision.** Read the relevant design skill and capture the actual
   surface. Pin what may change and what must stay: content, framing, palette,
   interactions and surrounding UI. Keep the original capture.
2. **Generate alternatives.** Use the available image-generation skill/tool with
   that capture as a reference. Produce a small, labelled set of distinct visual
   directions. Show them as concepts, never as screenshots of implemented code.
3. **Freeze the chosen target.** Use an existing approval or delegated design discretion; otherwise obtain
   the user's selection. Preserve the selected image, prompt and provenance in the project's
   reference area. Name its visible requirements: spacing and padding, silhouette,
   typography, opacity, edge softness, hierarchy and placement. Do not substitute
   the prompt's requested properties for what the selected image actually shows.
   Before coding, complete the reference measurements in
   [Reference Landmarks](../compare-screenshots/references/reference-landmarks.md).
4. **Implement the design.** Use the project's real components and visual
   primitives. A generated mockup is not source code, and easy CSS is not evidence
   of fidelity. Preserve intended relationships when implementation constraints
   require a different mechanism. Label generated text errors or invented details
   as artifacts; do not ship them merely to match pixels.
5. **Compare and iterate.** Capture the real implementation at comparable scale,
   framing and state. Run [compare-screenshots](../compare-screenshots/SKILL.md)
   against the **approved concept**, with full context and tight crops of the
   changed features. Complete its boundary/overlap checks: compare each side
   of the effect and any foreground it crosses, not just overall softness and
   spacing. Keep the per-feature pass/fix/uncertain record through handover.
   A before/after code screenshot comparison is supplementary;
   it proves change, not fidelity to the selected design. List the material
   mismatches, fix them in code, recapture and compare again. Continue until each
   intended feature matches or the user explicitly revises the target. Passing
   functional tests, a lower distance score, or "close enough" from memory is
   not a stopping condition. Disclose constraints as soon as they emerge.
6. **Verify and hand over.** Check the real design in its relevant states and
   sizes, including crowded and low-contrast cases. Use
   [screenshot-critique](../screenshot-critique/SKILL.md) for an unprimed review;
   show the approved reference beside the actual result, clearly labelled, using
   [preview-shots](../preview-shots/SKILL.md) where available. Resolve material
   feedback through the same comparison loop before claiming completion or
   publishing. Stabilize this visual gate before running expensive closeout
   suites; use focused checks while the design is still changing. Preserve existing
   authorization; do not invent another approval gate when the selected design and shipping action are already approved.

## Rules

- Keep concept, previous implementation and current implementation distinct.
  Never replace the approved reference with the latest code screenshot.
- Keep actual-size captures as primary evidence. Label derived alignments;
  never change application scale or crop away defects to improve agreement.
- Judge generated references by their intended design features, not literal
  equality of re-rendered text or scenery. Document such exclusions explicitly;
  they are not permission to excuse different padding, shapes or hierarchy.
- A selected concept is a requirement, not inspiration to reinterpret silently.
  If it cannot be implemented faithfully, show the specific conflict and seek a
  revised target rather than presenting an approximation as finished.
