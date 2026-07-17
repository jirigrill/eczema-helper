<script lang="ts">
  // LAYOUT C — SUBWAY MAP. The precedence cascade as a transit line: gates are
  // stations along one horizontal track, each with a short spur dropping to its
  // verdict terminal. The current day is a TRAIN riding the track; it runs
  // through the stations it passed and pulls off at the station where its gate
  // fired, down the spur to that terminal. Stations already passed today are
  // green; the firing station + its spur glow amber; later stations are dim.
  import { GATE_ORDER, NODES, verdictTone, type DayStep } from './fixture';

  let { day }: { day: DayStep } = $props();

  const STA_X = (i: number) => 90 + i * 150;
  const TRACK_Y = 70;
  const TERM_Y = 190;
  const W = 90 + GATE_ORDER.length * 150 + 40;

  const firedIdx = $derived(GATE_ORDER.indexOf(day.firedGate));
  const gateLabel = (id: string) => NODES.find((n) => n.id === id)!.label;
  const verdictFor = (gid: string): string => {
    const map: Record<string, string> = {
      g1: 'v-blocked', g2: 'v-ceiling', g3: 'v-rest',
      g4: 'v-hold-skin', g5: 'v-hold-cad', g6: 'v-advance',
    };
    return map[gid] ?? 'v-advance';
  };
</script>

<div class="overflow-x-auto rounded-xl border border-stone-800 bg-stone-900/40 p-4">
  <svg viewBox="0 0 {W} 240" class="w-full" style="max-width:{W}px">
    <!-- main track -->
    <line x1={STA_X(0)} y1={TRACK_Y} x2={STA_X(GATE_ORDER.length - 1)} y2={TRACK_Y} stroke="#44403c" stroke-width="6" stroke-linecap="round" />
    <!-- ridden portion (up to fired station) -->
    <line x1={STA_X(0)} y1={TRACK_Y} x2={STA_X(firedIdx)} y2={TRACK_Y} stroke="#10b981" stroke-width="6" stroke-linecap="round" />

    {#each GATE_ORDER as g, i}
      {@const passed = i < firedIdx}
      {@const fired = i === firedIdx}
      {@const dim = i > firedIdx}
      {@const vt = verdictFor(g)}
      <!-- spur to terminal -->
      <line x1={STA_X(i)} y1={TRACK_Y} x2={STA_X(i)} y2={TERM_Y - 16}
        stroke={fired ? '#f59e0b' : '#44403c'} stroke-width={fired ? 4 : 2} stroke-dasharray={fired ? '0' : '4 4'} opacity={dim ? 0.4 : 1} />

      <!-- terminal (verdict) -->
      <rect x={STA_X(i) - 52} y={TERM_Y - 16} width="104" height="30" rx="15"
        class={fired ? verdictTone[vt] : 'fill-stone-800'} opacity={dim ? 0.4 : fired ? 1 : 0.7} />
      <text x={STA_X(i)} y={TERM_Y + 4} text-anchor="middle" class="fill-white text-[9px] font-semibold" opacity={dim ? 0.5 : 1}>
        {gateLabel(g) === 'advance' ? 'advance' : vt.replace('v-', '')}
      </text>

      <!-- station -->
      <circle cx={STA_X(i)} cy={TRACK_Y} r={fired ? 15 : 11}
        fill={fired ? '#78350f' : passed ? '#065f46' : '#1c1917'}
        stroke={fired ? '#f59e0b' : passed ? '#10b981' : '#57534e'} stroke-width="2.5" opacity={dim ? 0.5 : 1} />
      <text x={STA_X(i)} y={TRACK_Y - 24} text-anchor="middle" class="text-[10px] font-semibold {fired ? 'fill-amber-200' : passed ? 'fill-emerald-300' : 'fill-stone-400'}">{gateLabel(g)}</text>
      <text x={STA_X(i)} y={TRACK_Y - 12} text-anchor="middle" class="fill-stone-500 text-[7px]">{NODES.find((n) => n.id === g)?.sub}</text>

      <!-- the train, parked at the fired station -->
      {#if fired}
        <text x={STA_X(i)} y={TRACK_Y + 4} text-anchor="middle" class="text-[13px]">🚆</text>
      {/if}
    {/each}

    <!-- origin marker -->
    <text x={STA_X(0) - 40} y={TRACK_Y + 4} text-anchor="middle" class="fill-indigo-300 text-[9px] font-bold">▶ {day.date}</text>
  </svg>

  <div class="mt-1 text-center text-[11px] text-stone-400">
    train pulled off at <span class="font-semibold text-amber-300">{gateLabel(day.firedGate)}</span>
    — <span class="text-stone-300">{day.conditions[day.firedGate]}</span>
  </div>
</div>
