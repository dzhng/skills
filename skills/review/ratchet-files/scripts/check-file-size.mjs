#!/usr/bin/env node
// Size budget for source files, so an agent can read any file whole. Tokens
// are estimated as bytes / 4. Run with --help for modes and hook setup.
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const pragma = "@ratchet-files-ignore";
const pragmaLines = 10;

const usage = `Usage:
  check-file-size.mjs --all [--max-tokens N]
      List every tracked source file over the budget, largest first.
  check-file-size.mjs [--max-tokens N] <path>...
      Ratchet the staged versions of <path>: a file over the budget fails
      unless HEAD already had it over the budget and it did not grow. A
      staged rename is measured against the file it came from.

Source is any extension GitHub Linguist assigns to a programming language
and no prose language (.md is not source). Files marked linguist-generated
or linguist-vendored in the staged .gitattributes are skipped, and so is a
file with ${pragma} in a comment in its first ${pragmaLines} lines,
followed by why splitting it would cost more than it saves. Language data
comes from the linguist-languages package, resolved from the repository,
else from beside this script. Bun fetches it in a repository without
node_modules.

The default budget is 8,000 tokens. Exit 1 means a file broke the budget.

Pre-commit install: run it on every staged file with bun or node (18.3+), e.g.
  lint-staged:  "*": "node <path-to>/check-file-size.mjs"
  plain hook:   git diff --cached --name-only -z | xargs -0 node <path-to>/check-file-size.mjs
Commit this script into the repository and point the hook at that copy, so
every clone runs the same check.`;

const splitRules = `Split a file before adding to it:
  - Split by concept, never by line count: each new file owns one idea and is
    named for it. No part1/part2, utils, helpers, or misc files.
  - Move whole items (types with their impls, functions with the contract
    their callers rely on) and keep the public interface where callers
    already import it.
  - Move tests beside the code they test, grouped the way the code is.
  - Commit the split on its own, before the change that needed the room. A
    split must not change behaviour; prove it with the checks the repository
    already uses for that.`;

const optOut = `Opt a file out only when every split would cost more than it saves, such
as one table or state machine that reads only as a whole. Put
${pragma} in a comment within its first ${pragmaLines} lines, followed by why:
  // ${pragma}: one opcode table; split, each half reads without the other.
The check then skips the file entirely, even as it grows, so it is a last
resort, never a way past a refusal. Tell the user each file you opt out.`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    all: { type: "boolean" },
    help: { type: "boolean" },
    "max-tokens": { type: "string", default: "8000" },
  },
});
if (values.help) {
  console.log(`${usage}\n\n${splitRules}\n\n${optOut}`);
  process.exit(0);
}
const maxTokens = Number(values["max-tokens"]);
if (!Number.isInteger(maxTokens) || maxTokens <= 0) {
  console.error(`check-file-size: --max-tokens must be a positive whole number.\n\n${usage}`);
  process.exit(2);
}
const maxBytes = maxTokens * 4;

const git = (args, input) =>
  execFileSync("git", args, {
    encoding: "utf8",
    input,
    maxBuffer: 1 << 30, // A large repository lists tens of megabytes of paths.
    stdio: ["pipe", "pipe", "ignore"],
  });
const root = git(["rev-parse", "--show-toplevel"]).trim();

// Resolved from the repository, so the hook runs its pinned version; failing
// that, from beside this script, where an audit before setup can install it.
let languages;
for (const base of [join(root, "package.json"), import.meta.url]) {
  try {
    const require = createRequire(base);
    languages = await import(pathToFileURL(require.resolve("linguist-languages")).href);
    break;
  } catch {}
}
if (!languages) {
  console.error(
    "check-file-size: install linguist-languages as a dev dependency of this repository.",
  );
  process.exit(1);
}
const claims = new Map();
for (const { type, extensions = [] } of Object.values(languages)) {
  for (const extension of extensions) {
    claims.set(extension, [...(claims.get(extension) ?? []), type]);
  }
}
const isSource = (path) => {
  const types = claims.get(extname(path).toLowerCase()) ?? [];
  return types.includes("programming") && !types.includes("prose");
};

// Paths .gitattributes marks as generated or vendored, read from the index.
const unauthored = (paths) => {
  if (paths.length === 0) return new Set();
  const output = git(
    ["check-attr", "--cached", "-z", "--stdin", "linguist-generated", "linguist-vendored"],
    paths.join("\0"),
  ).split("\0");
  const marked = new Set();
  for (let i = 0; i + 2 < output.length; i += 3) {
    if (output[i + 2] === "true" || output[i + 2] === "set") marked.add(output[i]);
  }
  return marked;
};

const blobBytes = (spec) => {
  try {
    return Number(git(["cat-file", "-s", spec]).trim());
  } catch {
    return null; // Not in that tree: a new file.
  }
};
// A file opts out with the pragma near its top, in whatever comment syntax
// its language uses.
const ignored = (spec) =>
  git(["cat-file", "blob", spec])
    .split("\n", pragmaLines)
    .some((line) => line.includes(pragma));
const tokens = (bytes) => `~${Math.round(bytes / 4).toLocaleString("en")} tokens`;
const sources = (paths) => {
  const candidates = paths.filter(isSource);
  const skipped = unauthored(candidates);
  return candidates.filter((path) => !skipped.has(path));
};

if (values.all) {
  // One batched size lookup, not a git process per file.
  const blobs = new Map();
  for (const entry of git(["ls-files", "--stage", "-z"]).split("\0").filter(Boolean)) {
    const tab = entry.indexOf("\t"); // A path may itself contain tabs.
    blobs.set(entry.slice(tab + 1), entry.slice(0, tab).split(" ")[1]);
  }
  const paths = sources([...blobs.keys()]);
  const sizes = git(
    ["cat-file", "--batch-check=%(objectsize)"],
    paths.map((path) => `${blobs.get(path)}\n`).join(""),
  ).split("\n");
  const over = paths
    .map((path, i) => ({ path, bytes: Number(sizes[i]) }))
    .filter(({ bytes }) => bytes > maxBytes)
    .sort((a, b) => b.bytes - a.bytes);
  const opted = over.filter(({ path }) => ignored(`:${path}`));
  const listed = over.filter((file) => !opted.includes(file));
  for (const { path, bytes } of listed) console.log(`${tokens(bytes).padStart(15)}  ${path}`);
  console.log(`Source files over ${maxTokens.toLocaleString("en")} tokens: ${listed.length}.`);
  if (opted.length > 0)
    console.log(`Over the budget but opted out with ${pragma}: ${opted.length}.`);
  process.exit(listed.length > 0 ? 1 : 0);
}

// NUL-separated, so paths come back unquoted (Git quotes non-ASCII ones).
const origin = new Map();
const changes = git(["diff", "--cached", "--find-renames", "--name-status", "-z"]).split("\0");
for (let i = 0; i < changes.length - 1; i += 2) {
  if (!changes[i].startsWith("R")) continue;
  origin.set(changes[i + 2], changes[i + 1]); // A rename carries two paths.
  i++;
}
const failures = [];
// Git reports the root with symlinks resolved (macOS /tmp is /private/tmp).
const inRepo = (path) => {
  try {
    return relative(root, realpathSync(path));
  } catch {
    return relative(root, path); // Deleted, so nothing to measure.
  }
};
for (const path of sources(positionals.map(inRepo))) {
  const bytes = blobBytes(`:${path}`);
  if (bytes === null || bytes <= maxBytes || ignored(`:${path}`)) continue;
  const before = blobBytes(`HEAD:${origin.get(path) ?? path}`);
  if (before !== null && bytes <= before) continue;
  failures.push({ path, bytes, before });
}
if (failures.length > 0) {
  const budget = tokens(maxBytes);
  console.error(`Commit refused: source files over the budget of ${budget} (bytes / 4).`);
  for (const { path, bytes, before } of failures) {
    // A file HEAD already had over the budget is held to its HEAD size, not
    // to the budget.
    const frozen = before !== null && before > maxBytes;
    const limit = frozen ? before : maxBytes;
    const why = frozen
      ? `already over the budget at ${tokens(before)}, so it may not grow; it does not have to get under the budget`
      : `${before === null ? "a new file" : `was ${tokens(before)}`}, so it must fit the budget`;
    console.error(`  ${path}: ${tokens(bytes)}, ${why}.`);
    console.error(`    Cut at least ${(bytes - limit).toLocaleString("en")} bytes.`);
  }
  console.error(
    `\nMake room by moving a concept into its own file, not by squeezing code to fit.\n${splitRules}\n\n${optOut}`,
  );
  process.exit(1);
}
