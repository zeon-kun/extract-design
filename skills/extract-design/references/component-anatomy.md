# Component Anatomy — the non-negotiable

This is the most important reference in the skill. If you skip this depth, the deliverable fails.

## The rule

A component is **never** documented as a single line. Every sub-element gets a name, every sub-element gets tokens, every behavior gets specified.

## What "exhaustive" means

For every component identified in Phase 4, document **all** of the following:

### 1. Sub-element inventory

Every named, addressable part of the component. If you can point at it and describe it, it's a sub-element. Examples for a feature card:
- `eyebrow-label` — the small uppercase label above the title
- `icon-slot` — the 32×32 SVG container, top-left
- `title` — the bolded headline
- `body` — the supporting paragraph
- `cta-link` — the optional "Learn more →" affordance at bottom
- `hover-lift` — the elevation change on hover (this is a *behavior*, but it's part of the anatomy)
- `focus-ring` — the keyboard focus treatment

If you can't list at least 4–6 sub-elements for a non-trivial component, you haven't looked closely enough.

### 2. Tokens per sub-element

Each sub-element references the specific tokens it uses:

```
icon-slot:
  size: 32 × 32
  color: ink.primary
  margin-bottom: space-3
  
title:
  font: type.title (28px / 1.25 / -0.01em / weight 500)
  color: ink.primary
  margin-bottom: space-2

body:
  font: type.body (18px / 1.5)
  color: ink.secondary
  max-width: 32ch
```

Vague is forbidden: "uses primary color" is not enough — name the token.

### 3. Layout grammar

How sub-elements relate spatially:
- Layout primitive (flex / grid / absolute)
- Direction and alignment
- Gap rhythm
- Constraints (max-width, aspect-ratio)

```
layout: vertical flex stack
gap: space-3 between icon-slot, title, body
alignment: start (no centering)
max-width: 320px (constrains body wrapping)
```

### 4. States

For every interactive element, document every state observed or strongly implied:

- **Default** — resting state
- **Hover** — what changes? (elevation, color, transform, opacity)
- **Focus** — keyboard ring? color shift?
- **Active / pressed** — visual feedback on click
- **Disabled** — opacity? grayscale? cursor?
- **Loading** — skeleton? spinner?
- **Error** — color shift? message slot?

If a state isn't observable on the site, mark it `not-observed` rather than inventing one. But **always list which states were checked** so the gap is transparent.

```
states:
  default: as specified above
  hover: 
    transform: translateY(-2px)
    shadow: shadow.lift
    duration: motion.duration.fast
    easing: motion.easing.standard
  focus: not-observed (verify in devtools)
  active: not-observed
  disabled: opacity 0.5, cursor not-allowed (inferred from convention)
```

### 5. Responsive behavior

How does the component change across breakpoints?

```
responsive:
  >=900px: 3-up grid, gap space-6
  600–900px: 2-up grid, gap space-5
  <600px: stacked, gap space-4
  
  title font-size:
    >=600px: 28px
    <600px: 24px (clamp)
```

Be explicit. "Responsive" is not a behavior — *what it does at what breakpoint* is.

### 6. Variants

If the same component appears with different treatments, list them:

```
variants:
  default: as specified
  featured: 
    background: bg.surface → accent.signal-tint
    border: 1.5px accent.signal
    used-for: "premium" or "highlighted" content
  inverted:
    background: bg.inverse
    text: ink.inverse
    used-for: dark sections
```

### 7. Composition rules

Which atoms compose this component? Which other components can nest inside it?

```
composes:
  atoms: [icon-outline, eyebrow-label, link-arrow]
  
nests-inside:
  - feature-grid (3-up or 4-up)
  - sidebar-card (single, full-width)
  
contains:
  - max one cta-link
  - exactly one icon-slot
  - title and body required, eyebrow optional
```

### 8. Motion spec

If the component has any motion — CSS transition, JS-driven animation, scroll-triggered behavior, or custom rendering — document it as a structured block, not a free-text description.

**Required fields per motion entry:**

```
motion-spec:
  - name: card-hover-lift
    technique: css-transition
    trigger: hover
    library: none
    properties: transform, box-shadow
    from-to: translateY(0) shadow.none → translateY(-2px) shadow.lift
    duration: motion.duration.fast
    easing: motion.easing.standard
    reduced-motion: disabled (no transform applied)
    confidence: confirmed
  
  - name: card-content-reveal
    technique: framer-motion-viewport
    trigger: viewport-enter (50% threshold)
    library: framer-motion
    variants: { hidden: opacity 0 y 20, visible: opacity 1 y 0 }
    transition: duration 0.5, ease entrance
    stagger: parent.staggerChildren 0.1
    reduced-motion: respect (Framer default)
    confidence: inferred-likely
```

**For each motion entry, the technique must be one of:**
- `css-transition` — property changes via :hover / state class
- `css-keyframes` — `@keyframes` rule
- `gsap-timeline` — GSAP tween or timeline
- `gsap-scrolltrigger` — scroll-driven via ScrollTrigger
- `framer-motion-variant` — Framer Motion variants/transitions
- `framer-motion-viewport` — Framer Motion `whileInView` or viewport-driven
- `intersection-observer` — vanilla IntersectionObserver-driven
- `lottie` — Lottie animation playback
- `requestanimationframe-loop` — hand-rolled JS loop
- `svg-path-animation` — stroke-dasharray / SMIL
- `spring-physics` — Framer spring, react-spring, hand-rolled lerp
- `unknown` — observed but technique not determinable

If unsure, mark `unknown` and document by behavior in the `from-to` field.

See `motion-extraction.md` for the full taxonomy.

### 9. Rendering spec

If the component is rendered by code rather than styled DOM (canvas, WebGL, manual SVG with stroke math, shader), it gets a separate rendering spec block. **The component anatomy still applies** — sub-elements, tokens, layout, states — but the rendering spec describes the implementation pipeline.

```
rendering-spec:
  medium: canvas-2d  
  library: hand-rolled
  purpose: ambient particle field behind hero
  driving-variables:
    COUNT: 80
    BASE_VELOCITY: 0.3
    CURSOR_REPEL_RADIUS: 100
  loop-summary: rAF loop, drift + cursor-repel + edge-wrap
  reconstruction: faithful rebuild possible (~50 lines vanilla canvas)
  preview-fallback: static halftone background (annotated)
  confidence: inferred (behavior observed, exact velocities estimated)
```

**Medium values:**
- `canvas-2d`
- `webgl` (raw)
- `three.js`
- `r3f` (React Three Fiber)
- `pixi.js`
- `svg-manual` (SVG with hand-tuned stroke / path math)
- `shader` (custom WGSL/GLSL)
- `lottie`

For full extraction template (visual, behavior, variables, render-loop pseudocode, performance), see `custom-implementation.md`.

If the component is plain styled DOM, **omit the rendering-spec block entirely.** Don't include it with placeholder values.

### 10. Accessibility notes

- Required ARIA attributes (e.g., `aria-expanded` on accordion triggers)
- Keyboard interaction model
- Focus management
- Reduced-motion alternatives if motion is present

If you didn't verify accessibility, mark it as such. Don't invent compliance.

---

## Worked example — what GOOD looks like

This is the level of detail required for **every** component:

```markdown
### Component: Feature Card

**Used for:** the "Zero protocol fees / Zero wait / …" grid in the "It's how the internet should be" section.

#### Sub-elements
- `card-frame` — the outer container
- `icon-slot` — top, single-color outline SVG
- `title` — headline below icon
- `description` — supporting line below title
- (no CTA on this variant; see "card-with-link" variant below)

#### Tokens
| Sub-element | Property | Token |
|---|---|---|
| card-frame | background | bg.page (transparent on this variant — uses page bg) |
| card-frame | padding | space-0 (no internal padding; spacing is grid gap) |
| card-frame | border | none |
| icon-slot | size | 32 × 32 |
| icon-slot | color | ink.primary |
| icon-slot | stroke-width | 1.5px |
| icon-slot | margin-bottom | space-3 |
| title | font | type.title (28 / 1.25 / -0.01em / 500) |
| title | color | ink.primary |
| title | margin-bottom | space-2 |
| description | font | type.body (18 / 1.5) |
| description | color | ink.secondary |
| description | max-width | none (wraps at grid column width) |

#### Layout grammar
- vertical flex stack, alignment: start
- gap is implicit via margin-bottom on each sub-element (not flex `gap`)

#### States
- default: as above
- hover: not-observed (the card is not interactive — it's static content)
- focus: N/A (no focusable child elements)

#### Responsive
- >=900px: 5-up grid (5 features in a row), gap space-6
- 600–900px: 3-up grid, gap space-5
- <600px: 2-up grid, gap space-5

#### Variants
- **default** (as specified)
- **with-link**: same anatomy + appended `cta-link` atom (text "Learn more →" in accent.signal). Not used in the "Zero X" grid but appears in other feature grids on the site.

#### Composition
- composes atoms: [icon-outline]
- nests-inside: feature-grid component
- siblings: typically 4 other feature-cards in same grid

#### Custom interactivity
- none observed (this is a static content card)

#### Motion spec
- name: feature-grid-stagger-reveal
  technique: intersection-observer
  trigger: viewport-enter (50% threshold)
  library: unknown (could be hand-rolled IntersectionObserver or Framer Motion — not verified)
  properties: opacity, transform
  from-to: opacity 0 translateY(8px) → opacity 1 translateY(0)
  duration: motion.duration.slow (480ms)
  easing: motion.easing.entrance
  stagger: 0.08s between cards
  reduced-motion: not-verified (assume should be disabled)
  confidence: inferred (entrance pattern observed; exact technique not confirmed)

#### Rendering spec
- omitted (this is plain styled DOM, not custom rendered)

#### Accessibility
- icon should have aria-hidden="true" if purely decorative
- title should be h3 (assuming feature-grid sits under an h2)
- description is plain p

#### Confidence
- card-frame, icon-slot, title, description: confirmed (visible in source)
- exact stroke-width on icons: inferred (1.5 is conventional, not measured)
- responsive breakpoints: inferred (Next.js + Tailwind defaults are likely)
```

That's one component. Every component on the site gets this treatment. **Yes, every one.**

---

## Common failures

- **"Card: padded container with shadow."** — this is a failure. No sub-elements, no tokens, no states.
- **Free-text custom interactivity.** — "has a hover thing" is not documentation. Use the structured motion-spec block.
- **Listing components without their motion spec.** — if the FAQ accordion has a rotating chevron, that's a motion-spec entry with technique `css-transition`, properties `transform`, from-to `rotate(0)→rotate(45deg)`.
- **Skipping the rendering spec.** — if the component uses canvas or WebGL, the rendering spec is required, not optional.
- **Inventing library names.** — if you didn't see `gsap` in the source, don't claim GSAP. Mark `library: unknown`.
- **Skipping responsive.** — "responsive: yes" is not a documented behavior.
- **Inventing states.** — if you didn't see `:disabled`, mark it `not-observed`. Don't make one up.
- **Skipping reduced-motion.** — every motion-spec entry requires a reduced-motion field.
- **Not naming sub-elements.** — every part needs a noun. "The thing on the left" doesn't ship.
