<!-- PROTOTYPE — throwaway (ticket #522). Variant B: Mermaid stateDiagram-v2. -->
<script lang="ts">
  import mermaid from 'mermaid';
  import { SCENARIO, BACK_EDGES } from './scenario';
  import CascadePanel from './CascadePanel.svelte';

  let selectedIndex = $state<number | null>(null);
  const selectedDay = $derived(selectedIndex === null ? null : SCENARIO[selectedIndex]!);
  let container: HTMLDivElement;

  // Mermaid state ids can't hold arbitrary chars — index-qualified slug per day.
  const ids = SCENARIO.map((day, i) => `d${i}_${day.situation.replace(/[^a-z]/gi, '')}`);

  function buildDiagram(): string {
    const lines: string[] = ['stateDiagram-v2'];
    for (let i = 0; i < SCENARIO.length - 1; i++) {
      lines.push(`  ${ids[i]} --> ${ids[i + 1]}`);
    }
    for (const [from, to] of BACK_EDGES) {
      lines.push(`  ${ids[from]} --> ${ids[to]} : reaction`);
    }
    for (let i = 0; i < SCENARIO.length; i++) {
      const day = SCENARIO[i]!;
      lines.push(`  ${ids[i]}: ${day.situation} (${day.dateRange[0]})`);
    }
    return lines.join('\n');
  }

  mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'neutral' });

  $effect(() => {
    let cancelled = false;
    mermaid.render('mermaid-graph', buildDiagram()).then(({ svg }) => {
      if (cancelled) return;
      container.innerHTML = svg;
      // stateDiagram-v2 has no built-in click-callback grammar (unlike
      // flowchart) — wire clicks directly onto the rendered state groups
      // instead of fighting the diagram-text `click` directive.
      for (let i = 0; i < ids.length; i++) {
        // mermaid mints its own id, e.g. `mermaid-graph-state-<ourId>-<n>` —
        // match by substring rather than assuming the exact rendered id.
        const el = container.querySelector<SVGGElement>(`g[id*="-${CSS.escape(ids[i]!)}-"]`);
        if (!el) continue;
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => {
          selectedIndex = i;
        });
      }
    });
    return () => {
      cancelled = true;
    };
  });
</script>

<div class="layout">
  <div class="graph-wrap" bind:this={container}></div>
  <CascadePanel day={selectedDay} />
</div>

<style>
  .layout { display: flex; height: 100vh; }
  .graph-wrap { flex: 1; overflow: auto; padding: 1rem; }
  .graph-wrap :global(svg) { max-width: none; }
</style>
