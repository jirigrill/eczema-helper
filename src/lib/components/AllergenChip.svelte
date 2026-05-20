<script lang="ts">
  import { getCategoryById } from '$lib/data/categories';

  const CUSTOM_ICONS = ['🌿', '🫚', '🧄', '🧅', '🫛', '🌾', '🍄', '🫙', '🧂', '🌶️', '🫑', '🥬', '🫘', '🥜', '🍯'];

  let {
    slug,
    muted = false,
  }: {
    slug: string;
    muted?: boolean;
  } = $props();

  function resolveDisplay(s: string): { icon: string; name: string } {
    if (s.startsWith('other:')) {
      const name = s.slice(6);
      let hash = 0;
      for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % CUSTOM_ICONS.length;
      return { icon: CUSTOM_ICONS[hash], name };
    }
    const cat = getCategoryById(s);
    return { icon: cat?.icon ?? '🍽️', name: cat?.nameCs ?? s };
  }

  const display = $derived(resolveDisplay(slug));
</script>

<span class="text-[11px] leading-snug {muted ? 'text-text-muted' : 'text-text'}">
  {display.icon} {display.name}
</span>
