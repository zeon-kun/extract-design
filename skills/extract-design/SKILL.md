---
name: extract-design
description: Use this skill when the user wants to extract or document an existing brand's design system — its tokens, atoms, components, and visual language — from a public source like a website, screenshot, Figma file, or live URL. Triggers include phrases like "extract the design system from X," "document the brand of Y," "reverse-engineer the visual language," "build a style guide from this site," or "capture the design tokens from [URL]." Do NOT use for generating new brands from scratch — this skill only documents what already exists. Output is always a three-file deliverable: tokens.json, preview.html, README.md.
license: Internal
---

# Brand Extraction

Document an existing brand's visual language as a reusable, machine-readable design system. Output is faithful, audited, and explicitly flags what was observed vs. inferred.

## When to use this skill

- "Extract the design system from [URL]"
- "Document the brand of [site / screenshot]"
- "Reverse-engineer the visual language of [X]"
- "Build a style guide from this site"
- "Capture the design tokens from [Figma/URL/image]"

## When NOT to use this skill

- **Generating a new brand from scratch.** This skill only documents existing brands.
- **Single-component reference.** If the user just wants one button styled like X, build the button — don't run a full extraction.
- **Code refactor / theme migration.** This skill produces documentation, not codemod output.

## Non-negotiables

These are the rules. Violations make the deliverable worthless.

1. **Component anatomy must be exhaustive.** Every sub-element of every component is documented by name, with its tokens, behaviors, and relationships to other sub-elements. "Card: padded container with shadow" is a failure. See `references/component-anatomy.md` for the required level of detail.

2. **Motion is a first-class extraction layer.** Library detection (GSAP, Framer Motion, Lottie, Three.js, vanilla canvas), choreography (timelines, staggers, scroll-driven), and reduced-motion fallbacks are all required. Tokens alone (durations, easings) are insufficient. See `references/motion-extraction.md`.

3. **Custom implementations get full anatomy.** Canvas particle fields, Three.js scenes, hand-animated SVG, shaders — these aren't "components with custom interactivity," they're separate rendering pipelines and must be documented with the same depth as components, including driving variables, render-loop pseudocode, and a reconstruction strategy. See `references/custom-implementation.md`.

4. **Confidence is flagged on every token.** `confirmed` (read directly from CSS/source), `inferred-likely` (visual inference with strong evidence), or `inferred` (visual approximation). No silent guessing.

5. **The preview must itself feel like the brand.** A spec sheet rendered in Inter on white is a failure when documenting a brand whose voice is, say, brutalist editorial. The preview is a proof the system works on itself. See `references/preview-principles.md`.

6. **Three-file deliverable, always.** `tokens.json` + `preview.html` + `README.md`. Even if the user only asks for one, produce all three — they reference each other.

7. **Self-audit before delivery.** Diff the reconstructed components against the original. If a reconstructed button looks meaningfully different from the real one, the extraction is wrong.

## Workflow

Run all seven phases in order. Don't skip Phase 1 just because the URL "looks simple."

**Phase 1 — Reconnaissance.** Fetch the source. Get content + visual references. **Detect motion libraries and custom rendering** (GSAP, Framer Motion, Lottie, Three.js, canvas). See `references/workflow.md` §1 and `references/motion-extraction.md` Phase 1 addendum.

**Phase 2 — Token extraction.** Pull primitives: color, type, space, radius, shadow, motion. Rank by frequency. See `references/workflow.md` §2.

**Phase 3 — Atom identification.** Map the smallest reusable units. See `references/atom-checklist.md` for the canonical set.

**Phase 4 — Component anatomy.** Decompose every component into named sub-elements with full specs. **This is a non-negotiable phase.** See `references/component-anatomy.md`.

**Phase 4.5 — Motion + custom implementation extraction.** Document every motion pattern (CSS, JS, scroll-driven, Lottie) and every custom rendering (canvas, WebGL, manual SVG). **Also non-negotiable.** See `references/motion-extraction.md` and `references/custom-implementation.md`.

**Phase 5 — Brand identity synthesis.** Voice, principles, photography treatment, motion character. The qualitative layer.

**Phase 6 — One-pager preview.** Build `preview.html` using only the extracted tokens. The preview itself must be styled in the source brand's aesthetic, and should reconstruct motion/custom impls where feasible (or show labeled static frames). See `references/preview-principles.md`.

**Phase 7 — Self-audit.** Compare reconstruction to source. Flag gaps. List items requiring manual verification — including motion library confidence and custom impl reconstruction trade-offs.

Full details in `references/workflow.md`.

## Outputs

Always produce these three files, in this order:

```
{output-dir}/
├── tokens.json     ← machine-readable design tokens with confidence flags
├── preview.html    ← self-contained one-pager, styled in source's aesthetic
└── README.md       ← brand identity write-up + extraction methodology
```

Use the templates in `templates/` as starting scaffolds. They have the structure pre-wired and the token CSS variables already plumbed through.

## Reading order

When this skill is loaded, read in this order:

1. This file (you're here)
2. `references/workflow.md` — the full 7-phase playbook
3. `references/component-anatomy.md` — **read carefully, this is a non-negotiable**
4. `references/motion-extraction.md` — **read carefully, this is a non-negotiable**
5. `references/custom-implementation.md` — **read carefully, this is a non-negotiable** for any site using canvas/WebGL/manual SVG
6. `references/atom-checklist.md` — the canonical atom set
7. `references/preview-principles.md` — what makes a good preview
8. `references/token-schema.md` — exact JSON schema with confidence flags
