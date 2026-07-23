---
id: 0007
title: ISBN camera / barcode scan
state: todo
module: components/AddBookModal + lib
created: 2026-07-22
updated: 2026-07-22
---

## Goal

Screen 1c "Scan" path: use the device camera to read an ISBN barcode, then run
the existing `lookupIsbn` flow to pre-fill the manual form. Manual + typed-ISBN
paths already work; this adds the camera capture.

## Context / where it lives

- `openlibrary.ts` `lookupIsbn` + `isbn.ts` normalization already exist — scanning
  just needs to produce a raw ISBN string and feed the same path.
- The add form is `BookForm`; the modal is `AddBookModal`.

## Approach

- Use the browser `BarcodeDetector` API where available; fall back to a small
  library (e.g. zxing/quagga) behind a dynamic import so the base bundle stays
  lean and offline-first.
- Camera preview + detection box (mockup 1c has the visual), permission handling,
  and graceful "not supported" fallback to typed ISBN.
- On detect → normalize → `lookupIsbn` → prefill.

## Definition of done

- [ ] Scans a real barcode on a phone and pre-fills the form
- [ ] Degrades cleanly when camera/BarcodeDetector unavailable
- [ ] Strings via `t()` (en + sk); `npm run check` clean
