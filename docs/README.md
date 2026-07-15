# Eczema Tracker

Personal PWA for tracking a breastfed newborn's atopic eczema through an elimination diet. Single-child, the mother's phone, Czech UI.

## Overview

A local-first SvelteKit PWA — no backend, no accounts. It runs the elimination protocol: onboarding, a daily "today" view, meal logging with allergen-conflict detection, a program timeline, per-region skin observations with photos, and end-of-reintroduction verdicts. All data lives in IndexedDB on the one device.

## Docs

- `../CONTEXT.md` — domain vocabulary and invariants
- `../UBIQUITOUS_LANGUAGE.md` — shared term glossary
- `adr/` — architecture decision records
- `decisions-log.md` — settled implemented decisions (one-liners)
- `architecture/` — tech stack, ports & adapters, testing, code standards
- `design/` — the redesign prototype (design source of truth)
- `research/` — forward-looking design research
- `allergen-reference/` — source protocol tables (Pekárková, Matoušková)

## Commands

Run `just` from the repo root for the recipe list (`just dev`, `just build`, `just check`, `just health`).
