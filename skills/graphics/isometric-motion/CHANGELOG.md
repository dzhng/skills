# Changelog

All notable changes to Anatomy are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Releases follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html); entries from before the first release are dated.

## [Unreleased]

### Added

- Antigravity support, alongside Claude Code, OpenCode and Codex. Documented user and project installation paths in the README and CONTRIBUTING, updated SKILL.md compatibility, and added Antigravity to the bug report form.

### Changed

- A Figure no longer quotes a time to the user. The 30–90 minute estimate was often far longer than the build itself ([#41](https://github.com/wheresryan22/anatomy/issues/41)).

### Fixed

- `capture.mjs` waits for the page to load before it touches it, even with `--wait 0`, and gives up with an error when Chrome leaves a request unanswered for 60 s instead of hanging.
- `drive.mjs` `until` times a condition inside the page, so one that is already true passes however short the wait, even on a slow machine; a promise that never settles still times out.
- Start headless Chrome on Windows from an elevated terminal: `capture.mjs`, `drive.mjs` and `turn-check.mjs` pass `--do-not-de-elevate` there. Chrome otherwise relaunches itself without the elevation, the process the script started exits with code 0, and the check stops with `Chrome exited before startup: 0` while the relaunched browser stays running.
- Resolve the current React readout target on every write so replaced readouts and anchors do not leave updates on detached elements.
- Reject drive `turn` and `orbit` actions when the page has no callable 3D turn controller, instead of reporting an unchanged figure as a successful turn.
- Await asynchronous `until` conditions without treating the promise itself as success, while enforcing the wait deadline.
- Capture measures the current figure before every screenshot, including moved, resized and timed zoom crops.
- `publish.mjs --submit` makes the fork again with gh 2.101 and later, which refuse `--remote` when a repository is named; gh never adds a remote in that case, so the flag is gone (#53).

## [1.1.0] - 2026-10-12

### Added

- `scripts/publish.mjs` and `references/publish.md`: share a finished framework-free figure in the community gallery, `wheresryan22/anatomy-community`. The script copies the figure, points its kit imports at the gallery's `.skill/` link, records the kit fingerprint (`scripts/fingerprint.mjs`) so the gallery can rebuild it with the same kit version, and copies only the source, under `figures/<author>/<id>/`. The gallery builds the pages in a locked sandbox. `--submit` sends it as a pull request after asking, making a fork when needed.
- `publish.mjs` records how long the figure took to make and how many tokens it used. In Claude Code it reads them from the session's own log (`scripts/session.mjs`, through `CLAUDE_CODE_SESSION_ID`, subagents included): from the request that made the figure to the request to publish it, idle gaps over 10 minutes left out and cache reads not counted. The plan shows both before anything is sent. `--minutes` and `--tokens` set them by hand, `--no-session` leaves them out.
- `publish.mjs` accepts `--agent Antigravity`, alongside Claude Code, OpenCode, Codex and Other.
- OpenCode and Codex support, alongside Claude Code. `SKILL.md` exposes `/anatomy` to OpenCode through `metadata`, `agents/openai.yaml` gives Codex its display name, and the README, CONTRIBUTING and the bug report form cover all three agents.

### Fixed

- Start headless Chrome on Linux: `capture.mjs`, `drive.mjs` and `turn-check.mjs` pass `--no-sandbox` there and find Playwright's Linux Chromium under `~/.cache/ms-playwright`, so the browser checks and the gallery's validator run on Linux hosts.
- `references/publish.md` clones the gallery with `--single-branch`, so contributors skip the previews branch and its images.
- `publish.mjs --submit` no longer stops with "already exists" when an earlier run without `--submit` left the figure's folder in the clone; it only asks for `--force` when the folder is already on the gallery's main.
- Preserve configured pipe clearances in broad-phase solid and pipe sampling.
- Observe replacement and late-mounted DOM targets through useInView.
- Check texture line attachments against rounded rectangle corners, including separate radii, SVG clamping and transformed outlines.
- Honor explicit capture, drive and line-check selectors, and scope reported readouts to the requested figure.
- Decode valid SVG attribute quotes, whitespace and XML character references in audit bounds.
- Exclude invisible empty clip intersections from authored SVG bounds.
- `scripts/drive.mjs` now fails when a browser evaluation throws or rejects, rather than reporting a clean successful session.
- The arcade cabinet now accepts coins with reduced motion enabled, preserving the meter, credit and power-on events when the coin animation is skipped.
- The turning dial stops its idle tour when reduced motion is enabled while the page is open and cancels its pending automatic restart while preserving keyboard and pointer input.
- `scripts/drive.mjs` now exits with status 1 and stops subsequent actions when an `until` condition times out.
- `scripts/capture.mjs` now creates the output directory for screenshots, including nested paths under `shots/`.
- The line-end check now includes the selected element when `--select` names an SVG, rather than checking only SVGs inside it.
- `scripts/drive.mjs` now rejects unknown actions before running the session, so a misspelled verification step cannot report success.
- Browser checks now fail promptly and remove their temporary profiles when Chrome exits before its debugging port is ready.
- The line-end check now uses ellipse boundaries and transformed circle boundaries, and treats hollow interiors as empty instead of solid dots.
- The line-end check now follows SVG arc curves instead of treating each arc as a straight chord.
- Capture and drive now fail when Chrome cannot load the requested page, instead of reporting a clean browser error page.
- Orbit checks reject invalid sampling steps and empty pose lists before a zero-state sweep can pass.
- Solid clearance audits rebuild cached surface grids when sampling spacing or cell size changes.
- Tube geometry audits use tapered radii instead of replacing every segment with an averaged cylinder.
- The line verifier reflects smooth Bezier controls only after the matching curve family.
- Capture and drive send native Enter activation so button and form checks perform their default action.
- Fixed-part and coverage bounds restore a closed SVG subpath origin before relative moves.
- Audit ray casts now refresh body camera coefficients when the projection direction changes, so repeated builds retain the correct depth order.
- Audit profile tracing now checks quarter-span deviations, preserving inflected analytic and smooth profiles whose midpoint lies on their chord.
- Depth-key solving now allows large acyclic figures to converge beyond 400 rounds and avoids choosing a cycle victim from an empty set of violated rules.
- Splitting now accepts default fixed rounds and preserves explicit prism/round ownership, so a pipe fitting can be split without inventing collisions with its own pipe.
- Turning builders now reject missing named part/parent groups and duplicate group names before authored motions silently become static or alias one value.
- Native fidelity checks now compare complete filled silhouettes for cut parts and honor open round ends in the kit reference, preserving deliberately unstroked cut edges.
- Tube fidelity checks path coverage in both directions when vertex counts differ, rejecting empty or truncated live silhouettes while preserving equivalent resampling.
- Solid clearances check sliding rods whose drawn reach changes, even when their stretching geometry leaves no relative translation to a stationary obstacle.
- React `Solid` honors the existing `paths.seamless` marker so smooth tone regions receive the same seam treatment as the plain SVG renderer.
- React `Dots` retains the kit's optional per-point opacity, including fading bolt circles and pulsing dots, while ordinary points remain opaque.
- Write the first readout value even when empty or issued before passive binding.
- Measure transformed rectangular and round SVG primitives through their true affine bounds.

## [1.0.0] - 2026-10-10

### Added

- `examples/arcade-cabinet/`, an upright arcade cabinet with its side panel off. A quarter rolls down the coin chute past the coin-switch wire into the cash box, the switch's pulse runs along its cable to the board, and the CRT warms up, self-tests and runs an attract mode drawn in the plane of the tilted monitor; the stick closes a microswitch under the panel. It draws in the light and dark themes and passes `--audit`.
- `examples/spot-plate/`, a second React figure from the same site as `test-rig`: six pairs of glass drops that run together into one piece of glass as a fan of feeler blades sets `merge`. It draws in the light and dark themes.
- A first workflow step, **Size it before you start**: every request is sized as a Figure (about 30–90 minutes), a Hero (2–4 hours) or an Epic (6 hours or more), and the estimate is told to the user first. An Epic is not started until the user chooses it over a proposed Hero version. Every size has a working page within the first hour, and Claude reports when a step runs past twice its share of the estimate.

### Fixed

- `examples/test-rig/` drew its glass button dark in the light theme. `stretch.css` now has light values for its own colours.

### Changed

- The workflow steps are renumbered 1–10.
- The 4× detail sweep scales with the size: the subject and mechanism for a Figure, the whole drawing for a Hero or an Epic. The density rule itself still holds for every figure.
## 2026-10-08

### Changed

- The skill is now called Anatomy: `name: anatomy` in `SKILL.md`, invoked as `/anatomy`. It was developed privately as `isometric-objects` before this date, without releases.
- The CSS tokens are now `--anatomy-*` (for example `--anatomy-card`, `--anatomy-face`, `--anatomy-shade-0`); they were `--iso-*`. Every example is rebuilt with the new names.
- The figure card (`.iso-plate`) is square and flat: no rounded corners and no floating shadow, just a 1 px rule in the drawing's mid tone.
- `SKILL.md` makes high detail a standing rule for every figure, raises the parts list to at least 40 parts (60–150 for a hero figure), and adds a 4× detail pass to the final check.

### Added

- The public repository: a README with screenshots of the examples, the MIT license, a contributing guide, a code of conduct, a security policy, issue forms, a pull request template, and a CI workflow that rebuilds every example and fails if a committed page changes.
- What the skill contains at this point: the workflow and craft rules in `SKILL.md`; the kit (SVG core, round parts, pipes, the geometry audit, the WebGL layer, React components, and the 3D mode in beta); eight references; the headless Chrome checks in `scripts/`; six examples (`dial-indicator`, `desk-computer`, `raptor-engine`, `ripple-tank`, `test-rig`, `turning-dial`); and five evals.
