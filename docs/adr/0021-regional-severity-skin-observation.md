# 0021 — Per-region severity is the skin observation primitive

**Status:** Accepted
**Date:** 2026-06-22

## Context

`/skin` was a single whole-body verdict — `status: improved | unchanged | worsened | new-lesions` — that the mother picked once per day and saved alongside an optional note and an immediate-save photo. The verdict was a *relative delta*: "did things change since last time?" That shape conflated three things the protocol actually wants to separate:

1. **Where** the eczema is (cheeks vs elbow folds vs no flare at all).
2. **How bad** it is *now*, on an absolute scale she can compare across days without remembering yesterday's record.
3. **Whether** there is a photographic baseline to look back at.

The redesign prototype (`docs/design/redesign-prototype.html`, `src/routes/skin-prototype/+page.svelte`) reframes the screen as a 3×3 region grid with four absolute severity levels (klidné / mírné / střední / silné). Tapping an inactive region only activates it (so a calm region tapped by mistake stays calm); tapping the active region cycles its level. Photos move out of the save flow into a deferred slice.

The wire-up forces decisions:

- The per-region body shape is wider than the prior status enum: nine regions × four levels = 36 slot states the old `status` cannot encode.
- An overall severity for the day is still useful (week strip dot, day card stub, evaluation recap), but storing it duplicates information already in the regions array and lets the two diverge.
- Photos are out-of-scope this slice but in-scope next slice. Splitting persistence into "save observation now, save photos later" doubles round trips and creates an awkward partial-save state if the network were ever involved (it isn't in v1, but the shape leaks).
- The nine-region union is a domain-language concept — Czech display strings on the records would couple persistence to UI copy and break ADR-0014.

## Decision

The skin observation primitive is **a set of per-region severities, on a four-step absolute scale, captured atomically with any photos taken in the same session**.

### Domain shape

```ts
type RegionId =
  | 'face' | 'scalp' | 'neck'
  | 'belly' | 'back' | 'arms'
  | 'elbow-folds' | 'knee-folds' | 'legs';

type RegionLevel = 0 | 1 | 2 | 3;          // klidné / mírné / střední / silné

type SkinRegionRecord = { id: RegionId; level: RegionLevel };

type SkinObservation = {
  id: string;
  date: string;        // ISO date
  createdAt: string;   // ISO datetime
  regions: SkinRegionRecord[];
  notes?: string;
};
```

- **Nine regions, four levels.** Frozen for v1. New regions or finer levels require a follow-up ADR — the strings layer's `satisfies Record<RegionId, ...>` makes additions fail `bunx tsc --noEmit` until labels exist.
- **`RegionId` is canonical, kebab-case, English-rooted.** Czech display labels live in `src/lib/strings/skin-regions.ts`, severity hex tokens in `src/lib/config/skin-regions.ts` (the strings + config split per ADR-0014).
- **Klidné is the explicit default**, not an "unknown" sentinel. A region the mother never touched is calm, not missing. The grid initialises every region to level 0 and the cycle wraps back through 0 — there is no "clear" verb.
- **Tap-to-activate is separate from tap-to-cycle.** Tapping an inactive region only selects it (bordeaux border); tapping the already-selected region cycles its severity. This prevents accidental severity bumps on regions the mother is just visually scanning.
- **Logged is `level > 0`.** The Uložit gate counts `regions.filter(r => r.level > 0)`. A region whose level the mother cycled all the way back to klidné is not logged. (When photos arrive in the next slice, "logged" widens to `level > 0 OR photo for region`.)
- **Day-overall severity is `max(regions)`, derived at every read site.** Never persisted. The week strip, day card, and evaluation recap all read it via `overallSeverity()` from `$lib/domain/models`.

### Persistence

`SkinObservationRepository.save` takes both the observation and any photos captured in the same session, and writes them in a single Dexie `'rw'` transaction over `skin_observations` and `photos`:

```ts
save(observation: SkinObservation, photos: SkinPhoto[]): Promise<Result<void, string>>;
```

Slice 1 (this issue, #361) always passes an empty photos array. The signature is shaped now so consumers don't migrate twice when slice 2 lights up the photos arm.

The Dexie schema bumps to `version(7)`. Same indexes as v6, with an `upgrade(tx)` hook that clears `skin_observations` so the old `status`-shaped rows never reach the new readers — pre-launch wipe per ADR-0012/0016, consistent with prior v2 / v3 / v4 / v6 bumps.

### Out of scope this slice

- **Photos.** Persistence shape ready, UI flow lives in the next slice (parent #358).
- **Per-region drill-in cards.** `SkinObservationCard` and `SkinPhotoCard` recompile against the new shape with a stub summary (overall-severity dot + label). Their full redesign is a separate slice.
- **Reintroduction-allergen banner on `/skin`.** Removed; the mother already has the reintroduction context on `/day` and `/meal`. If it returns, it returns as a separate observation-cards slice.

## Consequences

- The old `status: 'improved' | 'unchanged' | 'worsened' | 'new-lesions'` field is gone from `SkinObservation` and from every consumer (`buildPhaseRecap`, `SkinObservationCard`, `/program` "skin reactions" snippet, `/evaluation` recap). The `skinOutcomes` aggregate strings (`'× zlepšení'` etc.) are replaced by severity-tier suffixes (`'× klidné'`, `'× mírné'`, `'× střední'`, `'× silné'`).
- `EczemaCheck.svelte` and its tests are deleted. `eczemaCheck.*` strings, the `reactionBannerLabel(...)` helper, and the `saveAssessment` / `addPhoto` action labels are removed with it; `/skin` is the only consumer.
- `/skin` re-authors against the prototype: nine-tile region grid, optional note, gated Uložit, return-to navigation. No reintroduction-allergen pill.
- ADR-0004 stands — causation is still derived. The change here is the *shape* of the observation primitive (regions, not status); causal reasoning over the new shape is unchanged.
- Migration path for severity granularity: the strings layer keys `RegionLevel` numerically, so adding a fifth level becomes a domain-model change (`type RegionLevel = 0 | 1 | 2 | 3 | 4`), a strings change, a Dexie bump, and a `satisfies` failure that pins every consumer to update.

## References

- Issue #361 — feat(skin): per-region severity observation (no photos)
- Parent #358 — feat(skin): regional severity logging with deferred photos
- PR #359 — committed prototype (`src/routes/skin-prototype/+page.svelte`)
- ADR-0004 — Causation is derived, not recorded (amended for the model cut)
- ADR-0012 — Allergen status lifecycle (pre-launch wipe pattern)
- ADR-0014 — Presentation strings and domain keys (strings + config split)
- ADR-0016 — Verdict drives schedule, not status (paired evaluation/observation domains)
