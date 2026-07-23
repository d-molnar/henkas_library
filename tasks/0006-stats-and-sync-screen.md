---
id: 0006
title: Stats & sync screen
state: todo
module: routes/stats + lib/stats
created: 2026-07-22
updated: 2026-07-22
---

## Goal

Screen 1f: reading stats (books/pages this year, streak, per-month bar chart),
collection value, top genres, and the sync/backup panel.

## Context / where it lives

- `stats.ts` `deriveStats(books, loans, tags, now)` already computes everything
  except it's not rendered anywhere. It takes `tags` to resolve genre-tags.
- Backup: `db.ts` `exportBackup()` / `importBackup()` exist; no UI yet
  (this task can cover the UI, or split it to 0007).
- Mockup 1f: stat tiles, per-month bars, collection-value card, top-genres bars,
  "This device only" sync card with export/import.

## Approach

- New `/stats` route; feed the `books`/`loans`/`tags` stores into `deriveStats`.
- Bars are simple flex/height divs (see mockup) — no chart lib. If a chart lib is
  ever considered, load the `dataviz` skill first.
- Wire export (download JSON) and import (file input → `importBackup`).

## Definition of done

- [ ] Stats reflect real data; bars/tiles correct
- [ ] Export downloads a JSON; import restores it
- [ ] Strings via `t()` (en + sk); `npm run check` clean

## Follow-ups

If export/import grows (encryption, real sync server) split it into its own task.
