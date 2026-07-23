# Henka's Lib — agent guide

A **local-first, offline-capable PWA** for a personal book library. Tablet-first,
multilingual, all data on-device. Derived from the "Organic" design system and
the "Book Library Mockups" in claude.ai/design (project id
`bd618ff8-f8d4-4e7d-9e11-255ceb0d6171`, read via the DesignSync tool).

This file is the entry point for any agent picking up the project. Read it, then
`tasks/AGENTS.md` (how work is tracked) and `adr/AGENTS.md` (why things are the
way they are).

## Product direction

A warm, unfussy catalog of the books you own or want. Core loops: browse the
shelf, add/edit books (manual entry, optionally pre-filled by ISBN lookup),
track reading progress, tag & organize. It is **not** a social/reading-network
app and has **no backend** — sync is an optional future export/import, never a
requirement. Every feature must work offline.

## Stack

- **SvelteKit** (Svelte 5, **runes mode**) + **Vite 8** + **TypeScript 6** (classic).
- **adapter-static** with SPA `fallback: index.html`; `ssr = false`,
  `prerender = false` (see `src/routes/+layout.ts`). It's a pure client app.
- **@vite-pwa/sveltekit** — installable, offline (Workbox). Config in `vite.config.ts`.
- **Dexie** (IndexedDB) for storage. **lucide-svelte** for icons.
- No CSS framework: the design system is hand-ported CSS (see below).

Commands: `npm run dev` · `npm run build` · `npm run check` (svelte-check).
Keep `npm run check` at **0 errors** before ending a task. The ~17 "captures the
initial value" warnings in forms are expected (one-time seeds).

## Layout

```
src/
  app.css                     Organic design system (tokens + component classes) + app helpers
  lib/
    types.ts                  Book, Tag, Series, Loan, Status; isOwned/isWishlist helpers
    db.ts                     Dexie schema, seeding, reactive liveQuery stores, ALL mutations
    seed.ts                   starter library + seed tags/series/loans
    covers.ts                 gradient book-cover palettes (coverFor)
    isbn.ts                   ISBN validate/normalize to ISBN-13
    openlibrary.ts            lookupIsbn / searchBooks (Open Library)
    stats.ts                  deriveStats (used by the deferred stats screen)
    ui.svelte.ts              global modal state ($state runes): openAdd/openProgress/…
    i18n/
      index.svelte.ts         reactive t(), setLocale, LOCALES, formatDate
      locales/en.ts           source of truth for MessageKey (every key lives here)
      locales/sk.ts           Slovak (Partial; missing keys fall back to en)
    components/               BookCover, BookCard, ProgressBar, StarRating, Modal,
                              TagPicker, BookForm, AddBookModal, UpdateProgressModal, ModalHost
  routes/
    +layout.svelte            shell: nav, language switcher, modal host, phone tab bar
    +page.svelte              shelf (screen 1a)
    book/[id]/+page.svelte    book detail + inline edit (screen 1b)
```

## Data model (important — see ADRs 0004–0006)

- **Identity is a UUID** (`Book.id`). ISBN is an optional, normalized (ISBN-13),
  indexed *attribute* used for lookup/dedup — never identity.
- **Ownership is derived from `copies`**: `copies > 0` = owned; `copies === 0` =
  wishlist. There is no `owned` flag and no toggle. Helpers: `isOwned`, `isWishlist`.
- **Reading status** is `reading | to-read | completed | wont-read` (wishlist is
  NOT a status — it's the zero-copies state).
- **Tags are entities** (`tags` table): `{ id, name, kind: 'genre' | 'label' }`.
  Books reference **`tagIds`**. Genres are simply tags with `kind: 'genre'`.
  Rename a tag in one place (`renameTag`) and every book follows. This is what
  makes tags rename-safe and i18n-ready.

## Conventions

- **All user-facing strings go through `t()`** (`$lib/i18n/index.svelte`). Add the
  key to `en.ts` first (it types `MessageKey`), then `sk.ts`. Never hard-code copy.
- **Reactivity**: read data from the `liveQuery` stores exported by `db.ts`
  (`books`, `tags`, `series`, `loans`, `activeLoans`, `bookById(id)`). Mutations
  are the exported async functions in `db.ts` — don't touch `db.*` tables from
  components.
- **Styling**: prefer the Organic classes already in `app.css`
  (`.btn/.card/.tag/.seg/.input/.dialog/.table/.nav` + tokens `--color-*`,
  `--space-*`, `--radius-*`). Component-scoped `<style>` for layout glue only.
- **Icons**: `import X from 'lucide-svelte/icons/<name>'`; pass `strokeWidth={2.4}`
  for the heavier Organic look.
- **Schema changes (pre-release policy)**: **do not write data migrations.** See
  "Development phase" below — bump the Dexie version (or just wipe) and let the
  seed repopulate. Real `.upgrade()` migrations are a post-release concern.

## Development phase (pre-release) — read this

The app is **in development. There are no real users and all data is seeded.**
That changes several defaults:

- **No DB migrations.** Do not write Dexie `.upgrade()` logic to preserve data
  when the schema/model changes. Just change the schema and let `ensureSeeded()`
  repopulate. Data consistency / real migrations become a concern **only after
  release**. (The one `.upgrade()` currently in `db.ts` v2 exists because a live
  dev browser had older-shape data mid-session; you don't need to keep adding to
  that pattern — bumping the version and reseeding, or wiping, is fine.)
- **Reset local data freely.** The IndexedDB database is named **`henkas-lib`**.
  To reset: clear site data in devtools (Application → Storage), or bump the Dexie
  version in `db.ts`. Seed data lives in `src/lib/seed.ts` — edit it liberally.
- **The data model is settled** as of this writing (ADRs 0004–0006). If you change
  it, write/supersede an ADR; don't just mutate types silently.

## Other context for a fresh session

- **Design source of truth:** the claude.ai/design project "Personal Book Library
  PWA" (id `bd618ff8-f8d4-4e7d-9e11-255ceb0d6171`) built on the "Organic" design
  system. Read it with the **DesignSync** tool (`get_file`/`list_files`). Screens
  are labelled **1a–1h** (shelf, detail, add/scan, series, lending, stats, phone,
  update-progress) — task files reference these numbers. `src/app.css` is a
  verbatim port of Organic's `styles.css`; keep it faithful.
- **Verification gap:** the prototype has **not** been clicked through in a real
  browser yet (built/type-checked only). First thing worth doing: run `npm run
  dev`, exercise the flows, fix what's off. There is currently **no automated test
  suite** — add one if the project grows (TDD skill available).
- **Tooling facts:** Node 26 / npm. `lucide-svelte` is **v1** — import icons via
  subpath (`lucide-svelte/icons/<name>`). TypeScript stays on classic 6.x for
  `svelte-check` compatibility (ADR 0007) — do not switch to `tsgo`.
- **User works iteratively on the domain model.** The ownership and tag models were
  each refined across a couple of turns before settling; when in doubt about domain
  shape, ask rather than assume, and record the outcome as an ADR.

## Status

Built & working: shelf, book detail + inline edit, add/edit (manual + ISBN
lookup + duplicate handling), update-progress, tags/genres as entities,
i18n (en/sk), ownership-by-copies. Everything else is tracked in `tasks/`.
