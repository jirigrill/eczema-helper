<script lang="ts">
  import type { CategoryWithItems } from '$lib/domain/services/food-tracking.service';
  import { formatDateLong } from '$lib/utils/calendar';
  import { cs } from '$lib/i18n/cs';

  let {
    inspectedDate,
    eliminated,
    reintroduced,
    onClose,
  }: {
    inspectedDate: string | null;
    eliminated: CategoryWithItems[];
    reintroduced: CategoryWithItems[];
    onClose: () => void;
  } = $props();
</script>

<div class="mx-3 mt-2 mb-3 bg-white rounded-xl border border-surface-dark overflow-hidden {inspectedDate ? 'animate-fadeIn' : ''}">
  <div class="flex items-center justify-between px-4 pt-3 pb-2">
    <h3 class="text-sm font-semibold text-text">
      {inspectedDate ? formatDateLong(inspectedDate) : cs.today}
    </h3>
    {#if inspectedDate}
      <button
        type="button"
        class="p-1 text-text-muted hover:text-text"
        onclick={onClose}
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    {/if}
  </div>

  {#if eliminated.length === 0 && reintroduced.length === 0}
    <div class="px-4 pb-4 text-sm text-text-muted">{cs.noRecords}</div>
  {:else}
    {#if eliminated.length > 0}
      <div class="px-4 pb-2">
        <p class="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1.5">{cs.eliminated}</p>
        <div class="space-y-0.5">
          {#each eliminated as entry (entry.category.id)}
            <div class="flex items-center gap-2 py-1">
              <span class="text-base">{entry.category.icon}</span>
              <div>
                <span class="text-sm text-text">{entry.category.nameCs}</span>
                {#if entry.items.length > 0}
                  <span class="text-xs text-text-muted ml-1">({entry.items.map(i => i.nameCs).join(', ')})</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    {#if reintroduced.length > 0}
      <div class="px-4 pb-3 {eliminated.length > 0 ? 'pt-2 border-t border-surface-dark mt-2' : ''}">
        <p class="text-[10px] uppercase tracking-wider text-[#4A7C6F] font-semibold mb-1.5">{cs.reintroduced}</p>
        <div class="space-y-0.5">
          {#each reintroduced as entry (entry.category.id)}
            <div class="flex items-center gap-2 py-1">
              <span class="text-base">{entry.category.icon}</span>
              <div>
                <span class="text-sm text-text">{entry.category.nameCs}</span>
                {#if entry.items.length > 0}
                  <span class="text-xs text-text-muted ml-1">({entry.items.map(i => i.nameCs).join(', ')})</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
  .animate-fadeIn { animation: fadeIn 0.15s ease-out; }
</style>
