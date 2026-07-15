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

  const shell =
    'bg-white border border-surface-dark rounded-xl p-3 flex items-center justify-between w-full text-left';
</script>

{#if onEdit}
  <button class={shell} onclick={onEdit}>
    <div>
      <p class="text-text-muted text-[10px] tracking-wide uppercase">{label}</p>
      <p class="text-text text-sm font-semibold">{value}</p>
    </div>
    <span class="text-primary text-xs font-semibold">Upravit ›</span>
  </button>
{:else}
  <div class={shell}>
    <div>
      <p class="text-text-muted text-[10px] tracking-wide uppercase">{label}</p>
      <p class="text-text text-sm font-semibold">{value}</p>
    </div>
  </div>
{/if}
