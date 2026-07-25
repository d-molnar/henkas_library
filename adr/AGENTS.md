# ADRs — Architecture Decision Records

An **Architecture Decision Record** captures a single significant decision: the
context that forced a choice, the decision itself, and its consequences. The
format is Michael Nygard's (see https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).
ADRs are **immutable once accepted** — you don't edit the decision, you supersede
it with a new ADR that references the old one.

Write an ADR when a choice is expensive to reverse or shapes the codebase:
frameworks, storage, data-model shape, cross-cutting patterns. Do **not** write
one for routine implementation — that's a task (`tasks/`).

## File format

Filename: `NNNN-kebab-title.md` (zero-padded, monotonic).

```yaml
---
id: 0001
title: Use SvelteKit for the app
status: accepted        # proposed | accepted | superseded | deprecated
date: 2026-07-22
supersedes: null        # or an ADR id
superseded_by: null     # set when a later ADR replaces this one
---
```

Body sections:

```markdown
## Context
The forces at play: requirements, constraints, what we knew at the time.

## Decision
What we chose, stated plainly.

## Consequences
What becomes easier and harder as a result. Include the trade-offs we accepted.
```

## Index

- `0001` — Frontend framework: SvelteKit (SPA + PWA)
- `0002` — Local-first storage via IndexedDB/Dexie
- `0003` — Bundled, dependency-free i18n
- `0004` — Ownership derived from copy count (no `owned` flag) — **superseded by 0008**
- `0005` — Tags as entities; genres are a subset of tags
- `0006` — ISBN is an attribute, not identity
- `0007` — Stay on classic TypeScript (defer the Go native port)
- `0008` — Ownership as a discriminated union; reading is orthogonal (supersedes 0004)
- `0009` — Series volumes as entities (`SeriesEntry`); books link many-to-many
- `0010` — The value axis follows ownership: paid (owned) or estimated (wished), never both

Keep this index in sync when adding an ADR.
