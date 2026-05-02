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
    │   ├── hover-cta-primary.png
    │   ├── hover-nav-link.png
    │   ├── hover-card.png
    │   └── hover-input.png
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

```bash
# Auto-slug from URL (stripe.com → stripe)
node scripts/playwright-capture.mjs https://stripe.com .extract-design/stripe

# Explicit slug
node scripts/playwright-capture.mjs https://stripe.com .extract-design/stripe-v2 stripe-v2
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

### Stage D — Hover state captures
Element-level screenshots taken after hovering:

| File | What it captures | Feeds |
|---|---|---|
| `hover-cta-primary.png` | CTA button hover state | Phase 4 (button hover token — color, shadow, transform) |
| `hover-nav-link.png` | Navigation link hover | Phase 4 (nav link underline / color transition) |
| `hover-card.png` | Card hover lift | Phase 4 (card hover shadow / transform) |
| `hover-input.png` | Input focus state | Phase 4 (input focus ring color) |

If an element doesn't exist on the page the capture is skipped silently.

### Stage E — Manifest
`capture-manifest.json` is the single source of truth for Phase 1. It records:
- All screenshot paths (relative to the brand output dir)
- `domData` (cssVars, fontFamilies, scriptSrcs, computedStyles, rootBg)
- `hoverStates` (which hover captures succeeded)
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
