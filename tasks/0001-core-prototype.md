---
id: 0001
title: Core prototype — shelf, detail, add/edit, progress, tags, i18n
state: done
module: routes + lib + components
created: 2026-07-22
updated: 2026-07-22
---

## Goal

A runnable prototype covering the user's priority slice: book list, add/edit
(manual, with ISBN lookup pre-filling the manual form), reading progress, and
tags. Multilingual and offline.

## What shipped

- Shelf (`+page.svelte`, screen 1a): status sections + wishlist section, search
  (title/author/ISBN/tag), status + wishlist filters.
- Book detail + inline edit (`book/[id]`, screen 1b): status, rating, progress,
  tags/genres, notes, inventory, edit-details modal, delete.
- Add/edit form (`BookForm` + `AddBookModal`, screen 1c-ish): manual entry is the
  backbone; ISBN "Look up" pre-fills via Open Library; duplicate-ISBN offers
  add-copy vs add-separate.
- Update-progress modal (screen 1h): stepper, quick +N, mark finished, session note.
- i18n: bundled `t()`, English + Slovak, language switcher.
- Data model refactors: ownership-by-copies (ADR 0004), tags-as-entities (ADR 0005).

## Definition of done

- [x] `npm run check` clean (0 errors)
- [x] `npm run build` succeeds (PWA SW generated)
- [x] Strings via `t()` in en + sk

## Follow-ups

Spawned: 0002 (tag management), 0003 (PWA icons), 0004–0009 (deferred screens &
features). Not verified in a real browser from the build session — first human
click-through still pending.
