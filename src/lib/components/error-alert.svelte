<script lang="ts">
  type Props = {
    message: string;
  };

  let { message }: Props = $props();
</script>

{#if message}
  <div class="mb-4 rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger">
    {message}
  </div>
{/if}
