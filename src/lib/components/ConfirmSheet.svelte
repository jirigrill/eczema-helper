<script lang="ts">
  import BottomSheet from './BottomSheet.svelte';

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

<BottomSheet {open} ariaLabel={heading} onDismiss={onCancel} backdropTestid="confirm-sheet-backdrop">
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
</BottomSheet>
