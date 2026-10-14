# Reference Landmarks

Read before implementing or accepting a match to an approved image.

1. **Measure the reference first.** Pick visible anchors for each requested
   relationship: glyph bounds, line endpoints, icon edges, solid silhouettes.
   Record a small table: feature | reference relationship/range | candidate
   measurement | delta | pass/fix/uncertain. Fill the reference column before
   changing code; never calibrate the target from the latest candidate.
2. **Separate core from fringe.** A soft edge has no single boundary. Locate the
   dark/opaque core, its transition and the faint outer tail on each side. Say
   where a foreground stroke meets that profile. “Full width” may mean the
   visible core, not every pixel of blur; resolve shorthand against the supplied
   image before translating it into a percentage or a hard clip. For example,
   compare a rule's ends to both the text bounds and the fade, and compare the
   last glyph-to-rule gap separately from the tail below the rule.
3. **Keep scale honest.** Preserve original captures at the actual application
   scale, with viewport and DPR recorded. If a generated reference has different
   raster dimensions, record the mapping from its source capture; if unknown,
   compare ratios to stable landmarks such as glyph height and state uncertainty.
   Label any derived alignment image. Never resize the application, typography
   or evidence merely to make the pair agree. Native captures remain the proof.
4. **Isolate ambiguous effects.** When terrain, texture or lighting could be
   mistaken for shadow, capture the same frozen state with only that effect
   toggled. Use the difference to locate its contribution; keep the normal
   capture beside it. Use local contrast/falloff samples across an edge rather
   than whole-frame similarity. If no clean reference baseline exists, report
   the inferred range instead of inventing an exact opacity or endpoint.
5. **Keep the whole feature in the crop.** Include both endpoints, all fade
   tails and surrounding context. Recheck crop bounds after every geometry
   change; an old crop can hide a newly extended edge. Zoomed crops supplement
   native-size evidence, never replace it.
6. **Close every discrepancy.** A reviewer saying “slightly wider,” “minor gap”
   or “uncertain extent” has identified unfinished comparison work. Measure and
   resolve it, or record a demonstrated rasterization limit or user-approved
   deviation. Do not convert those words into a pass because the overall image
   looks good. Validate test assertions against these reference relationships,
   not a convenient CSS mechanism or the last verbal interpretation.

After a user catches a missed detail, revisit the whole landmark table. Recheck
neighbors after the fix: restoring a bright line can erase the dark support
above it; extending that line can overshoot the reference's fading edge. Finish
with the updated table and current captures, not a repeated general verdict.
