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
    class="fixed inset-0 z-[60] bg-black/35"
    onclick={onCancel}
  ></div>
  <div
    role="dialog"
    aria-label={heading}
    class="pb-safe fixed right-0 bottom-0 left-0 z-[70] rounded-t-[20px] bg-white"
    style:padding-bottom="calc(env(safe-area-inset-bottom, 0px) + 1rem)"
  >
    <div class="px-5 pt-5 pb-3">
      <p class="body-bold mb-1">{heading}</p>
      <p class="body-muted">{body}</p>
    </div>
    <div class="space-y-2 px-5 pt-1 pb-2">
      <button
        type="button"
        data-variant={confirmVariant}
        class="w-full rounded-xl py-3 text-sm font-semibold text-white
          {confirmVariant === 'danger' ? 'bg-danger' : 'bg-primary'}"
        onclick={onConfirm}>{confirmLabel}</button
      >
      <button
        type="button"
        class="bg-surface text-text w-full rounded-xl py-3 text-sm font-semibold"
        onclick={onCancel}>{cancelLabel}</button
      >
    </div>
  </div>
{/if}
