// Eval harness for visual-parity-diff.mjs.
//
// Every fixture is generated here, so the correct answer is known by
// construction rather than read back from a previous run — a snapshot of
// current output would happily bless a bug. Run it from a repo where the
// script's own dependencies resolve:
//
//   REPO_ROOT=<repo> node visual-parity-diff.eval.mjs
//
// Exits nonzero on the first failing expectation set, printing every check.

import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile, readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const script = resolve(here, 'visual-parity-diff.mjs');
const repoRoot = resolve(process.env.REPO_ROOT ?? process.cwd());
const require = createRequire(resolve(repoRoot, 'web/package.json'));
const { PNG } = require('pngjs');

const checks = [];
const check = (name, pass, detail = '') => checks.push({ name, pass, detail });
const near = (actual, expected, tolerance) => Math.abs(actual - expected) <= tolerance;

// --- fixtures -------------------------------------------------------------
// fn returns [r, g, b, a]; alpha defaults to opaque so the transparency cases
// have to opt in explicitly.
function draw(width, height, fn) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const [r, g, b, a = 255] = fn(x, y);
      png.data[o] = r;
      png.data[o + 1] = g;
      png.data[o + 2] = b;
      png.data[o + 3] = a;
    }
  }
  return PNG.sync.write(png);
}

const noise = (x, y) => [(x * 7 + y * 3) % 256, (x * 3 ^ y * 5) % 256, (x * 11 + y * 13) % 256];
const W = 640;
const H = 360;

// An authored scene: many objects, surface texture, varied materials. Painted
// in normalized coordinates so rendering it at another resolution produces the
// same picture rather than a different one, which is what scale invariance
// actually claims.
const paintScene = (width, height) => (px, py) => {
  const x = Math.floor((px / width) * W);
  const y = Math.floor((py / height) * H);
  const grain = ((x * 13 + y * 7) % 23) - 11;
  if (y > H * 0.72) {
    const tile = (Math.floor(x / 9) + Math.floor(y / 7)) % 3;
    return [70 + tile * 14 + grain, 90 + tile * 10 + grain, 50 + tile * 8 + grain];
  }
  for (const [bx, bw, bh, tint] of [[60, 70, 190, 30], [180, 55, 250, 90], [300, 90, 150, 55], [430, 65, 220, 120]]) {
    if (x > bx && x < bx + bw && y > H * 0.72 - bh) {
      const window = (Math.floor((x - bx) / 8) % 2) && (Math.floor(y / 11) % 2);
      return window ? [235, 210 - tint / 2, 120] : [90 + tint + grain, 80 + tint + grain, 100 + tint + grain];
    }
  }
  const sky = [40 + Math.floor((y / H) * 60), 60 + Math.floor((y / H) * 80), 140];
  return [sky[0] + grain, sky[1] + grain, sky[2]];
};

const FIXTURES = {
  // Nothing is there. Every one of these must read as empty.
  'empty-solid': draw(W, H, () => [30, 34, 40]),
  'empty-transparent-noise': draw(W, H, (x, y) => [...noise(x, y), 0]),
  'empty-transparent-white': draw(W, H, () => [255, 255, 255, 0]),
  'empty-smooth-gradient': draw(W, H, (x) => {
    const v = Math.floor((x / W) * 255);
    return [v, v, v];
  }),
  // Something is there. None of these may read as empty.
  'content-noise': draw(W, H, noise),
  'content-scene': draw(W, H, paintScene(W, H)),
  // Two rectangles on a gradient. Reads as suspicious, and should: this is
  // exactly the primitive-dominant framing the edge-density floor names.
  'primitive-dominant': draw(W, H, (x, y) => {
    if (y > H * 0.7) return [70, 90, 50];
    if (x > 180 && x < 320 && y > 120 && y < 250) return [200, 60, 40];
    return [40 + Math.floor((y / H) * 60), 60 + Math.floor((y / H) * 80), 140];
  }),
  // Half drawn, half transparent garbage: real content, and the invisible
  // half must be named rather than counted as detail.
  'mixed-half-transparent': draw(W, H, (x, y) => (y < H / 2 ? noise(x, y) : [...noise(x, y), 0])),
  // Dark and flat: contrast must collapse even though colour varies slightly.
  'dim-lowcontrast': draw(W, H, (x, y) => [18 + ((x + y) % 6), 20 + ((x * y) % 5), 24]),
  // Small but real: 64 samples is thin, not degenerate, and must still measure.
  'small-but-real': draw(8, 8, noise),
  // Degenerate: one pixel wide leaves no neighbour to compare against, so the
  // honest answer is no answer.
  'one-pixel-wide': draw(1, 400, (x, y) => noise(x, y)),
};

// Scale and hue invariance: same scene, different pixels.
const INVARIANCE = {
  'scene-1x': FIXTURES['content-scene'],
  'scene-2x': draw(W * 2, H * 2, paintScene(W * 2, H * 2)),
  'solid-red': draw(W, H, () => [200, 30, 30]),
  'solid-blue': draw(W, H, () => [30, 30, 200]),
  // Transparent black over noise vs. the composite it is equivalent to.
  'alpha-over-black': draw(W, H, (x, y) => [...noise(x, y), 0]),
  'flat-black': draw(W, H, () => [0, 0, 0]),
};

// --- runner ---------------------------------------------------------------
function run(env, { pipe = false } = {}) {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, [script], {
      cwd: repoRoot,
      env: { ...process.env, REPO_ROOT: repoRoot, ...env },
      stdio: ['ignore', pipe ? 'pipe' : 'ignore', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    if (pipe) child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => resolveRun({ code, stdout, stderr }));
  });
}

const workspace = await mkdtemp(resolve(tmpdir(), 'parity-eval-'));
try {
  const shots = resolve(workspace, 'shots');
  const inv = resolve(workspace, 'invariance');
  const ref = resolve(workspace, 'ref');
  const bulk = resolve(workspace, 'bulk');
  const empty = resolve(workspace, 'empty');
  for (const dir of [shots, inv, ref, bulk, empty]) await mkdir(dir, { recursive: true });

  for (const [id, buffer] of Object.entries(FIXTURES)) await writeFile(resolve(shots, `${id}.png`), buffer);
  for (const [id, buffer] of Object.entries(INVARIANCE)) await writeFile(resolve(inv, `${id}.png`), buffer);
  // Pair fixtures: identical, and swapped so the pair distance is symmetric.
  await writeFile(resolve(ref, 'content-scene.png'), FIXTURES['content-noise']);
  await writeFile(resolve(ref, 'content-noise.png'), FIXTURES['content-scene']);
  await writeFile(resolve(ref, 'empty-solid.png'), FIXTURES['empty-solid']);
  for (const id of ['content-scene', 'content-noise', 'empty-solid']) {
    await writeFile(resolve(bulk, `${id}.png`), FIXTURES[id]);
  }
  // Enough output to exceed the OS pipe buffer.
  for (let i = 0; i < 260; i++) {
    await writeFile(resolve(bulk, `bulk-${String(i).padStart(3, '0')}.png`), draw(48, 48, noise));
  }

  // 1. Scene metrics classify empty vs content correctly.
  const solo = await run({ CANDIDATE_DIR: shots, OUT_DIR: resolve(workspace, 'out-solo') }, { pipe: true });
  check('solo mode exits 0', solo.code === 0, solo.stderr.slice(0, 400));
  const soloReport = JSON.parse(await readFile(resolve(workspace, 'out-solo', 'scene-metrics.json'), 'utf8'));
  const metrics = Object.fromEntries(soloReport.results.map((r) => [r.id, r.sceneMetrics]));

  const readsEmpty = (m) => m.colorEntropyBits < 3.0 || m.dominantColorShare > 0.6 || m.edgeDensity < 0.04;
  for (const id of ['empty-solid', 'empty-transparent-noise', 'empty-transparent-white', 'empty-smooth-gradient']) {
    check(`${id} reads as empty`, readsEmpty(metrics[id]), JSON.stringify(metrics[id]));
  }
  for (const id of ['content-noise', 'content-scene', 'mixed-half-transparent']) {
    check(`${id} reads as content`, !readsEmpty(metrics[id]), JSON.stringify(metrics[id]));
  }
  check('dim-lowcontrast collapses contrast', metrics['dim-lowcontrast'].luminanceContrast < 60,
    JSON.stringify(metrics['dim-lowcontrast']));
  check('primitive-dominant framing reads as suspicious', readsEmpty(metrics['primitive-dominant']),
    JSON.stringify(metrics['primitive-dominant']));
  check('a small but real image still measures', metrics['small-but-real'] !== undefined
    && !readsEmpty(metrics['small-but-real']), JSON.stringify(metrics['small-but-real']));
  check('a degenerate image declines to guess', metrics['one-pixel-wide'] === undefined,
    JSON.stringify(metrics['one-pixel-wide']));

  // 2. Invisible pixels are named, not inferred.
  check('fully transparent frame reports full transparency',
    metrics['empty-transparent-noise'].transparentShare === 1, JSON.stringify(metrics['empty-transparent-noise']));
  check('opaque frame reports no transparency',
    metrics['content-noise'].transparentShare === 0, JSON.stringify(metrics['content-noise']));
  check('half-transparent frame reports half transparency',
    near(metrics['mixed-half-transparent'].transparentShare, 0.5, 0.02),
    JSON.stringify(metrics['mixed-half-transparent']));

  // 3. Invariance properties.
  const invRun = await run({ CANDIDATE_DIR: inv, OUT_DIR: resolve(workspace, 'out-inv') });
  check('invariance run exits 0', invRun.code === 0, invRun.stderr.slice(0, 400));
  const invReport = JSON.parse(await readFile(resolve(workspace, 'out-inv', 'scene-metrics.json'), 'utf8'));
  const im = Object.fromEntries(invReport.results.map((r) => [r.id, r.sceneMetrics]));
  check('metrics survive a 2x resolution change',
    near(im['scene-2x'].edgeDensity, im['scene-1x'].edgeDensity, 0.03)
      && near(im['scene-2x'].colorEntropyBits, im['scene-1x'].colorEntropyBits, 0.6),
    `1x=${JSON.stringify(im['scene-1x'])} 2x=${JSON.stringify(im['scene-2x'])}`);
  check('flatness does not depend on hue',
    im['solid-red'].colorEntropyBits === im['solid-blue'].colorEntropyBits
      && im['solid-red'].edgeDensity === im['solid-blue'].edgeDensity
      && im['solid-red'].dominantColorShare === im['solid-blue'].dominantColorShare,
    `red=${JSON.stringify(im['solid-red'])} blue=${JSON.stringify(im['solid-blue'])}`);
  check('transparent pixels measure as their composite',
    im['alpha-over-black'].colorEntropyBits === im['flat-black'].colorEntropyBits
      && im['alpha-over-black'].edgeDensity === im['flat-black'].edgeDensity
      && im['alpha-over-black'].luminanceContrast === im['flat-black'].luminanceContrast,
    `alpha=${JSON.stringify(im['alpha-over-black'])} flat=${JSON.stringify(im['flat-black'])}`);

  // 4. Pair mode keeps working and carries scene metrics per side.
  const pair = await run({ REFERENCE_DIR: ref, CANDIDATE_DIR: shots, OUT_DIR: resolve(workspace, 'out-pair') }, { pipe: true });
  check('pair mode exits 0', pair.code === 0, pair.stderr.slice(0, 400));
  const pairReport = JSON.parse(await readFile(resolve(workspace, 'out-pair', 'visual-parity-diff.json'), 'utf8'));
  check('pair mode reports every common image', pairReport.pairCount === 3, `pairCount=${pairReport.pairCount}`);
  const identical = pairReport.results.find((r) => r.id === 'empty-solid');
  const swapped = pairReport.results.filter((r) => r.id === 'content-scene' || r.id === 'content-noise');
  check('identical pair has zero distance', identical.parityDistance === 0, `distance=${identical.parityDistance}`);
  check('pair distance is symmetric', swapped[0].parityDistance === swapped[1].parityDistance,
    swapped.map((r) => `${r.id}=${r.parityDistance}`).join(' '));
  check('scene metrics break the symmetric tie',
    swapped.some((r) => readsEmpty(r.sceneMetrics.current) !== readsEmpty(r.sceneMetrics.candidate))
      || swapped.every((r) => r.sceneMetrics.current && r.sceneMetrics.candidate),
    'both sides carry sceneMetrics');
  const artifacts = await readdir(resolve(workspace, 'out-pair'));
  check('pair mode still writes its diff artifacts',
    ['side-by-side', 'absdiff', 'pixelmatch', 'edge-diff'].every((kind) => artifacts.some((f) => f.includes(kind))),
    artifacts.join(','));
  check('solo mode writes no diff artifacts',
    (await readdir(resolve(workspace, 'out-solo'))).every((f) => f.endsWith('.json')));

  // 5. Piped stdout survives to the last byte.
  const piped = await run({ CANDIDATE_DIR: bulk, OUT_DIR: resolve(workspace, 'out-bulk') }, { pipe: true });
  check('bulk run exits 0', piped.code === 0, piped.stderr.slice(0, 400));
  check('piped stdout ends with the wrote line', piped.stdout.trimEnd().endsWith('scene-metrics.json'),
    `tail=${JSON.stringify(piped.stdout.slice(-120))}`);
  const printed = piped.stdout.slice(0, piped.stdout.lastIndexOf('}') + 1);
  let parsed = null;
  try { parsed = JSON.parse(printed); } catch (error) { check('piped stdout is complete JSON', false, error.message); }
  if (parsed) {
    check('piped stdout is complete JSON', true);
    check('piped stdout holds every result', parsed.results.length === 263, `printed=${parsed.results.length}`);
    const onDisk = JSON.parse(await readFile(resolve(workspace, 'out-bulk', 'scene-metrics.json'), 'utf8'));
    check('piped stdout matches the written report', parsed.results.length === onDisk.results.length);
  }

  // 6. Failure paths stay loud.
  const noDir = await run({ CANDIDATE_DIR: '' });
  check('missing CANDIDATE_DIR fails loudly', noDir.code !== 0 && /CANDIDATE_DIR/.test(noDir.stderr), noDir.stderr.slice(0, 200));
  const emptyDir = await run({ CANDIDATE_DIR: empty, OUT_DIR: resolve(workspace, 'out-empty') });
  check('empty candidate directory fails loudly', emptyDir.code !== 0 && /no PNGs/.test(emptyDir.stderr), emptyDir.stderr.slice(0, 200));
} finally {
  await rm(workspace, { recursive: true, force: true });
}

const failed = checks.filter((c) => !c.pass);
for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.pass || !c.detail ? '' : `\n      ${c.detail}`}`);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
process.exitCode = failed.length === 0 ? 0 : 1;
