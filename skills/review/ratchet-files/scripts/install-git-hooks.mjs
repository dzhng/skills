// Installs one pre-commit hook in the repository's shared hooks directory, so
// every worktree runs its own lint-staged without installing hooks itself.
// Run it from the root package's prepare script; it needs no adapting.
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

let common;
try {
  common = git("rev-parse", "--path-format=absolute", "--git-common-dir");
} catch {
  process.exit(0); // Exported source trees have no hooks to install.
}

// Worktrees share this hook, so it names the committing checkout's own
// package manager, read from its lockfile.
const marker = "# Installed by ratchet-files";
const hook = `#!/bin/sh
${marker}
# A branch without lint-staged has no checks to run.
grep -q '"lint-staged"' package.json 2>/dev/null || exit 0
[ -x node_modules/.bin/lint-staged ] || {
  if [ -f bun.lock ] || [ -f bun.lockb ]; then manager=bun
  elif [ -f pnpm-lock.yaml ]; then manager=pnpm
  elif [ -f yarn.lock ]; then manager=yarn
  else manager=npm
  fi
  echo "pre-commit: dependencies aren't installed in this checkout; run $manager install" >&2
  exit 1
}
exec node_modules/.bin/lint-staged
`;

let hooksPath = "";
try {
  hooksPath = git("config", "--get", "core.hooksPath");
} catch {
  // Unset: Git uses the common hooks directory.
}
if (hooksPath && hooksPath !== ".husky/_") {
  console.warn(`core.hooksPath is ${hooksPath}; not installing the pre-commit hook.`);
  process.exit(0);
}

const path = join(common, "hooks", "pre-commit");
if (existsSync(path) && !readFileSync(path, "utf8").includes(marker)) {
  console.warn(`${path} exists and is not ours; not replacing it.`);
  process.exit(0);
}
mkdirSync(dirname(path), { recursive: true });
writeFileSync(path, hook);
chmodSync(path, 0o755);
if (hooksPath === ".husky/_") git("config", "--unset", "core.hooksPath");
