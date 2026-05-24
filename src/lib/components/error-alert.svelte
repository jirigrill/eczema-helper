<script lang="ts">
  type Props = {
    message: string;
  };

  let { message }: Props = $props();
</script>

{#if message}
  <div data-state="danger" class="mb-4 rounded-xl border px-3 py-2 text-sm">
    {message}
  </div>
{/if}
