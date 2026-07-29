<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    open,
    ariaLabel,
    onDismiss,
    backdropTestid,
    children,
  }: {
    open: boolean;
    /** Names the dialog for assistive tech; set to the sheet's heading. */
    ariaLabel: string;
    /** Fired on backdrop tap. The call site owns what dismissal means. */
    onDismiss: () => void;
    /** Optional test hook on the scrim (e.g. `confirm-sheet-backdrop`). */
    backdropTestid?: string;
    children: Snippet;
  } = $props();
</script>

<!--
  Shared bottom-sheet shell (issue #610): the scrim + panel shape every sheet in
  the app copies. Hard-coding the DESIGN.md §Stacking Scale layers here — scrim
  `z-[60]`, content `z-[70]` — makes the "sheet hand-invents a z value and
  covers the FAB" bug (issue #324) structurally impossible. Inner content is the
  caller's `children` snippet.
-->
{#if open}
  <div
    role="presentation"
    data-testid={backdropTestid}
    class="fixed inset-0 z-[60] bg-black/35"
    onclick={onDismiss}
  ></div>
  <div
    role="dialog"
    aria-label={ariaLabel}
    class="fixed right-0 bottom-0 left-0 z-[70] rounded-t-[20px] bg-white"
    style:padding-bottom="calc(env(safe-area-inset-bottom, 0px) + 1rem)"
  >
    {@render children()}
  </div>
{/if}
