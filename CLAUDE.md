# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A Claude Code **skill/plugin marketplace** for brand design-system extraction. It ships one plugin (`brand-extraction`) that teaches Claude how to reverse-engineer a brand's visual language from a URL, screenshot, or Figma file and produce a three-file deliverable: `tokens.json`, `preview.html`, `README.md`.

## Validation

```bash
bash scripts/validate.sh        # JSON syntax + SKILL.md frontmatter + HTML well-formedness
```

CI runs the same script on every push/PR via `.github/workflows/validate.yml`.

## Repository structure

The target layout (defined in `project-tree.md`) is:

```
.claude-plugin/marketplace.json          ← top-level plugin catalog
plugins/<plugin-name>/
  .claude-plugin/plugin.json             ← plugin manifest
  skills/<skill-name>/
    SKILL.md                             ← frontmatter-tagged entry point
    references/                          ← reference docs read during skill execution
    templates/                           ← output scaffolds (tokens.template.json, preview.template.html)
    examples/<slug>/                     ← fully-worked reference implementations
scripts/validate.sh
.github/workflows/validate.yml
README.md / CONTRIBUTING.md / LICENSE
```

**Current state:** content files (`SKILL.md`, `workflow.md`, `*.md` references, `*.template.*`) are flat at the root and need to move into `plugins/brand-extraction/skills/brand-extraction/`. Several files (`marketplace.json`, `validate.sh`, `validate.yml`, `CONTRIBUTING.md`, `LICENSE`) are currently empty stubs.

## Key files

| File                                  | Purpose                                                                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SKILL.md`                            | Main skill entry point — Claude reads this first. Contains frontmatter (`name`, `description`) and the 7-phase workflow summary with `references/` pointers. |
| `references/workflow.md`              | Full 7-phase playbook (Reconnaissance → Token extraction → Atom ID → Component anatomy → Motion → Brand synthesis → Self-audit)                              |
| `references/component-anatomy.md`     | Non-negotiable spec for exhaustive component decomposition                                                                                                   |
| `references/motion-extraction.md`     | Non-negotiable spec for motion library detection and documentation                                                                                           |
| `references/custom-implementation.md` | Spec for canvas/WebGL/SVG custom rendering documentation                                                                                                     |
| `references/atom-checklist.md`        | Canonical atom set to identify in Phase 3                                                                                                                    |
| `references/preview-principles.md`    | Rules for the self-contained `preview.html` output                                                                                                           |
| `references/token-schema.md`          | Exact JSON schema with `confirmed`/`inferred-likely`/`inferred` confidence flags                                                                             |
| `templates/tokens.template.json`      | Scaffold for the `tokens.json` deliverable                                                                                                                   |
| `templates/preview.template.html`     | Scaffold for the `preview.html` deliverable — token CSS vars pre-wired                                                                                       |
| `templates/README.template.md`        | Scaffold for the `README.md` deliverable                                                                                                                     |

## Skill architecture

`SKILL.md` uses YAML frontmatter:

```yaml
---
name: extract-design
description: <one-line trigger description for the skill router>
license: Internal
---
```

The skill is **read-order dependent**: Claude reads `SKILL.md` first, then each `references/` file in the order listed at the bottom of `SKILL.md`. The references are loaded into context during execution — they are not optional.

## Output contract

Every extraction run produces exactly three files in `{output-dir}/`:

- `tokens.json` — machine-readable tokens, every value has a `confidence` flag
- `preview.html` — self-contained, no build step, styled in the _source_ brand's aesthetic
- `README.md` — brand identity write-up + methodology + self-audit gaps

Templates in `templates/` are the required starting scaffolds.

## Confidence flags

Every token in `tokens.json` must carry one of:

- `confirmed` — read directly from CSS/source
- `inferred-likely` — strong visual evidence
- `inferred` — visual approximation, low certainty

Omitting confidence flags on any token is a deliverable failure.
