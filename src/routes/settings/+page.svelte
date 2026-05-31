<script lang="ts">
  import { goto } from '$app/navigation';
  import { actionStrings } from '$lib/strings/actions';
  import { commonStrings } from '$lib/strings/common';
  import { protocolSession } from '$lib/stores/protocol-session';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Button from '$lib/components/Button.svelte';

  async function resetPrototype() {
    await protocolSession.reset();
    goto('/');
  }
</script>

<div class="max-w-lg mx-auto">
  <PageHeader title={commonStrings.settings.heading} onBack={() => history.back()} />

  <div class="px-4 pt-4 pb-10 flex flex-col gap-4">
    <p class="body-muted">{commonStrings.settings.resetWarning}</p>
    <Button color="danger" onclick={resetPrototype}>{actionStrings.restart}</Button>
  </div>
</div>
