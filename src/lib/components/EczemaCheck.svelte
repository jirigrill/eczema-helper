<script lang="ts">
  import type { SkinObservation } from '$lib/domain/models';
  import { randomUUID } from '$lib/utils/uuid';
  import { getCategoryConfig } from '$lib/config/categories';
  import { actionStrings } from '$lib/strings/actions';
  import { commonStrings, reactionBannerLabel } from '$lib/strings/common';

  let {
    date,
    assessment = undefined,
    reintroductionAllergenId = null,
    onSave,
    onPhotoCapture = undefined,
  }: {
    date: string;
    assessment?: SkinObservation | undefined;
    reintroductionAllergenId?: string | null;
    onSave: (a: SkinObservation) => void;
    onPhotoCapture?: (blob: Blob) => void;
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
  let photoCount = $state(0);
  let saved = $state(!!assessment);

  const allergenCfg = $derived(reintroductionAllergenId ? getCategoryConfig(reintroductionAllergenId) ?? null : null);

  function save() {
    if (!selectedStatus) return;
    const obs: SkinObservation = {
      id: assessment?.id ?? randomUUID(),
      date,
      createdAt: assessment?.createdAt ?? new Date().toISOString(),
      status: selectedStatus,
      notes: notes.trim() || undefined,
    };
    onSave(obs);
    saved = true;
  }

  function handleFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    onPhotoCapture?.(file);
    photoCount += 1;
    (e.target as HTMLInputElement).value = '';
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
        {reactionBannerLabel(allergenCfg.icon, allergenCfg.name)}
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

  <!-- Photo capture — independent of status selection -->
  <input
    id="photo-capture-input"
    type="file"
    accept="image/*"
    capture="environment"
    aria-label={actionStrings.addPhoto}
    class="sr-only"
    onchange={handleFileChange}
  />
  <label
    for="photo-capture-input"
    class="w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2 cursor-pointer transition-all
      {photoCount > 0
        ? 'border-success/50 bg-success/5 text-success'
        : 'bg-white border-surface-dark text-text-muted hover:border-primary/30'}"
    data-photo-taken={photoCount > 0 ? 'true' : 'false'}
  >
    <span class="text-xl leading-none">{photoCount > 0 ? '✅' : '📸'}</span>
    <span class="text-sm font-medium">
      {photoCount > 0 ? `${actionStrings.photoTaken} (${photoCount})` : actionStrings.addPhoto}
    </span>
  </label>

  {#if selectedStatus}
    <!-- Notes -->
    <textarea
      bind:value={notes}
      placeholder={commonStrings.eczemaCheck.notePlaceholder}
      rows="2"
      class="input-base w-full px-3 py-2 bg-surface resize-none"
      oninput={() => (saved = false)}
    ></textarea>

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
