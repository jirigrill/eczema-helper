<script lang="ts">
  import type { SkinObservation } from '$lib/domain/models';
  import { commonStrings } from '$lib/strings/common';
  import { scheduleContext } from '$lib/stores/schedule-context';
  import EczemaCheck from '$lib/components/EczemaCheck.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import { db } from '$lib/db/atopic-db';
  import { DexieSkinObservationRepository } from '$lib/adapters/dexie-skin-observation-repository';
  import { DexieSkinPhotoStore } from '$lib/adapters/dexie-skin-photo-store';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { todayIso } from '$lib/utils/date';

  const repo = new DexieSkinObservationRepository(db);
  const photoStore = new DexieSkinPhotoStore(db);

  const date = $derived(page.url.searchParams.get('date') ?? todayIso());
  const returnTo = $derived(page.url.searchParams.get('returnTo') ?? '/today');
  const ctx = $derived($scheduleContext);
  const reintroductionAllergenId = $derived(
    ctx.status === 'ready' ? (ctx.reintroInfo?.allergenId ?? null) : null
  );

  async function handleSave(obs: SkinObservation): Promise<void> {
    await repo.save(obs);
    goto(returnTo);
  }

  async function handlePhotoCapture(blob: Blob): Promise<void> {
    await photoStore.save({
      id: crypto.randomUUID(),
      date: date,
      capturedAt: new Date().toISOString(),
      blob,
    });
  }
</script>

<div class="page-container pb-24">
  <PageHeader title={commonStrings.skin.heading} onBack={() => goto(returnTo)} />

  <div class="px-4 pt-4">
    <EczemaCheck
      {date}
      {reintroductionAllergenId}
      onSave={handleSave}
      onPhotoCapture={handlePhotoCapture}
    />
  </div>
</div>
