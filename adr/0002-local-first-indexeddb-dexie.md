---
id: 0002
title: Local-first storage via IndexedDB (Dexie)
status: accepted
date: 2026-07-22
supersedes: null
superseded_by: null
---

## Context

The app must work fully offline and store a personal library (hundreds to
thousands of books, plus tags, series, loans) on-device with no backend. It
needs reactive reads so the UI updates as data changes.

## Decision

Use **IndexedDB via Dexie**. All schema, seeding, reactive stores, and mutations
live in `src/lib/db.ts`. UI reads from `liveQuery`-backed Svelte stores
(`books`, `tags`, `series`, `loans`, `bookById(id)`) and mutates only through the
exported async functions. A one-time `ensureSeeded()` populates a starter library
on first run. Backup/restore is JSON export/import (`exportBackup`/`importBackup`).

## Consequences

- Genuine offline-first; no network on the critical path.
- Reactive UI for free via Dexie `liveQuery` bridged to the Svelte store contract.
- Schema changes require a Dexie version bump + `.upgrade()` (currently v2, which
  reseeds after the tag/ownership model change).
- Cross-device sync is out of scope; if added later it layers on top of export/import.
