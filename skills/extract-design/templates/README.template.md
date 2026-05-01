# {{BRAND}} — Design System Extraction

**Source:** {{SOURCE_URL}}
**Extracted:** {{DATE}}
**Method:** {{METHOD_SUMMARY}}

> ⚠️ **Confidence note.** {{CONFIDENCE_PARAGRAPH}}

---

## 1. Brand identity

### Positioning
{{POSITIONING_PARAGRAPH}}

### Voice principles
- {{VOICE_1}}
- {{VOICE_2}}
- {{VOICE_3}}
- {{VOICE_4}}
- {{VOICE_5}}

### Visual character
- {{VISUAL_1}}
- {{VISUAL_2}}
- {{VISUAL_3}}
- {{VISUAL_4}}
- {{VISUAL_5}}

### Design principles (synthesized)
1. {{PRINCIPLE_1}}
2. {{PRINCIPLE_2}}
3. {{PRINCIPLE_3}}
4. {{PRINCIPLE_4}}
5. {{PRINCIPLE_5}}

### Photography & illustration
{{PHOTOGRAPHY_TREATMENT}}

### Logo / mark treatment
{{LOGO_RULES}}

---

## 2. Asset taxonomy

| Category | Examples | Notes |
|---|---|---|
| Brand mark | {{ASSETS}} | {{NOTES}} |
| Hero illustrations | {{ASSETS}} | {{NOTES}} |
| Icons | {{ASSETS}} | {{NOTES}} |
| Photography | {{ASSETS}} | {{NOTES}} |
| Partner logos | {{ASSETS}} | {{NOTES}} |
| UI chrome | {{ASSETS}} | {{NOTES}} |

---

## 3. Tokens

See **`tokens.json`** for the machine-readable version. Summary:

- **Color**: {{COLOR_SUMMARY}}
- **Type**: {{TYPE_SUMMARY}}
- **Space**: {{SPACE_SUMMARY}}
- **Radius**: {{RADIUS_SUMMARY}}
- **Shadow**: {{SHADOW_SUMMARY}}
- **Motion**: {{MOTION_SUMMARY}}
- **Texture**: {{TEXTURE_SUMMARY}}

---

## 4. Atoms

The smallest reusable units, each composed only from tokens.

| Atom | Anatomy | Confidence |
|---|---|---|
| {{ATOM_NAME}} | {{ANATOMY}} | {{CONFIDENCE}} |

(Full anatomy for each atom rendered live in `preview.html`.)

---

## 5. Component anatomy

Every component is documented exhaustively per the skill's non-negotiable rule.
For each component below, sub-elements, tokens, layout, states, responsive behavior,
variants, composition rules, and custom interactivity are all specified.

### {{COMPONENT_NAME}}

**Used for:** {{USE_CASE}}

#### Sub-elements
- `{{SUBELEMENT_1}}` — {{DESCRIPTION}}
- `{{SUBELEMENT_2}}` — {{DESCRIPTION}}
- `{{SUBELEMENT_3}}` — {{DESCRIPTION}}

#### Tokens

| Sub-element | Property | Token |
|---|---|---|
| {{SUBELEMENT}} | {{PROPERTY}} | {{TOKEN}} |

#### Layout grammar
{{LAYOUT_DESCRIPTION}}

#### States
- default: {{DEFAULT_STATE}}
- hover: {{HOVER_STATE_OR_NOT_OBSERVED}}
- focus: {{FOCUS_STATE_OR_NOT_OBSERVED}}
- active: {{ACTIVE_STATE_OR_NOT_OBSERVED}}
- disabled: {{DISABLED_STATE_OR_NOT_OBSERVED}}

#### Responsive
- >=900px: {{LARGE_BEHAVIOR}}
- 600–900px: {{MEDIUM_BEHAVIOR}}
- <600px: {{SMALL_BEHAVIOR}}

#### Variants
- **default**: {{DESCRIPTION}}
- **{{VARIANT_NAME}}**: {{DESCRIPTION}}

#### Composition
- composes atoms: [{{ATOM_LIST}}]
- nests inside: {{PARENT_COMPONENTS}}
- contains: {{CONSTRAINT_LIST}}

#### Custom interactivity
{{CUSTOM_INTERACTIVITY_OR_NONE_OBSERVED}}

#### Motion spec
- name: {{MOTION_NAME}}
  technique: {{TECHNIQUE_FROM_TAXONOMY}}
  trigger: {{TRIGGER}}
  library: {{LIBRARY_OR_NONE_OR_UNKNOWN}}
  properties: {{PROPERTIES_ANIMATED}}
  from-to: {{FROM_TO}}
  duration: {{DURATION_TOKEN}}
  easing: {{EASING_TOKEN}}
  stagger: {{STAGGER_OR_NONE}}
  reduced-motion: {{FALLBACK}}
  confidence: {{CONFIDENCE}}

#### Rendering spec
{{RENDERING_SPEC_OR_OMIT_IF_PLAIN_DOM}}

#### Accessibility
{{A11Y_NOTES}}

#### Confidence
{{CONFIDENCE_NOTES}}

---

(Repeat the above block for every component. No exceptions.)

---

## 5b. Motion + custom implementations

> Per the skill's non-negotiable rule, motion is documented as a first-class layer. Every motion observed and every custom-rendered piece (canvas, WebGL, manual SVG) is documented below.

### Motion patterns observed

| Name | Technique | Trigger | Library | Confidence |
|---|---|---|---|---|
| {{MOTION_NAME}} | {{TECHNIQUE}} | {{TRIGGER}} | {{LIBRARY}} | {{CONFIDENCE}} |

### Custom implementations

#### {{IMPL_NAME}}

**Medium:** {{canvas-2d / webgl / three.js / svg-manual / shader / lottie}}
**Library:** {{LIBRARY_OR_HAND_ROLLED}}
**Purpose:** {{PURPOSE}}

##### Visual
{{VISUAL_SPECIFICATION}}

##### Behavior
{{BEHAVIOR_SPECIFICATION}}

##### Driving variables
| Variable | Value |
|---|---|
| {{VAR_NAME}} | {{VAR_VALUE}} |

##### Render-loop summary
```
{{LOOP_PSEUDOCODE}}
```

##### Performance
{{PERFORMANCE_NOTES}}

##### Reconstruction strategy
{{RECONSTRUCTION_APPROACH}}

##### Confidence
{{CONFIDENCE_BREAKDOWN}}

(Repeat per custom implementation. Omit this whole section if none observed.)

---

## 6. One-pager preview

See **`preview.html`** — single self-contained file. Open in any browser, no build step.

The preview:
- Implements all tokens as CSS custom properties
- Renders every atom and component live
- Is itself styled in the source brand's aesthetic (not a generic spec sheet)

---

## 7. Methodology & gaps

### What was confirmed
{{CONFIRMED_LIST}}

### What was inferred
{{INFERRED_LIST}}

### Manual verification checklist
- [ ] {{VERIFY_ITEM_1}}
- [ ] {{VERIFY_ITEM_2}}
- [ ] {{VERIFY_ITEM_3}}

Once verified, patch `tokens.json` (update `confidence` flags) and re-render the preview.

---

## 8. How to use this output

If feeding into a downstream Claude skill or build pipeline:

```
brand-{{slug}}/
├── SKILL.md      ← write from §1 (brand identity) + §3-5 (tokens/atoms/components)
├── tokens.json
├── preview.html
└── examples/
```
