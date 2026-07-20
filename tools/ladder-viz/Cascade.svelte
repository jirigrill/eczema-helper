<script lang="ts">
  import type { JourneyDay } from './journey';
  import { buildCascade } from './cascade';
  import { nodeStyle, spanLabel } from './node-style';

  let { day, onclose }: { day: JourneyDay; onclose: () => void } = $props();

  const style = $derived(nodeStyle(day.kind));
  const span = $derived(spanLabel(day.fromDate, day.toDate));
  const view = $derived(day.explain ? buildCascade(day.explain) : null);

  /** Render any raw seam value verbatim — explicit `null`, rungs as their id + dose. */
  function fmt(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') {
      const o = value as Record<string, unknown>;
      // A rung reads as its id + dose; anything else falls back to compact JSON.
      if (typeof o.id === 'string' && typeof o.dose === 'string') return `${o.id} · ${o.dose}`;
      return JSON.stringify(value);
    }
    return String(value);
  }

  const STATUS_LABEL: Record<string, string> = {
    'not-reached': 'not reached',
    fired: 'FIRED',
    'passed-confirmed': 'passed (confirmed)',
    'passed-no-data': 'passed (no data)',
  };
</script>

<aside class="cascade">
  <header>
    <div>
      <span class="kind">{style.label}</span>
      <span class="span">{span}</span>
    </div>
    <button class="close" onclick={onclose} aria-label="Close cascade">×</button>
  </header>

  {#if !view}
    <p class="empty">The engine has not spoken yet — this is the synthetic entry node.</p>
  {:else}
    <section>
      <h3>Snapshot</h3>
      <dl class="snapshot">
        {#each view.snapshot as row (row.field)}
          <dt>{row.field}</dt>
          <dd class:null={row.value === null}>{fmt(row.value)}</dd>
        {/each}
      </dl>
    </section>

    <section>
      <h3>Precedence</h3>
      <ol class="steps">
        {#each view.steps as step (step.name)}
          <li data-status={step.status} class:fired={step.fired}>
            <div class="step-head">
              <span class="step-name">{step.name}</span>
              <span class="step-status">{STATUS_LABEL[step.status] ?? step.status}</span>
            </div>

            {#if step.gate}
              <dl class="gate">
                <dt>effective threshold</dt>
                <dd>{step.gate.threshold}</dd>
                {#each step.gate.signals as signal (signal.label)}
                  <dt>{signal.label}</dt>
                  <dd class:null={signal.value === null}>{fmt(signal.value)}</dd>
                {/each}
              </dl>
            {/if}

            {#if step.verdict}
              <div class="verdict">
                <div class="verdict-label">verdict — raw {step.verdictKind}</div>
                <dl>
                  {#each step.verdict as field (field.field)}
                    <dt>{field.field}</dt>
                    <dd class:null={field.value === null}>{fmt(field.value)}</dd>
                  {/each}
                </dl>
              </div>
            {/if}
          </li>
        {/each}
      </ol>
    </section>
  {/if}
</aside>

<style>
  .cascade {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 360px;
    overflow-y: auto;
    background: #ffffff;
    border-left: 1px solid #e2e8f0;
    box-shadow: -4px 0 12px rgba(15, 23, 42, 0.08);
    padding: 14px 16px;
    font:
      13px/1.4 system-ui,
      sans-serif;
    color: #0f172a;
    z-index: 10;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid #e2e8f0;
  }
  .kind {
    font-weight: 600;
  }
  .span {
    margin-left: 8px;
    color: #64748b;
    font-size: 12px;
  }
  .close {
    border: none;
    background: none;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    color: #94a3b8;
  }
  .empty {
    color: #64748b;
    font-style: italic;
  }
  h3 {
    margin: 16px 0 6px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
  }
  dl {
    display: grid;
    grid-template-columns: minmax(0, auto) minmax(0, 1fr);
    gap: 2px 12px;
    margin: 0;
  }
  dt {
    color: #64748b;
    font-family: ui-monospace, monospace;
    font-size: 12px;
  }
  dd {
    margin: 0;
    font-family: ui-monospace, monospace;
    font-size: 12px;
    word-break: break-word;
  }
  dd.null {
    color: #cbd5e1;
    font-style: italic;
  }
  .steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    counter-reset: step;
  }
  .steps li {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 6px 8px;
    background: #f8fafc;
  }
  .steps li[data-status='not-reached'] {
    opacity: 0.5;
  }
  .steps li.fired {
    border-color: #f59e0b;
    background: #fffbeb;
  }
  .step-head {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: baseline;
  }
  .step-name {
    counter-increment: step;
    font-weight: 600;
  }
  .step-name::before {
    content: counter(step) '. ';
    color: #94a3b8;
    font-weight: 400;
  }
  .step-status {
    font-size: 11px;
    color: #64748b;
    white-space: nowrap;
  }
  li.fired .step-status {
    color: #b45309;
    font-weight: 600;
  }
  .gate,
  .verdict dl {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px dashed #e2e8f0;
  }
  .verdict-label {
    margin-top: 6px;
    font-size: 11px;
    color: #b45309;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
</style>
