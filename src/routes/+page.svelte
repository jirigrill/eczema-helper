<script lang="ts">
  // ═══════════════════════════════════════════════════════════
  // First run — a single welcome screen with the feeding-stage
  // picker (PRD #623, §3/§3c). Writing the stage is the app's
  // "seeded" signal: `settings.feedingStage != null` routes the
  // mother to the day view and she never sees this screen again.
  // ═══════════════════════════════════════════════════════════
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import Chip from '$lib/components/Chip.svelte';
  import { feedingStageOptions } from '$lib/config/feeding-stages';
  import type { FeedingStage } from '$lib/domain/models';
  import { settingsStore } from '$lib/stores/settings.svelte';
  import { commonStrings } from '$lib/strings/common';
  import { todayIso } from '$lib/utils/date';

  // Defaults to 'breastfed' — the common v1 case, a breastfed newborn
  // (ADR-0001). The stage stays editable later in Settings.
  let feedingStage = $state<FeedingStage>('breastfed');
  let saveError = $state(false);

  async function confirm() {
    saveError = false;
    const result = await settingsStore.setFeedingStage(feedingStage);
    if (!result.ok) {
      saveError = true;
      return;
    }
    goto(`/day/${todayIso()}`);
  }
</script>

<div class="bg-surface flex min-h-screen flex-col">
  <div class="page-container flex w-full flex-1 flex-col justify-center gap-8 pb-8">
    <div class="flex flex-col items-center gap-4 text-center">
      <div class="text-7xl">🌿</div>
      <div>
        <h1 class="page-heading mb-3">{commonStrings.firstRun.heading}</h1>
        <p class="text-text-muted leading-relaxed">{commonStrings.firstRun.intro}</p>
      </div>
    </div>

    <div>
      <p class="body-medium mb-1">{commonStrings.firstRun.feedingStageQuestion}</p>
      <p class="body-muted mb-3">{commonStrings.firstRun.feedingStageHint}</p>
      <div class="flex flex-wrap gap-2">
        {#each feedingStageOptions as option}
          <Chip
            active={option.value === feedingStage}
            onclick={() => (feedingStage = option.value)}
          >
            {option.label}
          </Chip>
        {/each}
      </div>
    </div>

    <div class="mt-auto">
      {#if saveError}
        <p class="text-danger mb-2 text-center text-sm">{commonStrings.firstRun.saveError}</p>
      {/if}
      <Button onclick={confirm}>{commonStrings.firstRun.confirm}</Button>
    </div>
  </div>
</div>
