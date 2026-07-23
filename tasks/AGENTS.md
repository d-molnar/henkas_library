# Tasks — how work is tracked

This directory is the project's work queue and orchestration log. Each task is a
single Markdown file with YAML frontmatter plus a free-form body. Tasks are the
unit of hand-off between sessions: a fresh agent should be able to read one task
and pick it up without the prior conversation.

## Why tasks exist

- **Clean context separation between sessions.** Nothing important lives only in
  a chat transcript — it lives here.
- **Orchestration.** While working a task you are *encouraged* to create new task
  files for work you discover but shouldn't do inline (scope creep, follow-ups,
  bugs found in passing). Link them from the current task's `## Follow-ups`.

## File format

Filename: `NNNN-short-slug.md` (zero-padded sequence, e.g. `0007-stats-screen.md`).
Keep the number monotonic; the next number is one past the highest existing.

Frontmatter (all fields required unless noted):

```yaml
---
id: 0007                     # matches the filename number
title: Stats & sync screen
state: todo                  # see states below
module: routes/stats         # the part of the system this touches
created: 2026-07-22
updated: 2026-07-22
depends_on: [0006]           # optional: task ids that must land first
---
```

### States

| state         | meaning |
|---------------|---------|
| `proposed`    | idea captured, not yet agreed to build |
| `todo`        | agreed, ready to start |
| `in-progress` | actively being worked (only a few at a time) |
| `blocked`     | waiting on a dependency or a decision (say what, in the body) |
| `done`        | shipped, `npm run check` clean, verified |
| `cancelled`   | deliberately not doing it (say why) |

### Body structure

```markdown
## Goal
One paragraph: what "done" looks like for the user.

## Context / where it lives
Files, existing helpers to reuse (e.g. deriveStats already exists in stats.ts).

## Approach
Bullet steps. Reference the mockup screen (1a–1h) when relevant.

## Definition of done
Checklist. Always includes: strings via t() (en + sk), npm run check clean.

## Follow-ups
Links to any task files spawned while doing this one.
```

## Working rules

1. **On start:** set `state: in-progress`, bump `updated`.
2. **On finish:** set `state: done`, bump `updated`, confirm `npm run check` is
   clean and note what you verified.
3. **New work discovered mid-task:** create a new task file (state `proposed` or
   `todo`), don't silently expand the current one. Cross-link both.
4. **Architectural choices** don't go here — they go in `adr/` (see `adr/AGENTS.md`).
   A task may *reference* an ADR it implements.
5. Keep `module` accurate — it's how a fresh agent finds the right task for the
   area they're touching.
