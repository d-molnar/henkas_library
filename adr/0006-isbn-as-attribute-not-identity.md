---
id: 0006
title: ISBN is an attribute, not identity
status: accepted
date: 2026-07-22
supersedes: null
superseded_by: null
---

## Context

ISBN is designed to be unique per edition/format, but it is unsafe as a primary
key: many books have none (pre-1970, foreign, self-published, hand-entered);
ISBN-10 and ISBN-13 are two strings for one book; publishers occasionally reuse or
misassign them; and the app deliberately wants duplicates (two copies, or a
hardcover + paperback of the "same" book).

## Decision

Identity is a generated **UUID** (`Book.id`). ISBN is an **optional, normalized
(ISBN-13, digits only), indexed attribute** used for lookup and duplicate
*detection*, not identity. `isbn.ts` validates and normalizes (ISBN-10 → ISBN-13).
On add, a matching ISBN offers **"add a copy" vs "add as separate entry"** rather
than blocking — dedup-with-choice, not dedup-by-force.

## Consequences

- Manual books with no ISBN work fine.
- ISBN-10/13 duplicates collapse via normalization before compare.
- Open Library lookup uses the same normalized ISBN to pre-fill the manual form.
- Real-world ISBN collisions never corrupt identity.
