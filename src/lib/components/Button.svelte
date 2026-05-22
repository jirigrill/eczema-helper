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
  data-state={variant}
  data-color={color}
  onclick={disabled ? undefined : onclick}
  class="
    {variant === 'primary'
      ? `w-full py-3.5 rounded-xl text-white font-semibold text-base
         ${color === 'danger' ? 'bg-danger' : color === 'warning' ? 'bg-warning' : 'bg-primary'}`
      : 'text-xs text-text-muted border border-surface-dark rounded-xl px-2.5 py-1 font-medium hover:text-text hover:border-text-muted transition-colors'}
  "
>
  {@render children?.()}
</button>
