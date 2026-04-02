<script lang="ts">
  // ═══════════════════════════════════════════════════════════
  // PROTOTYPE v5 — Draft editing, per-date data, fixed save bar
  // ═══════════════════════════════════════════════════════════

  type SubItem = { id: string; name: string };
  type Category = { id: string; name: string; icon: string; subItems: SubItem[] };
  type DayInfo = { date: string; dayNumber: number; isCurrentMonth: boolean; isToday: boolean };
  type DateData = { eliminated: Set<string>; reintroduced: Set<string> };

  const CATEGORIES: Category[] = [
    { id: 'dairy', name: 'Mléčné', icon: '🥛', subItems: [
      { id: 'milk', name: 'Mléko' }, { id: 'cheese', name: 'Sýr' },
      { id: 'yogurt', name: 'Jogurt' }, { id: 'butter-dairy', name: 'Máslo' },
    ]},
    { id: 'eggs', name: 'Vejce', icon: '🥚', subItems: [] },
    { id: 'grains', name: 'Obiloviny', icon: '🌾', subItems: [
      { id: 'wheat', name: 'Pšenice' }, { id: 'rye', name: 'Žito' },
      { id: 'barley', name: 'Ječmen' }, { id: 'oats', name: 'Oves' },
    ]},
    { id: 'nuts', name: 'Ořechy', icon: '🥜', subItems: [
      { id: 'walnut', name: 'Vlašské ořechy' }, { id: 'hazelnut', name: 'Lískové ořechy' },
      { id: 'cashew', name: 'Kešu' }, { id: 'almond', name: 'Mandle' },
      { id: 'peanut', name: 'Arašídy' },
    ]},
    { id: 'fish', name: 'Ryby', icon: '🐟', subItems: [] },
    { id: 'shellfish', name: 'Korýši', icon: '🦐', subItems: [] },
    { id: 'legumes', name: 'Luštěniny', icon: '🫘', subItems: [
      { id: 'soy', name: 'Sója' }, { id: 'lentil', name: 'Čočka' },
      { id: 'chickpea', name: 'Cizrna' },
    ]},
    { id: 'fruit', name: 'Ovoce', icon: '🍎', subItems: [
      { id: 'citrus', name: 'Citrusy' }, { id: 'strawberry', name: 'Jahody' },
      { id: 'kiwi', name: 'Kiwi' },
    ]},
    { id: 'vegetables', name: 'Zelenina', icon: '🧅', subItems: [] },
    { id: 'meat', name: 'Maso', icon: '🥩', subItems: [] },
    { id: 'fats', name: 'Tuky', icon: '🧈', subItems: [] },
    { id: 'sweets', name: 'Sladkosti', icon: '🍫', subItems: [] },
  ];

  // ── Calendar ───────────────────────────────────────────────

  const today = new Date();
  const todayIso = fmtIso(today.getFullYear(), today.getMonth(), today.getDate());

  function fmtIso(y: number, m: number, d: number): string {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function getMonthDays(year: number, month: number): DayInfo[] {
    const firstDay = new Date(year, month, 1);
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;
    const days: DayInfo[] = [];
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: fmtIso(d.getFullYear(), d.getMonth(), d.getDate()), dayNumber: d.getDate(), isCurrentMonth: false, isToday: false });
    }
    const dim = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= dim; d++) {
      const iso = fmtIso(year, month, d);
      days.push({ date: iso, dayNumber: d, isCurrentMonth: true, isToday: iso === todayIso });
    }
    while (days.length < 42) {
      const d = new Date(year, month + 1, days.length - startDow - dim + 1);
      days.push({ date: fmtIso(d.getFullYear(), d.getMonth(), d.getDate()), dayNumber: d.getDate(), isCurrentMonth: false, isToday: false });
    }
    return days;
  }

  function getDatesInRange(start: string, end: string): string[] {
    const dates: string[] = [];
    const d = new Date(start + 'T00:00:00');
    const endD = new Date(end + 'T00:00:00');
    while (d <= endD) {
      dates.push(fmtIso(d.getFullYear(), d.getMonth(), d.getDate()));
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }

  function formatShort(iso: string): string {
    const d = new Date(iso + 'T00:00:00');
    return `${d.getDate()}. ${d.getMonth() + 1}.`;
  }

  function formatDateLong(iso: string): string {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' });
  }

  const WEEKDAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
  const MONTHS = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];

  function dayPlural(n: number): string {
    if (n === 1) return 'den'; if (n >= 2 && n <= 4) return 'dny'; return 'dní';
  }

  function key(catId: string, subId?: string): string {
    return subId ? `${catId}:${subId}` : catId;
  }

  // ── Committed Data (per-date) ──────────────────────────────

  // Pre-populate every April 2026 day
  function makeAprilData(): Record<string, DateData> {
    const data: Record<string, DateData> = {};
    for (let d = 1; d <= 30; d++) {
      const iso = fmtIso(2026, 3, d); // month 3 = April (0-indexed)
      data[iso] = {
        eliminated: new Set(['dairy:milk', 'dairy:cheese', 'eggs', 'grains:wheat']),
        reintroduced: new Set(['nuts:hazelnut']),
      };
    }
    return data;
  }

  let dataByDate = $state<Record<string, DateData>>(makeAprilData());

  function getDateData(date: string): DateData {
    return dataByDate[date] ?? { eliminated: new Set(), reintroduced: new Set() };
  }

  // ── State ──────────────────────────────────────────────────

  let year = $state(today.getFullYear());
  let month = $state(today.getMonth());
  let days = $derived(getMonthDays(year, month));

  let mode = $state<'view' | 'edit'>('view');
  let inspectedDate = $state<string | null>(todayIso);
  let rangeStart = $state<string | null>(null);
  let rangeEnd = $state<string | null>(null);
  let actionMode = $state<'eliminate' | 'reintroduce'>('eliminate');
  let expandedCategoryId = $state<string | null>(null);
  let toast = $state<{ message: string } | null>(null);

  // Draft: staged changes in edit mode, applied only on save
  // Snapshot of committed eliminated set at edit start (for reintro filter stability)
  let committedElimSnapshot = $state<Set<string>>(new Set());
  let draftEliminated = $state<Set<string>>(new Set());
  let draftReintroduced = $state<Set<string>>(new Set());

  // ── Committed state helpers (for view mode + calendar dots) ─

  function dateHasElim(date: string, catId: string, subId?: string): boolean {
    return getDateData(date).eliminated.has(key(catId, subId));
  }
  function dateHasReintro(date: string, catId: string, subId?: string): boolean {
    return getDateData(date).reintroduced.has(key(catId, subId));
  }

  function dateCatPartialElim(date: string, c: Category): boolean {
    return c.subItems.length === 0 ? dateHasElim(date, c.id) : c.subItems.some(si => dateHasElim(date, c.id, si.id));
  }
  function dateCatPartialReintro(date: string, c: Category): boolean {
    return c.subItems.length === 0 ? dateHasReintro(date, c.id) : c.subItems.some(si => dateHasReintro(date, c.id, si.id));
  }

  function dateElimCount(date: string): number {
    return CATEGORIES.filter(c => dateCatPartialElim(date, c)).length;
  }
  function dateReintroCount(date: string): number {
    return CATEGORIES.filter(c => dateCatPartialReintro(date, c)).length;
  }

  function dateEliminatedItems(date: string): Category[] {
    return CATEGORIES.filter(c => dateCatPartialElim(date, c));
  }
  function dateReintroducedItems(date: string): Category[] {
    return CATEGORIES.filter(c => dateCatPartialReintro(date, c) && !dateCatPartialElim(date, c));
  }

  // ── Draft helpers (edit mode toggles read from draft) ───────

  function draftIsElim(catId: string, subId?: string): boolean { return draftEliminated.has(key(catId, subId)); }
  function draftIsReintro(catId: string, subId?: string): boolean { return draftReintroduced.has(key(catId, subId)); }

  function draftCatFullElim(c: Category): boolean {
    return c.subItems.length === 0 ? draftIsElim(c.id) : c.subItems.every(si => draftIsElim(c.id, si.id));
  }
  function draftCatPartialElim(c: Category): boolean {
    return c.subItems.length === 0 ? draftIsElim(c.id) : c.subItems.some(si => draftIsElim(c.id, si.id));
  }
  function draftCatFullReintro(c: Category): boolean {
    return c.subItems.length === 0 ? draftIsReintro(c.id) : c.subItems.every(si => draftIsReintro(c.id, si.id));
  }
  function draftCatPartialReintro(c: Category): boolean {
    return c.subItems.length === 0 ? draftIsReintro(c.id) : c.subItems.some(si => draftIsReintro(c.id, si.id));
  }

  // Reintroduce filter: show categories that are eliminated OR already reintroduced
  // Based on snapshot (stable during edit session) so items don't vanish mid-edit
  let committedReintroSnapshot = $state<Set<string>>(new Set());

  function snapshotCatRelevantForReintro(c: Category): boolean {
    if (c.subItems.length === 0) {
      return committedElimSnapshot.has(key(c.id)) || committedReintroSnapshot.has(key(c.id));
    }
    return c.subItems.some(si =>
      committedElimSnapshot.has(key(c.id, si.id)) || committedReintroSnapshot.has(key(c.id, si.id))
    );
  }

  // ── Range ──────────────────────────────────────────────────

  const sortedRange = $derived.by(() => {
    if (!rangeStart) return null;
    if (!rangeEnd) return { start: rangeStart, end: rangeStart };
    return rangeStart <= rangeEnd ? { start: rangeStart, end: rangeEnd } : { start: rangeEnd, end: rangeStart };
  });
  function isInRange(date: string): boolean {
    if (!sortedRange) return false;
    return date >= sortedRange.start && date <= sortedRange.end;
  }
  function isRangeEndpoint(date: string): boolean { return date === rangeStart || date === rangeEnd; }
  const rangeDayCount = $derived.by(() => {
    if (!sortedRange) return 0;
    return Math.round((new Date(sortedRange.end + 'T00:00:00').getTime() - new Date(sortedRange.start + 'T00:00:00').getTime()) / 86400000) + 1;
  });

  // ── Color scheme ───────────────────────────────────────────

  const isReintroMode = $derived(mode === 'edit' && actionMode === 'reintroduce');
  const accentBg = $derived(isReintroMode ? 'bg-[#4A7C6F]' : 'bg-primary');
  const accentBgLight = $derived(isReintroMode ? 'bg-[#4A7C6F]/15' : 'bg-primary/15');
  const accentText = $derived(isReintroMode ? 'text-[#4A7C6F]' : 'text-primary');
  const toggleOnBg = $derived(isReintroMode ? 'bg-[#4A7C6F] border-[#4A7C6F]' : 'bg-primary border-primary');
  const toggleOnPartial = $derived(isReintroMode ? 'bg-[#4A7C6F]/30 border-[#4A7C6F]/50' : 'bg-primary/30 border-primary/50');
  const toggleRowActive = $derived(isReintroMode ? 'border-[#4A7C6F]/40 bg-[#4A7C6F]/5' : 'border-primary/40 bg-primary/5');
  const toggleRowPartial = $derived(isReintroMode ? 'border-[#4A7C6F]/20' : 'border-primary/20');

  // ── Actions ────────────────────────────────────────────────

  function prevMonth() { if (month === 0) { year--; month = 11; } else month--; }
  function nextMonth() { if (month === 11) { year++; month = 0; } else month++; }

  function handleDayClick(date: string) {
    if (mode === 'view') {
      inspectedDate = inspectedDate === date ? null : date;
    } else {
      if (!rangeStart) { rangeStart = date; rangeEnd = null; }
      else if (!rangeEnd) { rangeEnd = date; }
      else { rangeStart = date; rangeEnd = null; }
    }
  }

  function getPreviousDate(iso: string): string {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    return fmtIso(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function enterEditMode() {
    // If a day is inspected, use it as range start
    const startDate = inspectedDate ?? todayIso;
    rangeStart = startDate;
    rangeEnd = null;
    mode = 'edit'; inspectedDate = null; expandedCategoryId = null;

    // Initialize draft from the day before the range start (carry forward)
    const prevDate = getPreviousDate(startDate);
    const sourceData = getDateData(startDate);
    const prevData = getDateData(prevDate);
    // Use the selected day's data if it has any, otherwise inherit from previous day
    const hasData = sourceData.eliminated.size > 0 || sourceData.reintroduced.size > 0;
    const seed = hasData ? sourceData : prevData;
    draftEliminated = new Set(seed.eliminated);
    draftReintroduced = new Set(seed.reintroduced);
    committedElimSnapshot = new Set(seed.eliminated);
    committedReintroSnapshot = new Set(seed.reintroduced);
  }

  function cancelEdit() {
    mode = 'view'; rangeStart = null; rangeEnd = null; expandedCategoryId = null;
  }

  function saveAndExit() {
    // Apply draft to every date in range
    if (sortedRange) {
      const dates = getDatesInRange(sortedRange.start, sortedRange.end);
      const updated = { ...dataByDate };
      for (const date of dates) {
        updated[date] = {
          eliminated: new Set(draftEliminated),
          reintroduced: new Set(draftReintroduced),
        };
      }
      dataByDate = updated;
    }

    const count = rangeDayCount;
    toast = { message: count > 0 ? `Uloženo pro ${count} ${dayPlural(count)}` : 'Uloženo' };
    setTimeout(() => { toast = null; }, 2000);
    mode = 'view'; rangeStart = null; rangeEnd = null; expandedCategoryId = null;
  }

  // Draft toggles — mutate draft sets, don't touch committed data
  function draftToggleElim(catId: string, subId?: string) {
    const k = key(catId, subId);
    const nE = new Set(draftEliminated), nR = new Set(draftReintroduced);
    if (nE.has(k)) nE.delete(k); else { nE.add(k); nR.delete(k); }
    draftEliminated = nE; draftReintroduced = nR;
  }

  function draftToggleReintro(catId: string, subId?: string) {
    const k = key(catId, subId);
    const nR = new Set(draftReintroduced), nE = new Set(draftEliminated);
    if (nR.has(k)) nR.delete(k); else { nR.add(k); nE.delete(k); }
    draftReintroduced = nR; draftEliminated = nE;
  }

  function draftToggleGroupElim(cat: Category) {
    if (cat.subItems.length === 0) { draftToggleElim(cat.id); return; }
    const all = cat.subItems.every(si => draftIsElim(cat.id, si.id));
    const nE = new Set(draftEliminated), nR = new Set(draftReintroduced);
    for (const si of cat.subItems) { const k = key(cat.id, si.id); if (all) nE.delete(k); else { nE.add(k); nR.delete(k); } }
    draftEliminated = nE; draftReintroduced = nR;
  }

  function draftToggleGroupReintro(cat: Category) {
    if (cat.subItems.length === 0) { draftToggleReintro(cat.id); return; }
    const all = cat.subItems.every(si => draftIsReintro(cat.id, si.id));
    const nR = new Set(draftReintroduced), nE = new Set(draftEliminated);
    for (const si of cat.subItems) { const k = key(cat.id, si.id); if (all) nR.delete(k); else { nR.add(k); nE.delete(k); } }
    draftReintroduced = nR; draftEliminated = nE;
  }

  function toggleExpand(catId: string) { expandedCategoryId = expandedCategoryId === catId ? null : catId; }

  function isToggleOn(cat: Category): boolean {
    if (actionMode === 'eliminate') return draftCatFullElim(cat);
    return draftCatFullReintro(cat);
  }
  function isTogglePartial(cat: Category): boolean {
    if (actionMode === 'eliminate') return !draftCatFullElim(cat) && draftCatPartialElim(cat);
    return !draftCatFullReintro(cat) && draftCatPartialReintro(cat);
  }
  function isSubToggleOn(catId: string, siId: string): boolean {
    return actionMode === 'eliminate' ? draftIsElim(catId, siId) : draftIsReintro(catId, siId);
  }
  function handleGroupToggle(cat: Category) {
    actionMode === 'eliminate' ? draftToggleGroupElim(cat) : draftToggleGroupReintro(cat);
  }
  function handleSubToggle(catId: string, siId: string) {
    actionMode === 'eliminate' ? draftToggleElim(catId, siId) : draftToggleReintro(catId, siId);
  }
</script>

<div class="min-h-screen" style:padding-bottom={mode === 'edit' ? 'calc(4.5rem + 3.5rem + var(--safe-area-inset-bottom))' : '0'}>

  <!-- Header -->
  <div class="sticky top-0 z-40 bg-white border-b border-surface-dark px-4 py-2 flex items-center gap-2">
    {#if mode === 'view'}
      <h1 class="text-base font-semibold text-text flex-1">Kalendář</h1>
      <button type="button" class="flex items-center gap-1.5 text-sm text-primary font-medium px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors" onclick={enterEditMode}>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        Upravit
      </button>
    {:else}
      <button type="button" class="text-sm text-text-muted font-medium px-3 py-1.5 rounded-lg hover:bg-surface transition-colors" onclick={cancelEdit}>Zrušit</button>
      <h1 class="text-base font-semibold flex-1 text-center {accentText}">
        {actionMode === 'eliminate' ? 'Vyřazení' : 'Znovuzavedení'}
      </h1>
      <div class="w-16"></div>
    {/if}
  </div>

  <!-- Calendar -->
  <div class="px-2 pt-1">
    <div class="flex items-center justify-between px-2 py-1">
      <button type="button" class="p-2 rounded-lg hover:bg-surface" onclick={prevMonth}>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button type="button" class="text-sm font-semibold text-text" onclick={() => { year = today.getFullYear(); month = today.getMonth(); }}>
        {MONTHS[month]} {year}
      </button>
      <button type="button" class="p-2 rounded-lg hover:bg-surface" onclick={nextMonth}>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>

    <div class="grid grid-cols-7">
      {#each WEEKDAYS as name}
        <div class="text-center text-[10px] text-text-muted font-medium py-0.5">{name}</div>
      {/each}
    </div>

    <div class="grid grid-cols-7 gap-px">
      {#each days as day (day.date)}
        {@const inRange = mode === 'edit' && isInRange(day.date)}
        {@const endpoint = mode === 'edit' && isRangeEndpoint(day.date)}
        {@const inspected = mode === 'view' && inspectedDate === day.date}
        {@const eCount = dateElimCount(day.date)}
        {@const rCount = dateReintroCount(day.date)}
        <button
          type="button"
          class="
            relative flex flex-col items-center justify-center
            h-10 w-full transition-colors
            {day.isCurrentMonth ? '' : 'opacity-30'}
            {endpoint
              ? `${accentBg} text-white font-bold rounded-lg`
              : inRange
                ? `${accentBgLight} ${accentText} font-medium`
                : inspected
                  ? 'bg-primary/20 text-primary font-semibold rounded-lg ring-2 ring-primary/30'
                  : day.isToday
                    ? 'text-primary font-bold'
                    : 'text-text'}
          "
          onclick={() => handleDayClick(day.date)}
        >
          <span class="text-xs leading-none">{day.dayNumber}</span>
          {#if day.isCurrentMonth && (eCount > 0 || rCount > 0)}
            <div class="flex gap-px mt-0.5">
              {#each { length: Math.min(eCount, 3) } as _}
                <span class="block h-1 w-1 rounded-full {endpoint ? 'bg-white/70' : 'bg-primary'}"></span>
              {/each}
              {#each { length: Math.min(rCount, 2) } as _}
                <span class="block h-1 w-1 rounded-full {endpoint ? 'bg-white/50' : 'bg-[#4A7C6F]'}"></span>
              {/each}
            </div>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <!-- ═══════ VIEW MODE ═══════ -->
  {#if mode === 'view'}
    {@const viewDate = inspectedDate ?? todayIso}
    {@const viewElim = dateEliminatedItems(viewDate)}
    {@const viewReintro = dateReintroducedItems(viewDate)}

    <div class="mx-3 mt-2 mb-3 bg-white rounded-xl border border-surface-dark overflow-hidden {inspectedDate ? 'animate-fadeIn' : ''}">
      <div class="flex items-center justify-between px-4 pt-3 pb-2">
        <h3 class="text-sm font-semibold text-text">
          {inspectedDate ? formatDateLong(inspectedDate) : 'Dnes'}
        </h3>
        {#if inspectedDate}
          <button type="button" class="p-1 text-text-muted hover:text-text" onclick={() => (inspectedDate = null)}>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        {/if}
      </div>

      {#if viewElim.length === 0 && viewReintro.length === 0}
        <div class="px-4 pb-4 text-sm text-text-muted">Žádné záznamy</div>
      {:else}
        {#if viewElim.length > 0}
          <div class="px-4 pb-1">
            <p class="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1.5">Vyřazeno</p>
            <div class="space-y-1">
              {#each viewElim as cat (cat.id)}
                <div class="flex items-center gap-2 py-1">
                  <span class="text-base">{cat.icon}</span>
                  <span class="flex-1 text-sm text-text">{cat.name}</span>
                  <span class="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center">
                    <span class="text-[10px] text-primary font-bold">✕</span>
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
        {#if viewReintro.length > 0}
          <div class="px-4 pb-3 {viewElim.length > 0 ? 'pt-2 border-t border-surface-dark mt-2' : ''}">
            <p class="text-[10px] uppercase tracking-wider text-[#4A7C6F] font-semibold mb-1.5">Znovuzavedeno</p>
            <div class="space-y-1">
              {#each viewReintro as cat (cat.id)}
                <div class="flex items-center gap-2 py-1">
                  <span class="text-base">{cat.icon}</span>
                  <span class="flex-1 text-sm text-text">{cat.name}</span>
                  <span class="h-5 w-5 rounded-full bg-[#4A7C6F]/15 flex items-center justify-center">
                    <span class="text-[10px] text-[#4A7C6F] font-bold">✓</span>
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {/if}
    </div>

  <!-- ═══════ EDIT MODE ═══════ -->
  {:else}

    {#if !rangeStart}
      <div class="mx-4 mt-3 text-xs text-text-muted text-center">Klepněte na den pro začátek období</div>
    {:else if !rangeEnd}
      <div class="mx-4 mt-3 text-xs {accentText} text-center font-medium">Klepněte na druhý den pro konec</div>
    {/if}

    <div class="flex gap-1 mx-3 mt-3 p-0.5 bg-surface-dark rounded-lg">
      <button type="button"
        class="flex-1 py-1.5 rounded-md text-xs font-medium transition-colors {actionMode === 'eliminate' ? 'bg-primary text-white shadow-sm' : 'text-text-muted'}"
        onclick={() => (actionMode = 'eliminate')}>Vyřadit</button>
      <button type="button"
        class="flex-1 py-1.5 rounded-md text-xs font-medium transition-colors {actionMode === 'reintroduce' ? 'bg-[#4A7C6F] text-white shadow-sm' : 'text-text-muted'}"
        onclick={() => (actionMode = 'reintroduce')}>Zavést zpět</button>
    </div>

    <!-- Food toggles — reintroduce shows only items eliminated in snapshot -->
    {@const visibleCategories = actionMode === 'reintroduce'
      ? CATEGORIES.filter(c => snapshotCatRelevantForReintro(c))
      : CATEGORIES}
    {#if actionMode === 'reintroduce' && visibleCategories.length === 0}
      <div class="mx-4 mt-4 text-sm text-text-muted text-center">Žádné vyřazené potraviny k znovuzavedení</div>
    {/if}
    <div class="mt-2 mx-3 space-y-1">
      {#each visibleCategories as cat (cat.id)}
        {@const on = isToggleOn(cat)}
        {@const partial = isTogglePartial(cat)}
        {@const isExpanded = expandedCategoryId === cat.id}

        <div class="rounded-xl border overflow-hidden transition-colors
          {on ? toggleRowActive : partial ? toggleRowPartial : 'border-surface-dark bg-white'}">
          <div class="flex items-center gap-2 px-3 py-2">
            {#if cat.subItems.length > 0}
              <button type="button" class="flex items-center gap-2 flex-1 min-w-0" onclick={() => toggleExpand(cat.id)}>
                <span class="text-lg flex-none">{cat.icon}</span>
                <span class="text-sm font-medium text-text truncate">{cat.name}</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-text-muted flex-none transition-transform {isExpanded ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            {:else}
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <span class="text-lg flex-none">{cat.icon}</span>
                <span class="text-sm font-medium text-text truncate">{cat.name}</span>
              </div>
            {/if}
            <button type="button"
              class="flex-none h-7 w-12 rounded-full border-2 transition-colors flex items-center px-0.5
                {on ? `${toggleOnBg} justify-end` : partial ? `${toggleOnPartial} justify-end` : 'bg-surface-dark border-surface-dark justify-start'}"
              onclick={() => handleGroupToggle(cat)}>
              <span class="block h-5 w-5 rounded-full bg-white shadow-sm"></span>
            </button>
          </div>

          {#if isExpanded && cat.subItems.length > 0}
            <div class="border-t border-surface-dark bg-surface/50">
              {#each cat.subItems as si (si.id)}
                <!-- In reintroduce mode, only show sub-items that are eliminated in snapshot -->
                {#if actionMode === 'eliminate' || committedElimSnapshot.has(key(cat.id, si.id)) || committedReintroSnapshot.has(key(cat.id, si.id))}
                  {@const siOn = isSubToggleOn(cat.id, si.id)}
                  <div class="flex items-center gap-2 px-3 py-1.5 pl-10">
                    <span class="text-sm text-text flex-1 truncate">{si.name}</span>
                    <button type="button"
                      class="flex-none h-6 w-10 rounded-full border-2 transition-colors flex items-center px-0.5
                        {siOn ? `${toggleOnBg} justify-end` : 'bg-surface-dark border-surface-dark justify-start'}"
                      onclick={() => handleSubToggle(cat.id, si.id)}>
                      <span class="block h-4 w-4 rounded-full bg-white shadow-sm"></span>
                    </button>
                  </div>
                {/if}
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
    <div class="h-4"></div>
  {/if}
</div>

<!-- Floating Save Bar — positioned above bottom nav with safe area -->
{#if mode === 'edit'}
  <div class="fixed left-0 right-0 z-40 px-3 pb-1" style="bottom: calc(3.5rem + var(--safe-area-inset-bottom));">
    <div class="rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 border bg-white
      {isReintroMode ? 'border-[#4A7C6F]/30' : 'border-primary/30'}">
      <div class="flex-1 text-xs text-text-muted min-w-0">
        {#if sortedRange && rangeEnd}
          <span class="font-medium text-text">{formatShort(sortedRange.start)} – {formatShort(sortedRange.end)}</span>
          <span class="ml-1">({rangeDayCount} {dayPlural(rangeDayCount)})</span>
        {:else if rangeStart}
          <span class="font-medium text-text">{formatShort(rangeStart)}</span>
          <span class="ml-1">— vyberte konec</span>
        {:else}
          <span>Vyberte období</span>
        {/if}
      </div>
      <button type="button"
        class="flex-none text-white text-sm font-medium rounded-lg px-5 py-2 min-h-[44px] transition-all
          {isReintroMode ? 'bg-[#4A7C6F]' : 'bg-primary'}
          {rangeStart ? '' : 'opacity-40 pointer-events-none'}"
        onclick={saveAndExit} disabled={!rangeStart}>
        Uložit
      </button>
    </div>
  </div>
{/if}

<!-- Toast -->
{#if toast}
  <div class="fixed left-4 right-4 z-50 animate-slideUp" style="bottom: calc(3.5rem + var(--safe-area-inset-bottom) + 5rem);">
    <div class="bg-[#4A7C6F]/90 text-white rounded-lg px-4 py-3 flex items-center gap-2 shadow-lg">
      <span>✓</span>
      <span class="text-sm">{toast.message}</span>
    </div>
  </div>
{/if}

<style>
  @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
  .animate-slideUp { animation: slideUp 0.2s ease-out; }
  .animate-fadeIn { animation: fadeIn 0.15s ease-out; }
</style>
