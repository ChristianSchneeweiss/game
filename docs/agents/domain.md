# Domain Docs

This repo uses a single-context layout shared by the client, server, and game packages.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root: the shared domain model and glossary.
- **`docs/adr/`** at the repo root: read ADRs that touch the area you are about to work in.

If these files do not exist, proceed silently. Do not flag their absence or suggest creating them upfront. The `/domain-modeling` skill creates them lazily when terms or decisions are resolved.

## File structure

```text
/
├── CONTEXT.md
├── docs/
│   └── adr/
│       └── 0001-<decision>.md
└── apps/
    ├── client/
    ├── server/
    └── game/
```

## Use the glossary's vocabulary

When your output names a domain concept in an issue title, refactor proposal, hypothesis, or test name, use the term defined in `CONTEXT.md`. Avoid synonyms the glossary explicitly rejects.

If the concept you need is missing, reconsider whether the project uses that language. Note real terminology gaps for `/domain-modeling`.

## Flag ADR conflicts

If your output contradicts an existing ADR, identify the ADR and explain why the decision should be reopened.
