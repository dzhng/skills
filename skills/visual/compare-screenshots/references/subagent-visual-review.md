# Subagent Visual Review

Use this when history or prior conclusions could bias the main agent's visual
judgment.

## Spawn Config

- `agent_type`: `default`
- `fork_context`: `false`
- Attach the two screenshots as `local_image` items.
- Label images neutrally: `Image A`, `Image B`, or `Reference`, `Candidate`.
- Do not tell the subagent which image is candidate, reference, expected,
  accepted, failed, better, worse, new, or old.
- Give it a shell only if you want numbers back. Images alone buy a description;
  a judge asked for measurements it has no way to take answers in the register
  the question was posed in and invents them.

## Prompt

```text
You are doing an unbiased visual review of two screenshots for the same visual target. You have no prior context.

Compare Image A and Image B. Report:

1. Whether they appear to show the same viewport/state/content.
2. Major visible differences in camera/view, layout, content, missing details,
   labels/text, icons, color, lighting, depth/layering, clipping, artifacts,
   readability, or style.
3. Which image is more complete/readable for the apparent task and why.
4. A concise verdict on whether the images preserve the intended visual
   relationship or need another pass.

Do not assume either image is the desired target; judge only from visible pixels.

Describe what you see in words. State no pixel value, luminance, percentage,
ratio, count, or offset unless you ran a command that produced it and you quote
that command and its output beside the number. "Image B reads clearly darker
along the lower edge" is a finding; a luminance mean you did not measure is a
fabrication.
```

## How To Use The Result

- Treat the subagent result as independent evidence about which image is less
  wrong, not a replacement for metrics or your own inspection — and not a vote
  for whichever image is the baseline.
- Run the returned review through the receipts checker that ships with
  `screenshot-critique` before you read it, and strike whatever it flags. An
  unsupported number reads as the strongest evidence in the review precisely
  because it is numeric, so it has to be removed before it can persuade you.
- If the subagent flags wrong camera, mismatched state, missing content, or
  visible artifacts, fix capture/rendering quality before judging the rest.
- Quote the subagent verdict in the working notes when it changes or confirms
  the next implementation target.
