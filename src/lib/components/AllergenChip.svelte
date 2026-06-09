<script lang="ts">
  import { getCategoryConfig } from '$lib/config/categories';

  const CUSTOM_ICONS = ['🌿', '🫚', '🧄', '🧅', '🫛', '🌾', '🍄', '🫙', '🧂', '🌶️', '🫑', '🥬', '🫘', '🥜', '🍯'];

  let {
    slug,
    color = 'neutral',
  }: {
    slug: string;
    color?: 'neutral' | 'warning' | 'success';
  } = $props();

  function resolveDisplay(s: string): { icon: string; name: string } {
    if (s.startsWith('other:')) {
      const name = s.slice(6);
      let hash = 0;
      for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % CUSTOM_ICONS.length;
      return { icon: CUSTOM_ICONS[hash], name };
    }
    const cfg = getCategoryConfig(s);
    return { icon: cfg?.icon ?? '🍽️', name: cfg?.name ?? s };
  }

  const display = $derived(resolveDisplay(slug));
</script>

<span
  data-state={color}
  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border"
>
  {display.icon} {display.name}
</span>
