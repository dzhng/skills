# refactor-codebase launch video

A 52s 2D showreel for the [refactor-codebase](../skills/review/refactor-codebase/SKILL.md)
skill, made with the launch-video skill. The pitch: AI-written codebases pile
up debt in layers, and refactor-codebase, with the specialist skills it runs,
is tuned to find it. Run it regularly to de-slop the codebase.

The world is one flat map of the codebase that a 2D camera flies across.
Files are cards, folders are columns, and colour is the feature a file
belongs to. Each shot shows a problem happening, then the fix landing, under
a header naming the skill that hunts it:

1. **The problem.** Sessions stack layers onto the files, then one small
   change has to touch seven places.
2. **Title.** "De-slop your codebase." `/refactor-codebase`.
3. **One feature, five folders** (refactor-codebase's own hunt for hidden
   links). The files regroup by feature.
4. **Guards nothing needs** (find-overengineering). Rings of defensive code
   peel off one line of real work.
5. **Hidden state machines** (find-state-machines). Four flags in four files
   jam the upload in an impossible state, then become one machine where
   every state has a way out.
6. **Files too big to read** (ratchet-files). A file outgrows one read and
   splits on the concepts it already holds.
7. **Tests that prove nothing** (audit-tests). A bug falls through a green
   wall; after the audit one test catches it.
8. **Same change, one place.** Then a weekly chart: slop creeps back, each
   run takes it out. "Run it regularly. Keep the slop out."

```bash
npm install
npm run audio    # synthesize + master public/soundtrack.wav (-12 LUFS, -1 dBTP)
npm run studio   # scrub it in the browser
npm run draft    # half-scale review render
npm run render   # 1080p60 H.264, 320k AAC → out/refactor-codebase-launch.mp4
npm run still -- KeyArt out/key-art.png   # "De-slop your codebase." still
```

Renders and generated audio are ignored; rerun `npm run audio` after a fresh
clone.

## One timing source

`src/cues.ts` holds every event time, in song seconds at 120 BPM. The scenes,
the camera (`src/camera.ts`), the type and `audio/synth.ts` all read it, so
moving a cue moves its picture and its sound together. Everything is a pure
function of song time.

The first 0.3s is a pre-roll that holds the title card as the feed thumbnail.
`PREROLL` shifts both the picture and the music.

## Claims and sources

- Each shot's problem comes from the skill that hunts it: refactor-codebase's
  hidden links (one feature spread across folders by layer), and the
  find-overengineering, find-state-machines, ratchet-files and audit-tests
  skills it runs. The 8k-token read is ratchet-files' default budget.
- "Run it regularly" is how we recommend using the skill. The skill itself
  doesn't claim it; it is a recommendation.
- The counts (40 sessions, 7 places, 28 lines, 31k tokens, the weekly chart)
  are illustrative, not measured.

The audio is verified by measurement (ffmpeg `ebur128`: −12.7 LUFS integrated
on the master, −1.2 dBTP true peak; a spectrogram shows the risers and
impacts at their cue times), not by ear.
