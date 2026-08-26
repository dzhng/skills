#!/usr/bin/env node
// Eval harness for receipts.mjs.
//
// Every report here is written in this file, so the right answer is known by
// construction rather than read back from a previous run — a snapshot of
// current output would happily bless a checker that flags nothing. Each case
// pins both directions: the fabricated report must be rejected, and the
// honest one must pass untouched. A checker that always fails is as useless as
// one that always passes, and only the paired cases catch either.
//
//   node receipts.eval.mjs
//
// Exits nonzero on the first failing expectation, printing every check.

import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const script = resolve(here, 'receipts.mjs');

const checks = [];
const check = (name, pass, detail = '') => checks.push({ name, pass, detail });

const workspace = await mkdtemp(resolve(tmpdir(), 'receipts-eval-'));

// A real 1x1 PNG. The reports below name it the way a critique names the shot
// it measured, and the checker resolves that name on disk — so the file has to
// be there for the honest fixtures to pass, and its hash has to be the hash
// they state.
const SHOT = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmM'
  + 'IQAAAABJRU5ErkJggg==',
  'base64',
);
await writeFile(resolve(workspace, 'shot.png'), SHOT);
const SHOT_SHA = createHash('sha256').update(SHOT).digest('hex');
// A second real file, so a fixture can pair two paths with two hashes and show
// that each path is read against the hash written beside it.
const CROP = Buffer.concat([SHOT, Buffer.from('\n')]);
await writeFile(resolve(workspace, 'crop.png'), CROP);
const CROP_SHA = createHash('sha256').update(CROP).digest('hex');
const WRONG_SHA = 'f'.repeat(64);

function run(args, stdin = null) {
  return new Promise((done) => {
    const child = spawn(process.execPath, [script, ...args], {
      stdio: [stdin === null ? 'ignore' : 'pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => { stdout += c; });
    child.stderr.on('data', (c) => { stderr += c; });
    if (stdin !== null) {
      child.stdin.end(stdin);
    }
    child.on('close', (code) => done({ code, stdout, stderr }));
  });
}

async function report(name, body) {
  const path = resolve(workspace, `${name}.md`);
  await writeFile(path, body);
  return path;
}

async function judge(name, body) {
  const path = await report(name, body);
  const result = await run(['--json', path]);
  return { ...result, json: JSON.parse(result.stdout) };
}

// --- the fabrication this exists to catch --------------------------------
// A critic with images and no shell, asked how much darker the hem is. The
// numbers are self-consistent, plausibly scaled, and measured nothing.
const FABRICATED = `# Visual critique

## Findings

1. The under-hem region is not darker than the far field. Mean luminance under
   the hem is 44.0 against 44.0 in the far field, so the contact shadow is
   absent.
2. Left/right symmetry is 96% — the silhouette is effectively mirrored.
3. The hem sits 12px above the floor plane.

I wrote crops to /tmp/receipts-eval-no-such-crop-hem.png and
/tmp/receipts-eval-no-such-crop-far.png for reference.
`;

// The same critique from an agent that had a shell, quoting what it ran.
const MEASURED = `# Visual critique

## Findings

1. The under-hem region is not darker than the far field.

   \`\`\`
   $ python3 measure.py shot.png --regions hem far
   hem  mean_luminance 33.6
   far  mean_luminance 44.3
   \`\`\`

   The hem reads 33.6 against 44.3, a real darkening rather than the flat
   contact the eye first suggested.

2. Left/right symmetry looks close but I did not measure it.
`;

// What an image-only critic should sound like: ordinal, not numeric.
const QUALITATIVE = `# Visual critique

## Findings

1. The under-hem region reads clearly darker than the floor beside it, so the
   contact shadow is present.
2. The silhouette looks close to mirrored, though the left sleeve hangs lower.
3. The hem sits a little above the floor plane — a visible gap, not a contact.
4. Reviewed at 2x on 3 crops.
`;

const fabricated = await judge('fabricated', FABRICATED);
check('fabricated report is rejected', fabricated.code === 1, `code=${fabricated.code}`);
check('every fabricated quantity is named',
  [44.0, 96, 12].every((n) => fabricated.json.findings.some((f) => f.claim.includes(String(n)))),
  JSON.stringify(fabricated.json.findings.map((f) => f.claim)));
check('fabricated findings carry line numbers',
  fabricated.json.findings.every((f) => Number.isInteger(f.line) && f.line > 0),
  JSON.stringify(fabricated.json.findings));

const measured = await judge('measured', MEASURED);
check('measured report passes', measured.code === 0, JSON.stringify(measured.json.findings));
check('measured report counts its receipt', measured.json.receipts === 1,
  `receipts=${measured.json.receipts}`);

const qualitative = await judge('qualitative', QUALITATIVE);
check('qualitative report passes untouched', qualitative.code === 0,
  JSON.stringify(qualitative.json.findings));

// --- the laundering move --------------------------------------------------
// Invented numbers pasted into a code fence with no command. A checker that
// treats any fenced block as evidence blesses exactly this.
const LAUNDERED = `# Visual critique

\`\`\`
hem  mean_luminance 44.0
far  mean_luminance 44.0
\`\`\`

Mean luminance under the hem is 44.0 against 44.0 in the far field.
`;
const laundered = await judge('laundered', LAUNDERED);
check('numbers in a fence with no command are still rejected', laundered.code === 1,
  `code=${laundered.code} findings=${JSON.stringify(laundered.json.findings)}`);

// --- hex ------------------------------------------------------------------
// An eyeballed hex value is the same fabrication wearing a different notation,
// and it hides from a plain number scan.
const HEXED = `# Visual critique

The band reads roughly 0x60 against a 0xB0 field, judged by eye.
`;
const hexed = await judge('hexed', HEXED);
check('eyeballed hex values are rejected',
  hexed.code === 1 && hexed.json.findings.length === 2,
  JSON.stringify(hexed.json.findings));

const HEX_MEASURED = `# Visual critique

\`\`\`
$ python3 sample.py shot.png --at 320,262 --at 40,262
0x60
0xb0
\`\`\`

The band reads 0x60 against a 0xb0 field.
`;
const hexMeasured = await judge('hex-measured', HEX_MEASURED);
check('measured hex values pass', hexMeasured.code === 0,
  JSON.stringify(hexMeasured.json.findings));

// --- proximity ------------------------------------------------------------
// A receipt backs the prose beside it, not a claim pages away that happens to
// share a digit.
const DISTANT = `# Visual critique

\`\`\`
$ python3 measure.py shot.png
hem mean_luminance 33.6
\`\`\`

The hem measures 33.6.

Filler line 1.
Filler line 2.
Filler line 3.
Filler line 4.
Filler line 5.
Filler line 6.
Filler line 7.
Filler line 8.

The sleeve also measures 33.6.
`;
const distant = await judge('distant', DISTANT);
check('a receipt backs only nearby prose', distant.code === 1 && distant.json.findings.length === 1,
  `findings=${JSON.stringify(distant.json.findings)}`);
check('the backed claim is not the flagged one',
  distant.json.findings[0]?.text.includes('sleeve'),
  JSON.stringify(distant.json.findings));

// --- what must not be flagged --------------------------------------------
// Bare ordinals, versions, dates, and prose numbers are not measurement
// claims. Flagging them trains the reader to ignore the tool.
const ORDINARY = `# Visual critique

Reviewed 4 screenshots captured on 2026-08-26 with the 2 crops from finding 1.
Issue 3 is the most serious of the 5. See the v1.2 baseline for comparison.
Confidence: high on findings 1 and 2, medium on 3.
`;
const ordinary = await judge('ordinary', ORDINARY);
check('ordinary prose numbers are not flagged', ordinary.code === 0,
  JSON.stringify(ordinary.json.findings));

// --- laundering, second form ---------------------------------------------
// The first laundering fixture pastes numbers into a fence with no command at
// all. This one is the move that beats a checker looking for a command *word*:
// the fence holds a sentence with `python3` in it. A sentence has no arguments
// in it, which is the difference the checker reads.
const LAUNDERED_COMMAND = `# Visual critique

\`\`\`text
python3 measured the image and reported the region means below
hem  mean_luminance 44.0
far  mean_luminance 44.0
\`\`\`

Mean luminance under the hem is 44.0 against 44.0 in the far field.
`;
const launderedCommand = await judge('laundered-command', LAUNDERED_COMMAND);
check('a command word in prose is not a receipt',
  launderedCommand.code === 1
    && launderedCommand.json.findings.some((f) => f.kind === 'quantity'),
  `code=${launderedCommand.code} findings=${JSON.stringify(launderedCommand.json.findings)}`);
check('the laundering fence counts as no receipt at all',
  launderedCommand.json.receipts === 0,
  `receipts=${launderedCommand.json.receipts}`);

// The same block with a real invocation in it passes, so the rule above
// discriminates rather than rejecting fences wholesale.
const COMMAND_WITH_ARGS = `# Visual critique

\`\`\`text
$ python3 measure.py shot.png --regions hem far
hem  mean_luminance 44.0
far  mean_luminance 44.0
\`\`\`

Mean luminance under the hem is 44.0 against 44.0 in the far field.
`;
const commandWithArgs = await judge('command-with-args', COMMAND_WITH_ARGS);
check('an invocation with arguments still counts as a receipt',
  commandWithArgs.code === 0, JSON.stringify(commandWithArgs.json.findings));

// --- artifacts ------------------------------------------------------------
// The crops a fabricating critic says it wrote are the one claim that can be
// settled against the world rather than against the page.
const fabricatedArtifacts = fabricated.json.findings.filter((f) => f.kind === 'artifact');
check('crops the report never wrote are flagged',
  fabricatedArtifacts.length === 2
    && fabricatedArtifacts.every((f) => f.detail === 'no such file'),
  JSON.stringify(fabricatedArtifacts));

const HASH_OK = `# Visual critique

\`\`\`
$ shasum -a 256 shot.png
${SHOT_SHA}  shot.png
\`\`\`

The frame under review is shot.png, sha256 ${SHOT_SHA}.
`;
const hashOk = await judge('hash-ok', HASH_OK);
check('a file that is there, with the hash it claims, passes',
  hashOk.code === 0, JSON.stringify(hashOk.json.findings));

const HASH_WRONG = `# Visual critique

The frame under review is shot.png, sha256 ${WRONG_SHA}.
`;
const hashWrong = await judge('hash-wrong', HASH_WRONG);
check('a stated hash that does not match the file is flagged',
  hashWrong.code === 1
    && hashWrong.json.findings.some((f) => f.kind === 'artifact' && /sha256/.test(f.detail)),
  JSON.stringify(hashWrong.json.findings));

// Reports write the pair both ways round, and `shasum` itself prints the hash
// first. A checker that only looks to the right of the path lets the whole
// claim through on the line shasum produced.
const HASH_WRONG_BEFORE = `# Visual critique

\`\`\`
$ shasum -a 256 -- *.png
${WRONG_SHA}  shot.png
\`\`\`
`;
const hashWrongBefore = await judge('hash-wrong-before', HASH_WRONG_BEFORE);
check('a wrong hash stated before the path is flagged',
  hashWrongBefore.code === 1
    && hashWrongBefore.json.findings.some((f) => f.kind === 'artifact' && /sha256/.test(f.detail)),
  JSON.stringify(hashWrongBefore.json.findings));

const HASH_OK_BEFORE = `# Visual critique

\`\`\`
$ shasum -a 256 -- *.png
${SHOT_SHA}  shot.png
\`\`\`
`;
const hashOkBefore = await judge('hash-ok-before', HASH_OK_BEFORE);
check('the right hash stated before the path passes',
  hashOkBefore.code === 0, JSON.stringify(hashOkBefore.json.findings));

// Reading both sides is only safe if the nearer hash wins: a line that pairs
// two files with two hashes must give each path its own, or the fix trades one
// bypass for a false accusation.
const HASH_TWO_ON_A_LINE = `# Visual critique

\`\`\`
$ shasum -a 256 shot.png crop.png
${SHOT_SHA}  shot.png  ${CROP_SHA}  crop.png
\`\`\`
`;
const hashTwoOnALine = await judge('hash-two-on-a-line', HASH_TWO_ON_A_LINE);
check('two files and two hashes on one line each keep their own',
  hashTwoOnALine.code === 0, JSON.stringify(hashTwoOnALine.json.findings));

// A matching repeat does not make a false SHA claim disappear. Both orders
// matter: judging a path by whether *any* of its hashes is true launders one
// of these reports.
const HASH_FALSE_THEN_TRUE = `# Visual critique

The frame is shot.png, sha256 ${WRONG_SHA}.
The same frame is shot.png, sha256 ${SHOT_SHA}.
`;
const hashFalseThenTrue = await judge('hash-false-then-true', HASH_FALSE_THEN_TRUE);
check('a false hash followed by a true repeat is flagged',
  hashFalseThenTrue.code === 1
    && hashFalseThenTrue.json.findings.filter((f) => f.kind === 'artifact').length === 1,
  JSON.stringify(hashFalseThenTrue.json.findings));

const HASH_TRUE_THEN_FALSE = `# Visual critique

The frame is shot.png, sha256 ${SHOT_SHA}.
The same frame is shot.png, sha256 ${WRONG_SHA}.
`;
const hashTrueThenFalse = await judge('hash-true-then-false', HASH_TRUE_THEN_FALSE);
check('a true hash followed by a false repeat is flagged',
  hashTrueThenFalse.code === 1
    && hashTrueThenFalse.json.findings.filter((f) => f.kind === 'artifact').length === 1,
  JSON.stringify(hashTrueThenFalse.json.findings));

const HASH_REPEATED_CORRECT = `# Visual critique

The frame is shot.png, sha256 ${SHOT_SHA}.
The same frame is shot.png, sha256 ${SHOT_SHA}.
`;
const hashRepeatedCorrect = await judge('hash-repeated-correct', HASH_REPEATED_CORRECT);
check('repeated correct hashes pass',
  hashRepeatedCorrect.code === 0, JSON.stringify(hashRepeatedCorrect.json.findings));

// The command names both inputs, while its output repeats each with the hash
// that belongs to it. Command paths must not inherit hashes from output paths.
const HASH_MULTI_FILE_COMMAND_OUTPUT = `# Visual critique

\`\`\`
$ shasum -a 256 shot.png crop.png
${SHOT_SHA}  shot.png
${CROP_SHA}  crop.png
\`\`\`
`;
const hashMultiFileCommandOutput = await judge('hash-multi-file-command-output', HASH_MULTI_FILE_COMMAND_OUTPUT);
check('multi-file command and output keep each hash with its output path',
  hashMultiFileCommandOutput.code === 0,
  JSON.stringify(hashMultiFileCommandOutput.json.findings));

// Ordered pairs must work in both directions. Path-first prose does not have
// the hash-first ordering `shasum` emits, even when table pipes or tabs make
// every neighboring distance identical.
const HASH_PATH_FIRST_TWO_FILES = `# Visual critique

shot.png sha256 ${SHOT_SHA} crop.png sha256 ${CROP_SHA}
`;
const hashPathFirstTwoFiles = await judge('hash-path-first-two-files', HASH_PATH_FIRST_TWO_FILES);
check('path-first same-line pairs keep each hash with its path',
  hashPathFirstTwoFiles.code === 0, JSON.stringify(hashPathFirstTwoFiles.json.findings));

const HASH_PATH_FIRST_TAB = `# Visual critique

shot.png\t${CROP_SHA}\tcrop.png\t${CROP_SHA}
`;
const hashPathFirstTab = await judge('hash-path-first-tab', HASH_PATH_FIRST_TAB);
check('a tab-separated path-first false hash is flagged on its own path',
  hashPathFirstTab.code === 1
    && hashPathFirstTab.json.findings.length === 1
    && hashPathFirstTab.json.findings[0].claim === 'shot.png',
  JSON.stringify(hashPathFirstTab.json.findings));

const HASH_PATH_FIRST_TABLE = `# Visual critique

| shot.png | ${CROP_SHA} | crop.png | ${CROP_SHA} |
`;
const hashPathFirstTable = await judge('hash-path-first-table', HASH_PATH_FIRST_TABLE);
check('a table path-first false hash is flagged on its own path',
  hashPathFirstTable.code === 1
    && hashPathFirstTable.json.findings.length === 1
    && hashPathFirstTable.json.findings[0].claim === 'shot.png',
  JSON.stringify(hashPathFirstTable.json.findings));

// One following hash after multiple paths has no defensible owner. It must
// fail instead of being silently attached to an arbitrary file or discarded.
const HASH_MULTI_PATH_CONTINUATION = `# Visual critique

Wrote crops to shot.png and crop.png.
${WRONG_SHA}
`;
const hashMultiPathContinuation = await judge('hash-multi-path-continuation', HASH_MULTI_PATH_CONTINUATION);
check('a hash after multiple paths is rejected as unattributable',
  hashMultiPathContinuation.code === 1
    && hashMultiPathContinuation.json.findings.length === 1
    && /cannot attribute sha256/.test(hashMultiPathContinuation.json.findings[0].detail),
  JSON.stringify(hashMultiPathContinuation.json.findings));

// Negative control for the artifact half: naming a file that is really there,
// with no hash claimed, must stay silent. A checker that flags every path is
// as useless as one that flags none.
const ARTIFACT_OK = `# Visual critique

The shot under review is shot.png; the crop discussion refers to its lower
third. No measurements were taken.
`;
const artifactOk = await judge('artifact-ok', ARTIFACT_OK);
check('naming a file that exists is not a finding',
  artifactOk.code === 0, JSON.stringify(artifactOk.json.findings));

// --- interfaces -----------------------------------------------------------
const piped = await run(['--json', '-'], FABRICATED);
check('stdin is accepted', piped.code === 1 && JSON.parse(piped.stdout).unsupported > 0,
  piped.stderr.slice(0, 200));

const labelled = await run(['--label', await report('label', FABRICATED)]);
check('--label annotates in place and keeps every line',
  labelled.stdout.includes('UNSUPPORTED:')
    && labelled.stdout.split('\n').length >= FABRICATED.split('\n').length,
  labelled.stdout.slice(0, 200));

const human = await run([await report('human', FABRICATED)]);
check('human output names the file and line',
  /fabrication|unsupported/i.test(human.stdout) && /human\.md:\d+/.test(human.stdout),
  human.stdout.slice(0, 300));

const missing = await run([resolve(workspace, 'nope.md')]);
check('a missing report fails loudly', missing.code === 2 && /cannot read/.test(missing.stderr),
  missing.stderr.slice(0, 200));

const badFlag = await run(['--nonsense', await report('flag', QUALITATIVE)]);
check('an unknown option fails loudly', badFlag.code === 2 && /unknown option/.test(badFlag.stderr),
  badFlag.stderr.slice(0, 200));

await rm(workspace, { recursive: true, force: true });

const failed = checks.filter((c) => !c.pass);
for (const c of checks) {
  console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.pass || !c.detail ? '' : `\n      ${c.detail}`}`);
}
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
process.exitCode = failed.length === 0 ? 0 : 1;
