# Look recipes

These are the exact values behind the look. They are written as CSS where CSS is the most direct way to describe them. Port them to whatever renderer you use. Pixel values assume a 1920 × 1080 frame; scale them with the frame height.

## Stage

```css
background: #000;               /* a true black void: no wallpaper, no haze, no floor */
```

The product's own dark chrome is the only surface. Everything that is not UI is black.

## Camera

Put the UI on one plane inside a perspective camera. Rotate in-plane first, then tilt, then yaw. In CSS, transforms apply right to left, so the order below does exactly that:

```css
.camera { perspective: 1300px; perspective-origin: 50% 50%; }

.plane {
  transform-origin: var(--fx) var(--fy);   /* the focal point, in UI pixels */
  transform:
    translate3d(var(--tx), var(--ty), 0)   /* drift: animated */
    rotateY(var(--yaw))                    /* ±5–15deg */
    rotateX(var(--pitch))                  /* tilt back: 30–50deg */
    rotateZ(var(--roll))                   /* in-plane: ±10–20deg, sign flips per shot */
    scale(var(--mag));                     /* magnification at the focal point */
}
```

| Shot | `--mag` | `--pitch` | `--roll` | `--yaw` | Perspective |
|---|---|---|---|---|---|
| Extreme macro | 5–7 | 35–50° | ±12–20° | ±5–15° | 1100–1300 px |
| Macro | 2.5–4 | 30–45° | ±10–18° | ±5–12° | 1200–1400 px |
| Medium | 1.5–2.5 | 25–40° | ±8–15° | ±5–10° | 1300–1500 px |
| Wide (payoff only) | 0.8–1.1 | 8–12° | 0° | ±0–3° | 1800–2200 px |

Check the result: in-focus text should read diagonally, and near text should be about 1.4–1.8× the size of far text. If the frame looks like a flat screenshot, increase pitch before anything else.

### Drift

Interpolate the translate, a small scale change, and a small angle change across the shot:

| Move | Amount over the shot |
|---|---|
| Track along the action | 3–10% of frame width; up to 20–35% for a long pan along a diff or document |
| Push | 1–5% scale |
| Turn | 0.5–4° of roll or yaw |

Use linear interpolation, or an ease-out over the first third that hands off to a slow, constant drift. Never ease to zero velocity before the cut.

## Depth of field

This is optical depth of field, not a blurred background layer. Blur depends on each point's depth relative to the focal plane, so it grows continuously toward both the near and the far edge of the tilted UI.

```
depth(p)    = z of plane point p after the camera transform
blur(p)     = min(maxBlur, k * |depth(p) - depth(focus)|)
```

| Shot | Sharp band (share of frame height) | Near-edge blur | Far-edge blur | `maxBlur` |
|---|---|---|---|---|
| Extreme macro | 4–8% | 10–16 px | 16–24 px | 24 px |
| Macro | 8–15% | 6–12 px | 12–20 px | 20 px |
| Medium | 15–30% | 4–8 px | 8–14 px | 14 px |
| Wide | 50–70% | 0–3 px | 3–6 px | 6 px |

**Implementation in a DOM stack**: depth is linear across the plane, so you can approximate it with 6–8 stacked copies of the plane, each with a stronger `filter: blur()`, each masked to a band at a greater distance from the focal line with `mask-image: linear-gradient(...)` on the plane itself. Point the gradient along the plane's depth direction, which you get by applying the inverse rotation to the camera's z-axis. Feather each band by about a third of its width so no seams show.

**Rack focus**: animate `depth(focus)` (the focal line's position on the plane) over 0.4–0.8 s on an ease-in-out when attention moves.

**Bokeh brightness**: out-of-focus bright text should spread and dim, not glow. Lower its opacity to about 0.6–0.8× as it blurs.

## Subject light

A neutral pool that follows the subject. A single screen-space radial gradient makes it look like a hole cut in a black overlay: always round, always the same, always centred on the same point. Four things make it read as light falling on the slab instead.

### 1. Put the pool on the plane

Light lands on the UI, so attach the pool to the plane and let the camera project it. Give the light layer the same size, `transform-origin`, and `transform` as `.plane`, and stack it above every depth-of-field copy:

```css
.light {
  position: absolute;
  width: var(--ui-w); height: var(--ui-h);   /* the UI's own size */
  transform-origin: var(--fx) var(--fy);
  transform: /* identical to .plane */;
  pointer-events: none;
  background:
    /* core: the hot spot, nudged toward the key */
    radial-gradient(
      ellipse var(--cw) var(--ch) at var(--kx) var(--ky),
      transparent 0%, transparent 45%,
      rgb(0 0 0 / 0.1) 70%, rgb(0 0 0 / 0.22) 100%
    ),
    /* spill: wide and soft, ending in black */
    radial-gradient(
      ellipse var(--sw) var(--sh) at var(--lx) var(--ly),
      transparent 0%, transparent 15%, rgb(0 0 0 / 0.06) 30%,
      rgb(0 0 0 / 0.22) 50%, rgb(0 0 0 / 0.5) 68%, rgb(0 0 0 / 0.82) 85%, #000 100%
    );
}
```

All positions and radii are in UI pixels. The tilt foreshortens the ellipse into an egg that falls off quickly toward the far edge and stretches toward the near edge, and the roll lays it along the text diagonal. Every shot gets a different shape for free, because every shot has a different camera.

Make the pool longer along the line of action than across it: wide for a line of typing or a row, tall for a column that streams downward.

| Shot | Spill radius on screen, along / across (share of frame width) | Core radius (share of spill) |
|---|---|---|
| Extreme macro | 0.32–0.38 / 0.20–0.25 | 0.35–0.45 |
| Macro | 0.40–0.45 / 0.26–0.30 | 0.35–0.45 |
| Medium | 0.48–0.55 / 0.32–0.38 | 0.40–0.50 |
| Wide | 0.70–0.80 / 0.50–0.60 | no core; the light opens up |

To get UI pixels, divide the on-screen radius by the magnification: at 4×, a 0.42 radius is `0.42 × 1920 / 4 ≈ 200` UI px. Check the result on screen and adjust, since the tilt compresses the across axis.

### 2. Give it a direction

A real fixture hangs off to one side. Offset the core (`--kx`, `--ky`) from the spill centre by 8–15% of the spill radius, toward the key. The two falloffs then stop being concentric: one side of the subject has a long, soft shoulder and the other drops off quickly.

Put the key toward the far side of the slab and a little to one side, and flip that side whenever the roll flips sign, so the light direction alternates with the diagonal. Keep it fixed within a shot.

The two layers stack multiplicatively (each passes `1 − alpha` of the light), which gives a hot spot with a gentle spill instead of one linear ramp to black. Keep at least five stops in the spill: three linear stops are what make a gradient read as CSS.

### 3. Flag it, sometimes

In about a third of the shots, cut one side of the pool with a soft straight edge, like a flag in front of the fixture:

```css
.flag {   /* full-frame, screen space, above the light layer */
  background: linear-gradient(
    var(--flag-angle),
    transparent 0%, transparent var(--flag-at),
    rgb(0 0 0 / 0.75) calc(var(--flag-at) + 20%)
  );
}
```

Place the edge 20–30% of the frame width from the subject, at least 25° off the text diagonal, with a 15–25% feather. The subject itself stays on the lit side. The flag rides with the pool, keeping the same offset from it as the camera drifts, so it never sweeps across the frame.

### 4. Let it react to the action

The light never performs, but it does respond:

- **Trail the subject.** Drive the spill centre with a lagged copy of the subject's position, so the light arrives just after the subject, like a follow-spot operator. It never leads. To keep each frame a pure function of time, average the path over a short window: `light(t) = mean of subject(τ) for τ in [t − T, t]`, with `T` = 0.3–0.5 s and `τ` clamped to the start of the shot. The core follows the same lagged position, plus its offset.
- **Follow the rack.** When focus racks to a new subject, the pool slides there too, through the same lag, so it lands slightly after the focus does.
- **Open with the content.** When an answer streams in or a document writes itself, grow the spill radii 20–40% over the shot to keep the new lines lit, smoothed with the same window.
- **Open up for the payoff.** The wide shot uses the widest, flattest pool in the film. The cut back to a close-up returns to a tight one, and that contrast is part of the release.

### Frame vignette

The vignette belongs to the lens, not the light, so it stays centred and constant. It only keeps the corners black:

```css
background: radial-gradient(120% 95% at 50% 50%, transparent 50%, rgb(0 0 0 / 0.7) 100%);
```

No colour goes into any of these layers.

## Grade

| Target | Value |
|---|---|
| Black | True black (#000) outside the UI |
| Average frame luminance | 4–10% (most shots about 6–8%) |
| In-focus primary text | about 85–90% white, never clipped |
| Secondary text | 45–60% white |
| Colour | Only the product's own: status icons, diff green and red, a brand-coloured button. Neutral everywhere else. |

The product slab keeps its real chrome. Add only a faint edge to separate panels from the void:

```css
border-radius: 14px;
box-shadow:
  inset 0 0 0 1px oklch(1 0 0 / 0.06),     /* hairline edge */
  inset 0 1px 0 oklch(1 0 0 / 0.08);       /* faint top highlight */
```

## Streaming reveal (stipple dissolve)

Generated text, icons, and avatars resolve line by line out of a fine stipple of dots:

```
noise(x, y) = hash of the 2 × 2 px cell containing (x, y), in [0, 1)
p(t)        = easeOutCubic(clamp((t - lineStart) / 0.5, 0, 1))
visible     = glyph pixel AND noise(x, y) < p(t)
```

- While `p < 1`, draw the visible dots 10–15% brighter, and add a 1–1.5 px blur that falls to 0 at `p = 1`.
- Stagger lines by about 0.1 s, top to bottom. Start each line slightly before the previous one finishes.
- Rows that hold icons resolve the icon and the text together.

## Other motion

| Event | Recipe |
|---|---|
| Typing | 12–13 cps; a solid caret while typing, blinking at about 1.6 Hz while idle. Identifiers and file names become inline chips once the token is complete. |
| Send | The composer text clears; the message appears in the thread with the Appear recipe. |
| Appear | `opacity 0 → 1`, `translateY 12px → 0`, `blur 6px → 0` over 0.35 s on `cubic-bezier(0.22, 1, 0.36, 1)`. No overshoot. |
| Select (tab, nav item) | The selection pill or highlight slides to the new item over 0.35 s on an ease-in-out. The new label brightens from 55% to 90% white. |
| Press (button) | Scale to 0.97 over 0.08 s and back over 0.2 s; the button's own pressed colour shows briefly. |
| Line select (code) | A gutter control fades in on the line, then the line's highlight fills over 0.25 s. |
| Document writing | Headings, then paragraphs, then table rows, each with the stipple reveal. |
| Diagram drawing | Nodes appear, then connectors draw on with a `stroke-dashoffset` over 0.4–0.6 s, then labels stipple in. |
| Scrolling | 120–250 px/s of UI at native scale, ease-in-out at the start and end. |

## Leaving the last UI shot

Either hard-cut to black, or over 0.4 s: `blur 0 → 12px` and `brightness 1 → 0`.

## Outro type

```css
/* one line, centred on black */
font: 500 90px/1.2 <the product's sans>;
letter-spacing: -0.02em;
color: rgb(255 255 255 / 0.95);
```

Enter over 0.8 s on an ease-out: `filter: blur(16px) → blur(0)` and `opacity 0 → 1`. An optional soft glow, `text-shadow: 0 0 40px rgb(255 255 255 / 0.3)`, fades to 0 as the type sharpens.

A quieter alternative is to fade the colour from 35% to 95% white over 1.2 s, with no blur.

For the name-then-tagline variant, set the name, hold it for about 1.5 s, then fade in the tagline after it on the same line over 0.6 s while the whole line slides to re-centre on an ease-in-out.

## Logo

Use the mark alone, or the mark with the wordmark. The mark is about 115 px tall, the gap to the wordmark about 0.4× the mark height, and the wordmark the size of the outro type. Plain white, with no bloom and no glow. Cut or dissolve (0.3 s) to it, hold it completely still for 4–5 s, and end the film on it.

## Render

| Setting | Value |
|---|---|
| Resolution | 1920 × 1080 (or 1920 × 960 for a 2:1 widescreen cut); a 2× master for delivery |
| Frame rate | 60 fps |
| Motion blur | 4+ sub-frames per frame, 0.5 shutter (180°) |
| Grain | Fine temporal luma noise (strength about 4 on ffmpeg's `noise` filter), applied after the grade |
| Legibility | Text in focus is at least 24 px tall on screen at 1080p. Check it at 960 × 540. |
