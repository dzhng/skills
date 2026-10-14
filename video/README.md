# Launch video

A ~35s showreel-style launch video for this repo, made with the
[launch-video](../skills/graphics/launch-video/SKILL.md) skill. The concept
grows out of the hero art's *fog of war*: a hex continent under fog gets mapped
(`/explore-unknowns`), sliced into territories (`/write-spec`), and built on at
night while an agent verifies each territory (`/goal /implement-spec`). It ends
on "the factory runs itself" and collapses into the wordmark's period.

```bash
npm install
npm run audio    # synthesize + master public/soundtrack.wav (-12 LUFS, -1 dBTP)
npm run studio   # scrub it in the browser
npm run draft    # half-scale review render
npm run render   # 1080p60 H.264, 320k AAC → out/skills-launch.mp4
npm run still -- KeyArt out/key-art.png   # the headline-number still
```

The world is three.js (via `@remotion/three`), so rendering needs a GPU-backed
browser (`--gl=angle`, already in the scripts). Renders and generated audio are
ignored; rerun `npm run audio` after a fresh clone.

## One timing source

`src/cues.ts` holds every event time in song seconds at 120 BPM. The 3D world,
the type layers, and `audio/synth.ts` all read it, so moving a cue moves its
picture and its sound together. Add a visual event as a cue first, then give it
a sound. Everything is a pure function of song time; nothing reads frames.

The first 0.3s is a pre-roll that holds the finished install as the feed
thumbnail; `PREROLL` shifts both picture and music.

## Claims to preserve

- "The factory runs itself" restates the root README's unattended middle of
  the full loop ("software factories"). Keep it tied to it.
- The unattended timer counts up through hours into days as an illustration of
  a long autonomous run; it is not a measured claim.
- "Claude Code · Codex · +70 harnesses" comes from the root README.

The audio is verified by measurement (ffmpeg `ebur128` and a spectrogram), not
by ear.
