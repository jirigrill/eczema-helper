<script lang="ts">
  let {
    value,
    class: extraClass = '',
  }: {
    value: number;
    class?: string;
  } = $props();
</script>

<div class="h-1 bg-surface-dark rounded-full overflow-hidden {extraClass}">
  <div class="h-full bg-primary rounded-full" style:width="{value}%"></div>
</div>
