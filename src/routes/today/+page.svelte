<script lang="ts">
  import { scheduleContext } from "$lib/stores/schedule-context";
  import { getPhaseForDate } from "$lib/domain/schedule-queries";
  import ErrorAlert from "$lib/components/error-alert.svelte";
  import EmptyStateCard from "$lib/components/EmptyStateCard.svelte";
  import AllergenChip from "$lib/components/AllergenChip.svelte";
  import PhaseBadge from "$lib/components/PhaseBadge.svelte";
  import ProgressBar from "$lib/components/ProgressBar.svelte";
  import { getCategoryById } from "$lib/data/categories";
  import { todayIso, addDays, formatDateLongCs } from "$lib/utils/date";
  import { getPhaseDisplay } from "$lib/utils/phase-display";

  const today = todayIso();

  const ctx = $derived($scheduleContext);
  const phase = $derived(ctx.status === 'ready' ? getPhaseForDate(ctx.schedule, today) : null);
  const protocolSlugs = $derived(
    ctx.status === 'ready'
      ? (ctx.schedule.phases.find((p) => p.type === "elimination")?.categoryIds ?? [])
      : [],
  );
  const allowedProtocol = $derived(
    ctx.status === 'ready'
      ? protocolSlugs.filter((s) => !ctx.eliminatedToday.includes(s))
      : [],
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
  <div class="px-4 pt-4 pb-2 flex items-end justify-between">
    <div>
      <div class="micro-label">
        {czechWeekday(today)} · {formatDateLongCs(today)}
      </div>
      <h2 class="page-heading">Dnes</h2>
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
    {#if ctx.status === 'error'}
      <ErrorAlert message={ctx.message} />
    {:else if ctx.status !== 'ready'}
      <div
        class="bg-white rounded-2xl border border-surface-dark p-6 text-center"
      >
        <p class="body-muted">
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
        class="block bg-white rounded-2xl border border-surface-dark p-4 text-left"
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
                <span class="body-bold">{phase.label}</span>
                <PhaseBadge type={phase.type} />
              </div>
              {#if ctx.progress}
                <div class="text-[11px] text-text-muted mt-0.5">
                  Den {ctx.progress.currentDay} / {ctx.progress.totalDays}
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
              <span class="body-bold">Program skončil</span>
              {#if ctx.progress}
                <div class="text-[11px] text-text-muted mt-0.5">
                  Den {ctx.progress.currentDay} / {ctx.progress.totalDays}
                </div>
              {/if}
            </div>
          {/if}
          <span class="body-muted">›</span>
        </div>
        {#if ctx.progress}
          <ProgressBar value={ctx.progress.percentComplete} />
        {/if}
      </a>

      <!-- Counter row -->
      <div class="bg-white border border-surface-dark rounded-2xl px-3.5 py-2.5 flex items-center justify-between">
        <div class="text-[12px] text-text">Dnes ti chybí stav, foto a jídla.</div>
        <div class="text-[10px] text-text-muted font-bold tracking-wide">0 / 3</div>
      </div>

      <!-- Stav ekzému — stub (slice 3) -->
      <EmptyStateCard label="Stav ekzému" status="neuložen">
        <div class="body-muted">Zatím není záznam pro dnešek.</div>
      </EmptyStateCard>

      <!-- Foto kůže — stub (slice 3) -->
      <EmptyStateCard label="Foto kůže" status="chybí">
        <div class="body-muted">Žádný snímek pro dnešek.</div>
      </EmptyStateCard>

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
              <div class="flex flex-wrap gap-1.5">
                {#each allowedProtocol as slug}
                  <AllergenChip {slug} />
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
            {#if ctx.eliminatedToday.length > 0}
              <div class="flex flex-wrap gap-1.5">
                {#each ctx.eliminatedToday as slug}
                  <AllergenChip {slug} color="warning" />
                {/each}
              </div>
            {:else}
              <div class="text-[11px] text-success">Žádná omezení</div>
            {/if}
          </div>
        </div>
      </div>

      <!-- Dnešní jídla — stub (slice 2) -->
      <EmptyStateCard label="Dnešní jídla" status="0 záznamů">
        <div class="body-muted">Zatím žádný záznam.</div>
      </EmptyStateCard>

      <!-- Bottom hint -->
      <div class="mt-2 flex items-center justify-center gap-2 text-[11px] text-text-muted/70">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="rotate-180">
          <path d="M12 19V5M5 12l7-7 7 7"/>
        </svg>
        <span>Vše zapisuj přes <strong>+</strong>: foto · jídlo · stav</span>
      </div>
    {/if}
  </div>
</div>
