<script lang="ts">
  let {
    value,
    class: extraClass = '',
  }: {
    value: number;
    class?: string;
  } = $props();
</script>

<div class="bg-surface-dark h-1 overflow-hidden rounded-full {extraClass}">
  <div class="bg-primary h-full rounded-full" style:width="{value}%"></div>
</div>
