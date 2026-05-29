<script lang="ts">
  import type { SkinObservation, ProtocolAllergenId } from '$lib/domain/models';
  import { categoryConfig } from '$lib/config/categories';
  import { actionStrings } from '$lib/strings/actions';
  import { commonStrings } from '$lib/strings/common';

  let {
    date,
    assessment = undefined,
    reintroductionAllergenId = null,
    onSave,
  }: {
    date: string;
    assessment?: SkinObservation | undefined;
    reintroductionAllergenId?: string | null;
    onSave: (a: SkinObservation) => void;
  } = $props();

  type Status = SkinObservation['status'];

  type StateVariant = 'success' | 'neutral' | 'warning' | 'danger';
  const statusOptions: { value: Status; label: string; icon: string; state: StateVariant }[] = [
    { value: 'improved',    label: commonStrings.program.skinOutcomes.improved,      icon: '✓',  state: 'success' },
    { value: 'unchanged',   label: commonStrings.program.skinOutcomes.unchanged,     icon: '—',  state: 'neutral' },
    { value: 'worsened',    label: commonStrings.program.skinOutcomes.worsened,      icon: '!',  state: 'warning' },
    { value: 'new-lesions', label: commonStrings.program.skinOutcomes['new-lesions'],icon: '!!', state: 'danger' },
  ];

  let selectedStatus = $state<Status | null>(assessment?.status ?? null);
  let notes = $state(assessment?.notes ?? '');
  let photoTaken = $state(false);
  let saved = $state(!!assessment);

  const allergenCfg = $derived(reintroductionAllergenId ? categoryConfig[reintroductionAllergenId as ProtocolAllergenId] ?? null : null);

  function save() {
    if (!selectedStatus) return;
    const obs: SkinObservation = {
      id: assessment?.id ?? crypto.randomUUID(),
      date,
      createdAt: assessment?.createdAt ?? new Date().toISOString(),
      status: selectedStatus,
      notes: notes.trim() || undefined,
    };
    onSave(obs);
    saved = true;
  }
</script>

<div class="card-base space-y-4">
  <div class="flex items-center justify-between">
    <p class="text-sm font-semibold text-text">{commonStrings.eczemaCheck.heading}</p>
    {#if saved}
      <span class="text-xs text-success font-medium">{commonStrings.eczemaCheck.savedLabel}</span>
    {/if}
  </div>

  {#if allergenCfg}
    <div data-state="success" class="border rounded-xl px-3 py-2">
      <p class="text-xs text-success font-medium">
        🔬 Sledujte reakci na {allergenCfg.icon} {allergenCfg.name}
      </p>
      <p class="text-xs text-text-muted mt-0.5">
        {commonStrings.eczemaCheck.reactionInstruction}
      </p>
    </div>
  {/if}

  <!-- 4 status buttons -->
  <div class="grid grid-cols-2 gap-2">
    {#each statusOptions as opt}
      <button
        type="button"
        data-state={selectedStatus === opt.value ? opt.state : undefined}
        class="flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all
          {selectedStatus === opt.value
            ? 'shadow-sm'
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
      placeholder={commonStrings.eczemaCheck.notePlaceholder}
      rows="2"
      class="input-base w-full px-3 py-2 bg-surface resize-none"
      oninput={() => (saved = false)}
    ></textarea>

    <!-- Photo toggle -->
    <button
      type="button"
      data-state={photoTaken ? 'success' : undefined}
      class="w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2 transition-all
        {photoTaken
          ? ''
          : 'bg-white border-surface-dark text-text-muted hover:border-primary/30'}"
      onclick={() => { photoTaken = !photoTaken; saved = false; }}
    >
      <span class="text-xl leading-none">{photoTaken ? '✅' : '📸'}</span>
      <span class="text-sm font-medium">
        {photoTaken ? actionStrings.photoTaken : actionStrings.markAsPhotographed}
      </span>
    </button>

    <button
      class="w-full py-3 rounded-xl font-semibold text-sm transition-all
        {saved ? 'bg-success/20 text-success' : 'bg-primary text-white'}"
      onclick={save}
      disabled={saved}
    >
      {saved ? actionStrings.savedAssessment : actionStrings.saveAssessment}
    </button>
  {/if}
</div>
