# refactor-codebase launch video

A 52s showreel for the [refactor-codebase](../skills/review/refactor-codebase/SKILL.md)
skill, made with the launch-video skill. The pitch: it is tuned to find the
patterns AI-written code piles up, layer after layer of debt, so run it
regularly to de-slop the codebase. The world is a board of modules wired by
cables. Colour is the reason a module changes, and the slop scatters each
colour across the board.

1. **The tug.** A hook lifts one module, and five others of the same colour
   tear loose with it: one change, six places.
2. **Title.** "De-slop your codebase." `/refactor-codebase`.
3. **Layer 1: AI slop.** A scan beam crosses the board, tags every problem,
   and names the patterns as it hits them: swallowed error, retry + sleep, if
   for one value, reaching into internals, param for one caller, pass-through
   wrapper. Then the slop goes, one kind per bar: the tape tears off, the
   wrappers sink, and the needless links snap.
4. **Layer 2: the debt under it.** The floor turns red. A deeper scan sweeps
   back and finds the hidden coupling underneath (copy-pasted logic, one
   feature in five folders). Each feature then gathers into one place.
5. **The tug again,** matched to the opening: one change, one place.
6. **Every week.** New slop creeps in between the clean districts, and each
   week's sweep clears it. Run it regularly. Keep the slop out.

```bash
npm install
npm run audio    # synthesize + master public/soundtrack.wav (-12 LUFS, -1 dBTP)
npm run studio   # scrub it in the browser
npm run draft    # half-scale review render
npm run render   # 1080p60 H.264, 320k AAC → out/refactor-codebase-launch.mp4
npm run still -- KeyArt out/key-art.png   # "De-slop your codebase." still
```

The board is three.js (via `@remotion/three`), so rendering needs a
GPU-backed browser (`--gl=angle`, already in the scripts). Renders and
generated audio are ignored; rerun `npm run audio` after a fresh clone.

## One timing source

`src/cues.ts` holds every event time, in song seconds at 120 BPM.
`src/world/board.ts` derives the per-item times from it:
- each tag's time comes from when a scan front crosses it;
- each block's move comes from its fix;
- each week's slop comes from that week's sweep.

The board, the type and `audio/synth.ts` all read those two files, so moving a
cue moves its picture and its sound together. Everything is a pure function of
song time.

The first 0.3s is a pre-roll that holds the title card as the feed thumbnail.
`PREROLL` shifts both the picture and the music.

## Claims and sources

- Every pattern named on screen comes from the skill's own list of hidden
  links, needless links, surplus, and special cases.
- "Layer 2" is the skill's step 4: search again, and go back to step 1 with
  what the search finds.
- "Run it regularly" is how we recommend using the skill. The skill itself
  doesn't claim it; it is a recommendation.
- The counts (6 places, 22 + 9 problems, 4 weeks) are illustrative, not
  measured.

The audio is verified by measurement (ffmpeg `ebur128`: −12.7 LUFS integrated
on the master, −0.9 dBFS peak; a spectrogram shows the risers and impacts at
their cue times), not by ear.
