import { test, expect } from '@playwright/test';
import { setupAuthenticatedPage, clearAuthState } from './helpers/auth';

test.describe('Child Management', () => {
  test.beforeEach(async ({ page, request }, testInfo) => {
    await clearAuthState(page);
    const baseURL = testInfo.project.use?.baseURL || 'http://localhost:5173';
    await setupAuthenticatedPage(page, request, baseURL, 'child-test');
  });

  test('can add a child and see it in settings', async ({ page }) => {
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

    // Verify header shows page title (not child name)
    await expect(page.locator('header')).toContainText('Nastavení');
  });

  test('shows success message after adding child', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const submitBtn = page.locator('button[type="submit"]:has-text("Přidat dítě")');
    await expect(submitBtn).toBeEnabled();

    // Fill and submit form
    await page.fill('input#add-name', 'TestChild');
    await page.fill('input#add-birth', '2025-06-15');

    const responsePromise = page.waitForResponse(
      res => res.url().includes('/api/children') && res.request().method() === 'POST'
    );
    await submitBtn.click();
    await responsePromise;

    // Success message should appear (without page reload)
    await expect(page.locator('text=Údaje byly uloženy')).toBeVisible({ timeout: 3000 });

    // The child should also appear in the list without reload
    await expect(page.getByRole('listitem').getByText('TestChild')).toBeVisible({ timeout: 3000 });
  });

  test('edit form shows pre-populated birth date', async ({ page }) => {
    // Add a child first
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.fill('input#add-name', 'DateTest');
    await page.fill('input#add-birth', '2025-08-20');

    const submitBtn = page.locator('button[type="submit"]:has-text("Přidat dítě")');
    let responsePromise = page.waitForResponse(
      res => res.url().includes('/api/children') && res.request().method() === 'POST'
    );
    await submitBtn.click();
    await responsePromise;

    // Reload to see the child
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('listitem').getByText('DateTest')).toBeVisible({ timeout: 10000 });

    // Click edit button
    const childRow = page.locator('li').filter({ hasText: 'DateTest' });
    const editBtn = childRow.getByRole('button', { name: 'Upravit' });
    await editBtn.click();

    // The date input should be pre-populated with the correct value
    const editDateInput = page.locator('section').first().locator('li input[type="date"]');
    await expect(editDateInput).toBeVisible({ timeout: 5000 });

    // THIS IS THE KEY ASSERTION: date should already be filled
    await expect(editDateInput).toHaveValue('2025-08-20');

    // Name should also be pre-populated
    const editNameInput = page.locator('section').first().locator('li input[type="text"]');
    await expect(editNameInput).toHaveValue('DateTest');
  });

  test('API returns birthDate in YYYY-MM-DD format', async ({ page, request }, testInfo) => {
    const baseURL = testInfo.project.use?.baseURL || 'http://localhost:5173';

    // Get session cookie by navigating first
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Add a child via the UI to get proper auth
    await page.fill('input#add-name', 'APITest');
    await page.fill('input#add-birth', '2025-03-15');

    const submitBtn = page.locator('button[type="submit"]:has-text("Přidat dítě")');
    const responsePromise = page.waitForResponse(
      res => res.url().includes('/api/children') && res.request().method() === 'POST'
    );
    await submitBtn.click();
    const response = await responsePromise;

    // Check the response format
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.birthDate).toBe('2025-03-15'); // Must be YYYY-MM-DD, not a Date object string
    expect(body.data.birthDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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

    // Wait for the edit form to render
    const editNameInput = page.locator('section').first().locator('li input[type="text"]');
    const editDateInput = page.locator('section').first().locator('li input[type="date"]');
    await expect(editNameInput).toBeVisible({ timeout: 5000 });

    // Verify the date is pre-populated (don't manually fill it!)
    await expect(editDateInput).toHaveValue('2025-12-01');

    // Change only the name
    await editNameInput.fill('Emmy');

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
  });

  test('single-child app: add form hidden after adding child', async ({ page }) => {
    // Add first child
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Add form should be visible initially
    await expect(page.locator('input#add-name')).toBeVisible();

    await page.fill('input#add-name', 'Emma');
    await page.fill('input#add-birth', '2025-12-01');

    const submitBtn = page.locator('button[type="submit"]:has-text("Přidat dítě")');
    const responsePromise = page.waitForResponse(
      res => res.url().includes('/api/children') && res.request().method() === 'POST'
    );
    await submitBtn.click();
    await responsePromise;

    // Child should appear
    await expect(page.getByRole('listitem').getByText('Emma')).toBeVisible({ timeout: 5000 });

    // Add form should be hidden (single-child app)
    await expect(page.locator('input#add-name')).not.toBeVisible();
    await expect(submitBtn).not.toBeVisible();

    // Reload to verify form stays hidden
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('listitem').getByText('Emma')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input#add-name')).not.toBeVisible();
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

  test('shows no child message when empty', async ({ page }) => {
    // Go to settings - should show no child message
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Zatím nemáte přidané dítě')).toBeVisible();

    // Header should show page title
    await expect(page.locator('header')).toContainText('Nastavení');
  });
});
