#!/usr/bin/env node
// Install this repo's skills into a target's `.agents/skills/` (the source of
// truth) and point `.claude/skills/` at them with relative symlinks.
//
//   node scripts/install-skills.mjs            # into $HOME
//   node scripts/install-skills.mjs ../my-app  # into a repo
//   node scripts/install-skills.mjs --only write-spec,review [target]
//   node scripts/install-skills.mjs --list
//   node scripts/install-skills.mjs --dry-run [target]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(REPO, 'skills');

// Categories only exist in this repo; harnesses want a flat `skills/<name>/`.
// Cross-category links have to be flattened to match: `](../../visual/x/` -> `](../x/`.
const CROSS_CATEGORY_LINK = /\]\(\.\.\/\.\.\/[a-z0-9-]+\//g;

function discover() {
  const found = new Map();
  for (const category of fs.readdirSync(SRC, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    const categoryDir = path.join(SRC, category.name);
    for (const skill of fs.readdirSync(categoryDir, { withFileTypes: true })) {
      if (!skill.isDirectory()) continue;
      const dir = path.join(categoryDir, skill.name);
      if (!fs.existsSync(path.join(dir, 'SKILL.md'))) continue;
      const clash = found.get(skill.name);
      if (clash) {
        throw new Error(
          `two skills flatten to the same name: ${path.relative(REPO, clash.dir)} and ${path.relative(REPO, dir)}`,
        );
      }
      found.set(skill.name, { name: skill.name, category: category.name, dir });
    }
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function flattenLinks(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) flattenLinks(full);
    else if (entry.name.endsWith('.md')) {
      const before = fs.readFileSync(full, 'utf8');
      const after = before.replace(CROSS_CATEGORY_LINK, '](../');
      if (after !== before) fs.writeFileSync(full, after);
    }
  }
}

function linkTarget(linkPath) {
  try {
    return fs.readlinkSync(linkPath);
  } catch {
    return null;
  }
}

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const only = (() => {
  const i = argv.indexOf('--only');
  return i === -1 ? null : new Set((argv[i + 1] ?? '').split(',').filter(Boolean));
})();
const positional = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--only');

const all = discover();

if (flags.has('--list')) {
  for (const s of all) console.log(`${s.name}\t(${s.category})`);
  process.exit(0);
}

if (only) {
  const unknown = [...only].filter((n) => !all.some((s) => s.name === n));
  if (unknown.length) {
    console.error(`unknown skill(s): ${unknown.join(', ')}\nrun with --list to see them all`);
    process.exit(1);
  }
}

const skills = only ? all.filter((s) => only.has(s.name)) : all;
const dryRun = flags.has('--dry-run');
const root = path.resolve(positional[0] ?? os.homedir());
if (!fs.existsSync(root)) {
  console.error(`target does not exist: ${root}`);
  process.exit(1);
}

const agentsSkills = path.join(root, '.agents', 'skills');
const claudeSkills = path.join(root, '.claude', 'skills');

// A `.claude/skills` that is already a symlink (usually straight at `.agents/skills`)
// covers every skill at once — don't fight it with per-skill links.
const claudeIsLink = linkTarget(claudeSkills) !== null;

console.log(`installing ${skills.length} skill(s) into ${root}${dryRun ? ' (dry run)' : ''}`);

if (!dryRun) {
  fs.mkdirSync(agentsSkills, { recursive: true });
  if (!claudeIsLink) fs.mkdirSync(claudeSkills, { recursive: true });
}

for (const skill of skills) {
  const dest = path.join(agentsSkills, skill.name);
  const link = path.join(claudeSkills, skill.name);
  const relative = path.relative(path.dirname(link), dest);

  let linked = !claudeIsLink;

  if (!dryRun) {
    fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(skill.dir, dest, { recursive: true });
    flattenLinks(dest);

    if (!claudeIsLink) {
      const existing = linkTarget(link);
      if (existing === null && fs.existsSync(link)) {
        console.warn(`  ! ${path.relative(root, link)} is a real directory — leaving it alone`);
        linked = false;
      } else {
        if (existing !== null) fs.rmSync(link);
        fs.symlinkSync(relative, link, 'dir');
      }
    }
  }

  console.log(
    `  ${skill.name} -> ${path.relative(root, dest)}` +
      (linked ? ` (linked from ${path.relative(root, link)})` : ''),
  );
}

if (claudeIsLink) {
  console.log(`.claude/skills is already a symlink -> ${linkTarget(claudeSkills)}; nothing else to link`);
}
