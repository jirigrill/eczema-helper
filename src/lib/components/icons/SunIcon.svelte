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
  <circle cx="12" cy="12" r="4" />
  <path d="M12 3v2" />
  <path d="M12 19v2" />
  <path d="M3 12h2" />
  <path d="M19 12h2" />
  <path d="m5.6 5.6 1.4 1.4" />
  <path d="m17 17 1.4 1.4" />
  <path d="m5.6 18.4 1.4-1.4" />
  <path d="m17 7 1.4-1.4" />
</svg>
