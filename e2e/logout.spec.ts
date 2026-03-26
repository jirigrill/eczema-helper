import { test, expect } from '@playwright/test';
import { setupAuthenticatedPage } from './helpers/auth';

test.describe('Logout Flow', () => {
  test('logout clears session and redirects to login', async ({ page, request, baseURL }) => {
    // Setup: Authenticate via API (more reliable than UI)
    await setupAuthenticatedPage(page, request, baseURL!, 'logout-test');

    // Navigate to settings and logout
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Odhlásit se")');

    // Should redirect to login
    await page.waitForURL(url => url.pathname === '/login');

    // Try to go back (simulating back button)
    await page.goto('/settings');

    // Should still redirect to login (session cleared)
    await page.waitForURL(url => url.pathname === '/login');
  });
});
