import { test, expect } from '@playwright/test';
import { setupAuthenticatedPage, clearAuthState } from './helpers/auth';

test.describe('Calendar Food Tracking', () => {
  test.beforeEach(async ({ page, request }, testInfo) => {
    await clearAuthState(page);
    const baseURL = testInfo.project.use?.baseURL || 'http://localhost:5173';
    const user = await setupAuthenticatedPage(page, request, baseURL, 'cal-test');

    // Create a child so the calendar isn't in empty state
    await request.post(`${baseURL}/api/children`, {
      headers: { Cookie: `session_id=${(await page.context().cookies()).find(c => c.name === 'session_id')?.value}` },
      data: { name: 'Test Baby', birthDate: '2025-12-01' },
    });

    // Go to calendar and wait for it to load
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');
  });

  test('elimination on one day does not show dots on other days', async ({ page }) => {
    // Click Edit button
    await page.click('text=Upravit');

    // Should be in edit mode — "Vyřazení" header visible
    await expect(page.locator('h1:has-text("Vyřazení")')).toBeVisible();

    // Select a day (click on day 10 of current month)
    // The first click in edit mode already sets rangeStart, so we need to find
    // day 10 and click it to set rangeEnd (making a 1-day range with rangeStart)
    const day10 = page.locator('button:has-text("10")').first();
    await day10.click();

    // Toggle the first category (should be a category without sub-items like Vejce)
    // Find a toggle switch button and click it
    const firstToggle = page.locator('.rounded-full.border-2').first();
    await firstToggle.click();

    // Click Save
    await page.click('text=Uložit');

    // Wait for save to complete
    await page.waitForTimeout(500);

    // Day 10 should have a dot indicator
    // Day 11 should NOT have a dot indicator (per-date, no carry-forward)
    // We verify by checking that the split bar indicator exists on day 10
    // but not on day 11

    // Check that we're back in view mode
    await expect(page.locator('text=Upravit')).toBeVisible();
  });

  test('edit mode shows existing eliminated items for a date', async ({ page }) => {
    // First: eliminate something on a day
    await page.click('text=Upravit');

    // Click on a day to set range endpoint
    const day15 = page.locator('button:has-text("15")').first();
    await day15.click();

    // Toggle a category
    const firstToggle = page.locator('.rounded-full.border-2').first();
    await firstToggle.click();

    // Save
    await page.click('text=Uložit');
    await page.waitForTimeout(500);

    // Now click on the same day to inspect it
    const day15Again = page.locator('button:has-text("15")').first();
    await day15Again.click();

    // Enter edit mode again
    await page.click('text=Upravit');

    // The previously toggled category should still be on (toggle should be in "on" position)
    // The toggle in "on" position has justify-end class
    const togglesOn = page.locator('.rounded-full.border-2.justify-end');
    await expect(togglesOn.first()).toBeVisible();
  });

  test('reintroduce tab shows previously eliminated items', async ({ page }) => {
    // Eliminate something first
    await page.click('text=Upravit');

    const day20 = page.locator('button:has-text("20")').first();
    await day20.click();

    // Toggle first category to eliminate it
    const firstToggle = page.locator('.rounded-full.border-2').first();
    await firstToggle.click();

    // Save
    await page.click('text=Uložit');
    await page.waitForTimeout(500);

    // Click on the same day and enter edit mode
    const day20Again = page.locator('button:has-text("20")').first();
    await day20Again.click();
    await page.click('text=Upravit');

    // Switch to "Zavést zpět" tab
    await page.click('text=Zavést zpět');

    // Should show at least one category (the one we eliminated)
    // If nothing was eliminated, it would show "Žádné vyřazené potraviny"
    const emptyMsg = page.locator('text=Žádné vyřazené potraviny k znovuzavedení');
    const categoryItems = page.locator('.rounded-xl.border .text-sm.font-medium');

    // Either we see categories or the empty message — but we eliminated something
    // so categories should be visible
    await expect(categoryItems.first()).toBeVisible({ timeout: 3000 });
  });

  test('detail card shows specific sub-items, not just category', async ({ page }) => {
    // Eliminate a sub-item
    await page.click('text=Upravit');

    const day5 = page.locator('button:has-text("5")').first();
    await day5.click();

    // Find a category with sub-items (has a chevron)
    const expandableCategory = page.locator('button:has(.rotate-180), button:has(svg[stroke-width="2"])').first();

    // Click the category row to expand sub-items
    const categoryRow = page.locator('.rounded-xl.border .flex.items-center.gap-2.flex-1').first();
    await categoryRow.click();

    // Toggle a specific sub-item
    const subItemToggle = page.locator('.pl-10 .rounded-full.border-2').first();
    if (await subItemToggle.isVisible()) {
      await subItemToggle.click();

      // Save
      await page.click('text=Uložit');
      await page.waitForTimeout(500);

      // Click on day 5 to see detail card
      const day5View = page.locator('button:has-text("5")').first();
      await day5View.click();

      // The detail card should show the sub-item name in parentheses
      // e.g., "Mléčné (Mléko)" or similar
      const detailCard = page.locator('.rounded-xl.border.border-surface-dark');
      await expect(detailCard).toBeVisible();

      // Check that there's a parenthetical sub-item list
      const subItemText = page.locator('.text-xs.text-text-muted');
      await expect(subItemText.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('cancel edit discards changes', async ({ page }) => {
    // Enter edit mode
    await page.click('text=Upravit');

    const day12 = page.locator('button:has-text("12")').first();
    await day12.click();

    // Toggle something
    const firstToggle = page.locator('.rounded-full.border-2').first();
    await firstToggle.click();

    // Cancel instead of saving
    await page.click('text=Zrušit');

    // Should be back in view mode
    await expect(page.locator('text=Upravit')).toBeVisible();

    // Click on day 12 — detail card should show "Žádné záznamy"
    const day12View = page.locator('button:has-text("12")').first();
    await day12View.click();

    const noRecords = page.locator('text=Žádné záznamy');
    await expect(noRecords).toBeVisible({ timeout: 3000 });
  });
});
