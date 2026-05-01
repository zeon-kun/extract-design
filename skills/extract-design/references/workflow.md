# Workflow — the 7 phases

Run every phase. Don't skip ahead.

---

## Phase 1 — Reconnaissance

**Goal:** Capture both the *computed truth* (CSS, source) and the *visual truth* (rendered pixels). The two together prevent hallucinated tokens.

**Steps:**
1. **Fetch the source.** If URL: use `web_fetch`. If screenshot: read it visually.
2. **Get visual reference.** Even if you have the source, look at how it renders. Use `image_search` for screenshots of the live site if direct access is blocked. Mobile and desktop both, where possible.
3. **Detect motion libraries and custom rendering.** Look at script tags and the DOM. Identify GSAP, Framer Motion, Lottie, Three.js, R3F, particles libraries, smooth-scroll libraries (Lenis), or any `<canvas>` / WebGL contexts. See `motion-extraction.md` Phase 1 addendum for the full detection table. **Mark library as `unknown` rather than guessing if not directly observable.**
4. **Inventory assets.** List every image/SVG URL referenced in the source. Note naming conventions (`-mono.svg`, `_halftone.svg` etc. — these reveal design rules). Include any Lottie `.json` files or shader source URLs.
5. **Note what you couldn't get.** If CSS bundles are inaccessible, write that down. Phase 7 will reference these gaps.

**Output of this phase:** A short observations note (kept in scratch, not delivered) listing what's confirmed vs. what needs inference, including motion library inventory.

**Failure modes:**
- Trusting markdown extraction alone — it strips CSS context.
- Skipping the visual check because "the source code is enough."
- Not noting access failures — they become silent guesses later.
- **Skipping library detection.** Without knowing the toolchain, motion docs can't be specified at the right level.

---

## Phase 2 — Token extraction

**Goal:** Pull the primitive layer. Tokens are the foundation; everything else composes from them.

**Token categories (all required):**
- **Color** — backgrounds, ink, accents, rules. Rank by frequency: most-used = real token, one-offs = noise.
- **Typography** — families (with fallback chain), weights, sizes, line-heights, letter-spacing.
- **Space** — the spacing scale. Look for the rhythm (4/8 base? 6/12? exponential?).
- **Radius** — corner radii. Note the *defaults* (default element vs. default card).
- **Shadow** — elevation system. Note if shadows are restrained vs. dramatic.
- **Motion** — durations, easings, named patterns (e.g., "marquee," "fade-in-up").
- **Texture** — if the brand uses textures (halftone, grain, noise), document the implementation recipe.

**Confidence flags (mandatory on every token):**
- `confirmed` — read directly from CSS, source, or design file
- `inferred-likely` — strong visual evidence + conventional pattern
- `inferred` — visual approximation, low certainty

**Frequency ranking rule:** If a value appears once on the entire site, it's probably not a token — it's an outlier. Promote frequent values, demote outliers.

**Failure modes:**
- Inventing a "neutral-50, neutral-100, neutral-200…" scale when the brand only actually uses 2 grays.
- Listing every hex that appears as if all are tokens of equal weight.
- Skipping the confidence flag.

---

## Phase 3 — Atom identification

**Goal:** Map the smallest reusable units.

See `atom-checklist.md` for the canonical list. The minimum set: button (primary + variants), link, eyebrow label, inline code, badge/tag, icon, hairline rule, input field (if present), and any brand-specific atoms (a numeral treatment, a step indicator, a halftone overlay).

**Test:** Each atom must be composable from tokens alone. If an atom uses a color that isn't in your token set, either the token set is incomplete or the atom is a one-off worth flagging.

---

## Phase 4 — Component anatomy ⚠️ NON-NEGOTIABLE

**This is the phase that earns or fails the deliverable.** See `component-anatomy.md` for the required depth.

A component is **not** "a card with padding and a shadow." A component is:

- **Every named sub-element** (e.g., card → header, eyebrow, title, body, icon-slot, footer-divider, CTA-row, hover-lift)
- **Each sub-element's tokens** (which color, which space, which radius)
- **Layout grammar** (grid? flex? gap? alignment?)
- **States and interactivity** (hover, focus, active, disabled, loading — even if only some are observable)
- **Responsive behavior** (how does it collapse on mobile? what changes?)
- **Variants** (what versions of this component exist on the site?)
- **Composition rules** (which atoms compose it? which other components can nest inside?)
- **Custom interactivity** (if the card has a parallax hover, document the parallax. If a hero has a marquee, document the timing.)

Read `component-anatomy.md` carefully before doing this phase.

---

## Phase 4.5 — Motion + custom implementation extraction ⚠️ NON-NEGOTIABLE

**Goal:** Document the brand's motion vocabulary and any custom-rendered (canvas / WebGL / manual SVG) elements with the same anatomy depth as components.

**Why this is its own phase:** Motion is often the most distinctive part of a brand — a site documented without motion is documented incompletely. And custom implementations (a hero canvas particle field, a Three.js marble, a hand-animated SVG mark) aren't just "components with extra interactivity" — they're separate rendering pipelines with their own tokens, behaviors, and reconstruction strategies.

**Steps:**

1. **Walk the motion taxonomy.** For each category present on the site, document every instance. The categories:
   - CSS-only motion (transitions, keyframes)
   - JavaScript choreography (GSAP timelines, Framer Motion variants, hand-rolled lerps)
   - Scroll-driven (ScrollTrigger pins, IntersectionObserver fades, parallax)
   - Lottie animations
   - Canvas / 2D hand-rolled
   - WebGL / Three.js / R3F
   - SVG path animations (stroke-dasharray, SMIL, draw-on)
   - Spring physics / drag / inertia
   - Mouse-tracking / parallax
   
   See `motion-extraction.md` for full per-category extraction templates.

2. **Document each custom implementation.** For every canvas, WebGL, manual SVG, or shader piece, fill out the full anatomy template: identity, visual, behavior, driving variables, render-loop pseudocode, performance notes, reconstruction strategy, and confidence.
   
   See `custom-implementation.md` for the template and worked examples.

3. **Specify reduced-motion fallbacks.** Every motion entry must specify what happens when `prefers-reduced-motion: reduce` is set. If you didn't verify on the live site, mark it as `not-verified` rather than inventing a fallback.

4. **Decide reconstruction strategy.** For each motion / custom impl, decide:
   - Reconstruct faithfully (CSS, vanilla JS, or library via CDN)
   - Build CSS-only fallback that captures the *feel*
   - Show labeled static frame with text annotation
   
   See the reconstruction decision tree in `custom-implementation.md`.

**Output of this phase:** New entries in `tokens.json` under `motion.library`, `motion.patterns`, and `motion.scroll`. New section in README under `## 5.X Motion + custom implementations`. Implementation snippets ready to drop into `preview.html`.

**Failure modes:**
- **Treating motion as decoration.** If the site uses pinned scroll sections or a magnetic cursor, those are signature elements, not optional details.
- **Documenting only durations.** A duration without choreography (stagger, sequence, trigger) is meaningless.
- **Assuming library when not verified.** If you didn't see `gsap` in script src, don't claim GSAP. Document by behavior and mark library `unknown`.
- **Skipping reduced-motion.** Every entry needs the fallback spec.
- **No reconstruction strategy.** Every custom impl needs an explicit answer to "how does this appear in the preview?"

---

## Phase 5 — Brand identity synthesis

**Goal:** The qualitative layer that ties tokens to *intent*.

**Required sections:**
1. **Positioning** — what is the brand selling/standing for?
2. **Voice principles** — 3–5 bullets describing tonal rules (e.g., "declarative not promotional," "numeric over adjectival").
3. **Visual character** — 3–5 bullets describing visual rules (e.g., "warm cream not white," "halftone is the signature").
4. **Design principles** — 5 numbered, opinionated rules that explain *why* the system looks this way. These should be defendable.
5. **Photography/illustration treatment** — if applicable.
6. **Logo / mark treatment rules** — placement, sizing, monochrome variants.

**Failure mode:** Generic principles ("modern, clean, bold"). If the principles could apply to any brand, they're worthless.

---

## Phase 6 — Preview construction

**Goal:** A single self-contained `preview.html` that renders every token, every atom, every component, **styled in the source brand's aesthetic.**

See `preview-principles.md`. Key rules:
- Self-contained (no external dependencies that require a build)
- Token-driven (every value in the preview should reference a CSS custom property)
- Shows tokens, atoms, AND component reconstructions
- Itself styled in the source brand's voice — texture, type, color, motion
- **Spatial sections must work at every breakpoint.** Test mobile, tablet, desktop. Use `clamp()` for fluid type. Always add media queries for grid layouts that drop columns.

---

### `--pencil` flag (optional) — pixel-perfect Pencil canvas preview

When invoked with `--pencil`, build a visual design canvas in Pencil *in addition to* `preview.html`. This gives the user a pixel-perfect, editable representation of the extracted design system they can approve or iterate on before the final deliverable is locked.

**The standard input pipeline (Phases 1–5) does not change.** Pencil only enters in the output/preview phase.

**Step P1 — Set up the Pencil document.**
```
mcp__pencil__open_document          → open new or existing .pen file
mcp__pencil__get_editor_state       → include_schema: true  ← MANDATORY before any read/write
```

**Step P2 — Load the guide matching the source type.**
```
mcp__pencil__get_guidelines         → no params first (lists available guides)
mcp__pencil__get_guidelines         → then load:
                                        landing page / website  → { category: "guide", name: "Landing Page" }
                                        web application         → { category: "guide", name: "Web App" }
                                        mobile app              → { category: "guide", name: "Mobile App" }
```
Follow the loaded guide exactly for layout grammar, component structure, and spacing conventions.

**Step P3 — Apply extracted tokens as Pencil variables.**
```
mcp__pencil__set_variables          → write every confirmed/inferred-likely token from tokens.json
                                        as a named Pencil variable (color, number, or string type).
                                        Use variable names that mirror the token keys.
                                        Example: { "color-bg": { type: "color", value: "#0A0A0A" },
                                                   "space-base": { type: "number", value: 8 } }
```

**Step P4 — Rebuild each component on canvas.**
Use `mcp__pencil__batch_design` to build a frame per component identified in Phases 3–4. Reference the screenshots from Phase 1 as locked background layers inside each frame so you can match pixel-by-pixel.
- Max 25 operations per call. Split by section: outer structure first, inner content second, states/variants third.
- Use the variable names from Step P3 (e.g. `fill: "$color-bg"`) — never hardcode values.

**Step P5 — Screenshot and present for approval.**
```
mcp__pencil__get_screenshot         → capture each component frame; present to user
mcp__pencil__snapshot_layout        → maxDepth: 2, problemsOnly: true  → catch layout issues
```
Ask the user: **approve or request changes?** Iterate until approved.

**Step P6 — Optional: generate code from the approved design.**
```
mcp__pencil__get_guidelines         → { category: "guide", name: "Code" }
```
Follow the Code guide to generate production-ready code from the approved Pencil frames. This supplements or replaces `preview.html` depending on the project's target stack.

**Failure modes (`--pencil` path):**
- Skipping `get_editor_state` with `include_schema: true` — all subsequent Pencil operations will fail.
- Hardcoding hex values instead of referencing Pencil variables — defeats token-driven fidelity.
- Exceeding 25 ops per `batch_design` call without splitting — leads to rollback of the entire call.
- Presenting to user without a screenshot — never ask for approval on invisible work.
- Not iterating after user feedback — the approval loop is not optional.

---

## Phase 7 — Self-audit

**Goal:** Catch the extraction's lies before the user does.

**Checklist:**
1. **Diff reconstructions vs. source.** Open the preview side-by-side with the original. For each major component, ask: would someone mistake one for the other at a glance? If no, iterate.
2. **List unverified inferences.** Every `inferred` token in the JSON should appear in the audit list with a verification path ("inspect element on the live site to confirm hex").
3. **List access failures from Phase 1.** If you couldn't fetch the CSS bundle, say so explicitly.
4. **Suggest manual verification steps.** Ideally with browser devtools instructions.

**`--pencil` path addition:** Run `mcp__pencil__snapshot_layout` with `problemsOnly: true` on the approved `.pen` file. Any clipped or overflowing nodes go into the audit gaps list. Use `mcp__pencil__get_screenshot` per component frame for the side-by-side diff rather than the HTML preview.

The audit goes in `README.md` under `## Methodology & gaps`.

**Failure mode:** Skipping audit because "it looks fine." It looks fine because you built it.
