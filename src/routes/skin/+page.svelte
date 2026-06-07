<script lang="ts">
  import type { SkinObservation } from '$lib/domain/models';
  import { commonStrings } from '$lib/strings/common';
  import { scheduleRaw } from '$lib/stores/schedule-context';
  import { buildScheduleContext } from '$lib/domain/schedule-queries';
  import { parseDayQuery } from '$lib/utils/day-query';
  import { skinObservationSession } from '$lib/stores/skin-observation-session';
  import { skinPhotoSession } from '$lib/stores/skin-photo-session';
  import EczemaCheck from '$lib/components/EczemaCheck.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';

  const { date, returnTo } = $derived(parseDayQuery(page.url));
  const raw = $derived($scheduleRaw);
  const ctx = $derived(
    raw.status === 'ready'
      ? buildScheduleContext({ schedule: raw.schedule, answers: raw.answers }, date)
      : null
  );
  const reintroductionAllergenId = $derived(ctx?.reintroInfo?.allergenId ?? null);

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
