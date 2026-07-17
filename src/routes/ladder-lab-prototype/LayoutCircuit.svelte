<script lang="ts">
  // LAYOUT A — CIRCUIT DAG. The engine drawn as its literal directed graph:
  // one source node → a vertical spine of gate nodes → verdict sinks, wired with
  // SVG bezier edges. For the current day the decision PATH lights up
  // (source → each passed gate → the fired gate → its verdict); everything else
  // dims to a faint substrate so the graph reads as "current flow through a
  // fixed circuit".
  import { NODES, EDGES, GATE_ORDER, verdictTone, type DayStep } from './fixture';

  let { day }: { day: DayStep } = $props();

  // geometry
  const COL_X = [70, 340, 620] as const;
  const ROW_Y = (row: number) => 70 + row * 74;
  const W = 720;
  const H = 6 * 74 + 40;

  const pos = (id: string) => {
    const n = NODES.find((x) => x.id === id)!;
    return { x: COL_X[n.col] ?? 0, y: ROW_Y(n.row), n };
  };

  // The lit path: which node ids are "on" this day.
  const firedIdx = $derived(GATE_ORDER.indexOf(day.firedGate));
  const litNodes = $derived(
    new Set<string>([
      'src',
      ...GATE_ORDER.slice(0, firedIdx + 1), // source + passed gates + fired gate
      day.verdict,
    ]),
  );
  // A lit edge = both endpoints lit AND it's on the taken path (pass edges up to
  // the fired gate, plus the single fire edge from the fired gate).
  function edgeLit(from: string, to: string, kind: 'pass' | 'fire'): boolean {
    if (!litNodes.has(from) || !litNodes.has(to)) return false;
    if (kind === 'fire') return from === day.firedGate;
    // pass edge lit only between consecutive passed gates (not into the fired gate's successor)
    const fi = GATE_ORDER.indexOf(from as never);
    return fi !== -1 && fi < firedIdx;
  }

  function path(from: string, to: string): string {
    const a = pos(from);
    const b = pos(to);
    const mx = (a.x + b.x) / 2;
    return `M ${a.x + 46} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x - 46} ${b.y}`;
  }
</script>

<div class="overflow-x-auto rounded-xl border border-stone-800 bg-stone-900/40 p-4">
  <svg viewBox="0 0 {W} {H}" class="h-auto w-full" style="max-width:{W}px">
    <!-- edges -->
    {#each EDGES as e}
      {@const lit = edgeLit(e.from, e.to, e.kind)}
      <path
        d={path(e.from, e.to)}
        fill="none"
        stroke={lit ? (e.kind === 'fire' ? '#f59e0b' : '#10b981') : '#44403c'}
        stroke-width={lit ? 2.5 : 1}
        stroke-dasharray={e.kind === 'fire' ? '0' : lit ? '0' : '3 4'}
        opacity={lit ? 1 : 0.4}
      />
    {/each}

    <!-- nodes -->
    {#each NODES as n}
      {@const p = pos(n.id)}
      {@const on = litNodes.has(n.id)}
      {@const fired = n.id === day.firedGate}
      <g opacity={on ? 1 : 0.35}>
        {#if n.kind === 'verdict'}
          <rect
            x={p.x - 46} y={p.y - 16} width="92" height="32" rx="16"
            class={on ? verdictTone[n.id] : 'fill-stone-800'}
            fill={on ? undefined : '#292524'}
          />
          <text x={p.x} y={p.y + 4} text-anchor="middle" class="fill-white text-[10px] font-semibold">{n.label}</text>
        {:else if n.kind === 'source'}
          <circle cx={p.x} cy={p.y} r="30" fill="#3730a3" stroke="#818cf8" stroke-width="1.5" />
          <text x={p.x} y={p.y - 1} text-anchor="middle" class="fill-indigo-100 text-[10px] font-bold">{n.label}</text>
          <text x={p.x} y={p.y + 11} text-anchor="middle" class="fill-indigo-300 text-[7px]">day {day.date}</text>
        {:else}
          <!-- gate: diamond -->
          <rect
            x={p.x - 40} y={p.y - 18} width="80" height="36" rx="6"
            fill={fired ? '#78350f' : on ? '#1c1917' : '#1c1917'}
            stroke={fired ? '#f59e0b' : on ? '#10b981' : '#57534e'}
            stroke-width={fired ? 2.5 : 1.5}
          />
          <text x={p.x} y={p.y - 3} text-anchor="middle" class="text-[10px] font-semibold {fired ? 'fill-amber-200' : on ? 'fill-emerald-200' : 'fill-stone-400'}">{n.label}</text>
          <text x={p.x} y={p.y + 9} text-anchor="middle" class="fill-stone-500 text-[7px]">{n.sub}</text>
        {/if}
      </g>
    {/each}
  </svg>

  <!-- live condition of the fired gate, small caption under the graph -->
  <div class="mt-2 text-center text-[11px] text-stone-400">
    stopped at <span class="font-semibold text-amber-300">{NODES.find((n) => n.id === day.firedGate)?.label}</span>
    — <span class="text-stone-300">{day.conditions[day.firedGate]}</span>
  </div>
</div>
