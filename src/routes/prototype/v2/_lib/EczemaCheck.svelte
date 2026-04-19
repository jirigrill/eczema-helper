<script lang="ts">
  import type { DailyAssessment } from './types';
  import { getCategoryBySlug } from './data';

  let {
    date,
    assessment = undefined,
    reintroductionAllergenSlug = null,
    onSave,
  }: {
    date: string;
    assessment?: DailyAssessment | undefined;
    reintroductionAllergenSlug?: string | null;
    onSave: (a: DailyAssessment) => void;
  } = $props();

  type Status = DailyAssessment['status'];

  const statusOptions: { value: Status; label: string; icon: string; color: string }[] = [
    { value: 'improved',    label: 'Zlepšení',     icon: '✓',  color: 'bg-success/10 border-success/40 text-success' },
    { value: 'unchanged',   label: 'Beze změny',   icon: '—',  color: 'bg-surface border-surface-dark text-text' },
    { value: 'worsened',    label: 'Zhoršení',     icon: '!',  color: 'bg-warning/10 border-warning/40 text-warning' },
    { value: 'new-lesions', label: 'Nová ložiska', icon: '!!', color: 'bg-danger/10 border-danger/40 text-danger' },
  ];

  let selectedStatus = $state<Status | null>(assessment?.status ?? null);
  let notes = $state(assessment?.notes ?? '');
  let photoTaken = $state(assessment?.photoTaken ?? false);
  let saved = $state(!!assessment);

  const allergenCat = $derived(reintroductionAllergenSlug ? getCategoryBySlug(reintroductionAllergenSlug) : null);

  function save() {
    if (!selectedStatus) return;
    onSave({ date, status: selectedStatus, notes: notes.trim() || undefined, photoTaken });
    saved = true;
  }
</script>

<div class="bg-white rounded-2xl border border-surface-dark p-4 space-y-4">
  <div class="flex items-center justify-between">
    <p class="text-sm font-semibold text-text">Stav kůže miminka</p>
    {#if saved}
      <span class="text-xs text-success font-medium">✓ Uloženo</span>
    {/if}
  </div>

  {#if allergenCat}
    <div class="bg-success/10 border border-success/20 rounded-xl px-3 py-2">
      <p class="text-xs text-success font-medium">
        🔬 Sledujte reakci na {allergenCat.icon} {allergenCat.nameCs}
      </p>
      <p class="text-xs text-text-muted mt-0.5">
        Zaznamenejte jakékoliv změny kůže po zavedení tohoto alergenu.
      </p>
    </div>
  {/if}

  <!-- 4 status buttons -->
  <div class="grid grid-cols-2 gap-2">
    {#each statusOptions as opt}
      <button
        type="button"
        class="flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all
          {selectedStatus === opt.value
            ? opt.color + ' border-opacity-100 shadow-sm'
            : 'bg-white border-surface-dark text-text hover:border-primary/30'}"
        onclick={() => { selectedStatus = opt.value; saved = false; }}
      >
        <span class="text-xl leading-none">{opt.icon}</span>
        <span class="leading-tight">{opt.label}</span>
      </button>
    {/each}
  </div>

  {#if selectedStatus}
    <!-- Notes -->
    <textarea
      bind:value={notes}
      placeholder="Poznámka (volitelné) — např. zarudnutí na tváři…"
      rows="2"
      class="w-full rounded-xl border border-surface-dark px-3 py-2 text-sm text-text resize-none
        focus:outline-none focus:ring-2 focus:ring-primary/40 bg-surface"
      oninput={() => (saved = false)}
    ></textarea>

    <!-- Photo toggle -->
    <button
      type="button"
      class="w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2 transition-all
        {photoTaken
          ? 'bg-success/10 border-success/40 text-success'
          : 'bg-white border-surface-dark text-text-muted hover:border-primary/30'}"
      onclick={() => { photoTaken = !photoTaken; saved = false; }}
    >
      <span class="text-xl leading-none">{photoTaken ? '✅' : '📸'}</span>
      <span class="text-sm font-medium">
        {photoTaken ? 'Fotka pořízena' : 'Označit jako vyfocenou'}
      </span>
    </button>

    <button
      class="w-full py-3 rounded-xl font-semibold text-sm transition-all
        {saved ? 'bg-success/20 text-success' : 'bg-primary text-white'}"
      onclick={save}
      disabled={saved}
    >
      {saved ? '✓ Uloženo' : 'Uložit hodnocení'}
    </button>
  {/if}
</div>
