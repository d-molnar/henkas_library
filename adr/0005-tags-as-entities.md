---
id: 0005
title: Tags as entities; genres are a subset of tags
status: accepted
date: 2026-07-22
supersedes: null
superseded_by: null
---

## Context

Genres and tags were free-form strings on each book. That can't be renamed
consistently and can't be translated — both required because the app is
multilingual. A genre is conceptually just a special kind of tag.

## Decision

Introduce a **`tags` table** of entities `{ id, name, kind: 'genre' | 'label' }`.
Books reference **`tagIds`** (stable ids), never raw strings. **Genres are tags
with `kind: 'genre'`** — a subset, not a separate concept or field. Creating a tag
is create-or-reuse by name+kind (`ensureTag`, case-insensitive). Renaming is a
single-row update (`renameTag`) that propagates to every referencing book. The
`TagPicker` component drives both genre and label selection.

## Consequences

- Rename a tag/genre once, everywhere updates — the multilingual-safe property.
- Tag-name *translation* is now possible later (id is stable; name is presentation)
  but is intentionally **not** implemented yet.
- `Book.genre`/`Book.tags` strings are gone; stats' "top genres" and shelf search
  resolve `tagIds` through the tag store.
- Deleting a tag must scrub references from books (`deleteTag` does this).
- A tag-management UI (rename/merge/delete) is still needed — see `tasks/`.
