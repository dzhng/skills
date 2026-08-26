#!/usr/bin/env node
// Strike unsupported quantities and invented artifacts out of a critique.
//
// A judge given images and no shell answers a numeric question numerically:
// the luminance means, the symmetry percentages, and the crop files it says it
// wrote all arrive together, self-consistent and invented. This reads the
// report back and asks two questions of it.
//
// Of every number presented as a measurement: does the report show a command
// that ran, and does that command's output contain this number? That is an
// attribution check, and attribution is necessary rather than sufficient — a
// report that invents a whole transcript, command and output together, passes
// it. Nothing readable from static text can tell an invented transcript from a
// real one, so this does not claim to.
//
// Of every file the report names: is it there, and is it the file the report
// says it is? That one is not a matter of reading — the path is resolved on
// disk, and a stated sha256 is recomputed. Fabricated crops and dumps die
// here, which is the half of the check that touches the world.
//
//   node receipts.mjs <report.md> [...]      # human summary, nonzero if unbacked
//   node receipts.mjs --json <report.md>     # machine-readable findings
//   node receipts.mjs --label <report.md>    # annotated copy on stdout
//   node receipts.mjs --base DIR <report.md> # resolve relative paths from DIR
//   cat report.md | node receipts.mjs -      # read stdin

import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { statSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

const HELP = `receipts.mjs — reject claims a critique cannot support

  node receipts.mjs [--json|--label] [--window N] [--base DIR] <report.md> [...]
  node receipts.mjs -            read the report from stdin

Numbers are checked for attribution: a command shown running, with this number
in its output. Files are checked against the filesystem, and against the sha256
the report states for them if it states one.

Exit code 0 when every claim holds, 1 when any does not, 2 on a usage or read
error.`;

// A "measurement claim" is a number the report presents as read off the
// image. Bare ordinals, dates, and dimensions people legitimately eyeball are
// not claims; a luminance, a ratio, a percentage, a pixel offset, or a count of
// something measured is.
const MEASUREMENT_UNITS = [
  'px', 'pixel', 'pixels', 'pt', 'dp', 'em', 'rem',
  'luminance', 'luma', 'brightness', 'lightness', 'value', 'intensity',
  'contrast', 'ratio', 'delta', 'diff', 'difference', 'variance', 'stddev',
  'mean', 'median', 'average', 'avg', 'rmse', 'mae', 'psnr', 'ssim',
  'entropy', 'density', 'coverage', 'share', 'opacity', 'alpha',
  'rgb', 'rgba', 'hsl', 'hex', 'channel', 'saturation', 'hue',
  'degrees', 'deg', 'offset', 'width', 'height', 'area', 'count',
];

// Words that make a nearby number a measurement even without a unit:
// "the hem measures 44", "symmetry scored 0.82".
const MEASUREMENT_VERBS = [
  'measure', 'measured', 'measures', 'measurement', 'computed', 'calculated',
  'sampled', 'scored', 'reads', 'read', 'registers', 'quantif',
];

const NUMBER = /(?<![\w.$#-])(\d+(?:\.\d+)?)\s*(%|px|pt|dp|em|rem)?(?![\w-])/g;

// A hex literal in a critique is always a pixel value read off the image —
// there is no other reason to write one — so it needs a receipt whatever
// words surround it. It also hides from NUMBER, whose word boundaries reject
// the `0` in `0x60`.
const HEX = /(?<![\w])(0x[0-9a-f]{2,8}|#[0-9a-f]{3,8})(?![\w])/gi;

// Files a critique claims to have produced or read: crops, dumps, frames,
// tables. The extension list is deliberately narrow — a report mentioning a
// script or a module name is not claiming an artifact.
const ARTIFACT = /(?<![\w@/-])((?:\.{1,2}\/|~\/|\/)?[\w.-]+(?:\/[\w.-]+)*\.(?:png|jpe?g|gif|webp|bmp|tiff?|pdf|csv|tsv|json|ndjson|txt|npy))(?![\w])/gi;

const SHA256 = /\b(?:sha-?256[\s:=]*)?([0-9a-f]{64})\b/i;
const SHA256_ALL = new RegExp(SHA256.source, 'gi');

const argv = process.argv.slice(2);
if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
  console.log(HELP);
  process.exit(argv.length === 0 ? 2 : 0);
}

let asJson = false;
let asLabel = false;
let window = 4;
let base = null;
const targets = [];
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === '--json') asJson = true;
  else if (arg === '--label') asLabel = true;
  else if (arg === '--window') window = Number.parseInt(argv[++i], 10);
  else if (arg === '--base') base = argv[++i];
  else if (arg.startsWith('--')) {
    console.error(`receipts.mjs: unknown option ${arg}\n\n${HELP}`);
    process.exit(2);
  } else targets.push(arg);
}
if (!Number.isFinite(window) || window < 0) {
  console.error('receipts.mjs: --window needs a non-negative integer');
  process.exit(2);
}
if (base !== null && base === undefined) {
  console.error('receipts.mjs: --base needs a directory');
  process.exit(2);
}
if (targets.length === 0) {
  console.error(`receipts.mjs: no report given\n\n${HELP}`);
  process.exit(2);
}

// --- receipts -------------------------------------------------------------

// Lines that belong to a fenced block, an indented block, or a `$ cmd` shell
// transcript.
function receiptLines(lines) {
  const inReceipt = new Array(lines.length).fill(false);
  let fence = null;
  let transcript = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      if (fence === null) {
        fence = fenceMatch[1][0].repeat(3);
        inReceipt[i] = true;
        continue;
      }
      if (fenceMatch[1].startsWith(fence)) {
        fence = null;
        inReceipt[i] = true;
        continue;
      }
    }
    if (fence !== null) {
      inReceipt[i] = true;
      continue;
    }
    if (/^\s{4,}\S/.test(line) && !/^\s*[-*+]\s/.test(line)) {
      inReceipt[i] = true;
      continue;
    }
    // `$ cmd` opens a transcript; its output runs until a blank line.
    if (/^\s*\$\s+\S/.test(line)) {
      inReceipt[i] = true;
      transcript = true;
      continue;
    }
    if (transcript) {
      if (line.trim() === '') transcript = false;
      else inReceipt[i] = true;
    }
  }
  return inReceipt;
}

const TOOLS = new Set([
  'node', 'python', 'python3', 'magick', 'convert', 'ffmpeg', 'ffprobe',
  'identify', 'compare', 'sips', 'exiftool', 'jq', 'awk', 'sed', 'grep', 'rg',
  'cat', 'head', 'tail', 'ls', 'wc', 'printf', 'echo', 'uv', 'uvx', 'npx',
  'pnpm', 'deno', 'bun', 'bash', 'sh', 'zsh', 'sha256sum', 'shasum', 'stat',
  'file', 'du', 'find', 'sort', 'uniq', 'cut', 'tr', 'xxd', 'od',
]);

// A token that reads as an argument rather than as English: a flag, a path, a
// filename, a key=value, a format string, an ImageMagick sink like `info:`.
function looksLikeArgument(token) {
  if (token.startsWith('-')) return true;
  if (token.includes('/') || token.includes('\\')) return true;
  if (/\.\w{1,6}$/.test(token)) return true;
  if (token.includes('=')) return true;
  if (/^['"]/.test(token) || token.includes('%[') || token.includes('{')) return true;
  if (/^\w+:$/.test(token)) return true;
  if (/^[$@]/.test(token)) return true;
  return false;
}

// A receipt has to actually run something, and running something has a shape:
// an executable followed by at least one argument. This is the line that
// separates a transcript from prose wearing a code fence — the laundering
// move is to paste invented numbers under a sentence that merely contains the
// word `python3`, and a sentence has no arguments in it.
function isInvocation(line) {
  const stripped = line.replace(/^\s*[$>]\s+/, '').trim();
  if (stripped === '') return false;
  const tokens = stripped.split(/\s+/);
  const head = tokens[0].replace(/^.*\//, '');
  const runnable = TOOLS.has(head)
    || /^\.{0,2}\//.test(tokens[0])
    || /^\w[\w.-]*\.(?:mjs|js|py|sh)$/.test(head);
  if (!runnable) return false;
  return tokens.slice(1).some(looksLikeArgument);
}

// --- claims ---------------------------------------------------------------

// `previous` is the line above, joined on for context only. Prose wraps
// mid-sentence, so the unit that makes a number a measurement — "Mean
// luminance under / the hem is 44.0" — routinely lands on the line before the
// number it qualifies. Reading one line at a time misses exactly the claims
// worth catching, and column and line numbers still report against `line`.
function claimsIn(line, previous = '') {
  const lower = line.toLowerCase();
  const carried = previous.toLowerCase().slice(-60);
  const hits = [];
  for (const match of line.matchAll(NUMBER)) {
    const [, value, suffix] = match;
    const start = match.index;
    const before = `${start < 40 ? `${carried} ` : ''}${lower.slice(Math.max(0, start - 40), start)}`;
    const after = lower.slice(start + match[0].length, start + match[0].length + 24);
    const context = `${before} ${after}`;
    const unitAttached = suffix === '%' || Boolean(suffix);
    const unitNearby = MEASUREMENT_UNITS.some((unit) =>
      new RegExp(`\\b${unit}\\b`).test(context));
    const verbNearby = MEASUREMENT_VERBS.some((verb) => before.includes(verb));
    if (!unitAttached && !unitNearby && !verbNearby) continue;
    hits.push({ value, text: match[0].trim(), column: start + 1 });
  }
  for (const match of line.matchAll(HEX)) {
    hits.push({
      value: match[1].toLowerCase(),
      text: match[1],
      column: match.index + 1,
    });
  }
  return hits;
}

// --- artifacts ------------------------------------------------------------

function resolveArtifact(path, baseDir) {
  if (path.startsWith('~/')) {
    const home = process.env.HOME ?? process.env.USERPROFILE;
    return home ? resolve(home, path.slice(2)) : path;
  }
  return isAbsolute(path) ? path : resolve(baseDir, path);
}

// Associate every same-line SHA-256 with the artifact nearest to it. A normal
// `shasum` line is hash then path; prose often writes path then hash. Assigning
// hashes, rather than asking each path for one nearest hash, keeps a line with
// several files from lending one file's hash to another. A hash-only line
// immediately after one path is also a claim about that path.
function statedHashes(lines, sitesByLine) {
  const claimsBySite = new Map();
  for (const sites of sitesByLine.values()) {
    for (const site of sites) claimsBySite.set(site, []);
  }

  for (let i = 0; i < lines.length; i++) {
    const sites = sitesByLine.get(i) ?? [];
    const hashes = [...lines[i].matchAll(SHA256_ALL)];
    for (const hash of hashes) {
      const hashEnd = hash.index + hash[0].length;
      let nearest = null;
      let nearestGap = Infinity;
      for (const site of sites) {
        const gap = hashEnd <= site.column
          ? site.column - hashEnd
          : site.end <= hash.index
            ? hash.index - site.end
            : 0;
        // Between two paths, a hash starts the next `hash  path` pair.
        const siteFollowsHash = hashEnd <= site.column;
        const nearestPrecedesHash = nearest && nearest.end <= hash.index;
        if (gap < nearestGap || (gap === nearestGap && siteFollowsHash && nearestPrecedesHash)) {
          nearest = site;
          nearestGap = gap;
        }
      }
      if (nearest) claimsBySite.get(nearest).push(hash[1].toLowerCase());
    }

    // Do not borrow a `shasum` output hash for a path named in its command:
    // the output line has its own artifact path. A hash-only continuation is
    // unambiguous only when the preceding line named one artifact.
    if (sites.length === 1 && hashes.length === 0 && !(sitesByLine.get(i + 1)?.length)) {
      for (const hash of (lines[i + 1] ?? '').matchAll(SHA256_ALL)) {
        claimsBySite.get(sites[0]).push(hash[1].toLowerCase());
      }
    }
  }
  return claimsBySite;
}

function checkArtifacts(lines, baseDir) {
  // Paths are grouped for the filesystem lookup, but every hash statement is
  // retained at the occurrence where it was made. A true repeat never erases
  // an earlier false claim about the same file.
  const findings = [];
  const occurrences = new Map();
  const sitesByLine = new Map();
  for (let i = 0; i < lines.length; i++) {
    for (const match of lines[i].matchAll(ARTIFACT)) {
      const claimed = match[1];
      if (!occurrences.has(claimed)) occurrences.set(claimed, []);
      const site = { line: i, column: match.index, end: match.index + claimed.length };
      occurrences.get(claimed).push(site);
      if (!sitesByLine.has(i)) sitesByLine.set(i, []);
      sitesByLine.get(i).push(site);
    }
  }
  const claimsBySite = statedHashes(lines, sitesByLine);

  for (const [claimed, sites] of occurrences) {
    const full = resolveArtifact(claimed, baseDir);
    let exists = false;
    try {
      exists = statSync(full).isFile();
    } catch {
      exists = false;
    }
    const first = sites[0];
    if (!exists) {
      findings.push({
        kind: 'artifact',
        line: first.line + 1,
        column: first.column + 1,
        claim: claimed,
        detail: 'no such file',
        text: lines[first.line].trim(),
      });
      continue;
    }

    const actual = createHash('sha256').update(readFileSync(full)).digest('hex');
    for (const site of sites) {
      for (const stated of claimsBySite.get(site)) {
        if (stated === actual) continue;
        findings.push({
          kind: 'artifact',
          line: site.line + 1,
          column: site.column + 1,
          claim: claimed,
          detail: `sha256 is ${actual.slice(0, 16)}…, report says ${stated.slice(0, 16)}…`,
          text: lines[site.line].trim(),
        });
      }
    }
  }
  return findings;
}

// --- analysis -------------------------------------------------------------

function analyse(source, text, baseDir) {
  const lines = text.split('\n');
  const inReceipt = receiptLines(lines);
  const receiptRuns = [];
  for (let i = 0; i < lines.length; i++) {
    if (!inReceipt[i]) continue;
    const start = i;
    while (i < lines.length && inReceipt[i]) i++;
    const body = lines.slice(start, i);
    const commands = body.filter(isInvocation);
    // Output is what the block holds that is not the command and not a fence.
    const output = body.filter((line) =>
      !isInvocation(line) && line.trim() !== '' && !/^\s*(`{3,}|~{3,})/.test(line));
    receiptRuns.push({
      start,
      end: i - 1,
      // Both halves are required. A command with nothing under it shows an
      // intention, not a result; output with no command is the laundering
      // move. Numbers come from the output alone, so a value typed into the
      // command line cannot vouch for itself.
      ran: commands.length > 0 && output.length > 0,
      numbers: new Set(output.flatMap((line) => [
        ...[...line.matchAll(NUMBER)].map((m) => m[1]),
        ...[...line.matchAll(HEX)].map((m) => m[1].toLowerCase()),
      ])),
    });
  }

  const findings = [];
  for (let i = 0; i < lines.length; i++) {
    if (inReceipt[i]) continue;
    for (const claim of claimsIn(lines[i], i > 0 && !inReceipt[i - 1] ? lines[i - 1] : '')) {
      const backing = receiptRuns.find((run) =>
        run.ran
        && run.numbers.has(claim.value)
        && i >= run.start - window - 1
        && i <= run.end + window + 1);
      if (backing) continue;
      findings.push({
        kind: 'quantity',
        source,
        line: i + 1,
        column: claim.column,
        claim: claim.text,
        text: lines[i].trim(),
      });
    }
  }
  for (const finding of checkArtifacts(lines, baseDir)) {
    findings.push({ source, ...finding });
  }
  findings.sort((a, b) => a.line - b.line || a.column - b.column);
  return { lines, findings, receipts: receiptRuns.filter((r) => r.ran).length };
}

// --- run ------------------------------------------------------------------

async function load(target) {
  if (target === '-') {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf8');
  }
  return readFile(target, 'utf8');
}

const reports = [];
for (const target of targets) {
  let text;
  try {
    text = await load(target);
  } catch (error) {
    console.error(`receipts.mjs: cannot read ${target}: ${error.message}`);
    process.exit(2);
  }
  const baseDir = base ?? (target === '-' ? process.cwd() : dirname(resolve(target)));
  reports.push(analyse(target === '-' ? '<stdin>' : target, text, baseDir));
}

const findings = reports.flatMap((r) => r.findings);

if (asLabel) {
  for (const report of reports) {
    const flagged = new Map();
    for (const f of report.findings) {
      flagged.set(f.line, [...(flagged.get(f.line) ?? []), f.claim]);
    }
    report.lines.forEach((line, index) => {
      const claims = flagged.get(index + 1);
      console.log(claims ? `${line}  <!-- UNSUPPORTED: ${claims.join(', ')} -->` : line);
    });
  }
} else if (asJson) {
  console.log(JSON.stringify({
    ok: findings.length === 0,
    receipts: reports.reduce((sum, r) => sum + r.receipts, 0),
    unsupported: findings.length,
    findings,
  }, null, 2));
} else if (findings.length === 0) {
  const receipts = reports.reduce((sum, r) => sum + r.receipts, 0);
  console.log(`receipts: ok — every quantity is attributed and every file is there (${receipts} receipt${receipts === 1 ? '' : 's'} found)`);
} else {
  const quantities = findings.filter((f) => f.kind === 'quantity').length;
  const artifacts = findings.length - quantities;
  const parts = [];
  if (quantities) parts.push(`${quantities} unsupported quantit${quantities === 1 ? 'y' : 'ies'}`);
  if (artifacts) parts.push(`${artifacts} file claim${artifacts === 1 ? '' : 's'} that do not hold`);
  console.log(`receipts: ${parts.join(', ')} — strike or re-measure before these reach a decision\n`);
  for (const f of findings) {
    console.log(`  ${f.source}:${f.line}:${f.column}  ${f.claim}${f.detail ? ` — ${f.detail}` : ''}`);
    console.log(`    ${f.text}`);
  }
}

process.exitCode = findings.length === 0 ? 0 : 1;
