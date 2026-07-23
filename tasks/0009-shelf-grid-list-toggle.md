---
id: 0009
title: Shelf grid/list view toggle + sort
state: todo
module: routes (shelf)
created: 2026-07-22
updated: 2026-07-22
---

## Goal

Screen 1a has a Grid/List segmented control and a "Sort: …" control that aren't
built yet. Add a list view (denser rows: cover thumb, title, author, progress,
status) and a sort option (recently added, title, author, rating).

## Context / where it lives

- Shelf is `+page.svelte`; it currently renders only the grid via `BookCard`.
- Reuse `.seg` for the toggle; persist the choice (localStorage) like the locale.

## Approach

- Add a `view: 'grid' | 'list'` and `sort` state; persist.
- List rows can reuse `BookCover` at `size="sm"` plus a text column.
- Apply sort within each section before rendering.

## Definition of done

- [ ] Toggle switches views; sort reorders; both persist across reloads
- [ ] Strings via `t()` (en + sk); `npm run check` clean
