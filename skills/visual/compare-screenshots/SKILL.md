---
name: compare-screenshots
description: Compare screenshots against the intended design, distinguishing approved references from historical baselines. Use for iterative implementation matching, before/after visual review, objective image telemetry, or checking a lone capture for flat, empty, or badly framed content.
---

# Compare Screenshots

Judge images against the intended result. A user-approved design is the target;
a historical baseline is only an earlier attempt and may be wrong. Metrics locate
differences, never decide correctness. Use
[design-with-images](../design-with-images/SKILL.md) for the full exploration-to-implementation loop.

## Workflow

1. **Establish the target.** Use the user-approved reference and stated design
   requirements when available; do not replace them with your own taste. Otherwise
   derive the target from the visual requirement, what the thing depicts in reality
   and the domain skill that owns the look. Write it down in one or two
   concrete sentences ("low sun should cast long shadows east; trees fill the
   canopy; labels stay legible at this zoom").
   - If the right answer isn't clear — competing valid readings, a taste or
     product-intent call, a tradeoff only the owner can settle — **stop and ask
     the user** what the correct answer should be. Show them the comparison.
     Do not quietly default to the baseline to avoid asking; that bakes in
     whatever the baseline got wrong.
2. **Confirm comparability** so the differences you see are real, not capture
   artifacts: same viewport, DPR, route/page, frozen time/tick, camera intent,
   UI state, data, fonts/assets where they matter. If not comparable, fix
   capture setup or compare only a crop/feature where the mismatch is harmless.
3. **Measure the approved design.** For reference matching, read and complete
   [Reference Landmarks](references/reference-landmarks.md) before changing code
   or accepting a candidate. Then generate artifacts sized to the question:
   side-by-side, key-feature crops/zooms, grayscale, absolute grayscale heatmap,
   pixelmatch diff, per-image Sobel/edge maps, edge-difference heatmap, JSON
   metrics.
4. **Inspect boundaries before judging the whole.** For every changed visual
   effect, inspect all sides at native scale and in matched detail crops. Include
   the effect's full fade and surrounding space; a crop ending at the component
   box hides spill. Compare top/right/bottom/left extents separately, anchored to
   visible text, rules or silhouettes rather than inferred CSS bounds. Check
   every foreground feature crossed by the effect (lines, icons, text, adjacent
   panels): brightness, color, sharpness and continuity must match the target.
   A readable line can still be incorrectly dimmed. Record each check as
   reference observation → candidate observation → pass/fix/uncertain, with its
   crop. Use the landmark table to resolve local distances and contrast;
   full-frame averages cannot settle a local defect.
5. **Judge each divergence against the target.** For every place the two images
   differ, name what is actually there in plain terms — missing content, wrong
   camera, bad hierarchy, weak contrast, wrong depth, text overlap, layout
   shift, clipped edge, unexpected blur, style mismatch — and decide which side
   is closer to correct. The answer can be the candidate, the baseline, both
   wrong, or a genuine toss-up.
6. **Get a neutral second opinion** for disputed or high-stakes calls: a fresh
   subagent given only the two images and neutral labels, per
   `references/subagent-visual-review.md`.
7. **Resolve mismatches to an approved target.** When implementing a selected
   design, record material differences in spacing, shape, softness, typography
   and hierarchy; revise, recapture and repeat until resolved or the user changes
   the target. Do not silently exempt a difference because the code is simpler.
8. **Conclude with one verdict:** candidate is less wrong (accept, and re-bless
   the baseline if one exists), baseline is less wrong (reject), both wrong
   (another pass needed — say what's still off), or unclear (ask the user).
   Accept only when every boundary/overlap check passes or has an explicit
   user-approved deviation; uncertainty requires closer evidence, not a pass.
   Overall resemblance or a positive second opinion cannot cancel a local defect.
   Never accept on a lower score alone or reject on a higher one. Never hide
   content, blur detail, crop away differences, or make the capture less
   truthful to move a number.

## Useful Metrics

Pick metrics that answer the question. For full visual comparisons, report:

- `mae`: mean absolute grayscale difference, 0..255, lower is closer.
- `rmse`: grayscale root mean square error, lower is closer.
- `diffRatio16`, `diffRatio32`, `diffRatio64`: fraction of pixels over each
  grayscale delta threshold.
- `pixelmatchRatio`: mismatch ratio from pixelmatch over grayscale images.
- `edgeEnergyCurrent` and `edgeEnergyCandidate`: average Sobel edge strength.
- `edgeEnergyRatio`: candidate/current. Far below 1 usually means missing
  geometry, props, labels, or terrain; far above 1 usually means noisy or
  incorrect detail.
- `edgeDiffRatio32`: fraction of pixels whose Sobel edge differs materially.
- `avgLuminanceCurrent`, `avgLuminanceCandidate`, `avgLuminanceDelta`: average
  brightness and delta. Use when a render is visibly too dark/light even if a
  broader distance score improves.
- Content proxies relevant to the scene: black/void ratio, terrain-like ratio,
  water-like ratio, team-color ratio, label/text mask ratio.

For UI/document/layout reviews, also use crop bounds, text/foreground mask
coverage, contrast checks, edge clipping, element positions, and before/after
dimensions when those beat global pixel distance.

## Single-Image Metrics

Every metric above measures one image against another, so none of them can
answer "is this capture worth anything" when there is nothing to compare it to
— and the pair score is symmetric, so an enormous distance never says *which*
side is the empty frame. A few absolute numbers do, computed on a coarse grid
from a single PNG:

- `colorEntropyBits` under ~3.0, or `dominantColorShare` over ~0.6: one colour
  owns the frame. A sparse scene, an unlit one, or a subject that never drew.
- `edgeDensity` under ~0.04: almost no form anywhere. Empty framing, a
  primitive-dominant scene, or the subject sitting outside the crop.
- `luminanceContrast` under ~60: fog, darkness, or haze compressing the whole
  frame into one band.
- `transparentShare` above 0 on a capture that should be opaque: the capture
  itself is wrong. A transparent pixel keeps whatever RGB it was left with, so
  an invisible frame can look rich until it is composited — the scene metrics
  composite before measuring, and name the invisible share rather than letting
  you infer it. The pair metrics above still read stored RGB, so this field is
  where transparency gets told either way.

These are thresholds for *suspicion*, not gates. A deliberately minimal design,
a night scene, an empty-state screen, and a whiteboard all trip them honestly.
Use them to decide where to look, then say what the frame is actually doing —
never adjust a capture to raise a number, which is the same failure as cropping
away a difference.

## Distance Score

When a single fixed-pair number is useful, this default works for structural
changes:

`distance = 0.35 * diffRatio32 + 0.25 * pixelmatchRatio + 0.25 * edgeDiffRatio32 + 0.15 * min(1, abs(log2(edgeEnergyRatio)))`

It measures **distance from the other image**, nothing more. Because the
baseline can be wrong, a distance of 0 is not success and a large distance is
not failure — a richer scene, clearer models, stronger labels, real depth, or
better lighting all legitimately raise it. Use the score to find *where* the
images move; decide who is right in step 5. Name the field for what it measures
(distance, not "parity") so no one reads it as a verdict.

Report the full-frame score and, when UI dominates the shot, a labeled
world-crop score. Use the world-crop score to locate renderer movement and keep
the full-frame score so UI/camera mistakes stay visible.

## Score Discipline

- Quote the previous and new distance for the same pair each iteration, then say
  whether the movement is toward the target, away from it, or diagnostic noise.
- Prefer edge metrics for missing-content bugs. A flat top-down map can show a
  deceptively moderate grayscale diff while edge energy proves trees, roads,
  city forms, or army silhouettes are absent.
- Segment out stable UI when it dominates and the question is the world render;
  keep a full-frame score too, labeled.
- If the camera is wrong, pixel scores are diagnostic only. Fix camera intent
  first, then judge the render.

## Tooling

Keep comparison scripts inside the skill or a temporary workspace, not in
product code, unless the product genuinely needs screenshot comparison at
runtime.

- `scripts/visual-parity-diff.mjs` is a reusable local helper. Its PNG and
  pixel-diff runtime is bundled with the skill, so target repositories do not
  need `pngjs` or `pixelmatch`. Run it with `REFERENCE_DIR=<png-folder>`,
  `CANDIDATE_DIR=<png-folder>`, and optional `OUT_DIR=<artifact-folder>`.
  `REPORT_ORDER=a,b,c` pins ordering;
  `CROPS_JSON=<file>` adds labeled crops (keyed by image id, each crop in pixels
  or `{ "unit": "ratio" }` normalized bounds). Pair reports carry a
  `sceneMetrics` block per side.
- Drop `REFERENCE_DIR` to run the same helper on a folder with no counterpart:
  it writes `scene-metrics.json` with the single-image numbers above and no
  diff artifacts. Use it on a lone screenshot, on a full capture set before
  anyone reviews it, or to find which side of a large distance is the empty
  one.
- `scripts/visual-parity-diff.eval.mjs` is the helper's own eval: it generates
  fixtures whose correct answer is known by construction — empty, transparent,
  primitive-dominant, authored, degenerate — and asserts the classification,
  the invariances, and the CLI contract. Run it with the same `REPO_ROOT` after
  changing the script. Never satisfy a failing check by loosening a threshold
  until you have shown the fixture, not the code, is what's wrong.
- For other tasks, adapt the same artifact set rather than adding one-off
  scripts to the application. Extend the helper if a needed pair is uncovered.

## References

- `references/subagent-visual-review.md`: neutral subagent prompt/config for an
  independent judgment when history could bias you.
