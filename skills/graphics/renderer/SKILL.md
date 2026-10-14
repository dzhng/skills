---
name: renderer
description: Architecture rules for GPU rendering with TypeGPU/WebGPU — games, data visualisation, canvases, any app that draws with the GPU. Use when adding or changing passes, shaders, buffers, textures, pipelines, frame orchestration, GPU resource lifetimes, or checks that judge rendered output.
---

# GPU renderer

The stack is **TypeGPU on WebGPU**: typed schemas, bind group layouts and pipelines, with WGSL where it's clearer. Don't add a second rendering library.

For 3D models and textures, use Blender if it's available. Prefer a Blender MCP server when one is installed; otherwise run headless (`blender -b --python script.py`). Keep the scripts in the repo, so every asset is reproducible from code rather than hand-edited.

## Architecture

- **The renderer draws what it's handed.** The app builds plain frame inputs from its own state (a game observation, a query result, a document), and the renderer consumes them through one interface. It never reaches into app or domain state.
- **One frame function orchestrates.** A single function encodes every pass in order. Read it before adding anything, and add your pass there, not beside it.
- **Pick the phase by semantics:**
  - compute for preparation (culling, layout, instance building);
  - a depth prepass for opaque geometry, then the lit colour pass;
  - translucent content after the opaque;
  - screen-space passes on resolved targets;
  - overlays and UI last.
- **One owner per concept:** device and capabilities, camera and projection, the depth convention, frame targets, the resource registry, the time source. A second copy (a private projection, or a struct hand-mirrored in WGSL) is a bug waiting to happen. Refactor to the shared owner.
- **Tunable numbers live in data** (config or fixtures), validated where they're loaded. Don't scatter them as constants in passes.
- **Update each resource at its own frequency:** every frame, on view change, on data change (upload deltas only), or once. Allocate nothing per frame on hot paths.
- **Do CPU-side math with the pmndrs [`math`](https://github.com/pmndrs/math) package** (npm `math`, whose `API.md` lists every export): vectors, matrices, quaternions, frustum and shape culling, noise, seeded randomness.
  - Its functions take the output as their first argument and return it, so preallocated scratch keeps hot paths allocation-free.
  - Pack its results into preallocated `Float32Array`s for upload.
  - Don't hand-roll a second vector or matrix library.
- **Picking and hit tests use the app's own shapes** and the same camera function the GPU packing uses, never a readback of drawn pixels.

## Resources

- **Every buffer and texture goes through one registry,** with scopes for size-dependent targets and slots for replaceable resources. Nothing is allocated outside it: in TypeGPU, `root.destroy()` does not free what the root created.
- **Handle async rebuilds** (resize, pipeline swaps). Build into a new scope and swap it in whole. Free a build that's overtaken or finishes after dispose. Make every public call safe after `dispose`.
- **Serialize the whole replacement transaction** when upload and derived-resource baking share mutable GPU buffers. Serializing upload alone still lets an older readback install stale results; retain caller errors without poisoning later requests.
- **Add a test that counts and bytes return to baseline** after resize, rebuild and repeated reset.

## Depth, blending and targets

- **Depth is an access contract** (`read`, `read-write`, `prepassed`), and the convention is engine-wide. Prefer reverse-Z on `depth32float` (clear 0, compare `greater`). Compare direction, clear value and format change together or not at all.
- **Opaque geometry never alpha-blends.** Translucent passes read depth and never write it.
- **A line drawn in pieces joins by construction.** Additive pieces overlap and fade over the overlap, so the joins sum to one; blended pieces are cut square, since two over-composited fades never sum to one. Blended layers of one thing draw in layer order, not in the order their pieces were made.
- **Dynamic light is data every material reads through one shading function.** Effects offer a bounded per-frame list of short-lived point lights; the shared shade call sums them for every lit layer. A glow sprite brightens air, never the surfaces round it, and a per-layer lighting hack drifts from the others.
- **Overlays and UI are composited after post-processing,** unlit and ungraded. Anything that belongs in the world is drawn in the world.
- **The depth prepass and the colour pass share one vertex stage** with an `@invariant` position, so their depth matches bit for bit.
- **Use 4× MSAA** (the count WebGPU guarantees). Interpolate at the centroid any varying that a later screen-space test depends on.

- **Composite each annotation as one group.** Its backing paints below its foreground strokes; selection priority moves the whole group. Fix occlusion through paint order, not by erasing intended backing coverage. Bound effect tails separately from stacking.

- **Bound final rendered geometry, including every independent multiplier and drawn LOD.** Give shader variation bounds, CPU validation and culling one owner. View-dependent width expansion must not silently expand height; source dimensions alone cannot prove a final size cap.

## TypeGPU and WebGPU gotchas

- **Use one TypeGPU module instance in GPU probes.** Mixing a bundler-optimized import with a direct package URL (or a different cache query) duplicates internal symbols: imported shader functions can silently disappear from resolution and WGSL reports an unresolved call. Match the pass's actual module URL before changing shader code.
- **Pin only the shared camera bind group** (`$idx(0)`). TypeGPU numbers the rest.
- **A pipeline with no fragment stage is valid.** Use it for depth-only passes rather than writing `frag_depth`, which disables early-Z.
- **WGSL `let` is immutable.** Reassigning one invalidates the pipeline while the app looks healthy.
- **WGSL reserves words it doesn't use yet** (`cast`, `meta`, …); an identifier named after one fails the module at parse time.
- **Pad uniform structs to 16 B.** Keep a byte-size constant beside each schema and test the packer against it.
- **Default bind limits are small** (8 storage buffers per stage). Count before adding one.
- **Apple GPUs:**
  - A tile a pass drew nothing into skips its resolve, so a loaded target can show an old frame there. Make the background pass resolve too.
  - Timestamp queries are only meaningful as a whole-frame total.
- **Keep matrices float32 on the CPU as well,** so CPU picking and GPU drawing agree exactly.
- **Treat any validation warning or console error as a failed render.**

## Verification

- **Use one injectable clock** for animation. Never use `performance.now()`, `Date` or unseeded randomness inside a pass. A held clock gives deterministic captures.
- **Test packing and CPU mirrors of shader math in unit tests.** Then render the narrowest real scene in a browser running on the real GPU (not a software fallback), and look at the image.
- **Stats aren't pixels.** Pair counts with a pixel or crop check that proves the subject was drawn and framed. Match a streak to its published endpoint, not colour alone when classes share a style. Follow fast motion for consecutive-frame crops so leaving a static camera does not masquerade as fading.
- **Derive checks from contracts,** not copied constants. Change a pixel threshold only with a written reason.
- **Measure GPU cost with the feature toggled on and off, interleaved on one machine,** not as two separate runs. Other load on the machine swamps small differences.

## Width changes at tactical zoom

When a world-space width change barely moves the screenshot, trace the full width path through screen-space minimums, core/glow layers and postprocessing before tuning again. Compare native tactical and close views with the same camera and event. For moving subpixel features, inspect consecutive frames in the crowded gameplay view as well as isolated crops; a thin still can conceal flicker or disappear against terrain.

## Repeating motion needs a full cycle

For cadence or synchronization claims, capture startup and multiple complete work/rest cycles, including their longest pauses. Pair native motion frames with source-event timestamps per actor; overlapping visible trails do not prove simultaneous launches, and a short staggered opening does not prove sustained independence. Test random timing across several seeds and report measured gaps rather than promising uninterrupted activity.

## Native generation identity owns overlapping scenery

Spatial membership cannot identify which authored forest generated a trunk.
Overlapping shapes can duplicate trees or assign another source's canopy. Export
immutable original source associations from native generation, retain lossless
prop IDs in the consumer, and place each source trunk once. Exact rectangle export
ordinal also needs an explicit authored-ID mapping when other shapes are interleaved.
Prove this through public exports and production placement, including empty sources
and ordinary props outside the generated ranges.

Membership, numeric sampling and rendered acceptance are separate claims. Preserve
the first failed production readback and its compiled source; a matching membership
flag does not resolve a failed distance oracle. At a stopping point, preserve an
unactivated candidate and restore the runtime baseline instead of widening its bar.

## Resource checks need consistent view history

A paused fast-forward can finish delivering data before the UI draws that
publication. Await its drawn tick and presentation clock before moving the camera.
Otherwise a retained buffer may see an extra detail tier on one reset and look
like a leak. Attribute differences with actual allocation creation/destruction
records before changing capacity policy or weakening byte assertions.


## Corpse identity does not freeze its anchor

A falling or resting body's authority can change its support after a building
collapses. Refresh the published position for the same corpse identity without
restarting its death clip, changing its facing, or making a faded corpse return.
A static anchor change must invalidate the corpse publication version; moving
only the cached object leaves GPU instances at the old height. Enemy anchors
come from the side's last observed corpse state, so rendering cannot infer an
unseen collapse from the current physical world.
