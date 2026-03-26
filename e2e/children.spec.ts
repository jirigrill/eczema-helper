import { test, expect } from '@playwright/test';
import { setupAuthenticatedPage, clearAuthState } from './helpers/auth';

test.describe('Child Management', () => {
  test.beforeEach(async ({ page, request }, testInfo) => {
    await clearAuthState(page);
    const baseURL = testInfo.project.use?.baseURL || 'http://localhost:5173';
    await setupAuthenticatedPage(page, request, baseURL, 'child-test');
  });

  test('can add a child and see it in settings and header', async ({ page }) => {
    // Capture console messages for debugging
    const consoleMessages: string[] = [];
    page.on('console', msg => consoleMessages.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => consoleMessages.push(`[error] ${err.message}`));

    // Go to settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Wait for hydration - ensure submit button is interactive (use type=submit to avoid header button)
    const submitBtn = page.locator('button[type="submit"]:has-text("Přidat dítě")');
    await expect(submitBtn).toBeEnabled();

    // Fill add child form
    await page.fill('input#add-name', 'Emma');
    await page.fill('input#add-birth', '2025-12-01');

    // Submit form and wait for API response
    const responsePromise = page.waitForResponse(
      res => res.url().includes('/api/children') && res.request().method() === 'POST',
      { timeout: 5000 }
    ).catch(e => {
      console.log('Console messages:', consoleMessages);
      throw new Error(`No API call made. Console: ${consoleMessages.join('\n')}`);
    });

    await submitBtn.click();
    const response = await responsePromise;

    // Debug: check response status and body
    const responseBody = await response.text();
    console.log(`API response: ${response.status()} - ${responseBody}`);

    if (!response.ok()) {
      throw new Error(`API call failed with status ${response.status()}: ${responseBody}`);
    }

    // Wait for page to process the API response by checking for network idle
    // rather than using arbitrary timeout
    await page.waitForLoadState('networkidle');

    // Reload page to verify child was persisted (bypasses client-side reactivity issues)
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for child to appear in list (use getByRole to be specific)
    await expect(page.getByRole('listitem').getByText('Emma')).toBeVisible({ timeout: 10000 });

    // Verify birth date is shown (in list item, not label)
    await expect(page.locator('li p:has-text("nar.")')).toBeVisible();

    // Verify header shows the child
    await expect(page.locator('header')).toContainText('Emma');
  });

  test('can edit child name', async ({ page }) => {
    // Add a child first
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.fill('input#add-name', 'Emma');
    await page.fill('input#add-birth', '2025-12-01');

    // Wait for API response
    const submitBtn = page.locator('button[type="submit"]:has-text("Přidat dítě")');
    let responsePromise = page.waitForResponse(
      res => res.url().includes('/api/children') && res.request().method() === 'POST'
    );
    await submitBtn.click();
    await responsePromise;

    // Reload to see the child (client-side reactivity workaround)
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('listitem').getByText('Emma')).toBeVisible({ timeout: 10000 });

    // Click edit button on the specific child's row
    const childRow = page.locator('li').filter({ hasText: 'Emma' });
    const editBtn = childRow.getByRole('button', { name: 'Upravit' });
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Wait for the edit form to render - look for inputs in the children list
    // Note: We can't use childRow.filter({ hasText: 'Emma' }) anymore because
    // in edit mode "Emma" is an input value, not text content
    const editNameInput = page.locator('section').first().locator('li input[type="text"]');
    const editDateInput = page.locator('section').first().locator('li input[type="date"]');
    await expect(editNameInput).toBeVisible({ timeout: 5000 });

    // Change name and ensure date is set (date might be empty after reload due to store timing)
    await editNameInput.fill('Emmy');
    await editDateInput.fill('2025-12-01');

    // Wait for PUT response before clicking save
    responsePromise = page.waitForResponse(
      res => res.url().includes('/api/children/') && res.request().method() === 'PUT'
    );
    await page.click('button:has-text("Uložit")');
    await responsePromise;

    // Reload to verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify name updated in list
    await expect(page.getByRole('listitem').getByText('Emmy')).toBeVisible();
    await expect(page.getByRole('listitem').getByText('Emma')).not.toBeVisible();

    // Verify header updated
    await expect(page.locator('header')).toContainText('Emmy');
  });

  test('can add multiple children and select between them', async ({ page }) => {
    // Add first child
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.fill('input#add-name', 'Emma');
    await page.fill('input#add-birth', '2025-12-01');

    const submitBtn = page.locator('button[type="submit"]:has-text("Přidat dítě")');
    let responsePromise = page.waitForResponse(
      res => res.url().includes('/api/children') && res.request().method() === 'POST'
    );
    await submitBtn.click();
    await responsePromise;

    // Reload to see first child
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('listitem').getByText('Emma')).toBeVisible({ timeout: 10000 });

    // Add second child
    await page.fill('input#add-name', 'Oliver');
    await page.fill('input#add-birth', '2026-01-15');
    responsePromise = page.waitForResponse(
      res => res.url().includes('/api/children') && res.request().method() === 'POST'
    );
    await submitBtn.click();
    await responsePromise;

    // Reload to see second child
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('listitem').getByText('Oliver')).toBeVisible({ timeout: 10000 });

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

    const submitBtn = page.locator('button[type="submit"]:has-text("Přidat dítě")');
    const responsePromise = page.waitForResponse(
      res => res.url().includes('/api/children') && res.request().method() === 'POST'
    );
    await submitBtn.click();
    await responsePromise;

    // Reload to see the child
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('listitem').getByText('Temp')).toBeVisible({ timeout: 10000 });

    // Click delete
    await page.click('button:has-text("Smazat")');

    // Confirmation dialog should appear
    await expect(page.locator('text=Opravdu smazat')).toBeVisible();
    await expect(page.locator('li:has-text("Temp")')).toBeVisible();

    // Cancel
    await page.click('button:has-text("Zrušit")');

    // Child should still be there
    await expect(page.getByRole('listitem').getByText('Temp')).toBeVisible();

    // Click delete again
    await page.click('button:has-text("Smazat")');

    // Confirm deletion - wait for DELETE response
    const deletePromise = page.waitForResponse(
      res => res.url().includes('/api/children/') && res.request().method() === 'DELETE'
    );
    await page.click('button:has-text("Smazat")');
    await deletePromise;

    // Reload to verify deletion persisted
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Child should be removed
    await expect(page.getByRole('listitem').getByText('Temp')).not.toBeVisible();
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
