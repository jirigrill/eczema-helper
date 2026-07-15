<script lang="ts">
  import type { PhaseType } from '$lib/domain/models';
  import { phaseConfig } from '$lib/config/phases';

  let { type }: { type: PhaseType } = $props();

  const display = $derived(phaseConfig[type]);
</script>

<span
  data-state={type}
  class="rounded-full px-1.5 py-0.5 text-[8px] font-extrabold tracking-wider {display.badge}"
>
  {display.badgeLabel}
</span>
