---
name: renderer
description: Build, debug, or review WebGPU renderer work — three.js/TSL scene layers, node materials, or raw WGSL passes and compute. Use when changing GPU resource layouts, render or compute passes, node materials, bind groups, buffers, shaders, frame orchestration, depth/overlay composition, capability handling, performance, or browser-verified renderer visuals.
---

# GPU renderer

Use this for WebGPU renderer work where correctness depends on GPU resource
ownership, pass orchestration, shader/material layout, depth semantics, or
browser-verified output. Find the current owners in the codebase — projection,
depth convention, environment presets — before changing anything; do not assume
this skill knows today's module layout.

## Workflow

1. Inspect the existing device/shell, pass graph, bind group layouts, shader
   contracts, and validation routes before adding a pipeline or buffer.
2. Define resources first: buffers, textures, uniforms, storage layouts, bind
   groups, ownership, update frequency, read/write access, and lifetime.
3. Choose the phase deliberately:
   - Use compute for parallel preparation, simulation, reductions, texture or
     buffer transforms, and work-list construction.
   - Use render passes for rasterized output.
   - Use separate background, depth-tested world, transparent/effect, and UI
     overlay phases when visibility semantics differ.
4. Single-source shared contracts. Camera layouts, projection helpers, depth
   modes, frame phases, semantic roles, vertex strides, and bind group schemas
   should live in one canonical module/source and be imported by renderers,
   shaders, and verifiers.
5. Fight sediment. When a new requirement reveals that two passes own the same
   concept (lighting environment, haze, material palette, terrain projection,
   water mask), refactor to the shared primitive you would design from scratch.
   Do not bolt an adapter or alias beside the old owner unless it is a tiny
   temporary bridge with a named removal path.
6. Validate in the browser. Run the narrowest scenario that exercises the
   changed pass, open the produced PNG, and use `compare-screenshots` when a
   visual before/after needs telemetry.

## Rules

- One projection owner, one depth convention, one environment owner — whatever
  modules currently own them. A camera is posed through the shared camera
  helper, never hand-rolled orbit math in a route or pass; a preset-dependent
  material knob lives on the environment owner, never in a pass.
- Prefer reverse-Z (near→1, far→0) on a float depth buffer for large outdoor
  depth ranges; whichever convention is in force, it is engine-wide — depth
  compare direction, clear value, and format move together or not at all.
- Renderer library upgrades are their own reviewed change with the full suite
  and perf gate as harness — never a ride-along on a feature commit.
- WGSL uniforms and storage structs must respect alignment. Pack scalar fields
  into obvious 16-byte slots when it reduces layout ambiguity.
- Treat depth as an access contract, not a boolean. Use explicit modes such as
  `read`, `read-write`, and `write`; make renderer stats and GPU pipeline state
  speak the same language.
- All pipelines in one render pass must be compatible with its attachments.
  Adding a depth attachment is a pass-wide change: update every pipeline in the
  pass, split the pass, or keep the pass depthless.
- Type buckets are batching details, not visibility policy. Sorting by mesh
  class, prop type, material, or instance bucket is valid only when the pass has
  the correct depth semantics for the world it draws.
- Do not mix alpha blending into depth-writing opaque geometry. Opaque/cutout
  world objects can write depth; translucent decals, shadows, selection rings,
  roads, and UI overlays need separate read-only depth or overlay phases.
- Treat read-only world decals as a one-way boundary inside a frame. Once
  ground cues, shadows, roads, or other `depth=read` world decals begin, no
  later world pass should write depth; otherwise the frame is relying on
  painter-order color overwrites instead of the depth buffer.
- World-space ground cues are not HUD overlays. If a marker belongs on terrain,
  submit it through the world camera and let real geometry occlude it; reserve
  screen overlays for labels, HUD, minimaps, debug UI, and deliberately
  non-world effects.
- Selection, order, targeting, and path cues should be verified by their
  semantic ground-cue/effect pass, not by an incidental terrain or mesh bucket.
  A correct cue can be a read-only world decal or tactical line without being
  part of the terrain geometry count.
- Ground decals on raised or tilted terrain need the same surface height as the
  world objects they mark. A selection ring, shadow, road, or footprint that
  assumes flat `z=0` can disappear under the terrain or drift away from the
  model even when its x/y coordinates are correct.
- Continuous world paths should be continuous geometry. Do not create road,
  rail, river, or path continuity by cutting endpoint gaps around occluders;
  resample the path onto the canonical surface and let depth-tested world
  objects occlude it.
- Instanced world props need a base-elevation field when they live on raised
  terrain. An instance layout that carries only x/y/scale can look fine on a
  flat fixture while trees, rocks, crowds, or buildings float, sink, or lose
  depth ordering on the real map.
- Tilted world scenes need one canonical surface. If terrain, water, roads,
  labels, props, or hit tests must stay geographically aligned while the camera
  moves, project and draw them from the same 3D surface/height contract. A flat
  textured underlay plus separate raised world objects will drift under
  perspective even when the source coordinates are correct.
- Geographic effects need a canonical mask/projection owner. Water glints,
  coast foam, fog reveal, biome tints, and terrain overlays must sample or be
  generated from the same world-space mask that owns the gameplay geography;
  unmasked decorative quads/ellipses are only valid for non-geographic
  atmosphere and must not independently decide where land or water exists.
- Shared visual concepts are not pass-local knobs. If water, terrain, grass,
  sky, soldiers, or props all need the same weather, haze, palette, or light,
  make that a shared renderer contract and have every pass consume it. A wrapper
  that preserves old duplicated constants is still a failed architecture unless
  it is explicitly transitional and tracked.
- Secondary world views need the same contract as the primary view. Minimap,
  overview, reflection, shadow, and debug views should expose or consume
  canonical world-space anchors instead of carrying private scale/offset math;
  verifier tolerances should match the source grid resolution.
- Nested objects must be proven with hostile-order fixtures. Submit an occluder
  first, submit the nested/rear object later, then sample or crop pixels that
  prove depth, not painter order, owns visibility.
- Browser checks can pass while the canvas is visually wrong. Inspect actual
  PNGs after WGSL, pipeline, camera, pass-order, depth, or blend changes, and
  reject black frames, transparent canvases, flattened occlusion, or UI layered
  over world geometry by accident.
- A valid render is not necessarily a useful capture. Screenshot gates must
  prove the intended subject is framed: derive camera targets from live
  renderable bounds or explicit semantic anchors, and reject frames that show
  mostly empty terrain, sky, water, or one flat colour while entity stats look
  healthy.
- Treat GPU renderer validation warnings as failed renders. A bad pipeline can leave
  route stats and app hooks alive while command buffers are invalid and the
  canvas is black. Capture console warnings and fix the root contract, commonly
  vertex stride/attribute offsets, bind-group layout drift, attachment mismatch,
  or a depth mode that no longer matches the pass.
- WGSL `let` bindings are immutable. When staged shader values need overrides,
  use `var`; reassigned `let` expressions can invalidate the pipeline and leave
  JavaScript stats healthy while the actual canvas is black.
- Expose pass-level stats for render-affecting modes and resource contracts.
  If a shader path depends on a texture, mask, depth mode, or feature toggle,
  the route stats should say which path is active and what resource dimensions
  it consumed.
- Keep scenario assertions derived from the same contracts as renderer code.
  Hard-coded verifier copies of depth formats, phase names, role maps, or vertex
  strides drift into false confidence.
- Capability handling must match the product. An unsupported-GPU renderer path may
  show a clear failure/fallback UI, but it must not silently route production
  visuals through an unrelated renderer to hide missing GPU renderer behavior.
- Spatial budgets must not erase geography. If a map renderer caps mountains,
  forests, props, particles, or decals, reserve by canonical region/tile or
  connected feature before global sorting; batching and top-N selection are
  performance details, not permission to drop whole visible landforms.
- Stats that count submitted instances are not proof that the GPU rendered
  content. NaN instance fields, zero coverage, bad projection, or invalid
  shader state can leave counts healthy while pixels are blank; pair stats with
  crop/content probes for each visual class.

## three.js WebGPU + TSL rules (when the scene layer is three.js)

- **Reversed depth flips three's sorted render lists.** With a reversed depth
  buffer, opaque/transparent sort order inverts silently — zero validation
  errors, and a low-`renderOrder` backdrop can cover the whole world. After any
  depth-convention or sort change, prove draw order empirically (hostile-order
  fixture), and expect to own the sort comparators.
- **A custom `positionNode` silently discards `instanceMatrix`.** Smell: every
  instance renders at the origin or with one shared transform while counts look
  healthy. Per-instance work must re-apply instancing explicitly.
- **`normalNode` is view-space.** Lighting math that assumes world-space normals
  reads plausibly wrong (moves with the camera); transform deliberately.
- **The TSL `time` node is BANNED in renderer code** — it breaks byte-stable
  snapshots. All animation keys off an owned, injectable time uniform plus
  seeded RNG.
- **No infinite-far perspective** — three NaNs at `far=Infinity`; use a large
  finite far that converges on the infinite-limit matrix, and pin the
  equivalence with a unit test.
- **`renderer.info` resets every browser frame** via three's internal loop —
  snapshot the counts at render time before publishing stats.
- **Type packages widen TSL literals** (`attribute()` inferred as `string` drops
  the whole swizzle/operator surface) — use explicit generics; if published types
  don't cover a module, keep a *narrowed* local declaration, never `any`.
- **Match sample count to the product.** Default MSAA washes out sub-pixel
  detail (a distant crowd fades to mush); the antialias choice is a per-world
  contract, not a default.
- **Screen fog ranges are camera-distance ranges.** A haze stand-in tuned at
  gameplay zoom fires at overview rig distances; range floors must clear the
  rig's maximum eye distance.

## Performance

- **SwiftShader is the correctness proxy, never the perf oracle.** It renders
  TSL/WebGPU (including reverse-Z, timestamps) faithfully but orders of
  magnitude slower; perf gates run on hardware only, and the standing crowd
  perf gate + frame-time ledger judge every renderer-affecting slice.
- **Prove which GPU drew the frame before quoting a frame time.** Falling back
  to software is silent: Playwright's default headless is
  `chromium_headless_shell`, which ships no GPU backend at all and lands on
  SwiftShader without an error, so the run looks green and every number in it is
  fiction. Launch with `channel: 'chromium'` for the full browser against the
  real device, and read the unmasked renderer string out of the page
  (`ANGLE (Google, ..., SwiftShader Device)` versus
  `ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Pro)`) into the capture's own
  report so the check is recorded, not remembered. One measured case: the same
  1024x1024 scene ran 32fps on the shell and 127fps on the real GPU — a 4x lie
  from one line of launch config. Fix a fallback with
  `npx playwright install chromium` rather than keeping the number with a
  caveat attached; a software-rendered run still counts for pixel, budget, and
  functional checks, but its timings are void.
- **Run GPU suites single-worker.** Parallel browser contexts contend for one
  GPU, and the frame-time collapse drifts app time away from wall time: timed
  phases and screenshot baselines flake for a reason that never appears in the
  diff. `workers: 1` for anything that renders.
- Exercise capabilities (GPU timer, MSAA, depth formats) in the production
  shell shape, not only lab shells — a capability that only ever ran in a
  simpler configuration can be invalid in the real one.
- Prefer instancing, batching, storage buffers, indirect draws where useful, and
  GPU-side phase preparation for scale.
- **Per-instance frustum culling is not free on either substrate** — three
  culls an instanced mesh as one bounding sphere; cull via CPU instance
  compaction or GPU-driven culling, publish culled counts in stats, and once
  shadow cascades exist cull against the union of view + cascade frusta or
  shadows pop at the screen edge.
- Avoid CPU readbacks in hot paths. Debug readbacks must be bounded, named, and
  removable.
- For iterative compute or simulation, split phases such as `state`, `apply`,
  `integrate`, `constrain`, and `correct`; use ping-pong buffers/textures when
  a pass reads previous state and writes next state.
- For neighbor queries, crowds, particles, or tiled effects, prefer spatial
  grids, tiles, or compacted work lists over O(n^2) scans.
- Expose meaningful knobs and stats: workgroup size, instance counts, draw
  counts, tile sizes, LOD thresholds, pass timings, and readback limits.

## Visual Validation

- Use the smallest route that exercises the changed visual surface, then open
  the generated PNG yourself.
- When a snapshot fails, inspect the actual candidate artifact, not the blessed
  baseline path. Baselines prove what was accepted before; actual captures prove
  what the current GPU code rendered.
- For model sheets, contact sheets, animation GIFs, and timeline strips, inspect
  every tile or frame class, not just one representative. A grid can pass while
  repeated crops are consistently off-center, clipped, or aimed between the
  models.
- When a projection-sensitive scene is disputed, add a tiny synthetic alignment
  fixture with known land/water/prop points and sample both semantic state and
  rendered pixels across multiple cameras before debugging the full production
  map or scene.
- Frozen-frame caches must key every render-affecting snapshot toggle. If a
  verifier intentionally preserves transient effects while the default freeze
  hides them, compare same-tick hidden-vs-visible pixels so the cache cannot
  silently reuse the wrong frame.
- Crop and upscale suspect regions before diagnosing small geometry, labels,
  sprites, flags, depth overlaps, or LOD artifacts.
- For GPU-backed screen overlays, expose semantic anchors such as center, edge,
  or baseline; do not tune visible spacing against the center of an atlas quad
  when the requirement is about an icon edge, marker edge, or text baseline.
- Screen-space text/icon arbitration belongs where measured overlay bounds
  exist. If a GPU renderer label atlas pass owns text measurement, use that pass for
  collision/culling policy and expose cull stats; do not scatter per-entity
  offsets to paper over overlapping labels.
- Use metrics as telemetry: pixel diffs, grayscale, edge maps, luminance, and
  content counts can explain movement, but acceptance depends on named visual
  requirements and human readability.
- If a visual change is disputed or subtle, run `screenshot-critique` with an
  unprimed second pass before accepting it.

## Common Failure Smells

- A pass reports one semantic role while its pipeline uses another depth or
  blend state.
- A background or overlay pass draws true 3D objects.
- A flat background/underlay is expected to line up with 3D objects after camera
  tilt, zoom, or perspective changes.
- Route stats report healthy passes while console validation warns about an
  invalid pipeline or command buffer.
- A private shader camera/projection helper appears beside a shared one.
- A verifier repeats renderer constants by hand.
- A green scenario has no screenshot inspection.
- A screenshot is mostly blank field, water, sky, or a flat colour while stats
  report submitted entities; suspect camera framing, crop origin, projection,
  or all-content-hidden CSS before chasing mesh generation.
- A type bucket appears in top-level frame or graph ordering where a semantic
  phase should be.
- A visual fix changes camera, lighting, model geometry, and pass order at once,
  leaving no clear cause for the result.
- A camera is posed by hand-rolled orbit/projection math beside the shared
  camera helper.
- A snapshot gate flakes frame-to-frame — suspect an unowned time source (TSL
  `time`, `performance.now`, unseeded RNG) first, then parallel test workers
  contending for the GPU, before suspecting the GPU itself.
- A perf regression appears with no plausible cause in the diff — check the
  renderer string before the code; a lost GPU reads as a slow commit.
