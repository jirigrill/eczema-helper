<script lang="ts">
  import type { SkinObservation } from '$lib/domain/models';
  import { commonStrings } from '$lib/strings/common';
  import { scheduleContext } from '$lib/stores/schedule-context';
  import { skinObservationSession } from '$lib/stores/skin-observation-session';
  import { skinPhotoSession } from '$lib/stores/skin-photo-session';
  import EczemaCheck from '$lib/components/EczemaCheck.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { todayIso } from '$lib/utils/date';

  const date = $derived(page.url.searchParams.get('date') ?? todayIso());
  const returnTo = $derived(page.url.searchParams.get('returnTo') ?? `/day/${todayIso()}`);
  const ctx = $derived($scheduleContext);
  const reintroductionAllergenId = $derived(
    ctx.status === 'ready' ? (ctx.reintroInfo?.allergenId ?? null) : null
  );

  async function handleSave(obs: SkinObservation): Promise<void> {
    await skinObservationSession.save(obs);
    goto(returnTo);
  }

  async function handlePhotoCapture(blob: Blob): Promise<void> {
    await skinPhotoSession.save({
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
