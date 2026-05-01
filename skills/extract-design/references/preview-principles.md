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

## Testing the preview

Before declaring done:

1. **Resize the window** from 1440px down to 320px continuously. Watch for:
   - Text overflowing containers
   - Grids not collapsing
   - Code blocks adding horizontal scroll to the page
   - Buttons wrapping awkwardly
   - Type that's too large on mobile

2. **Tab through the page.** Every interactive element should have a visible focus state.

3. **View source.** The HTML should be human-readable. No 5000-character class strings, no weird wrapper soup.

4. **Disable JavaScript.** The preview must work without JS. (Marquee animations are fine since they're CSS-only.)

5. **Compare side-by-side with the source.** This is Phase 7 and it's mandatory.
