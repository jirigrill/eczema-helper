<!--
  THROWAWAY PROTOTYPE — delete once folded into the real /skin route + model.

  Round 10 flow (replaces round 9 tap rule + photo placement):
    - Tap INACTIVE region -> activate ONLY. Level unchanged (klidné stays klidné).
    - Tap ACTIVE region -> cycle level 0→1→2→3→0 (klidné→mírné→střední→silné→klidné).
    - Active = bordeaux border. Logged-inactive = severity color border. Calm = hairline.
    - Photo button "Přidat fotku · <region>" works on active region regardless of level
      (klidné+foto is allowed; baseline photos legit).
    - No per-tile photo cue. Once region is logged-inactive klidné+foto, the tile is
      visually identical to never-touched klidné. Photo discovery happens in the gallery.
    - GLOBAL gallery below grid: chronological insertion order, 3 per row, 96px thumbs,
      region title wraps below thumb, × delete top-right of thumb. Tap thumb -> lightbox.
    - Lightbox: × top-right + tap-backdrop both close.
    - Vanish when no photos.

  No persistence. In-memory mock. Real file input.
-->
<script lang="ts">
  type Level = 0 | 1 | 2 | 3; // 0 klidné, 1 mírné, 2 střední, 3 silné
  type Photo = { id: string; region: string; url: string };

  const sev = [
    { v: 1 as Level, label: 'Mírné', hex: '#D9A82E' },
    { v: 2 as Level, label: 'Střední', hex: '#C97027' },
    { v: 3 as Level, label: 'Silné', hex: '#B84444' },
  ];
  const sevHex = (v: Level) => (v ? sev.find((s) => s.v === v)!.hex : '');
  const sevLabel = (v: Level) => (v ? sev.find((s) => s.v === v)!.label : 'klidné');

  const regions = ['Tváře', 'Vlasová část', 'Krk', 'Břicho', 'Záda', 'Paže', 'Loketní jamky', 'Podkolení', 'Nohy'];

  let level = $state<Record<string, Level>>(
    Object.fromEntries(regions.map((r) => [r, 0])) as Record<string, Level>,
  );
  let gallery = $state<Photo[]>([]); // chronological, all regions
  let active = $state<string | null>(null);
  let enlarged = $state<string | null>(null);
  let note = $state('');

  const photoCount = (r: string) => gallery.filter((p) => p.region === r).length;
  const isLogged = (r: string) => level[r] > 0 || photoCount(r) > 0;
  const loggedRegions = $derived(regions.filter(isLogged));

  function tapRegion(r: string) {
    if (active !== r) {
      active = r; // activate only, no auto-init
    } else {
      level = { ...level, [r]: ((level[r] + 1) % 4) as Level }; // cycle incl. klidné
    }
  }

  function addPhoto(e: Event) {
    if (!active) return;
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (!files) return;
    for (const f of files) {
      gallery = [...gallery, { id: crypto.randomUUID(), region: active, url: URL.createObjectURL(f) }];
    }
    input.value = '';
  }

  function removePhoto(id: string) {
    gallery = gallery.filter((p) => p.id !== id);
  }
</script>

<div class="page-container pb-32">
  <div class="sticky top-0 bg-surface z-20 -mx-4 px-4 py-2.5 flex items-center gap-3 border-b border-surface-dark">
    <button class="text-text leading-none text-lg" onclick={() => history.back()}>‹</button>
    <h1 class="body-bold flex-1">Stav kůže</h1>
    <span class="caption">Po · 22. 6.</span>
  </div>

  <div class="pt-4">
    <div class="card-base space-y-4">
      <div class="flex items-center justify-between">
        <p class="eyebrow">Kde a jak moc</p>
        <span class="caption">ťukni = vyber · znovu = míra</span>
      </div>

      <!-- region grid: tap to activate, tap-active to cycle severity -->
      <div class="grid grid-cols-3 gap-2">
        {#each regions as r}
          {@const isActive = active === r}
          <button
            type="button"
            onclick={() => tapRegion(r)}
            class="aspect-square rounded-xl flex flex-col items-center justify-center gap-1 p-1 transition-all {isActive ? 'border-[3px]' : 'border-2'}"
            style="
              border-color:{isActive ? '#8B4557' : level[r] ? sevHex(level[r]) + '80' : '#EDE8E9'};
              background:{level[r] ? sevHex(level[r]) + '22' : '#fff'}"
          >
            <span
              class="w-4 h-4 rounded-full"
              style="background:{level[r] ? sevHex(level[r]) : '#EDE8E9'}"
            ></span>
            <span class="text-[11px] font-medium text-text text-center leading-tight">{r}</span>
            <span class="text-[9px] text-text-muted">{sevLabel(level[r])}</span>
          </button>
        {/each}
      </div>

      <!-- contextual photo button for active region -->
      {#if active}
        <input id="P" type="file" accept="image/*" multiple class="sr-only" onchange={addPhoto} />
        <label
          for="P"
          class="w-full flex items-center justify-center px-3 py-2.5 rounded-xl bg-white border-2 border-primary text-primary text-sm font-semibold cursor-pointer"
        >
          Přidat fotku · {active}
        </label>
      {:else}
        <p class="caption text-center">Ťukni na oblast, kde je ekzém.</p>
      {/if}

      <!-- global gallery: chronological, 3 per row, all regions mixed -->
      {#if gallery.length}
        <div class="grid grid-cols-3 gap-2">
          {#each gallery as p (p.id)}
            <div class="space-y-1">
              <div class="relative">
                <button type="button" onclick={() => (enlarged = p.url)} class="block w-full">
                  <img src={p.url} alt="kůže — {p.region}" class="w-full aspect-square object-cover rounded-lg" />
                </button>
                <button
                  type="button"
                  onclick={() => removePhoto(p.id)}
                  aria-label="smazat foto"
                  class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-text text-white text-[11px] flex items-center justify-center shadow"
                >×</button>
              </div>
              <p class="text-[10px] text-text-muted text-center leading-tight break-words">{p.region}</p>
            </div>
          {/each}
        </div>
      {/if}

      <textarea
        bind:value={note}
        placeholder="Poznámka (nepovinné)"
        rows="2"
        class="input-base w-full resize-none"
      ></textarea>

      <button
        class="w-full py-3 rounded-xl font-semibold text-sm {loggedRegions.length ? 'bg-primary text-white' : 'bg-surface-dark text-text-muted'}"
        disabled={!loggedRegions.length}
      >
        {loggedRegions.length
          ? `Uložit stav · ${loggedRegions.length} ${loggedRegions.length === 1 ? 'oblast' : 'oblasti'}`
          : 'Uložit stav'}
      </button>
    </div>
  </div>
</div>

<!-- lightbox: × top-right + tap-backdrop, both close -->
{#if enlarged}
  <button
    class="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4"
    aria-label="zavřít"
    onclick={() => (enlarged = null)}
  >
    <img src={enlarged} alt="zvětšená fotka" class="max-w-full max-h-full object-contain rounded-lg" />
  </button>
  <button
    type="button"
    onclick={(e) => {
      e.stopPropagation();
      enlarged = null;
    }}
    aria-label="zavřít detail"
    class="fixed top-4 right-4 z-[71] w-10 h-10 rounded-full bg-white/90 text-text text-xl flex items-center justify-center shadow"
  >×</button>
{/if}
