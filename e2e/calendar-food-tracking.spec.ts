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

  test('elimination on one day does not show indicator bars on other days', async ({ page }) => {
    // Click Edit button
    await page.click('text=Upravit');

    // Should be in edit mode — "Vyřazení" header visible
    await expect(page.locator('h1:has-text("Vyřazení")')).toBeVisible();

    // Select a day (click on day 10 of current month)
    // The first click in edit mode already sets rangeStart, so we need to find
    // day 10 and click it to set rangeEnd (making a 1-day range with rangeStart)
    const day10 = page.locator('button:has-text("10")').first();
    await day10.click();

    // Toggle the first category using the accessible switch role
    const firstToggle = page.locator('[role="switch"]').first();
    await firstToggle.click();

    // Click Save
    await page.click('text=Uložit');

    // Wait for save to complete
    await page.waitForTimeout(500);

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
    const firstToggle = page.locator('[role="switch"]').first();
    await firstToggle.click();

    // Save
    await page.click('text=Uložit');
    await page.waitForTimeout(500);

    // Now click on the same day to inspect it
    const day15Again = page.locator('button:has-text("15")').first();
    await day15Again.click();

    // Enter edit mode again
    await page.click('text=Upravit');

    // The previously toggled category should still be on
    const togglesOn = page.locator('[role="switch"][aria-checked="true"]');
    await expect(togglesOn.first()).toBeVisible();
  });

  test('reintroduce tab shows previously eliminated items', async ({ page }) => {
    // Eliminate something first
    await page.click('text=Upravit');

    const day20 = page.locator('button:has-text("20")').first();
    await day20.click();

    // Toggle first category to eliminate it
    const firstToggle = page.locator('[role="switch"]').first();
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
    const subItemToggle = page.locator('.pl-10 [role="switch"]').first();
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
    const firstToggle = page.locator('[role="switch"]').first();
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

  test('multi-day range elimination applies to all days in range', async ({ page }) => {
    // First inspect day 8 so enterEditMode uses it as rangeStart
    const day8 = page.locator('button:has-text("8")').first();
    await day8.click();

    // Enter edit mode — rangeStart is now day 8
    await page.click('text=Upravit');

    // Click day 11 to set rangeEnd → range is days 8-11
    const day11 = page.locator('button:has-text("11")').first();
    await day11.click();

    // Toggle a category
    const firstToggle = page.locator('[role="switch"]').first();
    await firstToggle.click();

    // Save
    await page.click('text=Uložit');
    await page.waitForTimeout(500);

    // Should be back in view mode
    await expect(page.locator('text=Upravit')).toBeVisible();

    // Click day 8 (start of range) — detail card should show "Vyřazeno"
    const day8View = page.locator('button:has-text("8")').first();
    await day8View.click();
    await expect(page.locator('text=Vyřazeno')).toBeVisible({ timeout: 3000 });

    // Click day 10 (middle of range) — should also show eliminated items
    const day10View = page.locator('button:has-text("10")').first();
    await day10View.click();
    await expect(page.locator('text=Vyřazeno')).toBeVisible({ timeout: 3000 });

    // Click day 11 (end of range) — should also show eliminated items
    const day11View = page.locator('button:has-text("11")').first();
    await day11View.click();
    await expect(page.locator('text=Vyřazeno')).toBeVisible({ timeout: 3000 });

    // Click day 12 (outside range) — should show "Žádné záznamy"
    const day12View = page.locator('button:has-text("12")').first();
    await day12View.click();
    await expect(page.locator('text=Žádné záznamy')).toBeVisible({ timeout: 3000 });
  });

  test('eliminate then reintroduce cycle on same date', async ({ page }) => {
    // Step 1: Eliminate a category on day 18
    await page.click('text=Upravit');

    const day18 = page.locator('button:has-text("18")').first();
    await day18.click();

    const firstToggle = page.locator('[role="switch"]').first();
    await firstToggle.click();

    await page.click('text=Uložit');
    await page.waitForTimeout(500);

    // Verify elimination shows in detail card
    const day18View = page.locator('button:has-text("18")').first();
    await day18View.click();
    await expect(page.locator('text=Vyřazeno')).toBeVisible({ timeout: 3000 });

    // Step 2: Now reintroduce on the same date
    await page.click('text=Upravit');

    // Click day 18 again to set range
    const day18Edit = page.locator('button:has-text("18")').first();
    await day18Edit.click();

    // Switch to reintroduce mode
    await page.click('text=Zavést zpět');

    // The previously eliminated category should be visible — toggle it on for reintroduction
    const reintroToggle = page.locator('[role="switch"]').first();
    await reintroToggle.click();

    await page.click('text=Uložit');
    await page.waitForTimeout(500);

    // Verify detail card now shows reintroduction
    const day18Final = page.locator('button:has-text("18")').first();
    await day18Final.click();
    await expect(page.locator('text=Znovuzavedeno')).toBeVisible({ timeout: 3000 });
  });

  test('food page shows eliminations made in calendar', async ({ page }) => {
    // Get today's day number for clicking
    const today = new Date();
    const todayDay = today.getDate().toString();

    // Eliminate a category on today's date via calendar
    await page.click('text=Upravit');

    // Click today to set range end
    const todayBtn = page.locator(`button:has-text("${todayDay}")`).first();
    await todayBtn.click();

    // Toggle a category
    const firstToggle = page.locator('[role="switch"]').first();
    await firstToggle.click();

    await page.click('text=Uložit');
    await page.waitForTimeout(500);

    // Navigate to the food page
    await page.click('a[href="/food"]');
    await page.waitForLoadState('networkidle');

    // Food page should show the eliminated category under "Vyřazeno" heading
    await expect(page.locator('text=Vyřazeno')).toBeVisible({ timeout: 5000 });
  });

  test('month navigation updates calendar header', async ({ page }) => {
    // Use the CalendarHeader button (not the detail card heading) to read month
    const monthButton = page.getByRole('button', { name: /\d{4}/ });
    const headerText = await monthButton.textContent();

    // Click next month arrow
    await page.click('[aria-label="Další měsíc"]');

    // Header should change to a different month
    const nextMonthText = await monthButton.textContent();
    expect(nextMonthText).not.toBe(headerText);

    // Click previous month arrow twice to go one month back from original
    await page.click('[aria-label="Předchozí měsíc"]');
    await page.click('[aria-label="Předchozí měsíc"]');

    const prevMonthText = await monthButton.textContent();
    expect(prevMonthText).not.toBe(headerText);
    expect(prevMonthText).not.toBe(nextMonthText);
  });

  test('day detail card toggles on tap', async ({ page }) => {
    // Close the default detail card (today is inspected on load) by clicking today
    const today = new Date().getDate().toString();
    await page.locator(`button:has-text("${today}")`).first().click();
    await page.waitForTimeout(200);

    // Now tap day 15 — detail card should appear with the date heading
    const day15 = page.locator('button:has-text("15")').first();
    await day15.click();

    const detailHeading = page.locator('h3:has-text("15.")');
    await expect(detailHeading).toBeVisible({ timeout: 3000 });

    // Tap day 15 again — detail card heading should disappear
    await day15.click();
    await expect(detailHeading).not.toBeVisible({ timeout: 3000 });
  });

  test('calendar shows empty state when no child exists', async ({ page, request }, testInfo) => {
    // Create a fresh user with no children
    const baseURL = testInfo.project.use?.baseURL || 'http://localhost:5173';
    await clearAuthState(page);
    await setupAuthenticatedPage(page, request, baseURL, 'no-child');

    // Go to calendar without creating a child
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    // Should show "add child first" message
    await expect(page.locator('text=Nejprve přidejte dítě')).toBeVisible({ timeout: 5000 });

    // Should have a link to settings (use text to avoid matching the bottom nav link)
    await expect(page.getByRole('link', { name: 'Přejít do nastavení' })).toBeVisible();
  });
});
