<script lang="ts">
  import { goto } from '$app/navigation';
  import { actionStrings } from '$lib/strings/actions';
  import { commonStrings } from '$lib/strings/common';
  import { protocolSession } from '$lib/stores/protocol-session';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Button from '$lib/components/Button.svelte';

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
    <p class="body-muted">{commonStrings.settings.resetWarning}</p>
    <Button color="danger" onclick={resetPrototype}>{actionStrings.restart}</Button>
  </div>
</div>
