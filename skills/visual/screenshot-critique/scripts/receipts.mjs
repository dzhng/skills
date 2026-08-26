#!/usr/bin/env node
// Strike unsupported quantities out of a critique.
//
// A judge given images and no shell answers a numeric question numerically:
// the luminance means, the symmetry percentages, and the crop files it says it
// wrote all arrive together, self-consistent and invented. This reads the
// report back and asks, of every number that claims to be a measurement,
// whether the report also carries the command that produced it.
//
//   node receipts.mjs <report.md> [...]      # human summary, nonzero if unbacked
//   node receipts.mjs --json <report.md>     # machine-readable findings
//   node receipts.mjs --label <report.md>    # annotated copy on stdout
//   cat report.md | node receipts.mjs -      # read stdin
//
// A receipt is a fenced code block, an indented block, or an inline `$ cmd`
// line that both runs something and shows its output. A quantity counts as
// backed when it appears inside a receipt, or in prose within a few lines of
// one whose output contains that same quantity — which is what "quote the
// command and its output beside the number" looks like on the page.

import { readFile } from 'node:fs/promises';

const HELP = `receipts.mjs — reject quantitative claims a critique cannot support

  node receipts.mjs [--json|--label] [--window N] <report.md> [...]
  node receipts.mjs -            read the report from stdin

Exit code 0 when every measurement claim carries its command and output,
1 when any claim does not, 2 on a usage or read error.`;

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

const argv = process.argv.slice(2);
if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
  console.log(HELP);
  process.exit(argv.length === 0 ? 2 : 0);
}

let asJson = false;
let asLabel = false;
let window = 4;
const targets = [];
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === '--json') asJson = true;
  else if (arg === '--label') asLabel = true;
  else if (arg === '--window') window = Number.parseInt(argv[++i], 10);
  else if (arg.startsWith('--')) {
    console.error(`receipts.mjs: unknown option ${arg}\n\n${HELP}`);
    process.exit(2);
  } else targets.push(arg);
}
if (!Number.isFinite(window) || window < 0) {
  console.error('receipts.mjs: --window needs a non-negative integer');
  process.exit(2);
}
if (targets.length === 0) {
  console.error(`receipts.mjs: no report given\n\n${HELP}`);
  process.exit(2);
}

// --- receipts -------------------------------------------------------------

// Lines that belong to a fenced block, an indented block, or a `$ cmd` shell
// transcript. Both the command and whatever it printed count as receipt text:
// a number is backed by appearing in the output, not by sitting next to a
// command that was never run.
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

// A receipt has to actually run something. A fenced block holding only prose
// is not evidence, and treating it as evidence is how a fabricated report
// launders itself: paste the invented numbers into a code fence and they read
// as output.
const COMMAND_SHAPE = /(^|\s)(\$\s+\S|[.\/~]?[\w./-]*\b(node|python3?|magick|convert|ffmpeg|identify|compare|sips|exiftool|jq|awk|sed|grep|rg|cat|head|tail|ls|wc|printf|echo|uv|npx|pnpm|deno|bash|sh|zsh)\b)/;

function isCommandLine(line) {
  return COMMAND_SHAPE.test(line);
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

// --- analysis -------------------------------------------------------------

function analyse(source, text) {
  const lines = text.split('\n');
  const inReceipt = receiptLines(lines);
  const receiptRuns = [];
  for (let i = 0; i < lines.length; i++) {
    if (!inReceipt[i]) continue;
    const start = i;
    while (i < lines.length && inReceipt[i]) i++;
    const body = lines.slice(start, i);
    receiptRuns.push({
      start,
      end: i - 1,
      ran: body.some(isCommandLine),
      numbers: new Set(body.flatMap((line) => [
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
        source,
        line: i + 1,
        column: claim.column,
        claim: claim.text,
        text: lines[i].trim(),
      });
    }
  }
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
  reports.push(analyse(target === '-' ? '<stdin>' : target, text));
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
  console.log(`receipts: ok — no unsupported quantities (${receipts} receipt${receipts === 1 ? '' : 's'} found)`);
} else {
  console.log(`receipts: ${findings.length} unsupported quantit${findings.length === 1 ? 'y' : 'ies'} — strike or re-measure before these reach a decision\n`);
  for (const f of findings) {
    console.log(`  ${f.source}:${f.line}:${f.column}  ${f.claim}`);
    console.log(`    ${f.text}`);
  }
}

process.exitCode = findings.length === 0 ? 0 : 1;
