<script lang="ts">
  import { onMount } from 'svelte';

  let {
    message,
    duration = 5000,
    type = 'info',
    onUndo,
    onClose,
  }: {
    message: string;
    duration?: number;
    type?: 'info' | 'success' | 'warning' | 'error';
    onUndo?: () => void;
    onClose?: () => void;
  } = $props();

  let visible = $state(true);

  const typeStyles = {
    info: 'bg-surface-dark text-text',
    success: 'bg-success text-white',
    warning: 'bg-warning text-text',
    error: 'bg-danger text-white',
  };

  onMount(() => {
    const timer = setTimeout(() => {
      visible = false;
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  });

  function handleUndo() {
    visible = false;
    onUndo?.();
    onClose?.();
  }

  function handleDismiss() {
    visible = false;
    onClose?.();
  }
</script>

{#if visible}
  <div
    class="
      fixed bottom-20 left-4 right-4 z-50
      flex items-center justify-between gap-3
      px-4 py-3 rounded-lg shadow-lg
      animate-slideUp
      {typeStyles[type]}
    "
    role="alert"
  >
    <span class="text-sm">{message}</span>

    <div class="flex items-center gap-2">
      {#if onUndo}
        <button
          type="button"
          class="text-sm font-medium underline hover:no-underline"
          onclick={handleUndo}
        >
          Zpět
        </button>
      {/if}

      <button
        type="button"
        class="text-lg leading-none opacity-60 hover:opacity-100"
        onclick={handleDismiss}
        aria-label="Zavřít"
      >
        ×
      </button>
    </div>
  </div>
{/if}

<style>
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-slideUp {
    animation: slideUp 0.2s ease-out;
  }
</style>
