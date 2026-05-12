<script lang="ts">
  import { scheduleStore } from "$lib/stores/schedule";
  import {
    getPhaseForDate,
    getEliminatedSlugsForDate,
    getScheduleProgress,
  } from "$lib/domain/schedule";
  import { getCategoryById } from "$lib/data/categories";
  import { todayIso, addDays, formatDateLongCs } from "$lib/utils/date";
  import { getPhaseDisplay } from "$lib/utils/phase-display";

  const today = todayIso();

  const schedule = $derived($scheduleStore);
  const phase = $derived(schedule ? getPhaseForDate(schedule, today) : null);
  const eliminatedSlugs = $derived(
    schedule ? getEliminatedSlugsForDate(schedule, today) : [],
  );
  const progress = $derived(
    schedule ? getScheduleProgress(schedule, today) : null,
  );

  // Protocol allergens allowed today (in protocol but not currently eliminated)
  const protocolSlugs = $derived(
    schedule
      ? (schedule.phases.find((p) => p.type === "elimination")?.categoryIds ??
          [])
      : [],
  );
  const allowedProtocol = $derived(
    protocolSlugs.filter((s) => !eliminatedSlugs.includes(s)),
  );

  // 7-day strip: 6 days back + today
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  function weekdayShort(iso: string): string {
    return new Date(iso + "T00:00:00").toLocaleDateString("cs-CZ", {
      weekday: "short",
    });
  }

  function czechWeekday(iso: string): string {
    return new Date(iso + "T00:00:00").toLocaleDateString("cs-CZ", {
      weekday: "long",
    });
  }
</script>

<div class="max-w-lg mx-auto">
  <!-- Header -->
  <div class="px-5 pt-4 pb-2 flex items-end justify-between">
    <div>
      <div class="text-[11px] uppercase tracking-wide text-text-muted">
        {czechWeekday(today)} · {formatDateLongCs(today)}
      </div>
      <h2 class="text-2xl font-bold text-text">Dnes</h2>
    </div>
    <a
      href="/settings"
      class="text-text-muted p-1.5 -mr-1.5"
      aria-label="Nastavení"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="12" cy="12" r="3" />
        <path
          d="M19.4 15a1.7 1.7 0 0 0 .3 1.8 2 2 0 1 1-2.8 2.8 1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5 2 2 0 1 1-4 0 1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3 2 2 0 1 1-2.8-2.8 1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1 2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8 2 2 0 1 1 2.8-2.8 1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5 2 2 0 1 1 4 0 1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3 2 2 0 1 1 2.8 2.8 1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1 2 2 0 1 1 0 4 1.7 1.7 0 0 0-1.5 1z"
        />
      </svg>
    </a>
  </div>

  <!-- 7-day strip -->
  <div class="px-3 pb-3">
    <div class="grid grid-cols-7 gap-1">
      {#each weekDays as day}
        {@const isToday = day === today}
        <div
          class="flex flex-col items-center gap-1 py-2 rounded-lg
						{isToday ? 'bg-primary text-white' : 'text-text-muted'}"
        >
          <span class="text-[10px] uppercase">{weekdayShort(day)}</span>
          <span class="text-sm font-semibold"
            >{new Date(day + "T00:00:00").getDate()}</span
          >
          <span
            class="w-1.5 h-1.5 rounded-full {isToday
              ? 'bg-white/30 ring-1 ring-white'
              : 'bg-transparent'}"
          ></span>
        </div>
      {/each}
    </div>
  </div>

  <div class="px-4 pb-24 space-y-3">
    {#if !schedule}
      <div
        class="bg-white rounded-2xl border border-surface-dark p-6 text-center"
      >
        <p class="text-text-muted text-sm">
          Program není nastaven. Dokončete dotazník.
        </p>
        <a href="/" class="text-primary text-sm font-medium mt-2 inline-block"
          >Spustit dotazník →</a
        >
      </div>
    {:else}
      <!-- Phase hero -->
      <a
        href="/program"
        class="block bg-white rounded-2xl border border-surface-dark p-3.5 text-left"
      >
        <div class="flex items-center gap-2.5 mb-2">
          {#if phase}
            {@const display = getPhaseDisplay(phase.type)}
            <div
              class="w-9 h-9 rounded-lg {display.iconBg} flex items-center justify-center text-lg shrink-0"
            >
              {display.icon}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-sm font-bold text-text">{phase.label}</span>
                <span
                  class="text-[8px] font-extrabold tracking-wider rounded-full px-1.5 py-0.5 {display.badge}"
                >
                  {phase.type.toUpperCase()}
                </span>
              </div>
              {#if progress}
                <div class="text-[11px] text-text-muted mt-0.5">
                  Den {progress.currentDay} / {progress.totalDays}
                  {#if phase.endDate}
                    · do {formatDateLongCs(phase.endDate)}
                  {/if}
                </div>
              {/if}
            </div>
          {:else}
            <div
              class="w-9 h-9 rounded-lg bg-surface-dark flex items-center justify-center text-lg shrink-0"
            >
              📅
            </div>
            <div class="flex-1 min-w-0">
              <span class="text-sm font-bold text-text">Program skončil</span>
              {#if progress}
                <div class="text-[11px] text-text-muted mt-0.5">
                  Den {progress.currentDay} / {progress.totalDays}
                </div>
              {/if}
            </div>
          {/if}
          <span class="text-text-muted text-sm">›</span>
        </div>
        {#if progress}
          <div class="h-1 bg-surface-dark rounded-full overflow-hidden">
            <div
              class="h-full bg-primary rounded-full"
              style:width="{progress.percentComplete}%"
            ></div>
          </div>
        {/if}
      </a>

      <!-- Counter row -->
      <div class="bg-white border border-surface-dark rounded-2xl px-3.5 py-2.5 flex items-center justify-between">
        <div class="text-[12px] text-text">Dnes ti chybí stav, foto a jídla.</div>
        <div class="text-[10px] text-text-muted font-bold tracking-wide">0 / 3</div>
      </div>

      <!-- Stav ekzému — stub (slice 3) -->
      <div
        class="bg-white border-2 border-dashed border-surface-dark rounded-2xl p-3.5"
      >
        <div class="flex items-center justify-between mb-1">
          <div
            class="text-[10px] text-text-muted uppercase tracking-wide font-semibold"
          >
            Stav ekzému
          </div>
          <span class="text-[10px] text-text-muted">neuložen</span>
        </div>
        <div class="text-sm text-text-muted">Zatím není záznam pro dnešek.</div>
      </div>

      <!-- Foto kůže — stub (slice 3) -->
      <div
        class="bg-white border-2 border-dashed border-surface-dark rounded-2xl p-3.5"
      >
        <div class="flex items-center justify-between mb-1">
          <div
            class="text-[10px] text-text-muted uppercase tracking-wide font-semibold"
          >
            Foto kůže
          </div>
          <span class="text-[10px] text-text-muted">chybí</span>
        </div>
        <div class="text-sm text-text-muted">Žádný snímek pro dnešek.</div>
      </div>

      <!-- Smím / Vyhýbej se -->
      <div
        class="bg-white border border-surface-dark rounded-2xl overflow-hidden"
      >
        <div class="grid grid-cols-2 divide-x divide-surface-dark">
          <div class="p-3">
            <div
              class="text-[9px] font-extrabold tracking-wider text-success uppercase mb-1.5"
            >
              ✓ Smím
            </div>
            {#if allowedProtocol.length > 0}
              <div class="space-y-1">
                {#each allowedProtocol as slug}
                  {@const cat = getCategoryById(slug)}
                  {#if cat}
                    <div class="text-[11px] text-text leading-snug">
                      {cat.icon}
                      {cat.nameCs}
                    </div>
                  {/if}
                {/each}
              </div>
            {:else}
              <div class="text-[11px] text-text-muted">—</div>
            {/if}
          </div>
          <div class="p-3">
            <div
              class="text-[9px] font-extrabold tracking-wider text-danger uppercase mb-1.5"
            >
              ✗ Vyhýbej se
            </div>
            {#if eliminatedSlugs.length > 0}
              <div class="space-y-1">
                {#each eliminatedSlugs as slug}
                  {@const cat = getCategoryById(slug)}
                  {#if cat}
                    <div class="text-[11px] text-text-muted leading-snug">
                      {cat.icon}
                      {cat.nameCs}
                    </div>
                  {/if}
                {/each}
              </div>
            {:else}
              <div class="text-[11px] text-success">Žádná omezení</div>
            {/if}
          </div>
        </div>
      </div>

      <!-- Dnešní jídla — stub (slice 2) -->
      <div
        class="bg-white border-2 border-dashed border-surface-dark rounded-2xl p-3.5"
      >
        <div class="flex items-center justify-between mb-1">
          <div
            class="text-[10px] text-text-muted uppercase tracking-wide font-semibold"
          >
            Dnešní jídla
          </div>
          <span class="text-[10px] text-text-muted">0 záznamů</span>
        </div>
        <div class="text-sm text-text-muted">Zatím žádný záznam.</div>
      </div>

      <!-- Bottom hint -->
      <div class="mt-2 flex items-center justify-center gap-2 text-[11px] text-text-muted/70">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transform:rotate(180deg);transform-origin:center">
          <path d="M12 19V5M5 12l7-7 7 7"/>
        </svg>
        <span>Vše zapisuj přes <strong>+</strong>: foto · jídlo · stav</span>
      </div>
    {/if}
  </div>
</div>
