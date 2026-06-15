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
  <!-- Sun half above the horizon -->
  <path d="M5 17h14" />
  <path d="M3 21h18" />
  <path d="M7 17a5 5 0 0 1 10 0" />
  <!-- Sun rays -->
  <path d="M12 4v3" />
  <path d="M5.5 8.5 7 10" />
  <path d="M18.5 8.5 17 10" />
  <path d="M3 13h2" />
  <path d="M19 13h2" />
</svg>
