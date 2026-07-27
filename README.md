# Henka's Lib

A local-first, offline-capable PWA for keeping track of a personal book library.
Tablet-first, multilingual, and entirely on-device — there is no backend, no
account, and nothing leaves your browser.

> **Heads up:** this is mostly a vibecoded project, built for fun. It scratches a
> personal itch (cataloguing a real bookshelf) and doubles as a playground for
> Svelte 5 runes and local-first storage. It's developed largely by prompting AI
> agents, the design is ported from mockups, and it is **pre-release** — the
> schema still changes without migrations and all data is seeded. Treat it as a
> hobby project, not a product. That said, the domain modeling is deliberate and
> the decisions behind it are written down in [`adr/`](adr/).

## What it does

- **Shelf** — browse everything you own or want, with cover art (gradient
  placeholders or images).
- **Add & edit books** — manual entry, optionally pre-filled by ISBN lookup via
  [Open Library](https://openlibrary.org/).
- **Reading progress** — status, current page, start/finish dates, star rating.
  Tracked independently of whether you own the book.
- **Ownership & wishlist** — copy counts for what's on the shelf, wanted flags
  for what isn't, and a money field that follows the distinction (paid vs.
  estimated).
- **Series** — volumes are first-class, so a series can list a volume you don't
  own yet. Collection progress is derived per volume.
- **Tags** — rename-safe tag entities, with genres as a subset. Rename in one
  place and every book follows.
- **Lending** — track which books are out on loan and to whom.
- **Backup** — export/import the whole library as a file.
- **Offline & installable** — a real PWA; every feature works with no network.
- **English & Slovak** — bundled i18n, missing keys fall back to English.

## Quick start

Requires Node and npm.

```sh
npm install
npm run dev          # dev server
npm run dev -- --open
```

The app seeds a starter library on first run, so there's something to look at
immediately.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build (static SPA) |
| `npm run preview` | Preview the production build |
| `npm run check` | `svelte-check` type/template check |
| `npm test` | Run the Vitest unit tests |

`npm run check` is expected to sit at **0 errors**. A handful of "captures the
initial value" warnings in the forms are intentional (one-time seeds).

## Stack

- **[SvelteKit](https://svelte.dev/docs/kit)** (Svelte 5, runes mode) +
  **Vite** + **TypeScript**
- **`adapter-static`** with an SPA fallback — `ssr = false`, `prerender = false`.
  It's a pure client-side app.
- **[`@vite-pwa/sveltekit`](https://vite-pwa-org.netlify.app/)** — installable
  and offline via Workbox
- **[Dexie](https://dexie.org/)** over IndexedDB for storage
- **[lucide-svelte](https://lucide.dev/)** for icons
- No CSS framework — the "Organic" design system is hand-ported CSS with tokens
  and component classes in `src/app.css`

## Project layout

```
src/
  app.css                Design system (tokens + component classes)
  lib/
    types.ts             Book union, Tag, Series, SeriesEntry, Loan + type guards
    ownership.ts         Pure ownership transitions (unit-tested)
    db.ts                Dexie schema/instance, seeding, live() store helper
    books.ts             books store + all book mutations
    series.ts            series/entries stores, progress derivation, detection
    tags.ts              tag entities + rename/merge/delete
    lending.ts           loans + lend/return
    backup.ts            export/import
    openlibrary.ts       ISBN lookup & search
    i18n/                Reactive t(), en + sk locales
    components/          BookCard, BookForm, Modal, TagPicker, …
  routes/
    +page.svelte         Shelf
    book/[id]/           Book detail + inline edit
    series/              Series & collection progress
    tags/                Tag management
    more/                Settings, language switcher
```

## Data model, briefly

The interesting part of the project, and the part that isn't vibes. Full
reasoning lives in the ADRs.

- **Identity is a UUID.** ISBN is an optional, normalized (ISBN-13), indexed
  *attribute* used for lookup and dedup — never identity.
  ([ADR 0006](adr/0006-isbn-as-attribute-not-identity.md))
- **Ownership is a discriminated union.** `Book = OwnedBook | WishedBook`.
  Owned books have `copies ≥ 1`; wished books have `wanted`. "Owned and wanted"
  and "owned with zero copies" are unrepresentable by construction.
  ([ADR 0008](adr/0008-ownership-union-reading-orthogonal.md))
- **Reading is orthogonal to ownership.** Status, progress, and rating apply
  whether or not you own a copy — so a library book you finished is
  `owned: false, wanted: false, status: 'completed'`. Wishlist is a state, not a
  reading status.
- **Value follows ownership.** Owned books have `pricePaid` (a fact), wished
  books have `estValue` (an estimate), and neither has the other.
  ([ADR 0010](adr/0010-value-follows-ownership.md))
- **Tags are entities**, not strings on a book. Books reference `tagIds`.
  ([ADR 0005](adr/0005-tags-as-entities.md))
- **Series volumes are entities.** A volume exists whether or not it's owned, and
  books link to volumes many-to-many — so an omnibus is one book spanning several
  volumes, and multiple editions can share one.
  ([ADR 0009](adr/0009-series-volumes-as-entities.md))

## Architecture decisions

Every non-obvious choice is recorded as an ADR in [`adr/`](adr/) — framework
choice, local-first storage, bundled i18n, and the data-model decisions above.
See [`adr/AGENTS.md`](adr/AGENTS.md) for the format.

[`AGENTS.md`](AGENTS.md) is the entry point for AI agents (and humans) picking up
the project: stack, conventions, and the pre-release rules that apply while the
schema is still moving.

## Status

Pre-release and moving. There are no real users and all data is seeded, so
**schema changes don't ship migrations** — the Dexie version gets bumped and the
seed repopulates. Real migrations become a concern after release.

## License

[MIT](LICENSE) © David Molnar
