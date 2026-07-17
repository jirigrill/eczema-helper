<script lang="ts">
  // ═══════════════════════════════════════════════════════════
  // THROWAWAY PROTOTYPE ROUTE — /ladder-lab-prototype
  // The "flow" visualizer: the ladder engine drawn as a left→right data
  // pipeline (inputs → deriveLadderState → gate cascade → verdict), wired to the
  // REAL domain functions. Delete this whole folder once the design is folded
  // into the standalone tools/ladder-lab app. See NOTES.md.
  // ═══════════════════════════════════════════════════════════
  import '../../app.css';
  import VariantFlow from './VariantFlow.svelte';
</script>

<VariantFlow />
