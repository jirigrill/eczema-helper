<script lang="ts">
  import { onMount } from 'svelte';
  import { actionStrings } from '$lib/strings/actions';

  let {
    message,
    duration = 5000,
    type = 'info',
    href,
    linkLabel,
    onUndo,
    onClose,
  }: {
    message: string;
    duration?: number;
    type?: 'info' | 'success' | 'warning' | 'error';
    href?: string;
    linkLabel?: string;
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
      animate-slideUp fixed right-4 bottom-[84px] left-4
      z-40 flex items-center justify-between
      gap-3 rounded-xl px-4 py-3
      shadow-lg
      {typeStyles[type]}
    "
    role="alert"
  >
    <div class="flex min-w-0 flex-col gap-1">
      <span class="text-sm">{message}</span>
      {#if href && linkLabel}
        <a {href} class="text-xs underline underline-offset-2 opacity-80">{linkLabel}</a>
      {/if}
    </div>

    <div class="flex shrink-0 items-center gap-2">
      {#if onUndo}
        <button
          type="button"
          class="text-sm font-medium underline hover:no-underline"
          onclick={handleUndo}
        >
          {actionStrings.back}
        </button>
      {/if}

      <button
        type="button"
        class="text-lg leading-none opacity-60 hover:opacity-100"
        onclick={handleDismiss}
        aria-label={actionStrings.close}
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
