# Playwright Screenshots

Playwright is the primary visual capture tool for Phase 1. It provides rendered pixels, computed CSS values, and interaction states that `web_fetch` alone cannot give you.

---

## Output directory convention

Every extraction run writes its outputs to a dedicated directory in the project where the skill is invoked:

```
.extract-design/
└── <brand-slug>/
    ├── capture-manifest.json   ← index of everything captured + DOM data
    ├── screenshots/
    │   ├── desktop-fold.png    ── above-the-fold at 1440×900
    │   ├── desktop-full.png    ── full-page at 1440×900
    │   ├── tablet-fold.png     ── above-the-fold at 768×1024
    │   ├── tablet-full.png     ── full-page at 768×1024
    │   ├── mobile-fold.png     ── above-the-fold at 375×812
    │   ├── mobile-full.png     ── full-page at 375×812
    │   ├── scroll-0.png        ── scroll position 0%
    │   ├── scroll-25.png       ── scroll position 25%
    │   ├── scroll-50.png       ── scroll position 50%
    │   ├── scroll-75.png       ── scroll position 75%
    │   ├── scroll-100.png      ── scroll position 100%
    │   ├── atom-button-start-0-default.png   ← Stage D: atom state matrix
    │   ├── atom-button-start-0-hover.png
    │   ├── atom-button-start-0-focus.png
    │   ├── atom-input-0-default.png
    │   ├── atom-input-0-focus.png
    │   ├── ...                               ← more atom-* files per discovered atom
    │   ├── comp-card-standard-0-default.png  ← Stage D2: component state matrix
    │   ├── comp-card-standard-0-hover.png
    │   ├── comp-card-standard-0-child0-hover.png
    │   ├── comp-card-standard-0-active.png
    │   ├── comp-card-standard-0-focus.png
    │   └── ...                               ← more comp-* files per discovered component
    ├── tokens.json             ← Phase 2–4 deliverable (written after Playwright)
    ├── preview.html            ← Phase 6 deliverable
    └── README.md               ← Phase 7 deliverable
```

`<brand-slug>` is derived from the target URL's hostname: `stripe.com` → `stripe`, `linear.app` → `linear`, `www.figma.com` → `figma`. The user can override it by passing an explicit slug.

`.extract-design/` sits at the root of the current working directory — the project where you are running Claude Code. It is not inside the plugin directory.

---

## Prerequisites

```bash
# One-time setup — installs the Chromium binary Playwright needs
npx playwright install chromium
```

Playwright itself is invoked via `npx` so it does not need to be in `package.json`.

---

## Invocation

Use the absolute path derived in Phase 0 (`$SCRIPT_ABS_PATH`):

```bash
# Auto-slug from URL (stripe.com → stripe)
node $SCRIPT_ABS_PATH https://stripe.com .extract-design/stripe

# Explicit slug
node $SCRIPT_ABS_PATH https://stripe.com .extract-design/stripe-v2 stripe-v2
```

Run this at the start of Phase 1, before `web_fetch`. It is a blocking step — later phases read from the manifest it produces.

---

## What each stage captures and which phase it feeds

### Stage A — Viewport screenshots
Three viewports × two crops (fold + full-page):

| File | What it shows | Feeds |
|---|---|---|
| `desktop-fold.png` | First impression at 1440px | Phase 5 (brand voice, visual hierarchy) |
| `desktop-full.png` | Complete rendered page | Phase 4 (component inventory), Phase 6 (preview reference) |
| `tablet-full.png` / `mobile-full.png` | Responsive layouts | Phase 4 (responsive behavior per component) |

### Stage B — DOM analysis
Extracted from the live DOM after JS execution:

| Key in manifest | Content | Feeds |
|---|---|---|
| `domData.cssVars` | All CSS custom properties from `:root` and stylesheets | Phase 2 (confirmed tokens — highest confidence) |
| `domData.fontFamilies` | Loaded font faces (family, weight, style, status) | Phase 2 (confirmed typography tokens) |
| `domData.scriptSrcs` | `<script src>` URLs | Phase 1 Step 3 (motion library detection) |
| `domData.computedStyles` | Sampled computed values for h1–h3, body text, buttons, nav links, cards, inputs | Phase 2 (confirmed spacing, color, radius tokens) |
| `domData.rootBg` | Root background color | Phase 2 (page background token) |

### Stage C — Scroll traversal
Five scroll positions at desktop width:

| File | What it shows | Feeds |
|---|---|---|
| `scroll-0.png` | Hero / above fold | Phase 4 (hero component anatomy) |
| `scroll-25.png` | First scroll reveal | Phase 4.5 (scroll-triggered reveals — entrance animations) |
| `scroll-50.png` | Mid-page content | Phase 4 (card grids, feature sections) |
| `scroll-75.png` | Late reveals | Phase 4.5 (scroll-pinned sections, parallax positions) |
| `scroll-100.png` | Footer | Phase 4 (footer component anatomy) |

The 500 ms settle delay between scroll positions gives IntersectionObserver and GSAP ScrollTrigger time to fire.

### Stage D — Atom discovery + state capture

Dynamically discovers interactive atoms (buttons, links, inputs, badges, pills) by **structural and visual scoring — never by class name**. Works identically on Tailwind, CSS-in-JS with hashed names, custom BEM, and semantic class names.

**Discovery algorithm (runs inside `page.evaluate()`):**

1. `TreeWalker(SHOW_ELEMENT)` walks the DOM. Hard gates filter cheaply before any `getComputedStyle` call:
   - Visible and ≥24×16px
   - Width ≤60% of viewport, height ≤120px
   - Is interactive: native `<a>`/`<button>`/`<input>`/`<select>`/`<textarea>`, or `role=button/link/checkbox/radio`, or `tabindex≥0`, or `cursor:pointer`
   - Has visible content (text, SVG, or IMG child)
   - Not a banned container tag (`main`, `nav`, `header`, `footer`, `section`, `form`, …)
   - At most 8 children

2. Scoring signals assign points (+1–+3 each): padding, border-radius, visible border/bg, box-shadow, CSS transition, SVG icon child 12–32px, aspect ratio, cursor:pointer, interactive text 1–32 chars, sibling repetition. Cutoff = 4.

3. Sibling clustering keeps at most 2 instances of visually identical atoms (same tag, label, rounded dimensions).

4. Final cap: top **20** by score.

5. Each winner is tagged `data-xd-atom="<i>"` and `data-xd-atom-slug="<slug>"` in the DOM so Playwright's locator API can bind from Node.

**Classification** (from structure, never class names):

| Label | Condition |
|---|---|
| `button` | `<button>` / `role=button` / `<a>` with bg + radius + padding |
| `icon-button` | `button` where content is only SVG/IMG ≤32px |
| `button-link` | `<a>` styled as button |
| `link` | plain `<a>` |
| `pill-link` / `pill` | border-radius ≥ 999 or ≥50% of height, has bg |
| `input` | `<input>` / `<textarea>` / `<select>` |
| `badge` | small (<100×32), bg, text-only |
| `atom` | catch-all |

**State capture** (Node-side, per atom):

1. `scrollIntoViewIfNeeded`, settle 300ms.
2. **default** — element-isolated screenshot.
3. **hover** — `el.hover()`, settle 250ms, screenshot.
4. **focus** — `el.focus()`, settle 250ms, screenshot, then `blur()`.

Each state is skipped silently if the element isn't reachable or focusable.

**File naming:** `atom-<slug>-<state>.png` where `<slug>` is `<label>-<topword>-<index>` derived from the element's own text — no class names involved.

| File pattern | Example | Feeds |
|---|---|---|
| `atom-button-*-default.png` | `atom-button-start-0-default.png` | Phase 3 (button-primary atom anatomy) |
| `atom-button-*-hover.png` | `atom-button-start-0-hover.png` | Phase 3 (hover color/shadow token) |
| `atom-input-*-default.png` | `atom-input-0-default.png` | Phase 3 (input atom anatomy) |
| `atom-input-*-focus.png` | `atom-input-0-focus.png` | Phase 3 (input focus ring token) |

### Stage D2 — Component state matrix

Dynamically discovers compound interactive components (cards, feature blocks, pricing tiles, article rows) using the same **structural + visual scoring** approach as Stage D — no class-name reads.

**Detection differs from Stage D in scale and composition thresholds:**

- Size: ≥200×120px (larger than atoms)
- Has at least one interactive descendant
- Tags like `main`, `nav`, `section`, `form` are banned (use structural content tags only)
- Scoring rewards: padding ≥16px (+2), box-shadow (+3), bg distinct from parent (+2), radius ≥4px (+2), heading descendant (+2), ≥2 interactive descendants (+2), sibling repetition (+3), …  Cutoff = 6.
- Sibling clustering keeps at most 2 instances per visually similar group.
- Final cap: top **10**.

Each winner is tagged `data-xd-comp="<i>"` and `data-xd-comp-slug="<slug>"` for Node-side binding.

**Slug derivation** — structurally determined role + first heading word + counter:

| Role | Condition |
|---|---|
| `article` | `<article>` tag |
| `tile` | root `<a>` or `<li>` with interactives |
| `form-card` | has `<form>` descendant |
| `card` | has heading + interactive (default) |
| `media-card` | image/picture covers >30% of element area |
| `item` | ancestor is `<li>` |
| `block` | none of the above |

Example slugs (no class names): `card-standard-0`, `tile-getstarted-0`, `article-built-0`, `media-card-0`.

**State capture body** (per component):

| State file | What it shows | Feeds |
|---|---|---|
| `comp-<slug>-default.png` | Component at rest | Phase 4 (anatomy baseline) |
| `comp-<slug>-hover.png` | Container hover — lift, shadow, bg shift | Phase 4 (hover state tokens) |
| `comp-<slug>-child0-hover.png` | First interactive child hovered | Phase 4 (child hover — color, underline, arrow) |
| `comp-<slug>-child1-hover.png` | Second interactive child hovered | Phase 4 |
| `comp-<slug>-active.png` | Mousedown on primary CTA — pressed state | Phase 4 (active/pressed tokens) |
| `comp-<slug>-focus.png` | Keyboard focus on first tabbable child | Phase 4 (focus ring color, outline token) |

State files are added to `manifest.componentStates[]`. Each entry carries:
```json
{
  "slug": "card-standard-0",
  "label": "card",
  "score": 13,
  "states": ["default", "hover", "child0-hover", "active", "focus"],
  "stateFiles": { "default": "screenshots/comp-card-standard-0-default.png", "..." }
}
```

**Using Stage D2 in Phase 4:** For every component in `manifest.componentStates`, open the state screenshot set side-by-side and document which tokens change between states. The `default → hover` diff exposes `box-shadow` and `transform` tokens; `default → focus` exposes `outline-color` and `outline-width` tokens.

### Stage E — Manifest
`capture-manifest.json` is the single source of truth for Phase 1. It records:
- All screenshot paths (relative to the brand output dir)
- `domData` (cssVars, fontFamilies, scriptSrcs, computedStyles, rootBg)
- `atoms` (discovered interactive atoms with multi-state captures from Stage D)
- `componentStates` (compound component state matrices from Stage D2)
- `capturedAt` timestamp and source URL

---

## Reading the manifest in Phase 1

After Playwright finishes, read `capture-manifest.json` and use it as follows:

```
manifest.domData.cssVars         → seed Phase 2 color/space/radius tokens
                                   mark each as confidence: "confirmed"

manifest.domData.fontFamilies    → seed Phase 2 typography tokens
                                   mark each as confidence: "confirmed"

manifest.domData.scriptSrcs      → scan for known library strings:
                                   "gsap" → GSAP confirmed
                                   "framer-motion" → Framer Motion confirmed
                                   "lottie" → Lottie confirmed
                                   "three" → Three.js confirmed
                                   no match → mark library as "unknown"

manifest.domData.computedStyles  → cross-check visual tokens
                                   (computed values override visual approximation)

manifest.atoms                   → seed Phase 3 atom inventory
                                   each entry has: slug, label, score, states, stateFiles
                                   open the state files to observe hover + focus tokens

manifest.componentStates         → seed Phase 4 component inventory
                                   each entry has: slug, label, score, states, stateFiles
                                   open state file sets to diff which tokens change per state

manifest.screenshots             → reference paths for visual inspection
                                   during Phases 2–5
```

CSS vars in the manifest that look like design tokens (e.g. `--color-brand`, `--space-4`, `--radius-md`) are `confirmed`. Raw computed values (e.g. `rgb(15, 15, 15)`) are `inferred-likely` unless they also appear in a CSS var.

---

## Fallback hierarchy

When Playwright is unavailable:

```
1. Playwright (preferred)
   node scripts/playwright-capture.mjs <url> .extract-design/<slug>

2. web_fetch + image_search (current fallback)
   → web_fetch for HTML/CSS source
   → image_search for visual references
   → mark all visual tokens as confidence: "inferred" or "inferred-likely"
   → no hover states, no scroll states, no confirmed CSS vars
   → manifest.atoms and manifest.componentStates will be empty arrays

3. User-provided screenshots
   → User pastes or uploads screenshots
   → Treat as Stage A output only (no DOM data)
```

When falling back, note it explicitly in the Phase 1 observations and in `README.md` § Methodology & gaps.

---

## .gitignore recommendation

Screenshots are large binary files. Add this to the project's `.gitignore`:

```
.extract-design/*/screenshots/
```

The deliverable files (`tokens.json`, `preview.html`, `README.md`, `capture-manifest.json`) are text and worth committing if you want to version the extraction.
