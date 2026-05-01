# Motion Extraction

Motion is a first-class extraction layer, not a footnote in the token JSON. This reference covers how to detect, document, and reconstruct the full motion vocabulary of a brand — from CSS transitions to GSAP timelines to canvas particle systems.

## Why motion needs its own pass

The token layer (`duration`, `easing`) only captures *primitives*. It doesn't capture:

- **Choreography** — staggered reveals, sequenced timelines, magnetic cursors
- **Scroll behaviors** — pinned sections, parallax, scrub-tied animations, IntersectionObserver fade-ins
- **Physics** — spring configs, drag inertia, mouse-tracking damping
- **Custom rendering** — canvas, WebGL, Three.js scenes, hand-animated SVG paths
- **Library identity** — knowing it's GSAP vs Framer Motion vs CSS matters for downstream implementation

A site documented without motion extraction looks correct in static screenshots and feels dead in implementation. Motion is often the *most* distinctive part of a brand.

## Phase 1 addendum — runtime detection

Before extracting motion, identify the toolchain. This shapes how everything else gets documented.

**What to look for in `<head>` / `<script>` / network tab:**

| Signal | Library | Notes |
|---|---|---|
| `gsap` / `ScrollTrigger` / `cdn.jsdelivr.net/npm/gsap` | GSAP | Timelines, scroll-driven, MotionPath |
| `framer-motion` | Framer Motion | React `motion` components, `useScroll`, layout animations |
| `lottie-web` / `.json` Lottie files | Lottie | After Effects exports, often hero illustrations |
| `three` / `r3f` / `@react-three/fiber` | Three.js | WebGL scenes, often hero or background |
| `tsparticles` / `particles.js` | Particles | Canvas-based particle fields |
| `splide` / `swiper` / `embla` | Carousel libs | Often used for marquees + sliders |
| `<canvas>` with no library | Hand-rolled canvas | Look for `requestAnimationFrame` patterns |
| Only CSS animations | CSS-only | Look for `@keyframes`, `animation:`, `transition:` |

**Methods of detection:**
1. View page source — look for `<script src=...>` URLs
2. Open DevTools Network tab — filter by JS, look at filenames
3. Inspect specific elements — Framer Motion adds `data-projection-id`, GSAP often uses inline transforms
4. Search the DOM for class names like `lottie-container`, `three-canvas`, `gsap-marker`

**If runtime detection fails** (heavily bundled / minified): mark library as `unknown` and document by behavior, not by API call.

## The motion taxonomy

Document each motion observed under its category. Categories aren't mutually exclusive — a hero might combine scroll-pinning, canvas, and CSS keyframes.

### 1. CSS-only motion

**Detection:** `transition:` in computed styles, `@keyframes` rules, `animation:` properties.

**What to capture:**
- Trigger (hover, focus, page-load, infinite)
- Properties animated (transform, opacity, color)
- Duration + easing tokens
- Delay / stagger (if multiple elements)
- Reduced-motion fallback

**Example documentation:**
```
motion.css.feature-card-hover:
  trigger: hover
  target: .feature-card
  properties: transform, box-shadow
  from:  translateY(0), shadow.none
  to:    translateY(-2px), shadow.lift
  duration: motion.duration.fast
  easing: motion.easing.standard
  reduced-motion: disabled
```

### 2. CSS keyframe sequences

**Detection:** named `@keyframes` blocks.

**What to capture:** every keyframe, the property values, the iteration mode.

```
motion.keyframes.marquee:
  from: translateX(0)
  to:   translateX(-50%)
  duration: 40s
  easing: linear
  iteration: infinite
  technique: 3× content duplication for seamless loop
```

### 3. JavaScript choreography (GSAP / Framer Motion / hand-rolled)

**Detection:** library presence + element behavior.

**What to capture:**
- Library + version (where determinable)
- The full timeline as a list of beats, with offsets
- Stagger values
- Trigger conditions
- ScrollTrigger configs (start, end, scrub, pin)

**GSAP example:**
```
motion.gsap.hero-entrance:
  library: gsap@3.12 (inferred from cdn url)
  trigger: page-load
  timeline:
    - 0.0s:  .hero-eyebrow opacity 0→1, y 8→0, dur 0.4, ease power2.out
    - 0.08s: .hero-headline opacity 0→1, y 12→0, dur 0.6, ease power3.out
    - 0.16s: .hero-body opacity 0→1, y 8→0, dur 0.5, ease power2.out
    - 0.24s: .hero-cta opacity 0→1, y 4→0, dur 0.4, ease power2.out
  stagger-equivalent: 0.08s between elements
  reduced-motion: skip timeline, set all to final state
```

**Framer Motion example:**
```
motion.framer.feature-grid-reveal:
  library: framer-motion (detected via data-projection-id attrs)
  trigger: viewport-enter (50% threshold)
  variants:
    hidden:  { opacity: 0, y: 20 }
    visible: { opacity: 1, y: 0 }
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  stagger: parent.staggerChildren = 0.1
  reduced-motion: respect (Framer respects by default)
```

**ScrollTrigger / scroll-driven:**
```
motion.scroll.about-section-pin:
  technique: GSAP ScrollTrigger
  pin: true
  start: "top top"
  end: "+=2000"
  scrub: 1.0
  beats:
    - 0.0: .about-image scale 1.0
    - 0.5: .about-image scale 1.2, .about-text opacity 1→0
    - 1.0: .about-image scale 1.4
```

### 4. Lottie animations

**Detection:** `.json` files loaded by `lottie-web`, `<lottie-player>` elements, or Bodymovin output.

**What to capture:**
- Source file URL (or note "embedded")
- Trigger (autoplay, hover, scroll, click)
- Loop behavior
- The composition's purpose (hero illustration, loading state, decorative)
- Approximate frame count and duration if accessible

```
motion.lottie.hero-illustration:
  source: /assets/hero-anim.json
  trigger: autoplay
  loop: true
  duration: ~6s estimated from one cycle
  purpose: hero illustration (animated halftone shapes)
  fallback: static halftone-shape SVG
```

Lottie files are typically too complex to fully document inline — note their presence, behavior, and where to access the source.

### 5. Canvas / hand-rolled 2D

**Detection:** `<canvas>` element without WebGL context, `getContext('2d')` calls, `requestAnimationFrame` loops.

**What to capture:**
- The visual effect (particle field, ripples, generative pattern, parallax stars)
- The driving variables (count, speed, color, response to mouse/scroll)
- The render loop structure
- Performance considerations (DPR scaling, offscreen canvas, throttling)

```
motion.canvas.background-particles:
  technique: hand-rolled 2D canvas
  particle-count: ~80 (counted from screenshot)
  motion: drift in random direction at speed ~0.3px/frame
  color: rgba(154,149,140,0.15) — matches halftone
  size: 1–3px radius variation
  interactivity: particles repel from cursor within ~100px radius (inferred)
  reset: particles wrap at viewport edges
  reduced-motion: pause loop, freeze final positions
```

See `custom-implementation.md` for the full canvas reconstruction pattern.

### 6. WebGL / Three.js

**Detection:** WebGL context, `three.min.js`, R3F React components, shader source in DOM.

**What to capture:**
- Scene composition (camera, lights, geometries)
- Materials (PBR? toon? custom shader?)
- Animation drivers (time-based rotation, mouse-tracking, scroll-tied)
- Post-processing (bloom, distortion, chromatic aberration)
- Performance scaling (pixel ratio, geometry LOD)

See `custom-implementation.md` for the full Three.js documentation pattern. WebGL is rarely fully reconstructable without source — usually you document *intent* and provide a CSS-only or canvas-based fallback in the preview.

### 7. SVG path animations

**Detection:** `<svg>` with `<path>` whose `stroke-dasharray` / `stroke-dashoffset` is animated, or `<animate>`/`<animateTransform>` SMIL elements, or GSAP DrawSVGPlugin patterns.

**What to capture:**
- The path geometry (or note "complex SVG, see source")
- The animation type (draw-on, morph, rotate, motion-along-path)
- Trigger and duration
- Whether stroke-dasharray is hand-tuned or automated

```
motion.svg.logo-draw-on:
  technique: stroke-dasharray + stroke-dashoffset animation
  trigger: page-load
  path: brand mark (~340 path units total length)
  from: stroke-dashoffset 340 (fully hidden)
  to:   stroke-dashoffset 0   (fully drawn)
  duration: 1.2s
  easing: ease-out
  reduced-motion: instantly set offset to 0
```

### 8. Spring physics / drag / inertia

**Detection:** elements with damped feel, drag-throw behavior, magnetic cursors. Often Framer Motion `<motion.div drag />`, GSAP Draggable, or hand-rolled lerp loops.

**What to capture:**
- The physics character (stiff vs soft, bouncy vs critically damped)
- Approximate stiffness/damping values where determinable
- Constraints (axis lock, bounds, snap points)

```
motion.spring.cursor-magnet:
  technique: lerp toward cursor with damping
  damping: ~0.12 (estimated — element trails cursor noticeably)
  applies-to: large CTA buttons in hero
  reduced-motion: disabled, button stays static
```

### 9. Mouse-tracking / parallax

**Detection:** elements that translate / rotate / tilt based on cursor or scroll position.

**What to capture:**
- Source signal (mouseX, scrollY, deviceOrientation)
- Mapping function (linear, eased, clamped)
- Range of movement
- Damping if present

```
motion.parallax.hero-illustration-tilt:
  signal: cursor position relative to viewport center
  mapping: rotateX(mouseY * -10deg), rotateY(mouseX * 10deg)
  range: ±10deg each axis
  damping: requestAnimationFrame lerp at ~0.1
  reduced-motion: disabled
```

## Token schema additions for motion

The `motion` block in `tokens.json` should be extended to capture more than just primitives:

```json
"motion": {
  "library": {
    "primary": "gsap@3.12",
    "secondary": ["lottie-web", "scroll-trigger"],
    "confidence": "inferred-likely"
  },
  "duration": { ... primitives as before ... },
  "easing": { ... primitives as before ... },
  "patterns": {
    "fade-in-up": {
      "from": "opacity:0, translateY:8px",
      "to":   "opacity:1, translateY:0",
      "duration": "var(--motion-duration-slow)",
      "easing": "var(--motion-easing-entrance)",
      "stagger": "0.08s"
    },
    "marquee": {
      "from": "translateX(0)",
      "to":   "translateX(-50%)",
      "duration": "40s",
      "easing": "linear",
      "iteration": "infinite",
      "technique": "3× content duplication"
    },
    "scroll-pin-section": {
      "library": "ScrollTrigger",
      "pin": true,
      "scrub": 1.0,
      "duration-px": 2000
    }
  },
  "scroll": {
    "smooth-scroll": { "library": "lenis", "lerp": 0.1, "confidence": "inferred" },
    "trigger-defaults": { "start": "top 80%", "toggle-actions": "play none none reverse" }
  },
  "reduced-motion": {
    "policy": "respect-prefers-reduced-motion",
    "fallback": "instant-final-state"
  }
}
```

## Preview implications

The preview can include real motion where it's CSS-only or trivially scripted (marquees, hover transitions, entrance fades). For library-driven motion:

- **GSAP timelines** can be rebuilt in the preview by loading GSAP from CDN. Worth doing for the headline reveals.
- **Framer Motion** requires React; in a static preview, fall back to CSS keyframes that approximate the timing.
- **Lottie** can be embedded if the source `.json` is accessible. If not, show a static frame with an annotation.
- **Canvas/WebGL** — see `custom-implementation.md` for reconstruction patterns. If rebuilding is infeasible, render the static frame and overlay a label `// canvas: 80 drifting particles, repel cursor`.

When motion can't be reconstructed in the preview, **always show a labeled static frame** rather than omitting the component entirely. The label is itself documentation.

## Audit additions

The Phase 7 self-audit should now also list:
- Library detection confidence (was the lib name confirmed via script src, or guessed from behavior?)
- Motion patterns observed but not reconstructed in preview
- Frames captured for canvas/WebGL effects (link to where screenshots are stored)
- Whether `prefers-reduced-motion` was tested on the live site

## Common failure modes

- **Treating motion as decoration.** It's often the brand's signature — pinned scroll sections, magnetic cursors, halftone particle drift. Skipping these is missing the point.
- **Documenting only durations.** A duration without choreography (stagger, sequence, trigger) is meaningless.
- **Assuming CSS when it's JS.** A site can fake CSS-feel with GSAP. Detect the library before assuming.
- **Skipping reduced-motion.** Every motion entry must specify the reduced-motion fallback.
- **Documenting libraries you didn't confirm.** If you see suspicious-looking inline transforms but no library reference, mark library as `unknown` rather than guessing GSAP.
