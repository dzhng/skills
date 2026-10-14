---
name: cinematic-shot
description: Shoot software UI like a film. A sequence of hero shots, each a steep, oblique, extreme close-up of the interface floating in black, with a razor-thin focal plane, a slow motivated camera drift, and UI that acts on its own, hard-cut on the action, ending on one line of copy and a still logo. Use when asked for a launch video, product film, feature trailer, teaser, promo clip, hero shot, or any "cinematic" footage of an app or UI. This skill covers camera, framing, light, and edit. It is stack-agnostic.
---

# Cinematic shot

You are the director and the DP, not the motion designer. The film is a sequence of **hero shots**. Each one looks at a real piece of the product's UI from a steep, low angle, so close that the focal plane covers only a line or two of text and everything else melts into black. The camera drifts slowly toward where the next thing will happen. The UI does the work by itself: things get typed, streamed, selected, and written while we watch. Nothing explains itself with captions.

This skill is about camera, framing, light, and the edit. Build the film with any rendering stack. Whatever you choose, make every frame a pure function of time, so the film renders deterministically and can take motion blur.

Read [references/look.md](references/look.md) for exact camera, depth-of-field, light, reveal, and type recipes. Read [references/shot-list-example.md](references/shot-list-example.md) for a full example of the shot grammar.

For a ~15 second promo video made in code from a landing page (a continuous 3D fly-over of the page ending on a title card with the brand, logo mark, a two-part closing line, and an optional track), follow [references/landing-page-promo.md](references/landing-page-promo.md).

## The taste

A black void. The product floats in it like a dark slab, tilted away from the camera, lit by a soft pool that follows whatever matters and lets everything else fall into black. The camera is low and close, looking *along* the UI rather than at it, so lines of text run diagonally across the frame and shrink into the distance. The focal plane is a thin band: one control, one line of typing, one row of a list is sharp, and the rest is soft bokeh. The camera never stops drifting and never moves fast. Shots are long enough to watch something happen. The only colour is the product's own. Restraint everywhere else.

## 1. Find the story before the shots

Before planning a single camera, write down:

- **The flow**: the 4–7 things that happen on screen, in order. Examples: open a view, select a tab, type a prompt, watch the answer stream in, watch a document write itself, approve.
- **The payoff**: the one moment where the product visibly does something remarkable. The film exists to reach this frame.
- **The demo content**: concrete, believable data inside the UI, such as names, IDs, statuses, code, and short human-sounding text. Real-looking density is what makes a close-up beautiful. A list of twelve plausible issues reads as a product; three grey placeholders read as a mockup.
- **One line of copy**: the product or feature name, then a tagline of five words or fewer.

## 2. Write the shot list

Post the shot list before building, then keep going:

| # | Cut at | Len | Subject (what is in focus) | Scale | Angle | Move | Action |
|---|---|---|---|---|---|---|---|

Rules:

- **Length**: 45–55 s in all, with 8–10 UI shots, then the copy and the logo.
- **Shot length follows the action.** Process shots (typing, streaming, a document writing itself, a long diff) run **5–9 s**. Punctuation shots (a tab, a button, a nav item) run **2–3.5 s**. Alternate the two, so a long watch is followed by a short accent. Median about 5 s.
- **Cut on the action, not on a metronome.** There is no beat grid. Cut in when the subject is already in frame or about to arrive; the action starts within 0.3–0.8 s; hold the result for 0.5–1 s; cut while the camera is still moving.
- **One idea per shot.** A shot can contain a short chain (type → send → the reply starts) only if the camera follows one continuous thread.
- **Vary scale like an editor.** Extreme macros and macros dominate. Medium shots carry the longer process. Hold back the **wide shot** (the whole window, near-frontal) for the payoff, where it lands like a release. Return to a close-up after it.
- **Alternate the diagonal.** If the text in one shot rises to the right, the next shot's text falls to the right, or the plane tilts the other way. Every cut should read as a new camera position.
- **No continuity cursor.** The UI acts on its own (see section 4). The viewer never needs to follow a pointer between shots.
- **Separate surfaces get separate setups.** When the story moves to another surface (a terminal, a phone, another app), give it its own slab in the same black void and hard-cut to it.

### Shot scales

Measure scale as magnification of the UI at the focal point, relative to its native size:

| Scale | Magnification | Use for | Depth of field |
|---|---|---|---|
| Extreme macro | 5–7× | A single tab, a button, a nav item, a status badge. One or two words fill a third of the frame. | Only the subject is sharp. Everything else is heavy bokeh. |
| Macro | 2.5–4× | A composer with a line of typing, a few rows of a list, a code hunk | A band 2–4 text lines deep is sharp |
| Medium | 1.5–2.5× | A panel at work: a list streaming in, a document writing itself, a diff with a sidebar | A wider band is sharp; the far edge and near edge stay soft |
| Wide | 0.8–1.1× | The payoff only: the whole window, near-frontal, with content scrolling or changing | Mostly sharp; the frame edges still soften |

Macro shots must stay crisp. Rasterise the UI at the resolution of the magnification (for example 6×) before the camera scales it. Never upscale a 1× bitmap.

### Camera angle

This is the signature of the look. Except for the wide shot, the camera is **low and oblique**, looking across the UI plane:

- **Tilt the plane back** 30–50° (pitch), so the far side of the UI recedes and the near side looms.
- **Rotate it in-plane** 10–20° before tilting, so lines of text run diagonally. Flip the sign between consecutive shots.
- **Add a little yaw**, ±5–15°, so one side of the frame is closer than the other.
- **Use a short-ish perspective** so the foreshortening is obvious: near text should be about 1.4–1.8× the size of far text in the same frame. A perspective distance of about 0.6–0.75× the frame width works (1100–1400 px at 1080p).
- **The wide shot is the exception**: near-frontal, pitch 8–12°, no in-plane rotation, yaw within ±3°.
- **Framing**: crop aggressively. The slab's edges run off frame or fall into black. Leave generous black: a quarter to a half of the frame is often the void, or UI so far out of focus that it reads as texture.

### Camera move

Each shot is one continuous move. It is **motivated**: the camera drifts toward where the next thing will appear.

- **Track** along the reading direction of the action: 3–10% of the frame width over a typical shot, up to 20–35% for a long pan along a diff or a document.
- **Follow** content as it grows: when an answer streams downward, drift down with it; when a line is typed, drift with the caret.
- **Push** gently, a 1–5% scale change over the shot. Pull-outs are rare.
- **Turn** slightly, 0.5–4° of roll or yaw change over the shot.
- **Speed**: constant (linear) velocity, or a short ease-out arrival over the first third that then continues at a slow constant drift. The camera never eases to a full stop and is still moving at the cut. No handheld noise, no shake.
- **Rack focus** with the action: when attention moves from the typed line to the reply, or from a title to the body, slide the focal band there over 0.4–0.8 s.

## 3. Light and grade: a black void

Every shot must look like it was filmed on the same stage. Values are in [references/look.md](references/look.md).

- **Stage**: true black around the product. No gradient wallpaper, no coloured haze, no floor.
- **Subject light**: a soft, neutral pool on the subject, not the frame. The UI falls off to black within roughly a third of the frame width from the focal point. The pool lies *on the UI plane*, so the tilt foreshortens it and the roll lays it along the diagonal. It is longer along the line of action, has a hot spot nudged toward an off-axis key (the key side flips with the diagonal), and sometimes has one side cut by a soft flag. It trails the subject by a beat, slides with a rack focus, and opens up as content grows and at the payoff. It is never a centred circle that looks the same in every shot. There is no coloured key light.
- **Low key**: the average frame is very dark (about 7–10% luminance). Bright pixels are reserved for in-focus text and the product's own coloured UI. Anything bright and out of focus gets dimmed.
- **The product is a dark slab**: its own chrome, rounded corners, and a faint 1 px edge highlight on panels. Keep the real UI faithful; do not restyle it.
- **Colour belongs to the product**: status icons, diff greens and reds, a brand-coloured primary button. Add no accent of your own: no flares, no glows, no rings, no tinted light.
- **Finish**: motion blur (180° shutter, 4+ sub-frames) and fine film grain on the final render. Together with the depth of field, these three do almost all the work.

## 4. Motion inside the shot

- **No cursor.** The UI acts on its own. A nav item highlights. A tab's selection pill slides over. A button depresses. A gutter control appears on a code line and the line highlights. If a click must read, show it through the control's own pressed or selected state.
- **Typing**: 12–13 characters per second with a visible caret. Code identifiers and file references turn into inline chips as they are typed. On send, the composer clears and the message moves into the thread.
- **Streaming**: generated text resolves line by line, top to bottom. Each line arrives as a fine stipple of dots that condenses into solid glyphs over about 0.5 s, staggered by about 0.1 s per line. Icons and avatars resolve the same way.
- **Writing**: documents and diagrams build in order: a title, then a heading, then paragraphs; diagram nodes, then connectors drawing on, then labels.
- **Scrolling**: in medium and wide shots, the content may scroll smoothly under a drifting camera. This is the second layer of motion, and it should feel like reading speed.
- **Appear**: new panels and messages fade and rise slightly through a small blur on an ease-out of 0.3–0.5 s. Nothing pops with overshoot.
- **No impact effects.** The payoff is shown by scale (the wide shot) and by the amount that changes, not by shake, flashes, or rings.

## 5. Ending: copy, then a still logo

1. **Leave the last UI shot** with a hard cut to black, or a quick 0.4 s blur-and-dim into black.
2. **The copy**: one centred line on black, about 80–100 px at 1080p, weight 500, tracking about −0.02em, white. It arrives by un-blurring from about 16 px while fading up over 0.6–1 s. Either set the whole line at once, or set the product name first and then append the tagline on the same line, letting the line re-centre as it grows. A faint soft glow behind the type may settle away as it sharpens; nothing sweeps across it. Hold for 3–5 s.
3. **The logo**: cut or short-dissolve (about 0.3 s) to the still logo, either the mark alone or mark and wordmark, about 110–120 px tall at 1080p, in plain white. It does not move, pulse, or glow. Hold it for 4–5 s and end the film on it.

Add no CTA buttons, URL cards, or "available now" banners unless asked.

## 6. Sound

There is **no music**: no score, no drone, no beat, no risers, no braams, and no tonal stings. The soundtrack is quiet, tactile foley over near-silence.

Every visible action gets a cue: a soft key tick per typed character, a soft click when a tab or item is selected, a quiet whoosh on send, and a faint granular hiss under streaming text. The payoff gets no impact. The copy and the logo play over silence.

## Don't

These make a film look like a tutorial or a template:

- Cold opens, title cards, or "Introducing…" and "New in…" screens before the action.
- Keycap overlays, captions, callout arrows, or labels that explain the UI.
- A visible mouse pointer driving the action, or a cursor travelling between targets.
- Flat, frontal close-ups. Outside the wide payoff shot, the camera looks across the UI, not straight at it.
- Everything in focus. If the frame has no bokeh, the shot is too wide or the focal band is too deep.
- Dissolves or dips to black between UI shots. The UI shots use hard cuts only.
- Fast moves, slow orbits, big 3D rotations, swooping fly-throughs, camera shake, or a camera that eases to a stop.
- Cutting to a grid. Two-second shots back to back read as a sizzle reel; let process shots breathe.
- Restyling the product's UI to look "cinematic". Keep the real UI faithful, and get the cinema from the camera, the focus, and the light.
- Anamorphic flares, glow, accent rings, coloured key light, or any colour the product does not already have.
- Light that moves across the frame: sheen bands, sweeps, or light bars travelling over the UI. The light follows the subject; it does not perform.
- A light pool that is a screen-space circle, centred and identical in every shot. It reads as a black overlay with a hole in it, not as light on the slab.
- An animated logo reveal.
- Music of any kind, including a score, a beat, a drone, risers, braams, or bells.

## 7. Verify like a DP

Render a still at the middle of every shot, at each action's peak, at the payoff, and at the copy and logo frames. Judge each one as a frame grab from a film:

- There is exactly one sharp subject, and the eye lands on it in under half a second.
- The focal band is thin, with both near and far bokeh, except in the wide shot.
- The plane reads as tilted: text runs diagonally and visibly shrinks into the distance.
- Text in focus is legible at half resolution.
- At least a quarter of the frame is black or near-black.
- Consecutive shots differ in scale or in the direction of the diagonal.
- Every frame shares the same black level, neutral light, and grain, but the pool's shape changes with each camera: foreshortened, stretched along the action, and lit from one side.
- Pick the strongest frame as the poster.

Iterate until every still could be a screenshot in a launch post.
