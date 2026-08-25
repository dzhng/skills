---
name: compare-screenshots
description: Compare screenshots to judge which image is less wrong, not to match a baseline. Use when a UI, game, document, render, chart, or generated asset needs objective visual telemetry, side-by-side inspection, crop/zoom review, or a fresh second opinion before accepting or rejecting a visual change.
---

# Compare Screenshots

Decide which image is **less wrong** against what the scene should show — not
whether the candidate matches the baseline. The baseline is just an earlier
attempt; it can be wrong too. Treat both images as candidates measured against
a target you establish yourself. Metrics locate where the images differ; they
never decide who is right.

## Workflow

1. **Establish the target from first principles.** Before looking at distance,
   decide what this image *should* show: the visual requirement, the design
   intent, what the thing depicts in reality, and any domain skill that owns the
   look. This — not the baseline — is ground truth. Write it down in one or two
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
3. **Generate artifacts to locate divergence**, sized to the question:
   side-by-side, key-feature crops/zooms, grayscale, absolute grayscale heatmap,
   pixelmatch diff, per-image Sobel/edge maps, edge-difference heatmap, JSON
   metrics.
4. **Judge each divergence against the target.** For every place the two images
   differ, name what is actually there in plain terms — missing content, wrong
   camera, bad hierarchy, weak contrast, wrong depth, text overlap, layout
   shift, clipped edge, unexpected blur, style mismatch — and decide which side
   is closer to correct. The answer can be the candidate, the baseline, both
   wrong, or a genuine toss-up.
5. **Get a neutral second opinion** for disputed or high-stakes calls: a fresh
   subagent given only the two images and neutral labels, per
   `references/subagent-visual-review.md`.
6. **Conclude with one verdict:** candidate is less wrong (accept, and re-bless
   the baseline if one exists), baseline is less wrong (reject), both wrong
   (another pass needed — say what's still off), or unclear (ask the user).
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

## Distance Score

When a single fixed-pair number is useful, this default works for structural
changes:

`distance = 0.35 * diffRatio32 + 0.25 * pixelmatchRatio + 0.25 * edgeDiffRatio32 + 0.15 * min(1, abs(log2(edgeEnergyRatio)))`

It measures **distance from the other image**, nothing more. Because the
baseline can be wrong, a distance of 0 is not success and a large distance is
not failure — a richer scene, clearer models, stronger labels, real depth, or
better lighting all legitimately raise it. Use the score to find *where* the
images move; decide who is right in step 4. Name the field for what it measures
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
  or `{ "unit": "ratio" }` normalized bounds).
- For other tasks, adapt the same artifact set rather than adding one-off
  scripts to the application. Extend the helper if a needed pair is uncovered.

## References

- `references/subagent-visual-review.md`: neutral subagent prompt/config for an
  independent judgment when history could bias you.
