---
id: 0007
title: Stay on classic TypeScript; defer the Go native port
status: accepted
date: 2026-07-22
supersedes: null
superseded_by: null
---

## Context

The project type-checks through **`svelte-check`**, which drives the classic
**TypeScript Compiler API in-process** (via `svelte2tsx`) to check `.svelte`
files. The new native TypeScript (the Go port, `@typescript/native-preview` /
`tsgo`, a `7.0.0-dev` preview) is far faster, but today it is a CLI + LSP and does
**not** expose the JS Compiler API that `svelte-check` and Svelte language tools
depend on. It also can't resolve `.svelte` imports without the Svelte tooling.

## Decision

Stay on **classic TypeScript 6.x** as the project's type-checker and the version
`svelte-check` uses. Do **not** adopt `tsgo` as the checker while component
checking depends on the classic Compiler API. Compatibility with `svelte-check`
is the hard requirement.

## Consequences

- `npm run check` stays reliable across all `.svelte` + `.ts` files.
- We forgo `tsgo`'s speed for now. Revisit (and supersede this ADR) once the native
  port ships a Compiler-API-compatible surface that Svelte tooling can consume, or
  once `svelte-check` supports it.
- `tsgo` may still be used *locally* as an editor LSP or for ad-hoc plain-`.ts`
  checks — that's a personal-tooling choice, not the project gate.
