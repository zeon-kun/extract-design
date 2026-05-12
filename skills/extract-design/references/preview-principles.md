# Preview Principles

The `preview.html` is not a generic spec sheet. It is a proof the system works on itself.

## The core principle

**The preview is styled in the source brand's aesthetic.** If you're documenting x402 (warm cream, halftone, mono-forward), the preview is warm cream with halftone and mono. If you're documenting a brutalist editorial site, the preview is brutalist. If you're documenting a soft pastel brand, the preview is soft pastel.

Failure mode: rendering a documentation page in Inter on white because that's the "neutral" choice. There is no neutral. Inter on white is _itself_ an aesthetic choice that conflicts with most brands you'll document.

## What the preview must contain

In this order, with these section labels:

1. **Header** — title, eyebrow ("Design system extraction"), brief intro paragraph, two CTAs
2. **§01 Brand identity** — positioning + design principles (numbered list, ideally with hairline rules)
3. **§02 Tokens** — color swatches, type specimens, space ruler, radius samples, shadow examples (if applicable)
4. **§03 Atoms** — every atom rendered live, in a grid of cards
5. **§04 Components** — reconstructed components, each with its anatomy visible
6. **§05 Methodology & gaps** — what was observed vs. inferred, manual verification checklist
7. **Footer** — wordmark or signature, file references

## Spatial requirements (the things people get wrong)

### 1. Every grid layout has a media query

Any `grid-template-columns` with explicit columns (e.g., `1fr 1.2fr`, `repeat(4, 1fr)`) must have a fallback media query that drops to fewer columns on narrow viewports. Test at:

- 1440px (desktop)
- 1024px (laptop)
- 768px (tablet)
- 375px (mobile)

```css
.brand-grid {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: var(--space-8);
}
@media (max-width: 900px) {
  .brand-grid {
    grid-template-columns: 1fr;
    gap: var(--space-6);
  }
}
```

### 2. Type uses clamp() for fluid scaling

Hero and headline sizes must scale fluidly, not abruptly:

```css
.type-hero {
  font-size: clamp(40px, 7vw, 72px);
}
```

### 3. Atom cards have equal heights

Use `display: flex; flex-direction: column` on atom cards and `flex: 1` on the atom-stage so cards align even when content varies. Without this, the atom grid looks ragged.

### 4. Type specimens use a consistent baseline

Type specimens in the §02 Tokens section have a label column and a sample column. Use `align-items: baseline` so the labels align with the _baseline_ of the type sample, not the top.

```css
.specimen-row {
  display: grid;
  grid-template-columns: 140px 1fr;
  align-items: baseline;
}
```

For very large type (hero, metric), this can look weird because the baseline is far below the cap height. In those cases use `align-items: end` instead and add a comment explaining.

### 5. Section padding is consistent

Define a single `--section-y` rhythm and use it on every section. Don't mix `padding: 96px 0` on one section and `padding: 80px 0` on another.

### 6. Sticky nav has a background blur

If the nav is sticky, give it `backdrop-filter: blur()` and a translucent background. Otherwise it'll look broken when content scrolls under it.

### 7. The audit/methodology section needs its own collapse breakpoint

The §05 section often has a 2-column layout (intro + body). If body is a list, that list can get too narrow on tablet. Add a breakpoint at ~900px to collapse to single column.

### 8. Footer dark sections need their own halftone scale

If the body has halftone at one opacity and the footer is dark, the same halftone formula will be invisible on dark. Re-tune the halftone opacity for the footer:

```css
body {
  background-image: radial-gradient(circle at 1px 1px, rgba(154, 149, 140, 0.18) 1px, transparent 1.5px);
}
.footer {
  background-image: radial-gradient(circle at 1px 1px, rgba(245, 242, 236, 0.08) 1px, transparent 1.5px);
}
```

### 9. Marquees overflow the container

A marquee section's `overflow: hidden` needs to be on a parent that spans full container width. Check that the marquee doesn't add horizontal scroll to the page.

### 10. Code blocks are mobile-friendly

Code blocks need `overflow-x: auto` and `white-space: pre`. Otherwise long lines wrap or break the layout.

## Layout primitives to define upfront

Always define these utility classes in the preview:

```css
.container {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 var(--container-gutter);
}
.stack > * + * {
  margin-top: var(--space-5);
}
.stack-tight > * + * {
  margin-top: var(--space-3);
}
.stack-loose > * + * {
  margin-top: var(--space-7);
}
.hairline {
  height: 1px;
  background: var(--color-rule-hairline);
  border: 0;
  margin: 0;
}
```

Use `.stack` rather than ad-hoc margins. It composes better and is easier to reason about.

## Motion in the preview

The preview shouldn't just render static reconstructions — it should reconstruct motion where feasible, and clearly label what couldn't be reconstructed.

**Reconstruct faithfully:**

- CSS transitions / keyframes — always
- Marquees and infinite loops — always
- Entrance fade-ins / staggered reveals — use CSS animations or vanilla IntersectionObserver
- SVG path draw-ons — vanilla CSS + minimal JS
- Hover states / focus states — always

**Reconstruct via CDN:**

- GSAP timelines — load `https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js` and rebuild the timeline. Worth doing for hero choreographies.
- Three.js — load three.js from cdnjs and rebuild the scene if it's small enough (< ~150 lines).
- Lottie — load `lottie-web` from CDN if the source `.json` URL is accessible.

**Build a CSS-only fallback:**

- Framer Motion (React-only — won't run in vanilla HTML preview): rebuild as CSS keyframe animations that approximate the timing and feel.
- Spring physics: usually approximated with `cubic-bezier(0.16, 1, 0.3, 1)` style easings on a CSS transition.
- Annotate clearly that the real implementation differs.

**Show a labeled static frame:**

- Complex WebGL scenes that can't be rebuilt in < 200 lines
- Lottie files whose source isn't accessible
- Effects requiring proprietary libraries

The label is itself documentation:

```html
<div class="recon-block">
  <div class="recon-label">Hero · Three.js marble</div>
  <div class="frozen-frame">
    <img src="hero-screenshot.png" alt="Hero scene" />
    <div class="frame-annotation">
      // Real implementation: Three.js icosahedron, level-4 subdivision, // PBR material, slow Y-axis rotation, scale
      tied to scroll progress. // See README §5.X for the full rendering spec.
    </div>
  </div>
</div>
```

**Reduced-motion:** every motion in the preview must respect `prefers-reduced-motion: reduce`. Wrap CSS animations and any JS-driven motion in a check. The preview is a demonstration of correct accessibility, not a violation of it.

```css
@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
    animation: none;
  }
  .marquee-track {
    animation: none;
  }
}
```

```js
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!prefersReduced) {
  // start canvas loop, GSAP timeline, etc.
}
```

## Writing protocol — token budget

**Never output the complete HTML in your conversational response.** Write the file section by section using the Edit-append pattern described in `workflow.md` Phase 6. This prevents the 100k+ token burn that happens when the full file is generated in context.

The only HTML that should appear in your response text is the small excerpt you're about to write in the next Edit call.

---

## Professional quality bar

The preview must look like a real design system reference site — not a student assignment with boxes and `#000` everywhere. Below is the quality bar per section.

### Visual hierarchy (applies to every section)

One clear focal point per section. Use size, weight, and color to establish importance — not borders around everything. **Primary actions must be visually dominant.** If every element looks the same weight, reduce the secondary elements, not the primary one.

### Header quality bar

- The hero text must use the extracted brand's actual display font loaded via `@import` or `link` tag from Google Fonts / CDN if it's a web font.
- Background, text, and CTA colors must come from the extracted tokens — not the template defaults.
- If the brand uses a distinctive texture (grain, halftone, grid overlay), it must appear in the header.
- The header must feel like a landing section, not a `<h1>` on a white div.

### §01 Brand identity quality bar

- Design principles are numbered with a hairline-separated list — not bullet points with `•`.
- Each principle is a single opinionated sentence, not a paragraph.
- Voice principles appear as a pull quote or styled callout, not a generic `<p>`.
- The brand colors bleed into this section as accents (section number in accent color, hairlines in brand ink color).

### §02 Tokens quality bar

**Color swatches:**
- Every confirmed token has its hex value displayed in mono font below the chip.
- Confidence flags are shown (`confirmed` / `inferred-likely` / `inferred`) in a subdued mono label.
- Dark/inverse colors must be displayed on a dark background — a white swatch chip for `#0A0A0A` is a failure.
- Swatch chips are at least 100px tall — enough to read the color at a glance.

**Typography scale:**
- Each row shows a live sample in the actual brand font, not the fallback system font.
- Hero / display sizes use `clamp()` and are visually large even in the specimen row.
- The meta column (size, weight, tracking) uses mono font for scannability.

**Space ruler:**
- The bar widths are proportional to the actual values — not all the same width.
- Each bar row shows the CSS token name AND the px value side by side.

**Motion tokens:**
- Each motion card is interactive — hovering plays the timing curve visually.
- Duration values match the extracted tokens exactly.

### §03 Atoms quality bar

- **Drive from `manifest.atoms`.** Every entry in `manifest.atoms` gets at least one atom card in this section. Open each entry's `stateFiles.default` screenshot to verify the reconstruction matches.
- Canonical-checklist atoms that did NOT appear in `manifest.atoms` are still rendered in the grid — give them a `not-observed` badge (a small muted label in the card footer) so the gap is explicit rather than invisible.
- Every atom card has a live rendered demo in its stage, not a label saying "button goes here."
- Atom stages have consistent min-height (120px) with the element centered.
- The anatomy footer shows the actual token names used (e.g. `bg ink.primary · radius md`), not English prose.
- Brand-specific atoms must be included — if the brand has a distinctive badge, pill, step indicator, or icon treatment, those atoms appear here.
- Cards use `display: flex; flex-direction: column` so all cards in a row are the same height.

### §04 Components quality bar

- **Drive from `manifest.componentStates`.** Every entry in `manifest.componentStates` gets its own `recon-block`. Use the entry's `stateFiles.default` screenshot as the pixel reference — compare side-by-side before declaring the reconstruction complete.
- Show the state matrix for each component: place `default`, `hover`, and `focus` screenshots next to the CSS reconstruction so the viewer can see both source and reconstruction in one view. Label each screenshot thumbnail with its state name.
- Each component block shows a pixel-faithful reconstruction using only the extracted tokens.
- Component blocks are not empty or filled with `{{placeholder}}` text — they have realistic content (real product names, plausible emails, actual copy that matches the brand's voice).
- States are shown: if a card has a hover lift, show `hover: box-shadow var(--shadow-lift)` in the anatomy footer. The hover token value must come from the `default → hover` screenshot diff, not guessed.
- Complex components (hero, pricing grid, feature section) get their own `recon-block` — don't collapse multiple components into one block.

### §05 Methodology quality bar

- Audit items are specific, not generic. "Typography weights may be inferred" is a failure. "Heading weight — visually read as 600; confirm via DevTools → `font-weight` on `.hero-headline`" is correct.
- The source URL appears as a clickable `<a>` in `inline-code` style.
- Confirmed vs. inferred breakdown is quantified: "14 of 22 tokens confirmed from CSS vars; 8 inferred visually."

### Footer quality bar

- The brand name in the footer must use the display font at a large size (40px+).
- Background is the brand's dark/inverse color, not generic `#0A0A0A`.
- If the brand uses a logo SVG (identified in Phase 1 asset inventory), embed or link it here.

---

## Testing the preview

Before declaring done:

1. **Open the Phase 1 screenshots** (`desktop-fold.png`, `desktop-full.png`). Compare against the live preview. Every section should feel visually connected to the source brand.

2. **Resize the window** from 1440px down to 320px continuously. Watch for:
   - Text overflowing containers
   - Grids not collapsing
   - Code blocks adding horizontal scroll to the page
   - Buttons wrapping awkwardly
   - Type that's too large on mobile

3. **Tab through the page.** Every interactive element should have a visible focus state.

4. **View source.** The HTML should be human-readable. No 5000-character class strings, no weird wrapper soup.

5. **Disable JavaScript.** The preview must work without JS. (Marquee animations are fine since they're CSS-only.)

6. **Compare side-by-side with the source.** This is Phase 7 and it's mandatory.

**If the preview could pass as a generic spec sheet** — Inter on white, placeholder colors, no texture, no brand personality — it has failed the quality bar. Redo it.
