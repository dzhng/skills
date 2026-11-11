import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { fileURLToPath } from "node:url";

const installer = fileURLToPath(new URL("./install-git-hooks.mjs", import.meta.url));
const fixtures = [];
const env = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
afterEach(() => {
  for (const root of fixtures.splice(0)) rmSync(root, { recursive: true, force: true });
});

test("one installation runs each checkout's runner and enforces its result in new worktrees", () => {
  const { main, linked } = fixture();
  run(main, ["node", "scripts/install-git-hooks.mjs"]);
  git(main, "worktree", "add", "-b", "linked", linked);
  runner(linked, 1);
  const refused = command(linked, ["git", "commit", "--allow-empty", "-m", "refused"]);
  assert.notEqual(refused.status, 0);
  assert.match(refused.output, /fixture check refused/);

  writeFileSync(path.join(linked, ".check-result"), "0");
  git(linked, "commit", "--allow-empty", "-m", "accepted");
  assert.equal(readFileSync(path.join(linked, ".checked-in"), "utf8"), linked);
  assert.equal(git(main, "log", "-1", "--format=%s"), "fixture");
  assert.equal(existsSync(path.join(main, ".checked-in")), false);
});

for (const [lockfile, manager] of [
  [null, "npm"],
  ["bun.lock", "bun"],
  ["pnpm-lock.yaml", "pnpm"],
]) {
  test(`a checkout without dependencies is told to run ${manager} install`, () => {
    const { main } = fixture();
    run(main, ["node", "scripts/install-git-hooks.mjs"]);
    // Read when committing, not when installing.
    if (lockfile) writeFileSync(path.join(main, lockfile), "");
    const refused = command(main, ["git", "commit", "--allow-empty", "-m", "missing dependencies"]);
    assert.notEqual(refused.status, 0);
    assert.match(
      refused.output,
      new RegExp(`dependencies aren't installed in this checkout; run ${manager} install`),
    );
    assert.equal(git(main, "log", "-1", "--format=%s"), "fixture");
  });
}

test("a branch without lint-staged commits unchecked", () => {
  const { main, linked } = fixture();
  run(main, ["node", "scripts/install-git-hooks.mjs"]);
  git(main, "worktree", "add", "-b", "linked", linked);
  writeFileSync(path.join(linked, "package.json"), "{}\n");
  git(linked, "commit", "-am", "predates lint-staged");
  assert.equal(git(linked, "log", "-1", "--format=%s"), "predates lint-staged");
});

test("repeat installation from a linked worktree migrates Husky and preserves other hooks", () => {
  const { main, linked } = fixture();
  const prePush = path.join(main, ".git/hooks/pre-push");
  writeFileSync(prePush, "#!/bin/sh\necho preserve-lfs\n");
  git(main, "config", "core.hooksPath", ".husky/_");
  git(main, "worktree", "add", "-b", "linked", linked);
  run(linked, ["node", "scripts/install-git-hooks.mjs"]);
  run(linked, ["node", "scripts/install-git-hooks.mjs"]);
  assert.equal(command(main, ["git", "config", "--get", "core.hooksPath"]).status, 1);
  assert.equal(readFileSync(prePush, "utf8"), "#!/bin/sh\necho preserve-lfs\n");
  runner(main, 1);
  const refused = command(main, ["git", "commit", "--allow-empty", "-m", "refused"]);
  assert.notEqual(refused.status, 0);
  assert.match(refused.output, /fixture check refused/);
});

for (const customPath of [false, true]) {
  test(`installation preserves ${customPath ? "a custom hooks path" : "an existing common hook"}`, () => {
    const { main } = fixture();
    const directory = path.join(main, customPath ? "custom hooks" : ".git/hooks");
    mkdirSync(directory, { recursive: true });
    const preCommit = path.join(directory, "pre-commit");
    const content = "#!/bin/sh\necho preserve-custom\n";
    writeFileSync(preCommit, content);
    // A common-hook conflict must preserve the active Husky configuration too.
    git(main, "config", "core.hooksPath", customPath ? directory : ".husky/_");
    const output = run(main, ["node", "scripts/install-git-hooks.mjs"]);
    assert.match(output, /not (installing|replacing)/);
    assert.equal(readFileSync(preCommit, "utf8"), content);
    assert.equal(
      git(main, "config", "--get", "core.hooksPath"),
      customPath ? directory : ".husky/_",
    );
  });
}

test("installation in an exported tree creates no Git metadata", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ratchet-export-"));
  fixtures.push(root);
  copyFileSync(installer, path.join(root, "install-git-hooks.mjs"));
  run(root, ["node", "install-git-hooks.mjs"]);
  assert.equal(existsSync(path.join(root, ".git")), false);
});

function fixture() {
  const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), "ratchet-hooks-")));
  fixtures.push(root);
  const main = path.join(root, "main");
  const linked = path.join(root, "linked worktree");
  mkdirSync(path.join(main, "scripts"), { recursive: true });
  copyFileSync(installer, path.join(main, "scripts/install-git-hooks.mjs"));
  writeFileSync(
    path.join(main, "package.json"),
    '{ "devDependencies": { "lint-staged": "0.0.0" } }\n',
  );
  writeFileSync(path.join(main, ".gitignore"), "node_modules\n.check-result\n.checked-in\n");
  git(main, "init");
  git(main, "config", "user.name", "Hook Test");
  git(main, "config", "user.email", "hooks@example.test");
  git(main, "add", ".");
  git(main, "-c", "core.hooksPath=/dev/null", "commit", "-m", "fixture");
  return { main, linked };
}

// The installer owns dispatch to lint-staged; the real runner and ratchet are
// exercised by the consuming repository's commit checks.
function runner(checkout, exitCode) {
  const bin = path.join(checkout, "node_modules/.bin");
  mkdirSync(bin, { recursive: true });
  const executable = path.join(bin, "lint-staged");
  writeFileSync(
    executable,
    `#!/usr/bin/env node
const fs = require('node:fs');
fs.writeFileSync('.checked-in', process.cwd());
const result = Number(fs.readFileSync('.check-result', 'utf8'));
if (result) console.error('fixture check refused');
process.exit(result);
`,
  );
  chmodSync(executable, 0o755);
  writeFileSync(path.join(checkout, ".check-result"), String(exitCode));
}

function command(cwd, args) {
  const result = spawnSync(args[0], args.slice(1), { cwd, env, encoding: "utf8" });
  if (result.error) throw result.error;
  return { status: result.status, output: result.stdout + result.stderr };
}

function run(cwd, args) {
  const result = command(cwd, args);
  assert.equal(result.status, 0, result.output);
  return result.output.trim();
}

function git(cwd, ...args) {
  return run(cwd, ["git", ...args]);
}
