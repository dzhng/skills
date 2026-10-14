---
name: launch-video
description: Make a showreel-grade motion-graphics launch video, with music, that introduces a CLI, library, or product from its repo. Use when asked for a launch, promo, sizzle, or showreel video, an animated intro for a project, or a video to post on X/social.
---

# Launch Video

The bar is a **showreel**: the piece a motion designer puts on their résumé to
prove how good they are — dynamic, ambitious, scored to music, a real
professional production and never a demo or prototype. Go all out. The repo
supplies the story; the craft is yours. Nothing here is a template: if the
piece could be re-skinned for any other project, it has failed.

## Workflow

1. **Find the story.** Read the README, docs, benchmarks, and brand art. Done
   when you can state, each with a source: what it is in one line, how it works
   underneath (the audience is technical), and the proof worth landing. Flag
   any claim the repo cannot back instead of inventing its meaning.
2. **Direct before you build.** Choose one visual concept grown from what the
   project *is* (its metaphors, its brand art, its mechanism): a world with its
   own look, camera, and signature move, rather than a sequence of panels.
   Then commit to one familiar real-world analogy for the mechanism (building
   a city, running a kitchen, a heist) and map every step onto it: name each
   step in the analogy's vocabulary, and give each one the everyday props that
   explain it at a glance (a surveyor's tripod, stakes, cranes, an inspection
   stamp). Digestible beats clever: a viewer should get each step from
   references they already know, without reading a word. Write
   it as a shot list on a music timeline. Done when every shot names its camera
   move and the one moment in it a motion designer would be proud of. A shot
   whose description is "a card/panel/list appears" gets redesigned.
3. **Build picture and score from one timing source.** Every event time lives
   in one place that both the scenes and the soundtrack read, so hits land on
   hits. Synthesizing the music in code keeps that lock exact.
4. **Review as a director.** Render a draft, tile each shot into contact
   sheets, and get a fresh-eyes critique from a subagent that has not seen your
   plan. Then ask each shot the showreel question. Fix and re-render until
   every shot passes, not a sample.
5. **Ship.** Make the thumbnail (rules below), render the master (1080p60,
   high-quality H.264, 320k AAC), reveal it in Finder, and commit the project
   to the repo as a standalone package, with renders and generated audio
   ignored and a short README covering commands, the timing principle, and the
   claim sources and methodology kept outside the film.

## Marketing, not a white paper

Lead with the product and a few memorable benefits. Keep methodology, sample
sizes, missing-data allowances, benchmark caveats and source citations in the
package README or linked report, not in the video or key art. Do not add fine
print, asterisk footnotes, disclaimer blocks or defensive narration. If a claim
needs narrowing to stay true, narrow the headline itself; never use tiny text
to rescue a misleading headline. Review each frame for reading burden as well
as visual quality.

## Show, don't tell

Text is the last resort. Before any word goes on screen, find the picture
that makes it unnecessary: an object that transforms, a world that changes,
motion that performs the idea. Keep text only where nothing visual can carry
it: the product's real commands, its name, and a claim that must be exact.
The one exception is orientation: give each shot one header saying what is
happening (it can be dynamic, like a live count that ticks with the action),
or the best animation reads as random motion.
When a draft leans on labels, captions, or subtitles to explain what is
happening, redesign the shot instead of rewording the text.

## The showreel question

Would a motion designer put this shot on their reel? Tells that it has slid
into explainer or demo:

- **Animated slide deck.** A static layout where elements slide in and hold.
  A reel's camera is always going somewhere, and its composition keeps
  changing.
- **Reading, not watching.** Paragraphs, UI cards, body copy, or a subtitle
  under a headline (a headline that needs a subtitle is two ideas). A reel
  speaks in few-word hits at dramatic scale, and the visuals carry the
  mechanism.
- **Broken metaphor.** An action that doesn't do what it depicts: a cut that
  ignores the pieces it claims to divide, a label nobody could read against
  its ground. Make the motion true to the objects on screen.
- **One trick.** Every element springs in the same way. A reel shows range:
  depth and parallax, scale contrast, match cuts and transitions that carry an
  element into the next shot, speed ramps, lighting and color shifts, particles
  and physics, typography that moves as design.
- **Flat.** Everything sits on one plane at one scale, with no foreground,
  background, or light.
- **Deaf.** Motion ignores the music, or the music sits under the picture
  instead of driving it.
- **Prototype 3D.** Untextured primitives under flat light with no lens: it
  reads as a tech demo. If the piece goes 3D, finish it like a game
  cinematic: physically based materials with surface detail and bevels that
  catch light, reflections and soft shadows, emissives that bloom, and a lens
  (ambient occlusion, depth of field, grain, aberration on impacts).

## Rules

- **Rebuild, never screenshot.** Break any UI down into parts that can move.
- **Judge effects in a rendered frame, never the live preview.** Frame-by-frame
  renderers (Remotion's manual advance, for one) can silently drop a post
  stack or a canvas layer that looks fine live.
- **Claims stay exact.** Verify headline claims against the source and keep
  their scope clear in the headline. Preserve supporting evidence in the
  docs; follow the marketing rule above for what belongs on screen.
- **You cannot listen.** Verify the mix by measurement (integrated loudness
  around −11 to −14 LUFS, and a spectrogram showing risers and impacts at their
  cue times), and say in the handoff that the audio was checked by measurement,
  not by ear.
- **Thumbnail.** Feeds (X) pick an early frame and skip a one-frame poster, so
  hold the preview for ~0.3s of pre-roll, then move it into the opening (shift
  the music by the same amount). Match the pre-roll background to the opening
  so playback doesn't flash. The best preview is the product doing its job
  (name, tagline, a completed command and its output); the headline number
  gets its payoff shot and a separate key-art still.
