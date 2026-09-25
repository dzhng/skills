import assert from 'node:assert/strict';
import { access, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const testDir = dirname(fileURLToPath(import.meta.url));
const skillDir = resolve(testDir, '..');
const helper = resolve(skillDir, 'scripts/visual-parity-diff.mjs');
const targetRepo = resolve(testDir, 'fixtures/target-without-helper-packages');
const outDir = resolve(targetRepo, 'visual-diff-test-output');
const controlOutDir = resolve(targetRepo, 'visual-diff-control-output');

test('runs from a target repository without pngjs or pixelmatch', async () => {
  const targetRequire = createRequire(resolve(targetRepo, 'web/package.json'));
  for (const dependency of ['pngjs', 'pixelmatch']) {
    assert.throws(
      () => targetRequire.resolve(dependency),
      (error) => error?.code === 'MODULE_NOT_FOUND',
      `${dependency} must remain unavailable to the target repository`,
    );
  }

  try {
    const result = spawnSync(process.execPath, [helper], {
      cwd: targetRepo,
      encoding: 'utf8',
      env: {
        ...process.env,
        REFERENCE_DIR: 'reference',
        CANDIDATE_DIR: 'candidate',
        OUT_DIR: 'visual-diff-test-output',
      },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const report = JSON.parse(await readFile(resolve(outDir, 'visual-parity-diff.json'), 'utf8'));
    assert.equal(report.pairCount, 1);
    assert.equal(report.results[0].id, 'fixture');
    assert.equal(report.results[0].grayscale.pixelmatchRatio, 1);
    await access(resolve(outDir, 'fixture-pixelmatch.png'));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('preserves the identical-image control case', async () => {
  try {
    const result = spawnSync(process.execPath, [helper], {
      cwd: targetRepo,
      encoding: 'utf8',
      env: {
        ...process.env,
        REFERENCE_DIR: 'reference',
        CANDIDATE_DIR: 'reference',
        OUT_DIR: 'visual-diff-control-output',
      },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const report = JSON.parse(await readFile(resolve(controlOutDir, 'visual-parity-diff.json'), 'utf8'));
    assert.equal(report.results[0].grayscale.pixelmatchRatio, 0);
  } finally {
    await rm(controlOutDir, { recursive: true, force: true });
  }
});
