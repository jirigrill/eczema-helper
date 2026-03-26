<script lang="ts">
  // Protected area — auth guard will be wired in Phase 1
  let { children } = $props();
</script>

{@render children()}
