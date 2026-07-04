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
  class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
  onclick={handleBackdropClick}
>
  <img
    {src}
    alt="Snímek kůže"
    class="max-w-full max-h-full object-contain rounded-xl"
  />
  <button
    type="button"
    data-testid="skin-lightbox-close"
    class="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 text-white text-lg flex items-center justify-center"
    aria-label="Zavřít"
    onclick={onClose}
  >×</button>
</div>
