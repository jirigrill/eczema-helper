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
  <!-- Apple body: two-lobed top with a single rounded bottom -->
  <path d="M12 7c-1.2-1.6-3-2.4-4.6-2.1C5.6 5.2 4 7 4 9.5c0 4 3 9 6 9 1 0 1.5-.4 2-.4s1 .4 2 .4c3 0 6-5 6-9 0-2.5-1.6-4.3-3.4-4.6C14.9 4.6 13.2 5.4 12 7Z" />
  <!-- Stem -->
  <path d="M12 7V4" />
  <!-- Leaf -->
  <path d="M12 5c1-1.5 2.5-2 4-2-.2 1.6-1.3 2.8-2.8 3" />
</svg>
