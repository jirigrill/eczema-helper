<script lang="ts">
  let {
    label,
    value,
    onEdit,
  }: {
    label: string;
    value: string;
    onEdit?: () => void;
  } = $props();

  const shell = 'bg-white border border-surface-dark rounded-xl p-3 flex items-center justify-between w-full text-left';
</script>

{#if onEdit}
  <button class={shell} onclick={onEdit}>
    <div>
      <p class="text-[10px] text-text-muted uppercase tracking-wide">{label}</p>
      <p class="text-sm font-semibold text-text">{value}</p>
    </div>
    <span class="text-primary text-xs font-semibold">Upravit ›</span>
  </button>
{:else}
  <div class={shell}>
    <div>
      <p class="text-[10px] text-text-muted uppercase tracking-wide">{label}</p>
      <p class="text-sm font-semibold text-text">{value}</p>
    </div>
  </div>
{/if}
