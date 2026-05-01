# Contributing

## What lives here

This repo ships the `extract-design` Claude Code plugin — a skill that reverse-engineers a brand's visual language from a URL, screenshot, or Figma file and outputs `tokens.json`, `preview.html`, and `README.md`.

Contributions can target:

- **The skill logic** (`skills/SKILL.md`, `skills/references/`)
- **The output templates** (`skills/templates/`)
- **The validation script** (`scripts/validate.sh`)
- **Example extractions** (`examples/<slug>/`)

## Before you start

1. Fork the repo and create a branch from `main`.
2. Run the validation suite locally and make sure it passes before opening a PR:
   ```bash
   bash scripts/validate.sh
   ```

## Editing the skill

`skills/SKILL.md` is the entry point. It is read-order dependent — changes to the reading order at the bottom of the file affect which references Claude loads. The non-negotiable phases are component anatomy, motion extraction, and custom implementation — do not weaken or remove them.

When editing a `references/` file, re-run an extraction end-to-end against a known brand to confirm the change doesn't break the output contract.

## Adding an example

Examples go in `examples/<slug>/` and must include all three deliverable files:

```
examples/<slug>/
  tokens.json
  preview.html
  README.md
```

Use the templates in `skills/templates/` as starting points.

## Editing templates

Templates are scaffolds — they define the expected structure, not the content. Changes to `tokens.template.json` must stay in sync with `skills/references/token-schema.md`. Changes to `preview.template.html` must keep all CSS variable bindings intact.

## Validation rules

The CI script checks three things:

1. **JSON syntax** — every `.json` file must parse cleanly.
2. **SKILL.md frontmatter** — every `SKILL.md` must have `name`, `description`, and `license` fields in its YAML frontmatter.
3. **HTML well-formedness** — every `.html` file must contain the required structural elements.

PRs that fail validation will not be merged.

## Commit style

Use the imperative mood and keep the subject line under 72 characters. Reference the phase or file you changed when it isn't obvious from the diff:

```
fix(component-anatomy): clarify sub-element naming requirements
add(examples): extract Stripe design system
refactor(validate.sh): support nested plugin directory layout
```

## License

By contributing you agree that your changes will be released under the same license as this repository.
