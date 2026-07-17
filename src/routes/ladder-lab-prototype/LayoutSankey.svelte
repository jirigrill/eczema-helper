<script lang="ts">
  // LAYOUT B — SANKEY FLOW. The whole scenario at once: every day is a particle
  // that enters at the source and flows down the gate spine until a gate catches
  // it, then peels off into that gate's verdict. Ribbon thickness = how many
  // days each gate caught — you see the engine's behaviour *distribution* in one
  // glance. The current day's particle glows and its route is bold.
  import { DAYS, GATE_ORDER, NODES, verdictTone, type DayStep } from './fixture';

  let { day, cursor }: { day: DayStep; cursor: number } = $props();

  const GATE_X = 300;
  const VERDICT_X = 560;
  const SRC_X = 40;
  const rowY = (i: number) => 60 + i * 78;
  const H = GATE_ORDER.length * 78 + 30;

  const gateLabel = (id: string) => NODES.find((n) => n.id === id)!.label;
  const verdictOf = (gid: string) => DAYS.find((d) => d.firedGate === gid)?.verdict;

  // days grouped by the gate that caught them → ribbon weight
  const caught = $derived(
    GATE_ORDER.map((g, i) => ({
      gate: g,
      i,
      days: DAYS.map((d, di) => ({ d, di })).filter(({ d }) => d.firedGate === g),
    })),
  );
</script>

<div class="overflow-x-auto rounded-xl border border-stone-800 bg-stone-900/40 p-4">
  <svg viewBox="0 0 640 {H}" class="w-full" style="max-width:640px">
    <!-- source spine down to each gate -->
    {#each caught as c}
      {@const cnt = c.days.length}
      <!-- pass-spine from source area into the gate -->
      <line x1={SRC_X + 30} y1={H / 2} x2={GATE_X - 46} y2={rowY(c.i)} stroke="#44403c" stroke-width={Math.max(1, cnt * 3)} opacity="0.5" />
      <!-- gate node -->
      <rect x={GATE_X - 46} y={rowY(c.i) - 16} width="92" height="32" rx="6"
        fill="#1c1917" stroke={c.days.some((x) => x.di === cursor) ? '#f59e0b' : '#57534e'} stroke-width={c.days.some((x) => x.di === cursor) ? 2.5 : 1.5} />
      <text x={GATE_X} y={rowY(c.i) - 1} text-anchor="middle" class="fill-stone-200 text-[10px] font-semibold">{gateLabel(c.gate)}</text>
      <text x={GATE_X} y={rowY(c.i) + 10} text-anchor="middle" class="fill-stone-500 text-[8px]">{cnt} day{cnt === 1 ? '' : 's'}</text>

      <!-- fire ribbon gate → verdict -->
      {#if cnt > 0}
        {@const vt = verdictOf(c.gate)}
        <path d="M {GATE_X + 46} {rowY(c.i)} C {(GATE_X + VERDICT_X) / 2} {rowY(c.i)}, {(GATE_X + VERDICT_X) / 2} {rowY(c.i)}, {VERDICT_X - 46} {rowY(c.i)}"
          fill="none" stroke="#f59e0b" stroke-width={Math.max(2, cnt * 3)} opacity="0.35" />
        <rect x={VERDICT_X - 46} y={rowY(c.i) - 14} width="92" height="28" rx="14" class={verdictTone[vt ?? '']} />
        <text x={VERDICT_X} y={rowY(c.i) + 4} text-anchor="middle" class="fill-white text-[9px] font-semibold">{gateLabel(c.gate) === 'advance' ? 'advance' : (vt ?? '').replace('v-', '')}</text>
      {/if}

      <!-- day particles sitting on this gate -->
      {#each c.days as { di }, k}
        <circle cx={GATE_X - 46 - 14 - k * 16} cy={rowY(c.i)} r={di === cursor ? 7 : 5}
          fill={di === cursor ? '#fbbf24' : '#a8a29e'} stroke={di === cursor ? '#fff' : 'none'} stroke-width="1.5" />
        <text x={GATE_X - 46 - 14 - k * 16} y={rowY(c.i) + 2.5} text-anchor="middle" class="fill-stone-900 text-[6px] font-bold">{di + 1}</text>
      {/each}
    {/each}

    <!-- source -->
    <circle cx={SRC_X} cy={H / 2} r="26" fill="#3730a3" stroke="#818cf8" stroke-width="1.5" />
    <text x={SRC_X} y={H / 2 + 3} text-anchor="middle" class="fill-indigo-100 text-[9px] font-bold">inputs</text>
  </svg>

  <div class="mt-1 text-center text-[11px] text-stone-400">
    particle <span class="font-semibold text-amber-300">{cursor + 1}</span> ({day.date}) caught at
    <span class="font-semibold text-amber-300">{gateLabel(day.firedGate)}</span> — thickness = days each gate caught
  </div>
</div>
