<script lang="ts">
  import { foodLogStore } from '$lib/stores/food-log.svelte';

  const syncStatus = $derived(foodLogStore.syncStatus);

  const statusConfig = $derived(
    {
      synced: {
        icon: '☁️',
        color: 'text-success',
        label: 'Synchronizováno',
      },
      syncing: {
        icon: '🔄',
        color: 'text-primary',
        label: 'Synchronizuji…',
      },
      pending: {
        icon: '☁️',
        color: 'text-warning',
        label: 'Čeká na sync',
      },
      offline: {
        icon: '📴',
        color: 'text-text-muted',
        label: 'Offline',
      },
    }[syncStatus]
  );
</script>

<div
  class="flex items-center gap-1 text-sm {statusConfig.color}"
  title={statusConfig.label}
  role="status"
  aria-live="polite"
>
  <span class={syncStatus === 'syncing' ? 'animate-spin' : ''}>{statusConfig.icon}</span>
  <span class="sr-only">{statusConfig.label}</span>
</div>
