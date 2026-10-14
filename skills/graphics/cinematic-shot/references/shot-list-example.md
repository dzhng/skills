# Shot list example

This is a 52 s film, written in the abstract so it maps onto any feature. Replace each subject with the real piece of UI. Keep the rhythm, scales, and angles.

The story shape is:

1. A close look at the familiar app, where the entry point for the feature appears.
2. The feature's view opens, and we read its core content up close.
3. The user asks for something; the product answers while we watch.
4. A single confirming action.
5. The payoff, in the film's only wide shot.
6. A close-up on the result.
7. Copy, then the logo.

Magnification is relative to the UI at its native size, measured at the focal point. Angles are pitch (tilt back) / roll (in-plane, which sets the diagonal) / yaw. Drift is the camera move across the whole shot.

| # | Cut | Len | Subject in focus | Mag. | Pitch / roll / yaw | Drift | Action |
|---|---|---|---|---|---|---|---|
| 1 | 0.0 | 3.0 | The app's sidebar near the window corner | 4.0 → 4.2× | 35° / −12° / +8° | Track down 5%, push 2% | A new nav item for the feature fades in, then its highlight fills. No cursor. |
| 2 | 3.0 | 3.5 | The feature's list view, first few rows | 2.8 → 2.9× | 38° / +14° / −6° | Track right 8% along the rows | Rows resolve top to bottom with the stipple reveal. Focus sits on the second row. |
| 3 | 6.5 | 6.0 | The core content: a diff, a document, or a canvas | 2.0 → 2.1× | 32° / −10° / +10° | Long pan, 25% of frame width, along the reading direction | Content scrolls gently under the camera. A highlighted region passes through the focal band. |
| 4 | 12.5 | 2.5 | One tab or mode switch | 6.0 → 6.2× | 45° / +16° / −8° | Track sideways 5% | The selection pill slides to the new tab, and its label brightens. |
| 5 | 15.0 | 8.0 | The composer, then the first lines of the reply | 3.0 → 2.8× | 40° / −14° / +6° | Rise 6% with the reply, slight pull | Type a 40-character prompt at 12 cps; identifiers become chips. Send. The reply starts streaming; rack focus from the input to the reply over 0.6 s. |
| 6 | 23.0 | 6.0 | The generated result: a list, a plan, a document writing itself | 2.2 → 2.3× | 34° / +10° / −10° | Follow the content down, 10% | Lines stipple in top to bottom, about 0.1 s apart. Headings first, then body, then a table or diagram. |
| 7 | 29.0 | 2.5 | The primary action button | 6.5 → 6.7× | 48° / −18° / +12° | Track 3% toward the button | The button presses and shows its own pressed colour. Hold. |
| 8 | **31.5** | 7.0 | The whole window: the **only wide shot** | 0.9 → 0.95× | 10° / 0° / +2° | Push 5%, rise 3% | **Payoff.** Several regions change at once: the document scrolls, a panel updates, a list re-sorts. No shake and no flash. The size of the shot is the impact. |
| 9 | 38.5 | 4.5 | The single best line of the result | 3.2 → 3.3× | 38° / +12° / −8° | Track right 5% | The last line resolves. Hold on the after state. |
| — | 43.0 | 4.5 | Black | — | — | — | Blur-and-dim out of shot 9 over 0.4 s. The product name un-blurs at 90 px, then the tagline joins it on the same line. |
| — | **47.5** | 4.5 | Black | — | — | — | Cut to the still logo. Hold to the end at 52.0. |

## Why it works

- **Shot length follows the action.** The long shots (3, 5, 6, 8) are where something visibly happens: reading, typing, generating, paying off. The short shots (1, 4, 7) are punctuation, a single selection or press. Long and short alternate, so the film breathes instead of strobing.
- **Scale rhythm**: macro, macro, medium, **extreme macro**, macro, medium, **extreme macro**, **wide**, macro. The extreme macros are accents between longer reads. Holding the wide shot back until the payoff makes it land like a release.
- **The diagonal flips on every cut.** Roll alternates between negative and positive, so even two macros in a row read as different camera positions.
- **The camera is always motivated.** It tracks along a row, rises with a streaming reply, and pushes toward a button. It never moves just to move.
- **Focus tells the eye where to go.** Only a thin band is sharp. In shot 5, the rack from the input to the reply is the edit inside the shot.
- **No pointer, no effects.** The UI selects, presses, and writes on its own, so every frame stays about the product.
- **The ending is quiet.** After the widest, busiest shot, the film settles back into one close line, then one line of type, then a logo that does nothing at all.

## Camera numbers in practice

With a CSS-style perspective camera at `perspective: P` looking at a plane `dist` away, the magnification at the focal point is about `P / dist`. At `P = 1300`:

| Magnification | `dist` |
|---|---|
| 6× | 217 |
| 4× | 325 |
| 3× | 433 |
| 2× | 650 |
| 1× (use P ≈ 2000 for the wide shot) | 1300 |

A 4% push from 2.8× to 2.9× takes `dist` from 464 to 448. With a strong pitch, the near edge of the frame can be several times closer than the far edge, which is exactly where the depth of field comes from.
