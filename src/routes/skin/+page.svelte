<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { goto, beforeNavigate } from '$app/navigation';
  import { page } from '$app/state';
  import {
    REGION_IDS,
    type RegionId,
    type RegionLevel,
    type SkinObservation,
    type SkinPhoto,
    type SkinPhotoInput,
    type SkinRegionRecord,
  } from '$lib/domain/models';
  import { randomUUID } from '$lib/utils/uuid';
  import { sharePhotosToRoll } from '$lib/utils/share-photos';
  import { parseDayQuery } from '$lib/utils/day-query';
  import { commonStrings } from '$lib/strings/common';
  import { actionStrings } from '$lib/strings/actions';
  import { regionStrings, severityStrings } from '$lib/strings/skin-regions';
  import { severityConfig } from '$lib/config/skin-regions';
  import { formatDateLongCs } from '$lib/utils/date';
  import { createSkinObservationSession } from '$lib/stores/skin-observation-session';
  import { discardBuffer, writeBuffer, clearBuffer } from '$lib/stores/discard-buffer';
  import type { DiscardedSkinDelete } from '$lib/stores/discard-buffer';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import SkinPhotoGallery, {
    type SkinPhotoGalleryItem,
  } from '$lib/components/SkinPhotoGallery.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';

  /**
   * Grace window `waitForObservations` gives the Dexie liveQuery to emit an
   * observation whose id is in the URL before treating it as unknown. Trade-off:
   * shorter = more responsive on typo'd urls; longer = fewer false bounces on
   * cold-PWA-boot cache misses. 500 ms is comfortable on a warm cache and
   * short enough that a wrong id still bounces almost immediately.
   */
  const UNKNOWN_ID_TIMEOUT_MS = 500;

  const { date, returnTo } = $derived(parseDayQuery(page.url));
  const observationIdParam = $derived(page.url.searchParams.get('id'));
  const mode = $derived<'compose' | 'edit'>(observationIdParam ? 'edit' : 'compose');

  function initialLevels(): Record<RegionId, RegionLevel> {
    return Object.fromEntries(REGION_IDS.map((id) => [id, 0])) as Record<RegionId, RegionLevel>;
  }

  // The date-scoped session drives the same live query the day card uses;
  // reading the observation for `?id=` from that store keeps edit mode in
  // sync with the same Dexie writes and lets tests inject a mock cleanly.
  const session = $derived(createSkinObservationSession(date));

  // Per-region severity, defaulting every region to klidné (0). The mother
  // explicitly cycles back through klidné when retiring a region — there is
  // no "unknown" state.
  let levels = $state<Record<RegionId, RegionLevel>>(initialLevels());
  let active = $state<RegionId | null>(null);
  let note = $state('');
  let saving = $state(false);
  let saveError = $state<string | null>(null);
  // Compose mode collects new photos as `SkinPhotoInput[]`. Edit mode carries
  // the same list AND a set of persisted-photo ids marked for removal. Both
  // land in the update() call on Uložit; back-out preserves them for undo.
  let stagedPhotoAdds = $state<SkinPhotoInput[]>([]);
  let stagedPhotoRemovals = $state<Set<string>>(new Set());

  // Edit-mode load state — populated by `hydrate()` on mount. `null` on
  // compose. `loadedObservation` preserves the `id`/`createdAt` that Uložit
  // must round-trip so the row keeps its timeline position (ADR-0021).
  let loadedObservation = $state<SkinObservation | null>(null);
  let persistedPhotos = $state<SkinPhoto[]>([]);
  /**
   * True when a post-delete undo rehydrated the form from a skin-delete
   * descriptor. In that state, Dexie has no row for `?id=` but the buffer
   * carries the original observation + photo blobs. Uložit calls update()
   * with those blobs as `addPhotos` (not save()), so the row lands back at
   * the original id/createdAt.
   */
  let restoredFromDeleteBuffer = $state(false);
  /**
   * Full photo rows captured at delete time, kept id-intact so the restore
   * verb can round-trip photo ids verbatim (see PRD #389 photo-id preservation
   * promise). Only populated on the post-delete-undo path; empty otherwise.
   */
  let restorePhotos = $state<SkinPhoto[]>([]);
  /** Snapshot for the dirty gate. `null` on compose. */
  let loadSnapshot = $state<{
    levels: Record<RegionId, RegionLevel>;
    note: string;
    persistedPhotoIds: string[];
  } | null>(null);

  function levelsEqual(
    a: Record<RegionId, RegionLevel>,
    b: Record<RegionId, RegionLevel>,
  ): boolean {
    return REGION_IDS.every((id) => a[id] === b[id]);
  }

  const dirty = $derived.by(() => {
    if (loadSnapshot === null) return false;
    if (!levelsEqual(levels, loadSnapshot.levels)) return true;
    if (note.trim() !== loadSnapshot.note) return true;
    if (stagedPhotoAdds.length > 0) return true;
    if (stagedPhotoRemovals.size > 0) return true;
    return false;
  });

  // Issue #379 / ADR-0021 (klidné amendment): compose keeps Uložit always
  // enabled — klidné is positive evidence and every page open can save
  // "I checked, all calm". Edit gates on dirtiness: a clean edit has
  // nothing to persist and the back arrow is the right exit.
  const canSave = $derived(mode === 'compose' ? true : dirty);
  const saveLabel = $derived(
    mode === 'edit' ? commonStrings.skin.updateLabel : commonStrings.skin.saveLabel,
  );
  const saveAriaLabel = $derived(
    mode === 'edit' ? commonStrings.skin.updateAriaLabel : commonStrings.skin.saveAriaLabel,
  );
  /**
   * True when the page is in edit mode AND a load has completed (either from
   * Dexie or from a skin-delete descriptor). Guards edit-only chrome (the
   * ⋯ overflow) so a still-loading edit URL doesn't briefly render it, and
   * an unknown-id bounce never shows it at all.
   */
  const editingExisting = $derived(mode === 'edit' && loadedObservation !== null);

  // ── Delete + post-delete undo (issue #394) ─────────────────
  let overflowOpen = $state(false);
  let deleting = $state(false);

  async function handleDeleteConfirm(): Promise<void> {
    if (deleting || !loadedObservation) return;
    deleting = true;
    // Capture the descriptor BEFORE the remove call so the buffer is
    // populated even if the mother backs out during the transition (issue
    // #394). The load snapshot captured the persisted photos; carrying them
    // as `photoBlobs` lets undo re-materialize the observation faithfully.
    const captured: DiscardedSkinDelete = {
      kind: 'skin-delete',
      observationId: loadedObservation.id,
      observation: loadedObservation,
      addPhotos: [],
      removePhotoIds: [],
      photoBlobs: persistedPhotos,
      date,
      returnTo,
    };
    const result = await session.remove(loadedObservation.id);
    if (!result.ok) {
      deleting = false;
      overflowOpen = false;
      saveError = commonStrings.skin.deleteError;
      return;
    }
    writeBuffer(captured);
    overflowOpen = false;
    goto(returnTo);
  }

  function tapRegion(r: RegionId): void {
    // First tap activates without changing level. Subsequent taps on the
    // already-active region cycle 0→1→2→3→0. Activate-first prevents stray
    // taps from bumping severity when the user is hopping between regions.
    if (active !== r) {
      active = r;
    } else {
      const next = ((levels[r] + 1) % 4) as RegionLevel;
      levels = { ...levels, [r]: next };
    }
  }

  async function handleSave(): Promise<void> {
    if (saving || !canSave) return;
    saving = true;
    saveError = null;
    // Persist every region as positive evidence (issue #379 / ADR-0021 klidné
    // amendment). A region the mother never bumped is klidné (level 0), not
    // unknown. Saving witnesses "I checked all nine".
    const regions: SkinRegionRecord[] = REGION_IDS.map((id) => ({
      id,
      level: levels[id],
    }));
    const trimmed = note.trim();

    if (mode === 'edit' && loadedObservation) {
      // Preserve id + createdAt (the witnessing moment is immutable per
      // ADR-0021 amendment). The adapter also defensively re-reads createdAt
      // from Dexie, but sending the loaded value keeps the domain call honest.
      const { notes: _drop, ...base } = loadedObservation;
      const updated: SkinObservation = {
        ...base,
        regions,
        ...(trimmed ? { notes: trimmed } : {}),
      };
      const newBlobs = stagedPhotoAdds.map((p) => p.blob);
      const result = restoredFromDeleteBuffer
        ? // Snapshot proxied $state photo rows — IndexedDB structured-cloning
          // rejects Svelte proxies with DataCloneError, and restore forwards
          // rows verbatim (unlike update, which mints fresh photos).
          await session.restore(updated, $state.snapshot(restorePhotos) as SkinPhoto[])
        : await session.update(updated, {
            addPhotos: stagedPhotoAdds,
            removePhotoIds: [...stagedPhotoRemovals],
          });
      saving = false;
      if (result.ok) {
        // Post-delete-undo path: the descriptor is what kept the form alive
        // through the delete → re-entry roundtrip. Clear it now that the row
        // is back in Dexie, so a later back-out doesn't rehydrate a phantom.
        if (restoredFromDeleteBuffer) clearBuffer();
        sharePhotosToRoll(newBlobs);
        // Clean-edit-gate is satisfied — nothing to discard on the way out.
        goto(returnTo);
      } else {
        saveError = commonStrings.skin.saveError;
      }
      return;
    }

    const observation: SkinObservation = {
      id: randomUUID(),
      date,
      createdAt: new Date().toISOString(),
      regions,
      ...(trimmed ? { notes: trimmed } : {}),
    };
    const result = await session.save(observation, stagedPhotoAdds);
    saving = false;
    if (result.ok) {
      sharePhotosToRoll(stagedPhotoAdds.map((p) => p.blob));
      goto(returnTo);
    } else {
      saveError = commonStrings.skin.saveError;
    }
  }

  function handleFileInput(e: Event): void {
    if (!active) return;
    const files = (e.target as HTMLInputElement).files;
    if (!files) return;
    const region = active;
    const newPhotos: SkinPhotoInput[] = Array.from(files).map((blob) => ({ region, blob }));
    stagedPhotoAdds = [...stagedPhotoAdds, ...newPhotos];
    // Reset the input so the same file can be added again if needed.
    (e.target as HTMLInputElement).value = '';
  }

  /**
   * Gallery items concat: persisted photos first (so the index of a staged
   * add is `persistedPhotos.length + i`), then staged adds. A persisted
   * photo whose id sits in `stagedPhotoRemovals` renders greyed out — the
   * gallery repurposes its × as Undo and calls back into `handleGalleryDelete`
   * with the same index.
   */
  const galleryItems = $derived<SkinPhotoGalleryItem[]>([
    ...persistedPhotos.map((p) => ({
      blob: p.blob,
      region: p.region,
      markedForRemoval: stagedPhotoRemovals.has(p.id),
    })),
    ...stagedPhotoAdds.map((p) => ({ blob: p.blob, region: p.region })),
  ]);

  function handleGalleryDelete(index: number): void {
    if (index < persistedPhotos.length) {
      const persisted = persistedPhotos[index]!;
      const next = new Set(stagedPhotoRemovals);
      if (next.has(persisted.id)) {
        next.delete(persisted.id); // Undo affordance
      } else {
        next.add(persisted.id);
      }
      stagedPhotoRemovals = next;
      return;
    }
    const stagedIdx = index - persistedPhotos.length;
    stagedPhotoAdds = stagedPhotoAdds.filter((_, i) => i !== stagedIdx);
  }

  /**
   * Load an observation by id from the day session, take the load snapshot,
   * pre-fill live state. Called once on mount when the URL carries `?id=`.
   * Unknown id → forgiving bounce (matches /meal's unknown-slot guard).
   */
  async function hydrate(): Promise<void> {
    if (mode !== 'edit' || !observationIdParam) return;

    // Buffer takes precedence when the user is re-entering after a dirty
    // back-out. If the buffer descriptor targets this exact observation id,
    // rehydrate live state from it and clear it. The load snapshot is still
    // taken from the persisted row so the restored dirty edit stays dirty
    // and Uložit stays enabled (matches /meal's issue #299 pattern).
    const buf = get(discardBuffer);
    if (buf && buf.kind === 'skin-edit' && buf.observationId === observationIdParam) {
      clearBuffer();
      // Fall through to seed the load snapshot below; then overlay buffered
      // live state on top.
      const rest = await loadFromSession(observationIdParam);
      if (!rest) return;
      // Buffered edits win over the persisted values.
      levels = observationRegionsToLevels(buf.observation.regions);
      note = buf.observation.notes ?? '';
      stagedPhotoAdds = buf.addPhotos;
      stagedPhotoRemovals = new Set(buf.removePhotoIds);
      return;
    }

    // Post-delete undo (issue #394). Dexie has no row for `?id=`, but the
    // buffer holds a skin-delete descriptor for it. Rehydrate everything —
    // observation + photos — from the descriptor without touching Dexie.
    // The buffer stays populated until Uložit succeeds (so a second back-out
    // still lets the user retry). Domain invariant (ADR-0021 amendment):
    // id + createdAt are immutable across delete + undo, which is why we
    // preserve `loadedObservation` verbatim from the descriptor.
    if (buf && buf.kind === 'skin-delete' && buf.observationId === observationIdParam) {
      restoredFromDeleteBuffer = true;
      loadedObservation = buf.observation;
      levels = observationRegionsToLevels(buf.observation.regions);
      note = buf.observation.notes ?? '';
      // Post-delete undo preserves photo identity: the captured SkinPhoto rows
      // carry their original id/observationId/capturedAt and land verbatim via
      // the `restore` verb (ADR-0021 amendment). Gallery renders them from
      // `persistedPhotos` so the user sees them without a staged-adds indirection.
      restorePhotos = buf.photoBlobs;
      persistedPhotos = buf.photoBlobs;
      stagedPhotoAdds = [];
      stagedPhotoRemovals = new Set();
      // Dirty from the moment of rehydration: Uložit must always be live so
      // the mother can commit the restore without touching anything else.
      loadSnapshot = {
        levels: initialLevels(),
        note: '',
        persistedPhotoIds: [],
      };
      return;
    }

    await loadFromSession(observationIdParam);
  }

  async function loadFromSession(id: string): Promise<boolean> {
    // The session is Dexie-liveQuery backed and hasn't necessarily emitted
    // yet on mount — its initial value is `[]`. Wait for the first emission
    // that contains the target id, or give the query a fair chance to run
    // and confirm the id genuinely doesn't exist. This avoids a race where
    // freshly-navigated edit URLs bounce back to the day view even though
    // the observation is in Dexie.
    const observations = await waitForObservations(id);
    const found = observations.find((o) => o.id === id);
    if (!found) {
      goto(returnTo, { replaceState: true });
      return false;
    }
    loadedObservation = found;
    levels = observationRegionsToLevels(found.regions);
    note = found.notes ?? '';
    const photosResult = await session.loadPhotos(id);
    persistedPhotos = photosResult.ok ? photosResult.data : [];
    loadSnapshot = {
      levels: { ...levels },
      note: note.trim(),
      persistedPhotoIds: persistedPhotos.map((p) => p.id).sort(),
    };
    return true;
  }

  /**
   * Resolve on the first liveQuery emission that contains the target id, or
   * on the first emission after a short grace window if it never appears.
   * The grace window keeps the unknown-id bounce responsive while giving a
   * real load enough time to populate the store on first mount.
   */
  function waitForObservations(id: string): Promise<SkinObservation[]> {
    // Fast path: the store already carries the target.
    const current = get(session);
    if (current.some((r) => r.id === id)) return Promise.resolve(current);
    return new Promise((resolve) => {
      let lastValue: SkinObservation[] = current;
      let resolved = false;
      const unsubscribe = session.subscribe((rows) => {
        lastValue = rows;
        if (rows.some((r) => r.id === id) && !resolved) {
          resolved = true;
          unsubscribe();
          resolve(rows);
        }
      });
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          unsubscribe();
          resolve(lastValue);
        }
      }, UNKNOWN_ID_TIMEOUT_MS);
    });
  }

  function observationRegionsToLevels(
    regions: readonly SkinRegionRecord[],
  ): Record<RegionId, RegionLevel> {
    const next = initialLevels();
    for (const r of regions) next[r.id] = r.level;
    return next;
  }

  onMount(() => {
    void hydrate();
  });

  /**
   * When the user backs out with pending edits, snapshot the live state into
   * the discard buffer so re-entry can restore it. The route decides *when*
   * to write; the layout's undo toast decides *how* to navigate back.
   */
  function bufferSnapshotIfDirty(): void {
    if (mode !== 'edit' || !loadedObservation || !dirty) return;
    // Post-delete-restore back-out (issue #394): keep the original
    // skin-delete descriptor in the buffer so a second undo still works.
    // Overwriting to skin-edit would leave undo pointing at a row that no
    // longer exists in Dexie.
    if (restoredFromDeleteBuffer) return;
    const regions: SkinRegionRecord[] = REGION_IDS.map((id) => ({ id, level: levels[id] }));
    const trimmed = note.trim();
    const { notes: _drop, ...base } = loadedObservation;
    const observationSnapshot: SkinObservation = {
      ...base,
      regions,
      ...(trimmed ? { notes: trimmed } : {}),
    };
    writeBuffer({
      kind: 'skin-edit',
      observationId: loadedObservation.id,
      observation: observationSnapshot,
      addPhotos: stagedPhotoAdds,
      removePhotoIds: [...stagedPhotoRemovals],
      date,
      returnTo,
    });
  }

  function handleBack(): void {
    bufferSnapshotIfDirty();
    goto(returnTo);
  }

  // Popstate guard (system back gesture): the explicit back arrow above
  // arrives as a `goto`, so we act only on `popstate` — writing the buffer
  // by exactly one path per navigation.
  beforeNavigate((nav) => {
    if (nav.type !== 'popstate') return;
    bufferSnapshotIfDirty();
  });
</script>

<div class="page-container pb-28">
  <!--
    Sticky header — matches /meal verbatim: large variant, date on the
    right, no bottom border (the sticky container owns chrome).
  -->
  <div class="bg-surface sticky top-0 z-20">
    <PageHeader
      title={commonStrings.skin.heading}
      variant="large"
      onBack={handleBack}
      bordered={false}
    >
      {#snippet right()}
        <p class="body-muted">{formatDateLongCs(date)}</p>
        {#if editingExisting}
          <button
            type="button"
            data-testid="skin-overflow"
            aria-label={actionStrings.more}
            class="text-text-muted -mr-2 ml-1 px-2 text-lg leading-none"
            onclick={() => (overflowOpen = true)}>⋯</button
          >
        {/if}
      {/snippet}
    </PageHeader>
  </div>

  <div class="space-y-5 px-4 pt-4">
    <!--
      Region grid section: eyebrow + tap-hint on the right. The hint
      teaches the tap-cycle interaction on first use (the gesture is
      unique to /skin and not discoverable on its own).
    -->
    <section>
      <div class="mb-2 flex items-end justify-between">
        <p class="eyebrow">{commonStrings.skin.eyebrow}</p>
        <span class="caption">{commonStrings.skin.tapHint}</span>
      </div>
      <div class="grid grid-cols-3 gap-2" data-testid="skin-region-grid">
        {#each REGION_IDS as id (id)}
          {@const isActive = active === id}
          {@const lvl = levels[id]}
          {@const cfg = severityConfig[lvl]}
          {@const borderClass = isActive ? 'border-primary' : cfg.tileBorder}
          <!--
            Active uses `border-2 border-primary` (single 2px wine line).
            Inactive tiles use 1px border. The earlier "double line"
            problem came from combining `border-2` with a `ring-2` +
            ring-offset — dropping the ring lets the thicker border
            stand on its own.
          -->
          <button
            type="button"
            data-testid="skin-region-{id}"
            data-region={id}
            data-active={isActive ? 'true' : 'false'}
            data-level={lvl}
            aria-pressed={isActive}
            onclick={() => tapRegion(id)}
            class="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl p-1 transition-all {isActive
              ? 'border-2'
              : 'border'} {borderClass} {cfg.tileBg}"
          >
            <span class="h-4 w-4 rounded-full {cfg.dot}"></span>
            <span class="text-text text-center text-[11px] leading-tight font-medium"
              >{regionStrings[id].label}</span
            >
            <span class="text-text-muted text-[9px]">{severityStrings[lvl].label}</span>
          </button>
        {/each}
      </div>
    </section>

    <!--
      Photo section. The wine-tinted "Přidat fotku <region>" button only
      appears when a region is active — when none is active a grey
      disabled hint takes its place (no test anchor on the hint, so
      `queryByTestId('skin-add-photo')` returns null per the spec).
    -->
    <section>
      <p class="eyebrow mb-2">Fotky</p>
      {#if active}
        <label
          data-testid="skin-add-photo"
          class="border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors"
        >
          <span>+ Přidat fotku {regionStrings[active].label}</span>
          <input type="file" accept="image/*" multiple class="sr-only" onchange={handleFileInput} />
        </label>
      {:else}
        <div
          class="bg-surface-dark text-text-muted flex cursor-default items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm"
          aria-disabled="true"
        >
          <span>+ Vyber oblast pro fotku</span>
        </div>
      {/if}

      {#if galleryItems.length > 0}
        <div class="mt-3">
          <SkinPhotoGallery photos={galleryItems} onDelete={handleGalleryDelete} />
        </div>
      {/if}
    </section>

    <!-- Notes section: matches /meal's eyebrow + textarea pattern. -->
    <section>
      <label class="eyebrow mb-2 block" for="skin-note-textarea">Poznámka</label>
      <textarea
        id="skin-note-textarea"
        bind:value={note}
        placeholder={commonStrings.skin.notePlaceholder}
        rows={2}
        class="input-base w-full resize-none bg-white px-4 py-2.5"
        data-testid="skin-note"
      ></textarea>
    </section>
  </div>
</div>

<!-- Sticky CTA — identical to /meal. -->
<div
  class="from-surface via-surface fixed right-0 bottom-0 left-0 z-30 bg-gradient-to-t to-transparent px-4 pt-2"
  style:padding-bottom="calc(env(safe-area-inset-bottom, 0px) + 1rem)"
>
  <div class="mx-auto max-w-lg">
    <button
      type="button"
      data-testid="skin-save"
      aria-label={saveAriaLabel}
      aria-disabled={!canSave || saving ? 'true' : 'false'}
      disabled={!canSave || saving}
      onclick={handleSave}
      class="w-full rounded-xl py-3 text-sm font-semibold transition-all
        {canSave ? 'bg-primary text-white' : 'bg-surface-dark text-text-muted cursor-default'}"
    >
      {saveLabel}
    </button>
  </div>
</div>

{#if saveError}
  <Toast message={saveError} type="error" onClose={() => (saveError = null)} />
{/if}

<!--
  Destructive-confirm bottom sheet (issue #394). Reuses ConfirmSheet from
  /meal so the two destructive verbs share their entire visual/interaction
  shape.
-->
<ConfirmSheet
  open={overflowOpen}
  heading={commonStrings.skin.deleteConfirmHeading}
  body={commonStrings.skin.deleteConfirmBody}
  confirmLabel={actionStrings.deleteObservation}
  cancelLabel={actionStrings.cancel}
  confirmVariant="danger"
  onConfirm={handleDeleteConfirm}
  onCancel={() => (overflowOpen = false)}
/>
