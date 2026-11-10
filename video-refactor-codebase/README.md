# refactor-codebase launch video

A 54s showreel for the [refactor-codebase](../skills/review/refactor-codebase/SKILL.md)
skill, made with the launch-video skill. The world is a board of modules wired
by cables. Colour is the reason a module changes; the tangle scatters each
colour across the board.

1. **The tug.** A hook lifts one module, and five others of the same colour
   tear loose with it: one change, six places.
2. **Title.** `/refactor-codebase`.
3. **Tag every problem.** A scan beam sweeps the board and hangs a tag on each
   problem: `?` hidden link (cables under the floor), `✕` needless link,
   `∅` pass-through junction, `!` special case (hazard tape).
4. **One fix behind many.** Blueprint. The tags fly up into one list per fix,
   each wired to where its fix will land.
5. **Land one fix at a time,** biggest first. A colour gathers into one
   district, needless cables are cut, the tape is torn off, the review stamp
   lands, and a commit is added.
6. **Search again.** Fresh inspectors sweep with flashlights, find one late
   link, and fix it.
7. **The tug again,** matched to the opening. The feature lifts as one piece:
   one change, one place.

```bash
npm install
npm run audio    # synthesize + master public/soundtrack.wav (-12 LUFS, -1 dBTP)
npm run studio   # scrub it in the browser
npm run draft    # half-scale review render
npm run render   # 1080p60 H.264, 320k AAC → out/refactor-codebase-launch.mp4
npm run still -- KeyArt out/key-art.png   # "One change. One place." still
```

The board is three.js (via `@remotion/three`), so rendering needs a
GPU-backed browser (`--gl=angle`, already in the scripts). Renders and
generated audio are ignored; rerun `npm run audio` after a fresh clone.

## One timing source

`src/cues.ts` holds every event time, in song seconds at 120 BPM.
`src/world/board.ts` derives the per-item times from it:
- each tag's time comes from when the scan front crosses it;
- each block's move comes from its fix.

The board, the type and `audio/synth.ts` all read those two files, so moving a
cue moves its picture and its sound together. Everything is a pure function of
song time.

The first 0.3s is a pre-roll that holds the title card as the feed thumbnail.
`PREROLL` shifts both the picture and the music.

## Claims and sources

- "Untangle a whole codebase in one run." is the skill's own description.
- "One change. One place." restates the skill's goal and done-criterion: "a
  typical change lands in one place".
- Every on-screen step (list every problem first, one fix behind several,
  land one fix at a time through refactor-change and code-review with its own
  commit, search again with fresh subagents) comes from the skill's workflow.
- The counts (6 places, 31 problems, 4 fixes, 5 commits) are illustrative, not
  measured.

The audio is verified by measurement (ffmpeg `ebur128`: −12.7 LUFS integrated
on the master; a spectrogram shows the risers and impacts at their cue times),
not by ear.
