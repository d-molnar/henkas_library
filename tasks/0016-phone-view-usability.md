---
id: 0016
title: Phone view — clean render and solid usability on iPhone 14
state: done
module: routes/+layout + app.css + routes/more
created: 2026-07-25
updated: 2026-07-25
depends_on: [0004]
---

## Goal

The app is tablet-first but must be genuinely usable on a phone. Reference
device: **iPhone 14 (390 × 844 CSS px, safe-area insets top and bottom)**. On a
phone the page must not scroll sideways, the desktop top bar must be gone, and
the bottom tab bar must be navigation only.

## Problems (as reported)

1. The top bar still renders in phone view — `.topnav` has no `@media` rule
   hiding it below 640px, so the phone gets both chrome bars.
2. The page is wider than the screen. `.nav` is a non-wrapping flex row (brand +
   Series + Tags + language select + Add button); at 390px its content forces the
   shell past the viewport, so every screen scrolls sideways.
3. The bottom bar contains "Add book". It should be navigation only.

## Decisions

- **Add is a shelf concern** (user's call). The action moves out of the global
  chrome and onto the shelf screen itself — one home for it, on every viewport,
  so the top bar and the tab bar both lose their Add.
- **Language moves to a new "More" screen** reached from a fourth tab. That
  screen is also where the deferred settings-ish screens land when they ship
  (stats/sync 0006, lending 0005, backup) instead of growing the tab bar.
- The top bar is **hidden entirely** below 640px, not slimmed.

## Approach

- `@media (max-width: 640px)`: `.topnav { display: none }`, and give `.app-main`
  a `env(safe-area-inset-top)` top padding so content clears the notch.
- Tab bar: Shelf · Series · Tags · More. Remove the Add button; every tab is an
  `<a>`, so the `.tab-btn` special case goes away. Touch targets ≥ 44px.
- Shelf gets a persistent "Add book" button in its header (next to the search
  field), replacing the topnav one.
- New `/more` route: language switcher as a labelled row; a home for future
  settings rows.
- Overflow guard: `overflow-x: hidden` on the shell plus `min-width: 0` on the
  flex children that can't shrink, so a future wide child can't re-break it.
- Modals: cap `.dialog` height (`max-height` + `overflow-y: auto`) so a tall form
  is scrollable on a short viewport with the keyboard up.

## Definition of done

- [x] At 390px wide: no horizontal scroll on shelf, series, tags, book detail, more
- [x] No top bar on phone; tab bar is Shelf/Series/Tags/More only
- [x] Add book reachable from the shelf on every viewport
- [x] Language switchable on phone (via /more) and desktop (topnav)
- [x] Content clears the notch and the home indicator (safe-area insets)
- [x] Strings via `t()` (en + sk); `npm run check` clean

## Also fixed (found while testing at 390px)

- **Uneven book covers.** `repeat(3, 1fr)` is `minmax(auto, 1fr)`, so a card with
  a long unbreakable title widened its column and got a bigger cover than its
  neighbours. All shelf/series grids now use `minmax(0, 1fr)`, and `BookCard`
  gets `min-width: 0`.
- **Inconsistent element placement.** A card's rows used to shift depending on
  the book: the progress bar only existed while reading, and the meta line
  changed shape. Progress now rides on the cover as an overlay strip, the title
  is a fixed two-line clamp (full text in the tooltip), and the meta line has a
  reserved height — so every card puts every element in the same place.
- **Long titles.** Clamped rather than unbounded: two lines under the cover,
  3/4/6 lines on the cover itself by size, `overflow-wrap: anywhere` on the book
  detail heading and the series name.
- **Cover type too big at 3-up.** Cover title/author scale to 0.76/0.9 below
  560px; at tablet sizes they are unchanged. Stops mid-word breaks like
  "Sweetgra/ss".
- **Redundant grey line on phone** (user call): the meta line under a cover
  duplicates what the cover already shows, so it is hidden below 560px.
- iOS field zoom: inputs/selects go to 16px and 44px min height below 640px.
- Phone type scale for h1–h4; `.dialog` capped to the viewport and scrollable.
- `series.complete` renamed "All owned" / "Máš všetko" — next to a "Next: …"
  chip, "Complete" read as if the series had been *read*.

## Verification

- `npm run check` → 0 errors (22 pre-existing warnings); `npm run build` clean;
  vitest 28/28.
- Rendered at 390 × 844 in headless Firefox against the production build:
  shelf, series and more screens verified — no sideways scroll, no top bar, tab
  bar correct, covers uniform. Seed data was injected as the stores' initial
  value for those screenshots only (headless profile has no IndexedDB); that
  patch was reverted before committing.
- Not verified on real iOS Safari — the safe-area insets and the 16px field rule
  are correct by construction but untested on device.

## Follow-ups
