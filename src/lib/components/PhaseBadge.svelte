<script lang="ts">
  import type { SchedulePhaseType } from '$lib/domain/models';
  import { getPhaseDisplay } from '$lib/utils/phase-display';

  let { type }: { type: SchedulePhaseType } = $props();

  const display = $derived(getPhaseDisplay(type));
</script>

<span
  data-variant={type}
  class="text-[8px] font-extrabold tracking-wider rounded-full px-1.5 py-0.5 {display.badge}"
>
  {display.label}
</span>
