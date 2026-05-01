# Atom Checklist

The smallest reusable units. During Phase 3, walk this list and document every atom that exists on the source. Mark missing ones explicitly so the gap is visible.

## Canonical atom set

For each atom, check the source. If present: document with full anatomy. If absent: note `not-present-on-source`.

### Form / interaction
- [ ] **button-primary** — the dominant CTA style
- [ ] **button-secondary / ghost** — the lesser CTA
- [ ] **button-tertiary / text-only** — for inline or low-emphasis actions
- [ ] **link-inline** — body-prose link styling
- [ ] **link-standalone** — the "Read more →" affordance
- [ ] **input-text** — text input field
- [ ] **input-search** — search field, often with icon
- [ ] **textarea** — multi-line input
- [ ] **select / dropdown** — picker affordance
- [ ] **checkbox** — boolean control
- [ ] **radio** — single-choice control
- [ ] **toggle / switch** — alternate boolean
- [ ] **slider** — range control

### Typography units
- [ ] **eyebrow-label** — small uppercase label above headlines
- [ ] **caption** — small text under images / metadata
- [ ] **inline-code** — code mention in prose
- [ ] **kbd** — keyboard key indicator
- [ ] **abbr / dfn** — abbreviation or definition styling

### Visual indicators
- [ ] **badge / tag / pill** — labeled chip
- [ ] **status-dot** — small colored circle (online, beta, new)
- [ ] **count-bubble** — number indicator (notifications)
- [ ] **avatar** — user/entity image, often circular
- [ ] **icon-outline** — outline-style SVG icon
- [ ] **icon-filled** — filled-style SVG icon (if both styles are used)
- [ ] **logo-mark** — the brand logo, with sizing rules

### Structural
- [ ] **divider / hairline** — section separator
- [ ] **vertical-rule** — column separator
- [ ] **bullet** — custom list bullet (if not default)
- [ ] **step-number** — numeric indicator for ordered sequences
- [ ] **progress-bar** — loading/progress indicator
- [ ] **skeleton** — loading placeholder

### Brand-specific
These don't appear in every brand but should be checked:

- [ ] **metric-numeral** — oversized number treatment for stats
- [ ] **decorative-rule** — non-hairline rule (gradient, dotted, dashed, halftone)
- [ ] **texture-overlay** — repeatable pattern (grain, halftone, noise, dots)
- [ ] **gradient-fill** — if the brand uses gradients as fills
- [ ] **shape-token** — recurring decorative shape (a circle, blob, slash)
- [ ] **annotation-arrow** — hand-drawn or stylized arrow
- [ ] **highlight-mark** — text highlight effect (marker, underline, box)

## How to document each atom

For every present atom, capture:

1. **Visual** — render it live in the preview
2. **Anatomy** — its constituent properties (size, padding, border, color)
3. **Token references** — which tokens it uses
4. **States** — default + interactive states if applicable
5. **Variants** — other versions of this atom
6. **Confidence** — same flag system as tokens

## Template

```markdown
### Atom: button-primary

**Visual:** [rendered example in preview.html]

**Anatomy:**
- display: inline-flex
- padding: space-3 × space-5
- border-radius: radius.md
- font: body 16/1 weight 500
- background: ink.primary
- color: ink.inverse
- gap (when icon present): space-2

**States:**
- default: as above
- hover: background lightens to #1a1a1a (inferred)
- focus: not-observed
- active: not-observed
- disabled: not-observed

**Variants:**
- with-icon-leading: prepended icon-outline at 16×16
- with-icon-trailing: appended arrow icon for "next" affordances
- with-counter: trailing count-bubble (e.g., "Inbox · 3")

**Confidence:** confirmed (default), inferred (states)
```

## What to do when an atom is "almost there"

Sometimes a brand has, say, three buttons that are nearly identical but not quite — slightly different paddings, slightly different radii. **Don't merge them.** Document each as a variant, then in Phase 7 flag the discrepancy as something the brand team may want to standardize. Your job is to document, not normalize.
