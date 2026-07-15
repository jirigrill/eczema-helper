<script lang="ts">
  import type { Snippet } from 'svelte';

  type ButtonVariant = 'primary' | 'ghost-sm';
  type ButtonColor = 'primary' | 'warning' | 'danger';

  let {
    variant = 'primary' as ButtonVariant,
    color = 'primary' as ButtonColor,
    disabled = false,
    type = 'button' as 'button' | 'submit' | 'reset',
    onclick,
    children,
  }: {
    variant?: ButtonVariant;
    color?: ButtonColor;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    onclick?: () => void;
    children?: Snippet;
  } = $props();
</script>

<button
  {type}
  {disabled}
  data-variant={variant}
  data-color={color}
  onclick={disabled ? undefined : onclick}
  class="
    {variant === 'primary'
    ? `w-full rounded-xl py-3.5 text-base font-semibold text-white
         ${color === 'danger' ? 'bg-danger' : color === 'warning' ? 'bg-warning' : 'bg-primary'}`
    : 'text-text-muted border-surface-dark hover:text-text hover:border-text-muted rounded-xl border px-2.5 py-1 text-xs font-medium transition-colors'}
  "
>
  {@render children?.()}
</button>
