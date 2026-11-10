---
name: marketing-pages
description: Best-practice rulebook for a marketing site's pages, organized by page class — campaign landers, product pages, programmatic SEO trees, editorial. Use when writing or updating a landing/marketing page, wiring a campaign lander to an attribution identifier, changing site-wide nav/footer links, touching sitemap/robots/agent-readable surfaces, or auditing a public site's indexing, reachability, and conversion setup.
---

# Marketing Pages

A rulebook, not a workflow: every rule below is simultaneously a constraint to
build against and a check to audit against. Classify the page first — every
public page belongs to exactly one **page class**, and the class decides its
indexing, linking, chrome, and wiring.

## Page classes

| Class | Indexing | Reachability | Chrome |
|---|---|---|---|
| **Campaign lander** | `noindex, follow`; never in a sitemap | never linked from nav/footer | minimal: logo + ONE CTA, legal-only footer, no site nav |
| **Product page** | indexed | nav Product section and/or footer | full chrome |
| **SEO tree page** (programmatic: per-persona, per-industry, per-competitor) | indexed | footer link grid + hub pages | full chrome |
| **Editorial** (blog/guides) | indexed | header + footer | full chrome |
| Legal/utility | indexed | footer | full chrome |

- A page that is noindexed AND unlinked is a **zombie** — promote it to a
  linked, indexed class or make it a campaign lander. Never leave the halfway
  state.
- Campaign landers live in a dedicated URL prefix (e.g. `/l/<slug>`): one
  `startsWith` covers blanket noindex and "never nav-linked" checks, and slug
  collisions with real pages become impossible.

## Campaign lander rules

Campaign landers are alternate main landers — one audience, one promise, paid
traffic. They trade SEO for message-match freedom; indexed near-duplicates
split authority and freeze copy that should be A/B-able daily.

- **Message match end-to-end**: ad copy → H1 → post-signup first screen, one
  unbroken promise. Where the product supports it, the campaign identifier
  flows through signup into onboarding and analytics, so the first-run
  experience continues the promise and conversions attribute per lander.
- One CTA, repeated down the page; social proof beside it; friction-reducing
  microcopy ("no credit card"); capture only what qualifies later (usually
  just email).
- Static text/image hero — no full-viewport video or heavy JS above the fold.
  LCP is a conversion input on paid traffic.
- A lander you cannot measure cannot be iterated: conversion-per-lander
  (lead → signup → purchase) must be readable somewhere before ads spend.
- Killed campaign pages get no redirects: deleted routes 404, and the 404s in
  Search Console afterward are the intended signal, not a defect.

## Indexed page rules

Each of these has one owner in the codebase — find the current owner rather
than trusting remembered paths:

- The route appears in whatever closed-world route registry the site's gates
  check against.
- Indexed ⇔ sitemapped, always both or neither: a noindexed URL in the
  sitemap is a contradictory signal, as is an indexed page missing from it.
  `lastmod` is honest (content date, not build time).
- Agent-readable surfaces, if the site ships them (llms.txt, markdown twins),
  render from the same copy source the page renders from — never from built
  HTML, never hand-drifted duplicates.
- Robots allows reviewed indexed trees for AI crawlers; disallows only
  campaign landers and internal surfaces. robots, meta robots, and the
  sitemap must agree on every URL.
- Every indexed page is reachable from header or footer — the footer link
  grid is the crawl rail. Pages discoverable only via the sitemap sit in
  "Discovered — not indexed" for weeks and receive no internal authority.
- Product facts (pricing, limits, tier names) derive from the single source
  the product code owns — restated numbers drift silently and nothing turns
  red.
- Internal links name paths, never origins, so a closed-world check can
  verify every authored target resolves.
- Locale-prefixed links to pages that exist in only one locale must resolve
  (redirect to the canonical locale, not 404) — sitewide chrome prefetches
  every link from every page.
- Deleting or renaming a page deletes every reference in the same pass: route
  registry, sitemap, agent-readable twin, links from kept pages, visual
  baselines, and e2e/journey anchors (grep the test suites — a rename that
  keeps local gates green can break a live journey hours later).

## SEO rules

- Contextual in-body links from editorial to money pages move more authority
  than footer anchors — add them where content genuinely relates.
- Comparison/competitor pages carry an honest visible updated-date and get
  refreshed on a real cadence — a stale dated page is worse than an undated
  one.
- Programmatic tree pages stay substantive (concrete jobs, specific copy) —
  thin templated pages are doorway-page bait.
- Hub pages exist so leaves inherit authority: every tree leaf is linked from
  its hub, and the hub from the site chrome.

## Visual coverage rules

- Reusable sections and components have an isolated, deterministic **fixture**
  (playground/storybook entry) that owns their visual coverage; the fixture
  menu doubles as the component catalog new pages are composed from.
- Representative full-page screenshots stay at ONE key route per template.
  Routes churn; fixtures are the stable oracle. New template → one new
  representative route; new section → a fixture, not more route shots.
- Visual baselines are accepted only after an unprimed second opinion — eyes
  primed by the change pass defects fresh eyes catch.

## Audit sweeps

Auditing a site = evaluating every rule above, plus these cross-cutting
sweeps; each must come back empty or explained:

1. Zombie pages (noindexed AND unlinked).
2. Sitemap/robots/meta disagreements.
3. Campaign lander linked from any indexed page, or present in a sitemap.
4. Indexed page unreachable from header/footer.
5. Component with no owner in the visual coverage system.
6. Marketing copy restating a product fact that has a canonical owner.
7. Broken locale-crossed links from sitewide chrome.
