<script lang="ts">
  let { class: className = 'w-6 h-6' }: { class?: string } = $props();
</script>

<svg
  class={className}
  fill="none"
  stroke="currentColor"
  viewBox="0 0 24 24"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <!-- Crescent moon -->
  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
</svg>
