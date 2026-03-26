import { test, expect } from '@playwright/test';
import { setupAuthenticatedPage, clearAuthState, createTestUser } from './helpers/auth';

test.describe('Child Management', () => {
  test.beforeEach(async ({ page, request }) => {
    // Clear any previous state
    await clearAuthState(page);
    
    // Setup authenticated user via API
    await setupAuthenticatedPage(page, request, 'http://localhost:5173', 'child-test');
  });

  test('can add a child and see it in settings and header', async ({ page }) => {
    // Go to settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // Fill add child form
    await page.fill('input#add-name', 'Emma');
    await page.fill('input#add-birth', '2025-12-01');
    
    // Submit form
    await page.click('button:has-text("Přidat dítě")');
    
    // Wait for child to appear in list
    await expect(page.locator('text=Emma')).toBeVisible({ timeout: 10000 });
    
    // Verify birth date is shown
    await expect(page.locator('text=/nar\./')).toBeVisible();
    
    // Verify header shows the child
    await expect(page.locator('header')).toContainText('Emma');
  });

  test('can edit child name', async ({ page }) => {
    // Add a child first
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.fill('input#add-name', 'Emma');
    await page.fill('input#add-birth', '2025-12-01');
    await page.click('button:has-text("Přidat dítě")');
    await expect(page.locator('text=Emma')).toBeVisible({ timeout: 10000 });
    
    // Click edit
    await page.click('button:has-text("Upravit")');
    
    // Change name
    await page.fill('input[type="text"]', 'Emmy');
    await page.click('button:has-text("Uložit")');
    
    // Verify name updated in list
    await expect(page.locator('text=Emmy')).toBeVisible();
    await expect(page.locator('text=Emma')).not.toBeVisible();
    
    // Verify header updated
    await expect(page.locator('header')).toContainText('Emmy');
  });

  test('can add multiple children and select between them', async ({ page }) => {
    // Add first child
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.fill('input#add-name', 'Emma');
    await page.fill('input#add-birth', '2025-12-01');
    await page.click('button:has-text("Přidat dítě")');
    await expect(page.locator('text=Emma')).toBeVisible({ timeout: 10000 });
    
    // Add second child
    await page.fill('input#add-name', 'Oliver');
    await page.fill('input#add-birth', '2026-01-15');
    await page.click('button:has-text("Přidat dítě")');
    await expect(page.locator('text=Oliver')).toBeVisible({ timeout: 10000 });
    
    // Open child selector dropdown
    await page.click('header button');
    
    // Select Oliver
    await page.click('button:has-text("Oliver")');
    
    // Verify header shows Oliver
    await expect(page.locator('header')).toContainText('Oliver');
    
    // Navigate to calendar and back
    await page.goto('/calendar');
    await page.goto('/settings');
    
    // Oliver should still be selected
    await expect(page.locator('header')).toContainText('Oliver');
  });

  test('child deletion shows confirmation dialog', async ({ page }) => {
    // Add a child
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.fill('input#add-name', 'Temp');
    await page.fill('input#add-birth', '2025-12-01');
    await page.click('button:has-text("Přidat dítě")');
    await expect(page.locator('text=Temp')).toBeVisible({ timeout: 10000 });
    
    // Click delete
    await page.click('button:has-text("Smazat")');
    
    // Confirmation dialog should appear
    await expect(page.locator('text=Opravdu smazat')).toBeVisible();
    await expect(page.locator('text=Temp')).toBeVisible();
    
    // Cancel
    await page.click('button:has-text("Zrušit")');
    
    // Child should still be there
    await expect(page.locator('text=Temp')).toBeVisible();
    
    // Click delete again
    await page.click('button:has-text("Smazat")');
    
    // Confirm deletion
    await page.click('button:has-text("Smazat")');
    
    // Child should be removed
    await expect(page.locator('text=Temp')).not.toBeVisible();
  });

  test('shows add child link in header when no children', async ({ page }) => {
    // Go to settings - should show no children message
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Zatím nemáte přidané žádné dítě')).toBeVisible();
    
    // Header should show add child link
    await expect(page.locator('header a:has-text("Přidat dítě")')).toBeVisible();
    
    // Clicking should go to settings
    await page.click('header a:has-text("Přidat dítě")');
    await expect(page).toHaveURL('/settings');
  });
});
