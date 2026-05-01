# Token Schema

The exact structure for `tokens.json`. Follow it precisely so downstream tooling can rely on the shape.

## Top-level shape

```json
{
  "$schema": "design-tokens-v1",
  "meta": { ... },
  "color": { ... },
  "typography": { ... },
  "space": { ... },
  "radius": { ... },
  "border": { ... },
  "shadow": { ... },
  "motion": { ... },
  "texture": { ... },
  "z-index": { ... }
}
```

## `meta`

```json
{
  "source": "https://example.com/",
  "extracted": "YYYY-MM-DD",
  "confidence": "Free-text paragraph explaining overall confidence. Mention specifically what was confirmed (CSS read directly, design file inspected) vs. inferred (visual approximation from screenshots). Mention any access failures."
}
```

## Token entry format

Every token value must be either:

**Simple (for trivially confirmed values like the spacing scale):**
```json
"4": "16px"
```

**With confidence flag (for any value where confidence matters):**
```json
"page": {
  "value": "#F5F2EC",
  "note": "warm cream/off-white, dominant surface",
  "confidence": "inferred"
}
```

**Confidence values:**
- `"confirmed"` — read directly from CSS, source file, or design tool
- `"inferred-likely"` — visual inference + strong conventional evidence
- `"inferred"` — visual approximation, low certainty

## Required sections

### `color`

Must have at minimum: `background`, `ink`, `accent`, `rule`. Each contains named tokens with confidence.

```json
"color": {
  "background": {
    "page": { "value": "#F5F2EC", "confidence": "inferred" },
    "surface": { "value": "#FFFFFF", "confidence": "inferred" },
    "inverse": { "value": "#0A0A0A", "confidence": "inferred" }
  },
  "ink": {
    "primary": { "value": "#0A0A0A", "confidence": "inferred" },
    "secondary": { "value": "#5A5A5A", "confidence": "inferred" },
    "muted": { "value": "#9A958C", "confidence": "inferred" },
    "inverse": { "value": "#F5F2EC", "confidence": "inferred" }
  },
  "accent": {
    "signal": { "value": "#0052FF", "confidence": "inferred-likely" }
  },
  "rule": {
    "hairline": { "value": "rgba(10,10,10,0.10)", "confidence": "inferred" }
  }
}
```

### `typography`

Required: `family`, `weight`, `scale`. Each entry in `scale` must specify size, lineHeight, tracking, weight, and use-case.

```json
"typography": {
  "family": {
    "display": { "value": "'BrandDisplay', system-ui, sans-serif", "confidence": "inferred-likely" },
    "body":    { "value": "'BrandSans', system-ui, sans-serif", "confidence": "inferred-likely" },
    "mono":    { "value": "'BrandMono', ui-monospace, monospace", "confidence": "inferred-likely" }
  },
  "weight": { "regular": 400, "medium": 500, "bold": 700 },
  "scale": {
    "hero": { "size": "72px", "lineHeight": "1.05", "tracking": "-0.02em", "weight": 500, "use": "section openers", "confidence": "inferred" },
    "headline": { "size": "48px", "lineHeight": "1.1", "tracking": "-0.015em", "weight": 500, "use": "section titles", "confidence": "inferred" },
    "title": { ... },
    "body": { ... },
    "small": { ... },
    "metric": { ... },
    "code": { ... },
    "eyebrow": { ... }
  }
}
```

### `space`

Required: `scale`, `rhythm`, `container`. Scale is keyed by index (0–11).

```json
"space": {
  "scale": {
    "0": "0px", "1": "4px", "2": "8px", "3": "12px", "4": "16px",
    "5": "24px", "6": "32px", "7": "48px", "8": "64px", "9": "96px",
    "10": "128px", "11": "192px"
  },
  "rhythm": {
    "section-y": "var(--space-10)",
    "subsection-y": "var(--space-8)",
    "card-pad": "var(--space-6)",
    "stack-tight": "var(--space-3)",
    "stack": "var(--space-5)",
    "stack-loose": "var(--space-7)"
  },
  "container": {
    "max": "1200px",
    "gutter": "24px"
  }
}
```

### `motion`

Required. Goes beyond just durations and easings — must include `library`, `patterns`, and `scroll` blocks where applicable.

```json
"motion": {
  "library": {
    "primary": "gsap@3.12",
    "secondary": ["lottie-web", "scroll-trigger"],
    "detection-method": "script src urls",
    "confidence": "confirmed"
  },
  "duration": {
    "instant": "80ms",
    "fast":    "160ms",
    "base":    "240ms",
    "slow":    "480ms",
    "marquee": "40s"
  },
  "easing": {
    "standard": "cubic-bezier(0.2, 0.0, 0.0, 1.0)",
    "entrance": "cubic-bezier(0.16, 1, 0.3, 1)",
    "linear":   "linear"
  },
  "patterns": {
    "fade-in-up": {
      "from": "opacity:0, translateY:8px",
      "to":   "opacity:1, translateY:0",
      "duration": "var(--motion-duration-slow)",
      "easing": "var(--motion-easing-entrance)",
      "stagger": "0.08s",
      "trigger": "page-load",
      "reduced-motion": "skip to final state",
      "confidence": "inferred-likely"
    },
    "marquee-loop": {
      "from": "translateX(0)",
      "to":   "translateX(-50%)",
      "duration": "40s",
      "easing": "linear",
      "iteration": "infinite",
      "technique": "3× content duplication",
      "reduced-motion": "pause animation",
      "confidence": "confirmed"
    }
  },
  "scroll": {
    "smooth-scroll": {
      "library": "lenis",
      "lerp": 0.1,
      "confidence": "inferred"
    },
    "trigger-defaults": {
      "start": "top 80%",
      "toggle-actions": "play none none reverse"
    }
  },
  "reduced-motion": {
    "policy": "respect-prefers-reduced-motion",
    "fallback": "instant-final-state"
  }
}
```

**Custom-implementation driving variables** also live under `motion` when applicable (these are the "tokens" of canvas / WebGL pieces):

```json
"motion.canvas.particle-field": {
  "count": 80,
  "min-radius": 1,
  "max-radius": 3,
  "color": "var(--color-ink-muted) at 15% alpha",
  "base-velocity": 0.3,
  "cursor-repel-radius": 100,
  "confidence": "inferred"
}
```

See `motion-extraction.md` for the full motion taxonomy and `custom-implementation.md` for canvas/WebGL/manual SVG documentation patterns.

### `radius`, `border`, `shadow`

All required. Even if the brand uses no shadows, include `"none": "none"` and a note explaining the choice.

### `texture` (optional, but recommended for any brand with non-trivial visual treatment)

If the brand has signature texture (halftone, grain, noise, custom pattern), document the implementation recipe so the preview can recreate it without external assets:

```json
"texture": {
  "halftone": {
    "note": "Signature visual motif",
    "implementation-hint": "radial-gradient at small intervals OR raster SVG circles on a grid",
    "dot-color": "var(--color-ink-muted)",
    "dot-size": "1.5px",
    "spacing": "6px"
  }
}
```

### `z-index`

Always include the elevation scale, even if minimal:

```json
"z-index": {
  "base": 0,
  "raised": 10,
  "sticky": 100,
  "overlay": 1000,
  "modal": 1100
}
```

## Validation

Before delivering, validate the JSON:

```bash
python3 -c "import json; json.load(open('tokens.json')); print('valid')"
```

Confirm every value with `confidence: "inferred"` is mentioned in the `README.md` audit section. The `tokens.json` confidence flags and the `README.md` audit list must agree.
