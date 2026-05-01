# Custom Implementation Extraction

For components that aren't styled DOM — canvas particle fields, Three.js scenes, hand-animated SVG with manual stroke math, WebGL shaders, generative patterns — this is the documentation pattern. Same anatomy depth as components, but adapted to the rendering medium.

## When this applies

Any component or background that uses:
- `<canvas>` with 2D or WebGL context
- Three.js, R3F, Babylon, PixiJS, OGL
- SVG with `stroke-dasharray` / `stroke-dashoffset` math, or `<animate>` SMIL elements
- Custom WGSL/GLSL shaders
- Hand-rolled physics simulations (particle systems, springs, fluid)
- Procedurally generated geometry or patterns
- `OffscreenCanvas` / Web Workers for rendering

If the visual is rendered by code rather than CSS-styled HTML, document it here.

## The anatomy template

Every custom implementation gets the following fields. Treat this with the same rigor as `component-anatomy.md` — each field is required, even if the answer is `not-observable` or `inferred`.

### 1. Identity

```
name: hero-particle-field
medium: canvas-2d
library: hand-rolled (no detected library)
purpose: ambient background motion behind the hero block
runs: at all times when section is visible
detection-method: <canvas id="hero-bg"> in DOM, requestAnimationFrame loop visible in profiler
```

### 2. Visual specification

What does it look like? Be specific.

```
visual:
  element-count: ~80 particles (counted from screenshot)
  element-shape: filled circles
  element-size: 1–3px radius (varied per particle)
  element-color: rgba(154,149,140,0.15) — matches the halftone token
  background: transparent (canvas overlays the page bg)
  density: roughly even distribution, slightly concentrated near top-center
```

### 3. Behavior specification

What does it do? Use precise verbs.

```
behavior:
  primary-motion: each particle drifts in a fixed direction at constant velocity
  velocity: ~0.3px/frame (estimated from frame-by-frame inspection)
  direction: each particle has a fixed random direction at init, never changes
  edge-behavior: wrap to opposite edge when leaving viewport
  cursor-interaction: particles within ~100px of cursor are pushed away with falloff
  cursor-falloff: linear, full-strength at 0px, zero at 100px
  reduced-motion: animation pauses, particles freeze at last position
```

### 4. Driving variables

The knobs that, if changed, would change the feel. These are the "tokens" of the custom implementation.

```
variables:
  COUNT: 80
  MIN_RADIUS: 1
  MAX_RADIUS: 3
  COLOR: var(--color-ink-muted) at 15% alpha
  BASE_VELOCITY: 0.3
  CURSOR_REPEL_RADIUS: 100
  CURSOR_REPEL_STRENGTH: 2.0
  DPR_SCALING: respect window.devicePixelRatio up to 2
```

### 5. Render-loop structure (where determinable)

Pseudocode the loop. This is the implementation recipe.

```
loop:
  init():
    create canvas, size to parent, set DPR
    spawn COUNT particles with random position + random direction unit vector
    attach mousemove + resize listeners
  
  frame(time):
    clear canvas
    for each particle:
      apply velocity along direction
      apply cursor repulsion if within radius
      wrap position to viewport
      draw filled circle at position
    requestAnimationFrame(frame)
  
  on-resize:
    re-size canvas, re-distribute particles proportionally
  
  on-cursor-move:
    update tracked cursor position (no per-particle work here)
```

### 6. Performance characteristics

Real production sites care about this. Document what was observed.

```
performance:
  target: 60fps on desktop, may drop to 30fps on mobile
  techniques: 
    - DPR cap at 2 to avoid retina performance hit
    - particles drawn in a single canvas, not separate elements
    - no per-particle event listeners
  observed-issues: minor jank when window is resized rapidly (likely no debounce)
```

### 7. Reconstruction strategy for preview

How should this be rebuilt in `preview.html`?

```
reconstruction:
  approach: rebuild faithfully — this is a 50-line vanilla canvas script
  fallback: if rebuild infeasible, show static screenshot with overlay annotation
  reduced-motion: must respect; freeze all particles
  preview-included: yes (see js block in §04 components)
```

### 8. Confidence

```
confidence:
  visual: confirmed (extracted from screenshots)
  behavior: inferred-likely (drift + wrap is conventional pattern)
  exact-velocity: inferred (estimated from screen recording)
  cursor-interaction: inferred (visible behavior, exact math unknown)
  library: confirmed (no library — vanilla canvas script in source)
```

---

## Worked example — Three.js hero scene

This is the level of detail required when a brand uses WebGL.

```
name: hero-3d-marble
medium: webgl
library: three.js@0.158 (detected from script src)
purpose: hero illustration, replaces a static image with a procedural sculpture

visual:
  geometry: icosahedron, subdivided to level 4 (~640 faces)
  material: physical material (PBR), high roughness, low metalness
  color: matches accent.signal (#0052FF) with slight emissive tint
  lighting: 1 ambient (low intensity) + 1 directional (warm) + 1 point (cool)
  background: transparent (page bg shows through)

behavior:
  primary-motion: continuous slow rotation on Y axis (~0.002 rad/frame)
  cursor-interaction: rotation Y velocity boosted by cursor X delta
  scroll-interaction: scale decreases from 1.0 → 0.6 as section scrolls past
  reduced-motion: rotation paused, scene held at fixed angle

variables:
  GEOMETRY_DETAIL: 4
  ROTATION_SPEED: 0.002
  CURSOR_INFLUENCE: 0.5
  SCROLL_SCALE_MIN: 0.6
  CAMERA_FOV: 45
  CAMERA_POSITION: (0, 0, 5)

render-loop:
  init():
    create renderer with antialias, DPR cap 2
    create scene, camera, mesh, lights
    attach scroll + cursor listeners
  
  frame(time):
    update mesh.rotation.y with current speed
    update mesh.scale based on scroll progress
    renderer.render(scene, camera)

performance:
  target: 60fps desktop, 30fps mobile fallback
  techniques: geometry pre-built, no per-frame allocations, scene graph minimal
  observed: dropped frames during scroll on lower-end mobile

reconstruction:
  approach: full rebuild requires Three.js — feasible since it's available via CDN
  fallback: CSS-only animated radial-gradient mimicking the marble feel
  preview-included: fallback (CSS gradient) — note in audit that real implementation is Three.js

confidence:
  geometry: inferred-likely (icosahedron is conventional for this look)
  material: inferred (PBR is standard for marble appearance)
  exact-rotation-speed: inferred from frame counting
  library: confirmed (script src visible)
```

---

## Worked example — manual SVG path animation

```
name: brand-mark-draw-on
medium: svg
library: none — vanilla CSS animation on stroke-dashoffset
purpose: page-load reveal of the brand mark in the nav

visual:
  source: /assets/brand-mark.svg (60 × 24 px)
  paths: 4 separate <path> elements (one per letter glyph)
  stroke: 1.5px var(--color-ink-primary)
  fill: none during animation, becomes ink.primary at end

behavior:
  trigger: page load
  technique: stroke-dasharray + stroke-dashoffset transition
  per-path:
    - measure pathLength (varies per glyph)
    - set stroke-dasharray: pathLength
    - set stroke-dashoffset: pathLength (initially hidden)
    - animate stroke-dashoffset to 0 (drawn)
  stagger: 0.1s between paths
  fill-fade: after all paths drawn, fill fades in over 0.3s
  reduced-motion: paths fully drawn instantly, fill applied with no transition

variables:
  STROKE_DURATION: 0.8s per path
  STAGGER: 0.1s
  FILL_DURATION: 0.3s
  EASING: ease-in-out

implementation-recipe:
  CSS:
    .brand-mark path {
      fill: transparent;
      stroke: var(--color-ink-primary);
      stroke-width: 1.5;
      animation: draw 0.8s ease-in-out forwards, 
                 fill 0.3s ease-in-out 1.2s forwards;
    }
    .brand-mark path:nth-child(2) { animation-delay: 0.1s, 1.3s; }
    .brand-mark path:nth-child(3) { animation-delay: 0.2s, 1.4s; }
    .brand-mark path:nth-child(4) { animation-delay: 0.3s, 1.5s; }
    
    @keyframes draw {
      from { stroke-dashoffset: var(--length); }
      to   { stroke-dashoffset: 0; }
    }
    @keyframes fill {
      to { fill: var(--color-ink-primary); }
    }
  JS (one-time, sets the --length variable per path):
    document.querySelectorAll('.brand-mark path').forEach(p => {
      p.style.setProperty('--length', p.getTotalLength());
      p.style.strokeDasharray = p.getTotalLength();
    });

reconstruction:
  approach: full rebuild — pure CSS + 4 lines of JS
  preview-included: yes

confidence:
  technique: confirmed (visible in source: stroke-dasharray inline style)
  exact-durations: inferred (estimated from screen recording)
```

---

## Reconstruction decision tree

When deciding what to put in the preview:

```
Is the implementation < 100 lines of vanilla JS/CSS?
├─ YES → Reconstruct faithfully, include in preview
└─ NO → Does it require a library?
        ├─ Library available via CDN (GSAP, Three.js, Lottie) → Reconstruct, load via CDN
        └─ Library is React-only or proprietary → Build CSS-only fallback that captures the *feel*, annotate that real implementation differs
                
Is reduced-motion respected?
├─ Always required, regardless of approach above

Is the original interactive (responds to cursor/scroll)?
├─ YES → Reconstruct interactivity if possible. If not, document the input/output mapping in detail and show a static representative frame.
└─ NO → Static autoplay reconstruction is fine.
```

## What goes in `tokens.json` vs what goes in the README

**`tokens.json`** holds primitive values and named patterns:
- `motion.duration.*`, `motion.easing.*`
- `motion.patterns.fade-in-up`, `motion.patterns.marquee`
- Driving variables for custom impls (e.g., `motion.canvas.particle-field.count: 80`)

**`README.md`** holds the full anatomy as documented above:
- The full template (identity, visual, behavior, variables, loop, performance, reconstruction, confidence)
- The implementation recipe / pseudocode
- The reconstruction strategy and trade-offs

This split keeps `tokens.json` machine-readable and the README human-narratable.

## Common failure modes

- **Documenting "particle background" without numbers.** Count, velocity, color, size, interactivity — all required.
- **Skipping the reduced-motion fallback.** Custom implementations are the *most* likely to break accessibility expectations. Always specify the fallback.
- **Inventing implementation details.** If you didn't see the source, mark techniques `inferred` and document what you observed, not what you guessed they wrote.
- **Treating WebGL as a black box.** Even when full reconstruction is impossible, the geometry, material, lighting, and animation drivers can usually be inferred and documented.
- **No reconstruction strategy.** Every custom impl entry must answer: "how would the preview show this?"
