# Eczema Tracker

Personal PWA for tracking a breastfed newborn's atopic eczema through an elimination diet. Single-child, the mother's phone, Czech UI.

## Overview

A local-first SvelteKit PWA — no backend, no accounts. It is a logging tool: a first-run feeding-stage picker, a daily day view, meal logging, per-region skin observations with photos, and settings. It records what was eaten and how the skin looked; it derives nothing and instructs nothing. All data lives in IndexedDB on the one device. The elimination-protocol engine (onboarding questionnaire, schedule, conflict detection, reintroduction ladder, verdicts) is parked at `parked/protocol-engine` — see `parked-features.md`.

## Docs

- `../CONTEXT.md` — domain vocabulary and invariants
- `../UBIQUITOUS_LANGUAGE.md` — shared term glossary
- `adr/` — architecture decision records
- `decisions-log.md` — settled implemented decisions (one-liners)
- `parked-features.md` — the revival catalog for the parked protocol engine
- `architecture/` — tech stack, ports & adapters, testing, code standards
- `design/` — the redesign prototype (design source of truth; still depicts pre-descaling protocol screens)
- `research/` — forward-looking design research
- `spec/` — platform-neutral behavior specifications extracted from the implementation

## Commands

Run `just` from the repo root for the recipe list (`just dev`, `just build`, `just check`, `just health`).
