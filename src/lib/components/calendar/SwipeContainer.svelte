<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    onSwipeLeft,
    onSwipeRight,
    children,
  }: {
    onSwipeLeft: () => void;
    onSwipeRight: () => void;
    children: Snippet;
  } = $props();

  const SWIPE_THRESHOLD = 50;
  let touchStartX = 0;
  let touchStartY = 0;

  function handleTouchStart(e: TouchEvent) {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }

  function handleTouchEnd(e: TouchEvent) {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;

    // Only trigger if horizontal swipe is dominant
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > SWIPE_THRESHOLD) {
      if (diffX > 0) {
        onSwipeLeft(); // Swiped left = next month
      } else {
        onSwipeRight(); // Swiped right = previous month
      }
    }
  }
</script>

<div
  ontouchstart={handleTouchStart}
  ontouchend={handleTouchEnd}
  class="touch-pan-y"
  role="region"
  aria-label="Kalendář"
>
  {@render children()}
</div>
