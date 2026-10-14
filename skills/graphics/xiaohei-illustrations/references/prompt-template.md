# Single-Image Prompt Template

Generate each image separately. Replace the variables for the current article. Do not combine multiple illustrations into one image.

```text
Generate one standalone 16:9 horizontal article illustration.

Visual DNA:
Pure white background. Minimalist black hand-drawn line art. Slightly wobbly pen lines. Lots of empty white space. Sparse red, orange, and blue handwritten English annotations. Clean absurd product-sketch feeling. No gradients, no shadows, no paper texture, no complex background, no commercial vector style, no PPT infographic look, no cute mascot poster, no children's illustration, no realistic UI. Absolutely no Chinese text unless the user explicitly requested Chinese.

Recurring IP character required:
Xiaohei, a small solid-black absurd creature with white dot eyes, tiny thin legs, blank serious expression, slightly uneven hand-drawn body shape. Xiaohei must perform the core conceptual action, not decorate the scene. Make Xiaohei serious, deadpan, and slightly bizarre, not cute.

Theme:
{image topic}

Composition type:
{workflow / system fragment / before-after / role state / concept metaphor / method layers / map route / mini comic}

Core idea:
{the single idea this image must communicate}

Composition:
{specific scene: where Xiaohei is, what Xiaohei is doing, what the main object is, how information or material moves}

Suggested elements:
{element 1} / {element 2} / {element 3} / {element 4}

Required English handwritten labels, spelled exactly:
"{label 1}" / "{label 2}" / "{label 3}" / "{label 4}" / "{optional label 5}"

Color use:
Black for main line art and Xiaohei. Orange for the main path, flow, or arrows. Red only for key warnings, problems, or results. Blue only for secondary notes, feedback, or system state.

Constraints:
One image explains only one core structure. Keep the main subject around 40%–60% of the canvas. Preserve at least 35% blank white space. Use at most 5–8 short handwritten English labels. Do not write a title in the top-left corner. Do not write the composition type on the image. Do not make it a formal diagram, course slide, or dense explainer. Do not copy prior examples or reuse known case compositions unless explicitly requested; invent a fresh visual metaphor for this specific article. It should be clear but not instructional, interesting but not childish, strange but clean. Double-check the spelling of every English label before finalizing.
```

## Edit prompt: remove a top-left title

```text
Edit the provided image. Remove only the handwritten title "{title text}" and its underline from the top-left corner. Fill that area with the same clean white background, matching the surrounding blank paper. Preserve everything else exactly: characters, labels, paths, line style, composition, aspect ratio, and image quality. Do not add any new text or objects.
```

## Edit prompt: make it weirder

```text
Regenerate this illustration with the same core meaning and simple layout, but make Xiaohei more central to the conceptual action. Xiaohei should be doing the strange work that explains the idea, not standing beside the diagram. Keep it clean, sparse, hand-drawn, and not cute.
```
