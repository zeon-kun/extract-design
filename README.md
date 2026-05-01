# extract-design

A Claude Code plugin that reverse-engineers a brand's visual language from a public URL, screenshot, or Figma file and produces a three-file design system deliverable.

## Output

Every extraction produces exactly three files:

```
{output-dir}/
├── tokens.json     ← machine-readable design tokens (color, type, space, motion, …)
├── preview.html    ← self-contained one-pager styled in the source brand's aesthetic
└── README.md       ← brand identity write-up, methodology notes, and self-audit gaps
```

All token values carry a confidence flag — `confirmed`, `inferred-likely`, or `inferred` — so you always know what was read directly from source versus visually approximated.

## Installation

**1. Add this repo as a marketplace source:**

```
/plugin marketplace add zeon-kun/extract-design
```

**2. Install the plugin:**

```
/plugin install extract-design@extract-design
```

**3. Reload plugins in your current session:**

```
/reload-plugins
```

To scope the install to a single project instead of your user profile, append `--scope project` to the install command.

## Usage

Once installed, trigger the skill by describing what you want to extract:

```
Extract the design system from https://example.com
Document the brand of this screenshot: [attach image]
Reverse-engineer the visual language of stripe.com
Build a style guide from this Figma file: [paste URL]
Capture the design tokens from [URL] and save to ./brand/
```

The skill runs a seven-phase workflow — Reconnaissance → Token extraction → Atom identification → Component anatomy → Motion & custom implementation → Brand synthesis → Self-audit — and writes the three output files to the directory you specify (defaults to `./`).

## What gets extracted

| Layer | Details |
|---|---|
| **Color** | Background, ink, accent, and rule palettes with hex values |
| **Typography** | Font families, weight scale, and a full type scale (hero → eyebrow) with size, line-height, tracking, and use-case |
| **Space** | 12-step scale, rhythm aliases, and container max/gutter |
| **Radius, border, shadow** | Named tiers with the brand's elevation philosophy |
| **Motion** | Library detection (GSAP, Framer Motion, Lottie, etc.), duration/easing tokens, named patterns, scroll behavior, and reduced-motion policy |
| **Custom implementations** | Canvas, WebGL, and hand-animated SVG documented with driving variables and reconstruction strategy |
| **Brand identity** | Voice, principles, photography treatment, and motion character |

## Non-negotiables

- Component anatomy is exhaustive — every sub-element is named with its tokens and relationships.
- Motion is a first-class layer — library detection is always attempted, not optional.
- Every token carries a confidence flag. Silent guessing is a deliverable failure.
- The `preview.html` is styled in the *source* brand's aesthetic, not a generic spec sheet.
- All three output files are always produced, even if you only ask for one.

## Requirements

- Claude Code with plugin support
- Python 3 (for the validation script)

## Validate

```bash
bash scripts/validate.sh
```

Checks JSON syntax, SKILL.md frontmatter, and HTML well-formedness across the repo.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) — Muhammad Rafif Tri Risqullah
