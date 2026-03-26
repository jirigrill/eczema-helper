<script lang="ts">
  type Props = {
    message: string;
  };

  let { message }: Props = $props();
</script>

{#if message}
  <div class="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
    {message}
  </div>
{/if}
