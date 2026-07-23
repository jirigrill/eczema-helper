<!-- The replay ledger: one row per event of the `deriveLadderState` loop, from
     the domain's own `explain.replay` trace (never recomputed here). Each row
     shows the event, the branch the loop took (the "why"), and the resulting
     state after that event with changed cells highlighted. The last row's state
     equals the "derived state" bar above by construction — same replay. A
     collapsible panel under the pipeline; `focus` scrolls/highlights a row when
     a pipeline back-link jumps here. All labels come from adapter.ts — this
     component holds no engine knowledge. -->
<script lang="ts">
  import type { DayView } from './adapter';

  let {
    day,
    focus = null,
    open = $bindable(false),
  }: { day: DayView; focus?: number | null; open?: boolean } = $props();

  const replay = $derived(day.replay);
  const fieldKeys = ['liveRung', 'pendingRest', 'ceilingRung', 'dwell'];

  // Open the panel when a back-link targets a row inside it.
  $effect(() => {
    if (focus !== null) open = true;
  });
</script>

<div class="ledger">
  <button type="button" class="head" onclick={() => (open = !open)} aria-expanded={open}>
    <span class="caret" class:open>▸</span>
    replay ledger
    <span class="count">{replay.rows.length} event{replay.rows.length === 1 ? '' : 's'}</span>
    <span class="hint">deriveLadderState, event by event</span>
  </button>

  {#if open}
    {#if replay.rows.length === 0}
      <div class="empty">
        no events replayed for this day — the initial frame is the whole story
      </div>
    {/if}
    <div class="scroll">
      <table>
        <thead>
          <tr>
            <th class="c-idx"></th>
            <th class="c-event">event</th>
            <th class="c-branch">branch — what the loop did</th>
            {#each fieldKeys as k (k)}<th class="c-field">{k}</th>{/each}
          </tr>
        </thead>
        <tbody>
          <tr class="initial">
            <td class="c-idx">·</td>
            <td class="c-event">(initial)</td>
            <td class="c-branch">before any event</td>
            {#each replay.initialCells as c (c.k)}<td class="c-field">{c.v}</td>{/each}
          </tr>
          {#each replay.rows as row (row.index)}
            <tr class:focused={focus === row.index} class:terminal={row.terminal}>
              <td class="c-idx">{row.index + 1}</td>
              <td class="c-event">{row.event}</td>
              <td class="c-branch"><code class="b">{row.branch}</code>{row.branchLabel}</td>
              {#each row.cells as c (c.k)}
                <td class="c-field" class:changed={c.changed}>{c.v}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr>
            <td class="c-idx"></td>
            <td class="c-event" colspan="2">↑ last row = the "derived state" bar above</td>
            {#each fieldKeys as k (k)}<td class="c-field foot">{k}</td>{/each}
          </tr>
        </tfoot>
      </table>
    </div>
  {/if}
</div>

<style>
  .ledger {
    border-top: 1px solid var(--hair);
    background: var(--surface);
  }
  .head {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    border: none;
    background: var(--surface-2);
    padding: 9px 14px;
    font: inherit;
    font-weight: 700;
    color: var(--ink);
    cursor: pointer;
    text-align: left;
  }
  .caret {
    display: inline-block;
    transition: transform 0.1s;
    color: var(--muted);
  }
  .caret.open {
    transform: rotate(90deg);
  }
  .count {
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
  }
  .hint {
    margin-left: auto;
    font-size: 10px;
    font-weight: 500;
    color: var(--muted);
  }
  .empty {
    padding: 10px 14px;
    font-size: 12px;
    color: var(--muted);
  }
  .scroll {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 12px;
  }
  th,
  td {
    padding: 5px 9px;
    text-align: left;
    white-space: nowrap;
    border-bottom: 1px solid var(--hair);
  }
  th {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
    font-weight: 700;
    background: var(--surface);
    position: sticky;
    top: 0;
  }
  .c-idx {
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    width: 1%;
  }
  .c-branch code.b {
    display: inline-block;
    margin-right: 7px;
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 4px;
    background: var(--canvas);
    color: var(--ink);
  }
  .c-field {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    color: var(--muted);
  }
  .c-field.changed {
    color: var(--ink);
    font-weight: 700;
    background: rgba(47, 158, 87, 0.1);
  }
  tr.initial td {
    color: var(--muted);
    font-style: italic;
  }
  tr.terminal {
    background: rgba(209, 72, 63, 0.06);
  }
  tr.focused {
    outline: 2px solid var(--hold);
    outline-offset: -2px;
  }
  tfoot td {
    border-bottom: none;
  }
  tfoot .foot {
    font-size: 9px;
    text-transform: uppercase;
    color: var(--muted);
  }
  tfoot .c-event {
    font-size: 10px;
    color: var(--muted);
    font-style: italic;
  }
</style>
