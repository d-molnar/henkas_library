---
id: 0002
title: Tag management screen (rename / merge / delete)
state: done
module: routes/tags + lib/db
created: 2026-07-22
updated: 2026-07-23
---

## Goal

A screen to manage the tag vocabulary: list all genres and labels with usage
counts, rename a tag in place, delete a tag (scrubbing it from books), and merge
two tags into one. This is the UI half of ADR 0005 — the data layer already
supports it.

## Context / where it lives

- `db.ts` already has `renameTag(id, name)` and `deleteTag(id)` (deleteTag scrubs
  references). Merge is not yet implemented — add `mergeTags(fromId, intoId)` that
  rewrites every book's `tagIds` and deletes the source.
- `tags` reactive store lists entities; count usage by scanning `books`.
- Reuse `TagPicker` styling/chips for consistency.

## Approach

- New route (e.g. `/tags`), linked from nav or a settings area.
- Two sections: Genres (`kind: 'genre'`), Labels (`kind: 'label'`).
- Per tag: name (inline-editable → `renameTag`), usage count, delete (confirm),
  merge-into picker.
- Add `mergeTags` to `db.ts` in a transaction.

## Definition of done

- [x] Rename, delete, merge all work and reflect live on the shelf/detail
- [x] Strings via `t()` (en + sk)
- [x] `npm run check` clean

## Done notes

- `mergeTags(fromId, intoId)` added to `db.ts` (transaction: swap+dedup tagIds
  on every affected book, delete source).
- New `/tags` route: Genres + Labels sections, per-tag inline rename (blur/Enter
  → `renameTag`), usage count (scans `$books`), delete (confirm → `deleteTag`),
  and a merge-into `<select>` of same-kind tags (confirm → `mergeTags`).
- Linked from the top nav and the phone tab bar (`tags` lucide icon).
- Verified: `npm run check` 0 errors (17 expected form warnings) and
  `npm run build` clean. Not yet clicked through in a browser (see AGENTS.md
  verification gap).

## Follow-ups

If tag-name *translation* is wanted, that's a separate task (see 0010) and ADR 0003/0005.
