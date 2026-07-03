# Handoff — /day photo surfacing redesign (POSTPONED)

**Status:** Postponed 2026-07-03. Design direction settled on "unified adaptive card" family (see below), but final variant not picked and no code changed in `src/`. No ADR/UBIQUITOUS_LANGUAGE update yet — explicitly deferred by the user until work resumes.

**Latest cleanup (2026-07-03):** all small-photo variants (A/C/D/E, C1/C3/C4, C6/C7/C8, C9) were stripped from `PROTOTYPE-photo-variants.html` — the real-user "make photos bigger" pivot invalidated that whole exploration. Only BIG-*, NL-*, and UA-1/UA-2/UA-3 remain in the prototype file.

**For the next agent:** this was a `/grilling` session (see the `grilling` skill). When work resumes, continue user-driven one-question-at-a-time interviewing; do not skip ahead to implementation. Three unified-adaptive candidates (UA-1 split, UA-2 mixed feed, UA-3 chronological) are the current open question — user has not yet picked between them.

## Original problem

`/day/[date]` rendered all of a day's skin photos in one flat "Foto kůže" grid card (`src/lib/components/SkinPhotoCard.svelte`), with only a region label under each thumb — no time, no grouping. When the same region is photographed 2+ times in one day (across different `SkinObservation` checkups), there was no way to tell which photo belongs to which checkup/time/severity state.

## Domain facts established early (still true, don't re-derive)

- `SkinObservation` = one checkup, timestamp + `regions: {id, level}[]` covering all 9 canonical regions each time.
- `SkinPhoto` FKs to exactly one `observationId`, carries one `region`. Multiple photos per observation (different regions) and multiple observations per day (same region re-shot) are both valid.
- Real region labels/lengths live in `src/lib/strings/skin-regions.ts` (`regionStrings`) — longest are "Vlasová část", "Loketní jamky". 9 regions total, so "many regions in one observation" tops out around 6-9, never more.
- Real severity styling comes from `src/lib/config/skin-regions.ts` (`severityConfig`) — 4 levels (0-3), hex `#EDE8E9 / #C9A227(warning) / #C97027(severity-4) / #B84444(danger)`, NOT the 5-level DESIGN.md scale.
- `SkinObservationCard.svelte` (current, shipped) renders one row per observation: time + colored chip-per-bumped-region (or single "Klidný" chip), **no chevron today** — that's an existing inconsistency vs. `MealCard.svelte`, which does have a trailing `›`/`+`.
- The `/skin?id=...` edit route already renders full photos via `SkinPhotoGallery.svelte` (persisted + staged), including a real lightbox (`openLightbox`/tap-to-enlarge) — any "view photo" interaction can reuse this pattern (`e.stopPropagation()` nested inside a clickable row, same trick `SkinPhotoGallery.svelte:88,96` already uses for delete/undo buttons).

## Evolution of the design (in order)

1. **Structural options explored (A–E lettering, later B dropped):**
   - A: keep flat grid, add time badge to each thumb.
   - B: keep flat grid but sub-group internally by observation — **rejected outright by user**, no reason recorded beyond "not an option."
   - C: dissolve the photo card, inline thumbs into `SkinObservationCard` rows.
   - D: rows get only a camera+count badge, photos fully on-demand (tap → `/skin` edit).
   - E: photo card shows latest-per-region only, "+N" for history — **disqualified on domain grounds**: this app's actual purpose is flare *progression*, so hiding same-region history by default suppresses the evidence multiple photos exist to show.
2. Verified `/skin` edit already shows full photos (`+page.svelte:249-267`), so C/D's "tap row → edit" doesn't lose photo access — but D's row-tap and a `📷 N` sub-tap-target conflict with the app's convention that counts (elsewhere) are *never* tappable, unlike a thumbnail image, which reads as tappable for free.
3. **Stress-tested C's row-merge under real content** (6 regions/6 photos on one observation, using actual long region names) via a live static-HTML prototype + Playwright — original C blew up into an unbounded multi-line block. Iterated fixes: C1 (cap 2 + "+N"), C2 (horizontal scroll, **user vetoed**), C3 (two-line row, unconditional even for 1 photo), C4 (hybrid count-only above 2).
4. **Built genuinely content-aware (measured, not fixed-threshold) variants**: C6/C7/C8 (native flex-wrap flow, post-render `offsetTop`-clustering to cap by *line budget* not photo count) and C9 (kept C1's right-aligned chips-left/thumbs-right structure per user preference, but capped via the same greedy re-measure-after-removing-a-thumb algorithm). **Found and fixed a real methodology bug along the way**: Tailwind's CDN script generates utility CSS via a `MutationObserver` that only fires as a microtask *after* the page's synchronous `<script>` finishes — so the first round of "measured" results (C7 looked clean on the realistic flare day) were measuring pre-stylesheet layout and were wrong. Fixed by deferring measurement to a double `requestAnimationFrame`. Re-measured: **C9 beat C7** on the same realistic dataset (zero fallback triggers vs. C7 losing one photo on the densest row).
5. **Real-user pivot (the actual wife/primary-user feedback), which invalidated the entire C-family framing:** she said "I just need bigger photos." All C-variant thumbnails were 36px (`w-9 h-9`) — an *evidence chip* size, smaller than the currently-shipped `SkinPhotoCard` grid (~90px). The whole C-family optimized "don't break the row layout with small thumbs," not "are small thumbs right at all." Pivoted to a **BIG photo direction**: 2-col grid (~140px tiles), explored three shapes:
   - BIG-A: big grid, grouped by observation (own card, sub-header per checkup).
   - BIG-B: big grid, flat, each tile self-labels region+time+severity dot.
   - BIG-C: **grouped by region, not observation** — a region shot 3×/day gets one row, all shots laid out chronologically left-to-right with a "N× dnes" flag. This makes intra-day progression the headline view instead of something hidden behind a tap. User's early lean: BIG-C.
6. **Second real-user pivot:** wife reported she goes straight to the photo section on `/day` and **ignores the `SkinObservationCard` chip list entirely**. This reframes the photo card as the *primary* (possibly *sole*) skin-status surface, not a supplement.
   - Explored: should `/day` just reorder cards (photos first)? User instead asked to prototype **removing `SkinObservationCard` entirely**.
   - Built "NL" (no-list) variants: one unified "Stav kůže" card, region-grouped (BIG-C shape), photo-less "Klidný" checks reduced to a plain one-line display row (no chip, no severity color — carries far less info than a photo). Two sub-variants to resolve "does the tile need the severity *word*, not just the color dot, since there's no chip list to fall back on":
     - NL-1: dot only.
     - NL-2: dot + Czech severity word (`Region · čas · Mírná`) — slightly taller caption (wraps to 2 lines sometimes) but self-sufficient.
   - **Decision made: NL-2** (word matters more than compactness once the chip list is gone).
   - **Decision made:** editing a rare photo-less "Klidný" entry routes through `/skin` directly — no tap target needed on that row in the unified card. Prototype already updated to reflect this (calm line is now plain, non-interactive text).
7. **Third exploration — Unified Adaptive (UA-1/UA-2/UA-3):** three candidates for how the single "Stav kůže" card should compose the checkup summary rows (for calm/photo-less days) with region-grouped big-photo strips (for flare days), so one card handles both extremes and mixed days without swapping shapes:
   - UA-1: split within card — top sub-section "Kontroly" (chronological one-row-per-checkup summary), bottom sub-section "Foto průběh" (region-grouped photo strips). Distinct visual sections.
   - UA-2: one mixed feed — calm-check summary rows and region strips at the same top level, no sub-headers, chronologically interleaved.
   - UA-3: chronological — one block per checkup, region photos inlined directly under the checkup they belong to (not region-grouped). Closest to today's `SkinObservationCard`, just with big inline photos. Loses cross-checkup region progression (a region shot 3× in one day is not visible as a horizontal series).
   - **Not yet picked.** This is the live open question when work resumes.

## Current state of the decision (as of end of session)

Leaning direction, **not yet finalized as an ADR**:
- Drop `SkinObservationCard` from `/day` entirely.
- Single unified "Stav kůže" card, grouped by region (not by observation).
- Big tiles (~140px), severity dot **+ word** overlay, region name as group header, "N× dnes" flag when a region has 2+ shots that day, shots ordered chronologically, horizontally scrollable per region.
- Photo-less "Klidný" checks: plain one-line text row, no chip, no tap target.
- All editing continues to route through `/skin?id=...` (unchanged).

## Open threads / what's NOT resolved yet

- No ADR written. No `UBIQUITOUS_LANGUAGE.md` entry for "Stav kůže" (possibly a renamed/merged concept — worth checking if this needs a term entry, given `SkinObservationCard`'s current role is disappearing).
- Not stress-tested: what happens to the unified card's height/scroll on a day with many regions AND many observations simultaneously (the BIG-C/NL region-rows haven't been capped or measured the way the C-family was — could grow tall on an extreme day; unclear if that's acceptable given this is a rare edge case, or needs its own line/row-count budget like C9's approach did).
- Not checked: whether removing `SkinObservationCard` from `/day` has any knock-on effect on `dailyCompleteness({ observations, photos, meals })` (used in `+page.svelte`) — that logic likely doesn't care about the *card* existing, only the underlying data, but wasn't explicitly verified this session.
- Not checked: does anything else on `/day` or elsewhere link to or assume `SkinObservationCard` is present (e.g. `/week` photo gallery, other routes)?
- The BIG/NL variants' tap targets (open lightbox on tile tap, row background does nothing since there's no "row" concept anymore — tapping a region group might need its own affordance to reach `/skin` edit, since the old chevron-per-observation convention doesn't map onto region-grouped rows). **This wasn't addressed and is a real gap**: in the NL variants, how does the user get *into* the edit screen at all, if there's no observation row left to tap? Likely each photo tile itself needs to link to `/skin?id=<that photo's observationId>&...` on tap (distinct from opening the lightbox) — needs its own interaction design (tap-to-enlarge vs. tap-to-edit conflict, same class of problem solved earlier for C/D but not yet re-solved for the region-grouped tile).

## Artifacts

- **Live prototype (throwaway, in repo):** `docs/design/PROTOTYPE-photo-variants.html` — contains **only** the surviving big-photo directions: BIG-A/B/C, NL-1/NL-2, UA-1/UA-2/UA-3, each rendered against three densities (few/middle/many observations). Small-photo variants (A/C/D/E, C1/C3/C4, C6/C7/C8, C9) were stripped 2026-07-03 after the "make photos bigger" pivot invalidated them; if you need to see that history, use git (`git log docs/design/PROTOTYPE-photo-variants.html` on branch `docs/photo-surfacing-handoff`). Self-contained static HTML + vanilla JS, but Playwright's `browser_navigate` blocks `file://` URLs — serve via `python3 -m http.server 8765` from `docs/design/` and open `http://127.0.0.1:8765/PROTOTYPE-photo-variants.html`.
- Real components referenced throughout: `src/lib/components/SkinPhotoCard.svelte`, `src/lib/components/SkinObservationCard.svelte`, `src/lib/components/SkinPhotoGallery.svelte`, `src/lib/components/MealCard.svelte`, `src/routes/day/[date]/+page.svelte`, `src/routes/skin/+page.svelte`.
- Design tokens: `DESIGN.md` (card geometry, severity colors — note DESIGN.md's 5-level severity scale differs from the actual shipped 4-level `severityConfig` in `src/lib/config/skin-regions.ts`, the code is the source of truth).

## Suggested skills for the next session

- **`grilling`** — resume with one-question-at-a-time interviewing. First question waiting: which of UA-1/UA-2/UA-3 is the shape? Do not skip to implementation.
- **`prototype`** — the open thread on region-group tap targets (lightbox vs. edit-navigation conflict) is exactly the kind of thing that needs a live browser check before deciding, same as the rest of this session.
- **`domain-modeling`** — once the design direction is fully locked, this skill should record the ADR (retiring `SkinObservationCard`'s role on `/day`, new region-grouped "Stav kůže" card) and any `UBIQUITOUS_LANGUAGE.md` updates. Explicitly deferred by the user until then — don't invoke it prematurely.
