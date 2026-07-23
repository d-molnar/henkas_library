---
id: 0008
title: Online title/author search when adding
state: todo
module: components/AddBookModal + lib/openlibrary
created: 2026-07-22
updated: 2026-07-22
---

## Goal

Screen 1c "Search" tab: type a title/author, see Open Library results with
covers, pick one to pre-fill the manual form (and flag "already on your shelf").

## Context / where it lives

- `openlibrary.ts` `searchBooks(query)` already exists and returns hits with
  cover URLs — it's just not wired into any UI.
- `AddBookModal` currently opens straight into the manual `BookForm`; add a
  Search/Manual (and later Scan) tab set.
- `findByIsbn` gives the "already on your shelf" check for a hit with an ISBN.

## Approach

- Add a segmented Search / Manual tab header in `AddBookModal`.
- Debounced search input → `searchBooks` → result rows (cover, title, author,
  year, publisher). Selecting a row pre-fills `BookForm` (reuse the lookup prefill
  logic; consider extracting a shared `applyLookup(result)` helper).
- Show "already on your shelf — adds a copy" when the ISBN matches.

## Definition of done

- [ ] Search returns and renders results; selection pre-fills the form
- [ ] Offline: fails gracefully to manual entry
- [ ] Strings via `t()` (en + sk); `npm run check` clean
