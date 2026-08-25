import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const cwd = resolve(process.cwd());
const repoRoot = process.env.REPO_ROOT ? resolve(process.env.REPO_ROOT) : basename(cwd) === 'web' ? resolve(cwd, '..') : cwd;
const require = createRequire(resolve(repoRoot, 'web/package.json'));
const { PNG } = require('pngjs');
const pixelmatch = (await import(require.resolve('pixelmatch'))).default;

const currentDir = process.env.REFERENCE_DIR ? requiredDir('REFERENCE_DIR') : null;
const candidateDir = requiredDir('CANDIDATE_DIR');
const reportOrder = (process.env.REPORT_ORDER ?? '')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);
const cropSpecs = process.env.CROPS_JSON ? await readJson(resolvePath(process.env.CROPS_JSON)) : {};
const outDir = resolvePath(process.env.OUT_DIR ?? 'visual-diff');
const artifactRoot = basename(outDir);
await mkdir(outDir, { recursive: true });

// Two modes, one helper: with a reference folder this diffs pairs; without
// one it only measures each capture on its own terms.
if (currentDir) {
  await reportPairDiff();
} else {
  await reportSceneMetricsOnly();
}

async function reportPairDiff() {
  const pairs = await discoverPairs();
  const results = [];
  for (const pair of pairs) {
    const currentPath = resolve(repoRoot, pair.current);
    const candidatePath = resolve(repoRoot, pair.candidate);
    const current = PNG.sync.read(await readFile(currentPath));
    const candidate = PNG.sync.read(await readFile(candidatePath));
    if (current.width !== candidate.width || current.height !== candidate.height) {
      throw new Error(`${pair.id}: image sizes differ: current=${current.width}x${current.height} candidate=${candidate.width}x${candidate.height}`);
    }

    const width = current.width;
    const height = current.height;
    const grayCurrent = new PNG({ width, height });
    const grayCandidate = new PNG({ width, height });
    const absDiff = new PNG({ width, height });
    const sideBySide = new PNG({ width: width * 2, height });
    const edgeCurrent = new PNG({ width, height });
    const edgeCandidate = new PNG({ width, height });
    const edgeDiff = new PNG({ width, height });
    const currentGray = new Float32Array(width * height);
    const candidateGray = new Float32Array(width * height);

    let sumAbs = 0;
    let sumSq = 0;
    let over16 = 0;
    let over32 = 0;
    let over64 = 0;
    let blackCurrent = 0;
    let blackCandidate = 0;
    let terrainCurrent = 0;
    let terrainCandidate = 0;
    let luminanceCurrent = 0;
    let luminanceCandidate = 0;

    for (let i = 0; i < width * height; i++) {
      const o = i * 4;
      const cg = luminance(current.data[o], current.data[o + 1], current.data[o + 2]);
      const wg = luminance(candidate.data[o], candidate.data[o + 1], candidate.data[o + 2]);
      luminanceCurrent += cg;
      luminanceCandidate += wg;
      currentGray[i] = cg;
      candidateGray[i] = wg;
      const d = Math.abs(cg - wg);
      sumAbs += d;
      sumSq += d * d;
      if (d > 16) over16++;
      if (d > 32) over32++;
      if (d > 64) over64++;
      if (cg < 24) blackCurrent++;
      if (wg < 24) blackCandidate++;
      if (isTerrainLike(current.data[o], current.data[o + 1], current.data[o + 2])) terrainCurrent++;
      if (isTerrainLike(candidate.data[o], candidate.data[o + 1], candidate.data[o + 2])) terrainCandidate++;
      copyPixel(current, sideBySide, i, xOf(i, width), yOf(i, width));
      copyPixel(candidate, sideBySide, i, xOf(i, width) + width, yOf(i, width));
      writeGray(grayCurrent, o, cg);
      writeGray(grayCandidate, o, wg);
      const heat = Math.min(255, d * 4);
      absDiff.data[o] = heat;
      absDiff.data[o + 1] = Math.max(0, 160 - heat);
      absDiff.data[o + 2] = Math.max(0, 255 - heat);
      absDiff.data[o + 3] = 255;
    }

    const edgeStats = writeEdges(currentGray, candidateGray, edgeCurrent, edgeCandidate, edgeDiff, width, height);
    const pixelmatchDiff = new PNG({ width, height });
    const mismatched = pixelmatch(
      grayCurrent.data,
      grayCandidate.data,
      pixelmatchDiff.data,
      width,
      height,
      { threshold: 0.08, includeAA: true },
    );

    await writePng(resolve(outDir, `${pair.id}-side-by-side.png`), sideBySide);
    await writePng(resolve(outDir, `${pair.id}-current-gray.png`), grayCurrent);
    await writePng(resolve(outDir, `${pair.id}-candidate-gray.png`), grayCandidate);
    await writePng(resolve(outDir, `${pair.id}-absdiff.png`), absDiff);
    await writePng(resolve(outDir, `${pair.id}-pixelmatch.png`), pixelmatchDiff);
    await writePng(resolve(outDir, `${pair.id}-current-edges.png`), edgeCurrent);
    await writePng(resolve(outDir, `${pair.id}-candidate-edges.png`), edgeCandidate);
    await writePng(resolve(outDir, `${pair.id}-edge-diff.png`), edgeDiff);

    const total = width * height;
    const diffRatio32 = over32 / total;
    const pixelmatchRatio = mismatched / total;
    const edgeDiffRatio32 = edgeStats.diffOver32 / total;
    const edgeEnergyRatio = edgeEnergyRatioOf(edgeStats.currentEnergy, edgeStats.candidateEnergy);
    const parityDistance =
      0.35 * diffRatio32
      + 0.25 * pixelmatchRatio
      + 0.25 * edgeDiffRatio32
      + 0.15 * Math.min(1, Math.abs(Math.log2(edgeEnergyRatio)));
    const crop = cropFor(pair.id, width, height);
    const worldCrop = crop
      ? await analyzeWorldCrop(pair.id, crop, current, candidate, currentGray, candidateGray, width, height)
      : undefined;

    const result = {
      id: pair.id,
      current: relative(repoRoot, currentPath),
      candidate: relative(repoRoot, candidatePath),
      dimensions: { width, height },
      parityDistance: round(parityDistance),
      sceneMetrics: {
        current: computeSceneMetrics(current),
        candidate: computeSceneMetrics(candidate),
      },
      grayscale: {
        mae: round(sumAbs / total),
        rmse: round(Math.sqrt(sumSq / total)),
        diffRatio16: round(over16 / total),
        diffRatio32: round(diffRatio32),
        diffRatio64: round(over64 / total),
        pixelmatchRatio: round(pixelmatchRatio),
      },
      contentProxies: {
        blackRatioCurrent: round(blackCurrent / total),
        blackRatioCandidate: round(blackCandidate / total),
        terrainLikeRatioCurrent: round(terrainCurrent / total),
        terrainLikeRatioCandidate: round(terrainCandidate / total),
        avgLuminanceCurrent: round(luminanceCurrent / total),
        avgLuminanceCandidate: round(luminanceCandidate / total),
        avgLuminanceDelta: round((luminanceCandidate - luminanceCurrent) / total),
        edgeEnergyCurrent: round(edgeStats.currentEnergy),
        edgeEnergyCandidate: round(edgeStats.candidateEnergy),
        edgeEnergyRatio: round(edgeEnergyRatio),
        edgeDiffRatio32: round(edgeDiffRatio32),
      },
      artifacts: {
        sideBySide: `${artifactRoot}/${pair.id}-side-by-side.png`,
        currentGray: `${artifactRoot}/${pair.id}-current-gray.png`,
        candidateGray: `${artifactRoot}/${pair.id}-candidate-gray.png`,
        absDiff: `${artifactRoot}/${pair.id}-absdiff.png`,
        pixelmatch: `${artifactRoot}/${pair.id}-pixelmatch.png`,
        currentEdges: `${artifactRoot}/${pair.id}-current-edges.png`,
        candidateEdges: `${artifactRoot}/${pair.id}-candidate-edges.png`,
        edgeDiff: `${artifactRoot}/${pair.id}-edge-diff.png`,
      },
    };
    if (worldCrop) result.worldCrop = worldCrop;
    results.push(result);
  }

  results.sort((a, b) => b.parityDistance - a.parityDistance);
  const report = {
    kind: 'screenshot-parity-diff',
    generatedAt: new Date().toISOString(),
    note: 'Lower parityDistance means the candidate is closer to the reference for this fixed pair. This is a distance metric, not an acceptance gate.',
    pairCount: results.length,
    worstPair: results[0]?.id ?? null,
    results,
  };

  const reportPath = resolve(outDir, 'visual-parity-diff.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`wrote ${relative(repoRoot, reportPath)}`);
}

async function reportSceneMetricsOnly() {
  const names = await orderedPngNames(candidateDir);
  if (names.length === 0) {
    throw new Error(`no PNGs found in ${relative(repoRoot, candidateDir)}`);
  }
  const results = [];
  for (const name of names) {
    const imagePath = resolve(candidateDir, name);
    const png = PNG.sync.read(await readFile(imagePath));
    results.push({
      id: basename(name, '.png'),
      image: relative(repoRoot, imagePath),
      dimensions: { width: png.width, height: png.height },
      sceneMetrics: computeSceneMetrics(png),
    });
  }
  const report = {
    kind: 'screenshot-scene-metrics',
    generatedAt: new Date().toISOString(),
    note: 'Absolute per-image telemetry, no reference involved. Low values locate flat, sparse, or empty captures; they never accept or reject an image on their own.',
    imageCount: results.length,
    results,
  };
  const reportPath = resolve(outDir, 'scene-metrics.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`wrote ${relative(repoRoot, reportPath)}`);
}

// Describes one image on its own terms, with nothing to compare it against.
// Sampled on a coarse grid so the cost stays trivial beside the pair work, and
// so the numbers read scene composition instead of per-pixel noise.
function computeSceneMetrics(png) {
  const stepX = Math.max(1, Math.floor(png.width / 160));
  const stepY = Math.max(1, Math.floor(png.height / 90));
  const cols = Math.floor(png.width / stepX);
  const rows = Math.floor(png.height / stepY);
  if (cols < 2 || rows < 2) return undefined;

  const gray = new Float64Array(cols * rows);
  const buckets = new Map();
  let samples = 0;
  let transparent = 0;

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const o = (gy * stepY * png.width + gx * stepX) * 4;
      // Measure what the frame shows, not what it stores. A fully transparent
      // pixel keeps whatever RGB it was left with, so an invisible capture can
      // read as rich, high-entropy content until it is composited down.
      const alpha = png.data[o + 3] / 255;
      if (alpha === 0) transparent++;
      const r = png.data[o] * alpha;
      const g = png.data[o + 1] * alpha;
      const b = png.data[o + 2] * alpha;
      gray[gy * cols + gx] = luminance(r, g, b);
      // 4 bits per channel: distinct enough to separate materials, coarse
      // enough that gradients and dither do not read as authored variety.
      const key = `${r >> 4},${g >> 4},${b >> 4}`;
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
      samples++;
    }
  }

  const sorted = Array.from(gray).sort((a, b) => a - b);
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  const p5 = sorted[Math.floor(sorted.length * 0.05)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];

  let entropy = 0;
  let dominant = 0;
  for (const count of buckets.values()) {
    const p = count / samples;
    entropy -= p * Math.log2(p);
    dominant = Math.max(dominant, count);
  }

  let edges = 0;
  let checked = 0;
  for (let gy = 0; gy < rows - 1; gy++) {
    for (let gx = 0; gx < cols - 1; gx++) {
      const i = gy * cols + gx;
      const dx = Math.abs(gray[i] - gray[i + 1]);
      const dy = Math.abs(gray[i] - gray[i + cols]);
      if (Math.max(dx, dy) > 12) edges++;
      checked++;
    }
  }

  return {
    colorBuckets: buckets.size,
    colorEntropyBits: round(entropy),
    edgeDensity: round(edges / checked),
    dominantColorShare: round(dominant / samples),
    transparentShare: round(transparent / samples),
    luminanceMean: round(mean),
    luminanceP5: round(p5),
    luminanceP95: round(p95),
    luminanceContrast: round(p95 - p5),
  };
}

// Two frames with no edges at all are not infinitely far apart, they are the
// same frame. Dividing into a floor would send an identical pair of flat
// captures — the empty-render case the metrics exist to catch — to a nonzero
// distance.
function edgeEnergyRatioOf(currentEnergy, candidateEnergy) {
  const floor = 1e-6;
  if (currentEnergy < floor && candidateEnergy < floor) return 1;
  return candidateEnergy / Math.max(floor, currentEnergy);
}

async function orderedPngNames(dir) {
  const names = await pngNames(dir);
  const order = new Map(reportOrder.map((id, index) => [`${id}.png`, index]));
  names.sort((a, b) => (order.get(a) ?? 999_999) - (order.get(b) ?? 999_999) || a.localeCompare(b));
  return names;
}

async function discoverPairs() {
  const [currentFiles, candidateFiles] = await Promise.all([pngNames(currentDir), pngNames(candidateDir)]);
  const candidateSet = new Set(candidateFiles);
  const common = currentFiles.filter((name) => candidateSet.has(name));
  if (common.length === 0) {
    throw new Error(`no comparable PNG pairs found in ${relative(repoRoot, currentDir)} and ${relative(repoRoot, candidateDir)}`);
  }
  const order = new Map(reportOrder.map((id, index) => [`${id}.png`, index]));
  common.sort((a, b) => (order.get(a) ?? 999_999) - (order.get(b) ?? 999_999) || a.localeCompare(b));
  return common.map((name) => ({
    id: basename(name, '.png'),
    current: relative(repoRoot, resolve(currentDir, name)),
    candidate: relative(repoRoot, resolve(candidateDir, name)),
  }));
}

async function pngNames(dir) {
  return (await readdir(dir)).filter((name) => name.endsWith('.png'));
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isTerrainLike(r, g, b) {
  return g > 72 && r > 62 && b > 38 && r > b * 0.92 && g > b * 0.92;
}

function writeGray(png, offset, value) {
  const v = Math.max(0, Math.min(255, Math.round(value)));
  png.data[offset] = v;
  png.data[offset + 1] = v;
  png.data[offset + 2] = v;
  png.data[offset + 3] = 255;
}

function copyPixel(source, target, sourceIndex, targetX, targetY) {
  const sourceOffset = sourceIndex * 4;
  const targetOffset = (targetY * target.width + targetX) * 4;
  target.data[targetOffset] = source.data[sourceOffset];
  target.data[targetOffset + 1] = source.data[sourceOffset + 1];
  target.data[targetOffset + 2] = source.data[sourceOffset + 2];
  target.data[targetOffset + 3] = source.data[sourceOffset + 3];
}

function xOf(index, width) {
  return index % width;
}

function yOf(index, width) {
  return Math.floor(index / width);
}

function writeEdges(currentGray, candidateGray, edgeCurrent, edgeCandidate, edgeDiff, width, height) {
  let currentEnergy = 0;
  let candidateEnergy = 0;
  let diffOver32 = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const o = i * 4;
      const ce = sobel(currentGray, width, height, x, y);
      const we = sobel(candidateGray, width, height, x, y);
      currentEnergy += ce / 255;
      candidateEnergy += we / 255;
      const d = Math.abs(ce - we);
      if (d > 32) diffOver32++;
      writeGray(edgeCurrent, o, ce);
      writeGray(edgeCandidate, o, we);
      edgeDiff.data[o] = Math.min(255, d * 4);
      edgeDiff.data[o + 1] = Math.max(0, 180 - d * 3);
      edgeDiff.data[o + 2] = Math.max(0, 255 - d * 4);
      edgeDiff.data[o + 3] = 255;
    }
  }
  const total = width * height;
  return {
    currentEnergy: currentEnergy / total,
    candidateEnergy: candidateEnergy / total,
    diffOver32,
  };
}

function sobel(gray, width, height, x, y) {
  const xm = Math.max(0, x - 1);
  const xp = Math.min(width - 1, x + 1);
  const ym = Math.max(0, y - 1);
  const yp = Math.min(height - 1, y + 1);
  const a = gray[ym * width + xm];
  const b = gray[ym * width + x];
  const c = gray[ym * width + xp];
  const d = gray[y * width + xm];
  const f = gray[y * width + xp];
  const g = gray[yp * width + xm];
  const h = gray[yp * width + x];
  const i = gray[yp * width + xp];
  const gx = -a - 2 * d - g + c + 2 * f + i;
  const gy = -a - 2 * b - c + g + 2 * h + i;
  return Math.min(255, Math.sqrt(gx * gx + gy * gy));
}

async function analyzeWorldCrop(id, crop, current, candidate, currentGray, candidateGray, width, height) {
  const bounds = clampCrop(crop, width, height);
  const total = bounds.width * bounds.height;
  const grayCurrent = new PNG({ width: bounds.width, height: bounds.height });
  const grayCandidate = new PNG({ width: bounds.width, height: bounds.height });
  const absDiff = new PNG({ width: bounds.width, height: bounds.height });
  const sideBySide = new PNG({ width: bounds.width * 2, height: bounds.height });
  const edgeCurrent = new PNG({ width: bounds.width, height: bounds.height });
  const edgeCandidate = new PNG({ width: bounds.width, height: bounds.height });
  const edgeDiff = new PNG({ width: bounds.width, height: bounds.height });
  const cropCurrentGray = new Float32Array(total);
  const cropCandidateGray = new Float32Array(total);
  let sumAbs = 0;
  let sumSq = 0;
  let over16 = 0;
  let over32 = 0;
  let over64 = 0;
  let blackCurrent = 0;
  let blackCandidate = 0;
  let terrainCurrent = 0;
  let terrainCandidate = 0;
  let luminanceCurrent = 0;
  let luminanceCandidate = 0;

  for (let y = 0; y < bounds.height; y++) {
    for (let x = 0; x < bounds.width; x++) {
      const sourceIndex = (bounds.y + y) * width + (bounds.x + x);
      const cropIndex = y * bounds.width + x;
      const sourceOffset = sourceIndex * 4;
      const cropOffset = cropIndex * 4;
      const cg = currentGray[sourceIndex];
      const wg = candidateGray[sourceIndex];
      luminanceCurrent += cg;
      luminanceCandidate += wg;
      cropCurrentGray[cropIndex] = cg;
      cropCandidateGray[cropIndex] = wg;
      const d = Math.abs(cg - wg);
      sumAbs += d;
      sumSq += d * d;
      if (d > 16) over16++;
      if (d > 32) over32++;
      if (d > 64) over64++;
      if (cg < 24) blackCurrent++;
      if (wg < 24) blackCandidate++;
      if (isTerrainLike(current.data[sourceOffset], current.data[sourceOffset + 1], current.data[sourceOffset + 2])) terrainCurrent++;
      if (isTerrainLike(candidate.data[sourceOffset], candidate.data[sourceOffset + 1], candidate.data[sourceOffset + 2])) terrainCandidate++;
      copyPixel(current, sideBySide, sourceIndex, x, y);
      copyPixel(candidate, sideBySide, sourceIndex, x + bounds.width, y);
      writeGray(grayCurrent, cropOffset, cg);
      writeGray(grayCandidate, cropOffset, wg);
      const heat = Math.min(255, d * 4);
      absDiff.data[cropOffset] = heat;
      absDiff.data[cropOffset + 1] = Math.max(0, 160 - heat);
      absDiff.data[cropOffset + 2] = Math.max(0, 255 - heat);
      absDiff.data[cropOffset + 3] = 255;
    }
  }

  const edgeStats = writeEdges(cropCurrentGray, cropCandidateGray, edgeCurrent, edgeCandidate, edgeDiff, bounds.width, bounds.height);
  const pixelmatchDiff = new PNG({ width: bounds.width, height: bounds.height });
  const mismatched = pixelmatch(
    grayCurrent.data,
    grayCandidate.data,
    pixelmatchDiff.data,
    bounds.width,
    bounds.height,
    { threshold: 0.08, includeAA: true },
  );

  const prefix = `${id}-world-crop`;
  await writePng(resolve(outDir, `${prefix}-side-by-side.png`), sideBySide);
  await writePng(resolve(outDir, `${prefix}-current-gray.png`), grayCurrent);
  await writePng(resolve(outDir, `${prefix}-candidate-gray.png`), grayCandidate);
  await writePng(resolve(outDir, `${prefix}-absdiff.png`), absDiff);
  await writePng(resolve(outDir, `${prefix}-pixelmatch.png`), pixelmatchDiff);
  await writePng(resolve(outDir, `${prefix}-current-edges.png`), edgeCurrent);
  await writePng(resolve(outDir, `${prefix}-candidate-edges.png`), edgeCandidate);
  await writePng(resolve(outDir, `${prefix}-edge-diff.png`), edgeDiff);

  const diffRatio32 = over32 / total;
  const pixelmatchRatio = mismatched / total;
  const edgeDiffRatio32 = edgeStats.diffOver32 / total;
  const edgeEnergyRatio = edgeEnergyRatioOf(edgeStats.currentEnergy, edgeStats.candidateEnergy);
  const parityDistance =
    0.35 * diffRatio32
    + 0.25 * pixelmatchRatio
    + 0.25 * edgeDiffRatio32
    + 0.15 * Math.min(1, Math.abs(Math.log2(edgeEnergyRatio)));

  return {
    label: bounds.label,
    bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
    parityDistance: round(parityDistance),
    grayscale: {
      mae: round(sumAbs / total),
      rmse: round(Math.sqrt(sumSq / total)),
      diffRatio16: round(over16 / total),
      diffRatio32: round(diffRatio32),
      diffRatio64: round(over64 / total),
      pixelmatchRatio: round(pixelmatchRatio),
    },
    contentProxies: {
      blackRatioCurrent: round(blackCurrent / total),
      blackRatioCandidate: round(blackCandidate / total),
      terrainLikeRatioCurrent: round(terrainCurrent / total),
      terrainLikeRatioCandidate: round(terrainCandidate / total),
      avgLuminanceCurrent: round(luminanceCurrent / total),
      avgLuminanceCandidate: round(luminanceCandidate / total),
      avgLuminanceDelta: round((luminanceCandidate - luminanceCurrent) / total),
      edgeEnergyCurrent: round(edgeStats.currentEnergy),
      edgeEnergyCandidate: round(edgeStats.candidateEnergy),
      edgeEnergyRatio: round(edgeEnergyRatio),
      edgeDiffRatio32: round(edgeDiffRatio32),
    },
    artifacts: {
      sideBySide: `${artifactRoot}/${prefix}-side-by-side.png`,
      currentGray: `${artifactRoot}/${prefix}-current-gray.png`,
      candidateGray: `${artifactRoot}/${prefix}-candidate-gray.png`,
      absDiff: `${artifactRoot}/${prefix}-absdiff.png`,
      pixelmatch: `${artifactRoot}/${prefix}-pixelmatch.png`,
      currentEdges: `${artifactRoot}/${prefix}-current-edges.png`,
      candidateEdges: `${artifactRoot}/${prefix}-candidate-edges.png`,
      edgeDiff: `${artifactRoot}/${prefix}-edge-diff.png`,
    },
  };
}

function requiredDir(envName) {
  const value = process.env[envName];
  if (!value) {
    throw new Error(`${envName} is required. Example: ${envName}=path/to/pngs`);
  }
  return resolvePath(value);
}

function resolvePath(value) {
  return resolve(repoRoot, value);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function cropFor(id, width, height) {
  const spec = cropSpecs[id];
  if (!spec) return undefined;
  return scaleCrop(Array.isArray(spec) ? spec[0] : spec, width, height);
}

function scaleCrop(spec, width, height) {
  const unit = spec.unit ?? 'px';
  if (unit === 'ratio') {
    return {
      label: spec.label,
      x: Math.round((spec.x ?? 0) * width),
      y: Math.round((spec.y ?? 0) * height),
      width: Math.round((spec.width ?? 1) * width),
      height: Math.round((spec.height ?? 1) * height),
    };
  }
  return {
    label: spec.label,
    x: Math.round(spec.x ?? 0),
    y: Math.round(spec.y ?? 0),
    width: Math.round(spec.width ?? width),
    height: Math.round(spec.height ?? height),
  };
}

function clampCrop(crop, width, height) {
  const x = Math.max(0, Math.min(width - 1, crop.x));
  const y = Math.max(0, Math.min(height - 1, crop.y));
  return {
    label: crop.label,
    x,
    y,
    width: Math.max(1, Math.min(width - x, crop.width)),
    height: Math.max(1, Math.min(height - y, crop.height)),
  };
}

async function writePng(path, png) {
  await writeFile(path, PNG.sync.write(png));
}

function round(value) {
  return Number(value.toFixed(5));
}

export const scriptUrl = pathToFileURL(import.meta.url).href;
