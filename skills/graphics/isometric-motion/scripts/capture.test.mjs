import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";

const execute = promisify(execFile);
const capture = fileURLToPath(new URL("capture.mjs", import.meta.url));

test("capture creates nested output directories for initial and timed screenshots", async () => {
  const directory = await mkdtemp(join(tmpdir(), "anatomy-capture-"));
  try {
    const page = join(directory, "figure.html");
    const output = join(directory, "shots", "closeups", "figure.png");
    await writeFile(page, '<!doctype html><div class="iso-plate" style="width:200px;height:100px;background:papayawhip">Figure</div>');
    const result = await execute(process.execPath, [capture, page, "--out", output, "--wait", "0", "--times", "20", "--scale", "1"], { timeout: 30000 });
    assert.match(result.stdout, /console: clean/);
    for (const name of [output, output.replace(/\.png$/, "-20.png")]) {
      const png = await readFile(name);
      assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      assert.ok(png.length > 100);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("capture retains existing-directory output", async () => {
  const directory = await mkdtemp(join(tmpdir(), "anatomy-capture-"));
  try {
    const page = join(directory, "figure.html");
    const output = join(directory, "figure.png");
    await writeFile(page, '<!doctype html><div class="iso-plate" style="width:200px;height:100px;background:papayawhip">Figure</div>');
    await execute(process.execPath, [capture, page, "--out", output, "--wait", "0"], { timeout: 30000 });
    assert.ok((await readFile(output)).length > 100);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
