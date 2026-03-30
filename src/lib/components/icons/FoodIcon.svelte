<script lang="ts">
  let { class: className = 'w-6 h-6' }: { class?: string } = $props();
</script>

<svg class={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
  <!-- Fork -->
  <path stroke-linecap="round" stroke-linejoin="round" d="M7 3v4M7 7c0 1.5-1.5 2-1.5 4 0 1 .5 1.5 1.5 1.5s1.5-.5 1.5-1.5c0-2-1.5-2.5-1.5-4M7 12.5V21" />
  <path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M9 3v4" />
  <!-- Knife -->
  <path stroke-linecap="round" stroke-linejoin="round" d="M17 3v18M17 3c1.5 0 3 1 3 4s-1.5 4-3 4" />
</svg>
