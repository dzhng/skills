---
name: xiaohei-illustrations
description: Generate Ian-style Xiaohei illustrations for articles, posts, blogs, Notion documents, workflows, methods, processes, structures, states, metaphors, and opinions. Use when the user asks for weird, hand-drawn, Xiaohei, article, editorial, body illustrations, illustration ideas, shot lists, title removal, image edits, or image regeneration. By default, all image text and annotations are English, even when the source article is Chinese; only use another language when the user explicitly asks.
---

# Xiaohei Illustrations

## Purpose

Create 16:9 horizontal illustrations for article body sections and blog headers. The goal is not commercial illustration, a slide, or a cute cartoon. Turn the article's key judgment, process, structure, state, or metaphor into a clean, weird, creative, readable-but-not-instructional hand-drawn explanation.

The default visual IP is Xiaohei: a solid-black creature with white dot eyes, thin legs, and a blank expression, seriously doing something absurd but meaningful. Xiaohei must participate in the central action, not stand beside it as decoration.

## Default language rule

All visible image text must be English by default. This includes labels, notes, signs, fictional UI text, and tiny annotations. Do not mix in Chinese or other languages unless the user explicitly requests another language.

Keep English labels short, natural, and correctly spelled. Prefer 2–5 words per label.

## Read these references as needed

Do not load every reference unless the task needs it:

- `references/style-dna.md`: visual style, color rules, text rules, and prohibitions.
- `references/xiaohei-ip.md`: Xiaohei's appearance, personality, action library, and prohibitions.
- `references/composition-patterns.md`: composition types, original-metaphor method, and anti-copying rules.
- `references/prompt-template.md`: the single-image generation prompt template.
- `references/qa-checklist.md`: post-generation checks and iteration rules.
- `assets/examples/`: low-frequency visual calibration only. Do not copy the compositions, objects, or annotations from these examples.

## Workflow

### 1. Understand the article

Read the user's article, link, Notion page, Markdown file, screenshot, or stated idea. Identify:

- The core argument.
- Which paragraphs carry a cognitive turn.
- Which ideas benefit from an image.
- Which parts should remain text-only.

Do not illustrate evenly. Prefer cognitive anchors: core judgments, breakpoints, input/output loops, forks, before/after contrasts, reuse paths, handoffs, common traps, and role-state changes.

### 2. Start with an illustration strategy

If the user asks only for analysis or illustration ideas, return a concise shot list first. For each proposed image, include:

- Where it belongs in the article.
- The image topic.
- The core meaning.
- The composition type.
- What Xiaohei is doing.
- Suggested visual elements.
- Suggested English labels.

Default to 4–8 images. Use 1–3 for a short article. Avoid exceeding 9 unless the article truly needs it.

### 3. Generate one image at a time

If the user clearly asks to generate, output, make, or create images, do not stop for confirmation. Generate each image separately. Do not combine multiple illustrations into one image.

Each image explains one core structure. Every prompt must include:

- 16:9 horizontal article illustration.
- Pure white background.
- Black hand-drawn line art.
- Sparse red, orange, and blue handwritten English annotations.
- Large areas of blank space.
- Xiaohei as the central action-taker.
- No PPT look, commercial illustration, childish cuteness, complex architecture, or top-left type title.

Do not copy prior examples. Examples only calibrate line density, restraint, and how Xiaohei participates. Unless the user explicitly asks to recreate a prior image, invent a fresh metaphor from the current article.

### 4. Check and iterate

After generation, inspect the image against `references/qa-checklist.md`. Regenerate or locally edit if any of these occur:

- Xiaohei is only decorative.
- The image is too crowded.
- It looks like a flowchart or PPT slide.
- There is too much text or misspelled English.
- A top-left title appears, such as “workflow,” “system diagram,” or “common pitfalls.”
- The style becomes cute, childish, rigid, or corporate.
- The background is not clean white.

### 5. Save and deliver

When working in the workspace, save final images under a task-specific folder such as:

```text
assets/<article-slug>-illustrations/
```

or the folder the user is already using for that article.

Name files in order:

```text
01-topic-name.png
02-topic-name.png
```

Preserve original generated files. Do not overwrite existing assets unless the user explicitly asks for replacement.

## Output style

Before generation, keep strategy output concise. After generation, report:

- How many images were generated.
- What each image is for.
- Where the files are saved.
- Which images are strongest and which are optional.

Do not over-explain style theory; let the images speak.
