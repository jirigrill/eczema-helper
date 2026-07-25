<script lang="ts">
  let { class: className = 'w-6 h-6' }: { class?: string } = $props();
</script>

<svg
  class={className}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.4"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <circle cx="12" cy="6.4" r="4" />
  <path d="M11.4 2.6c1.5-.2 2.5 1 1.9 2.2-.3.6-.9.8-1.5.6" />
  <circle cx="10.2" cy="6.3" r=".85" fill="currentColor" stroke="none" />
  <circle cx="13.8" cy="6.3" r=".85" fill="currentColor" stroke="none" />
  <path d="M10.6 8c.4.4.9.6 1.4.6s1-.2 1.4-.6" />
  <path d="M8.7 11c-1.7.9-2.8 2.6-2.8 4.6 0 1 .7 1.9 1.7 2.1" />
  <path d="M15.3 11c1.7.9 2.8 2.6 2.8 4.6 0 1-.7 1.9-1.7 2.1" />
  <path d="M9.8 15.4h4.4l-2.2 3Z" />
  <path d="M6.9 17.7c-.7.5-1.6.1-1.6-.8" />
  <path d="M17.1 17.7c.7.5 1.6.1 1.6-.8" />
</svg>
