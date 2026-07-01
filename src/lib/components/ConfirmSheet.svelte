<script lang="ts">
  type ConfirmVariant = 'primary' | 'danger';

  let {
    open,
    heading,
    body,
    confirmLabel,
    cancelLabel,
    confirmVariant = 'primary' as ConfirmVariant,
    onConfirm,
    onCancel,
  }: {
    open: boolean;
    heading: string;
    body: string;
    confirmLabel: string;
    cancelLabel: string;
    confirmVariant?: ConfirmVariant;
    onConfirm: () => void;
    onCancel: () => void;
  } = $props();
</script>

{#if open}
  <div
    role="presentation"
    data-testid="confirm-sheet-backdrop"
    class="fixed inset-0 bg-black/35 z-40"
    onclick={onCancel}
  ></div>
  <div
    role="dialog"
    aria-label={heading}
    class="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[20px] pb-safe"
    style:padding-bottom="calc(env(safe-area-inset-bottom, 0px) + 1rem)"
  >
    <div class="px-5 pt-5 pb-3">
      <p class="body-bold mb-1">{heading}</p>
      <p class="body-muted">{body}</p>
    </div>
    <div class="px-5 pt-1 pb-2 space-y-2">
      <button
        type="button"
        data-variant={confirmVariant}
        class="w-full py-3 rounded-xl font-semibold text-sm text-white
          {confirmVariant === 'danger' ? 'bg-danger' : 'bg-primary'}"
        onclick={onConfirm}
      >{confirmLabel}</button>
      <button
        type="button"
        class="w-full py-3 rounded-xl font-semibold text-sm bg-surface text-text"
        onclick={onCancel}
      >{cancelLabel}</button>
    </div>
  </div>
{/if}
