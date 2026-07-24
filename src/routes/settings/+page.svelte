<script lang="ts">
  import { goto } from '$app/navigation';
  import type { FeedingStage } from '$lib/domain/models';
  import { actionStrings } from '$lib/strings/actions';
  import { commonStrings } from '$lib/strings/common';
  import { feedingStageOptions } from '$lib/config/feeding-stages';
  import { protocolSession } from '$lib/stores/protocol-session';
  import { settingsContext } from '$lib/stores/settings-context';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Button from '$lib/components/Button.svelte';
  import Chip from '$lib/components/Chip.svelte';

  const feedingStage = $derived($settingsContext?.feedingStage ?? null);

  function selectFeedingStage(stage: FeedingStage) {
    if (stage === feedingStage) return;
    void protocolSession.setFeedingStage(stage);
  }

  async function resetPrototype() {
    await protocolSession.reset();
    // scheduleContext updates via a liveQuery subscription, so it can still
    // report the stale 'ready' status for a tick right after reset() resolves.
    // Wait for it to actually leave 'ready' before navigating — otherwise the
    // root layout's ready-on-root redirect (issue #353) fires on the stale
    // value and bounces straight back to the day view instead of showing
    // the questionnaire.
    await new Promise<void>((resolve) => {
      const unsubscribe = protocolSession.subscribe((ctx) => {
        if (ctx.status !== 'ready') {
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
    <Button color="danger" onclick={resetPrototype}>{actionStrings.restart}</Button>
  </div>
</div>
