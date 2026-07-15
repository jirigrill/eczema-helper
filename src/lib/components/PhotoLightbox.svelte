<script lang="ts">
  let {
    src,
    onClose,
  }: {
    src: string;
    onClose: () => void;
  } = $props();

  function handleBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) onClose();
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  role="dialog"
  tabindex="-1"
  aria-modal="true"
  aria-label="Náhled snímku"
  data-testid="skin-photo-lightbox"
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
  onclick={handleBackdropClick}
>
  <img {src} alt="Snímek kůže" class="max-h-full max-w-full rounded-xl object-contain" />
  <button
    type="button"
    data-testid="skin-lightbox-close"
    class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-lg text-white"
    aria-label="Zavřít"
    onclick={onClose}>×</button
  >
</div>
