<script lang="ts">
  import { goto } from '$app/navigation';
  import type { FeedingStage } from '$lib/domain/models';
  import { actionStrings } from '$lib/strings/actions';
  import { commonStrings } from '$lib/strings/common';
  import { feedingStageOptions } from '$lib/config/feeding-stages';
  import { settingsStore } from '$lib/stores/settings.svelte';
  import { settingsContext } from '$lib/stores/settings-context';
  import { resetDatabase } from '$lib/db/reset-database';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Button from '$lib/components/Button.svelte';
  import Chip from '$lib/components/Chip.svelte';
  import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';

  const feedingStage = $derived(settingsStore.feedingStage);

  // Reset is a factory wipe of every table — meals, observations and photos
  // included — and there is no export yet (#438), so it is gated behind a
  // destructive confirm rather than firing on a single tap.
  let resetConfirmOpen = $state(false);

  function selectFeedingStage(stage: FeedingStage) {
    if (stage === feedingStage) return;
    void settingsStore.setFeedingStage(stage);
  }

  async function confirmReset() {
    resetConfirmOpen = false;
    await resetDatabase();
    // The seeded signal is `settingsContext`'s status, driven by a liveQuery —
    // so it can still report the stale 'seeded' status for a tick right after
    // resetDatabase() clears the settings row. Wait for it to flip to 'unset'
    // before navigating; otherwise the root layout's seeded redirect (issue
    // #353, re-opened against this signal per §3d) fires on the stale value
    // and bounces straight back to the day view. Landing on first run is the
    // intended destination here — but only once the signal has flipped.
    await new Promise<void>((resolve) => {
      const unsubscribe = settingsContext.subscribe((state) => {
        if (state.status === 'unset') {
          resolve();
          queueMicrotask(() => unsubscribe());
        }
      });
    });
    goto('/');
  }
</script>

<div class="mx-auto max-w-lg">
  <PageHeader title={commonStrings.settings.heading} onBack={() => history.back()} />

  <div class="flex flex-col gap-4 px-4 pt-4 pb-10">
    <section class="flex flex-col gap-3">
      <div>
        <h2 class="card-heading">{commonStrings.settings.feedingStageHeading}</h2>
        <p class="body-muted">{commonStrings.settings.feedingStageHint}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        {#each feedingStageOptions as option}
          <Chip
            active={option.value === feedingStage}
            onclick={() => selectFeedingStage(option.value)}
          >
            {option.label}
          </Chip>
        {/each}
      </div>
    </section>

    <p class="body-muted">{commonStrings.settings.resetWarning}</p>
    <Button color="danger" onclick={() => (resetConfirmOpen = true)}>{actionStrings.reset}</Button>
  </div>
</div>

<ConfirmSheet
  open={resetConfirmOpen}
  heading={commonStrings.settings.resetConfirmHeading}
  body={commonStrings.settings.resetConfirmBody}
  confirmLabel={actionStrings.reset}
  cancelLabel={actionStrings.cancel}
  confirmVariant="danger"
  onConfirm={confirmReset}
  onCancel={() => (resetConfirmOpen = false)}
/>
