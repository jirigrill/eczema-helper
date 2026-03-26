import { test, expect } from '@playwright/test';

const uniqueEmail = (prefix: string, projectName: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${projectName}@example.com`;

test.describe('Logout Flow', () => {
  test('logout clears session and redirects to login', async ({ page }, testInfo) => {
    // Setup: Register and login
    const email = uniqueEmail('logout-test', testInfo.project.name);
    
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await page.fill('input#name', 'Logout Test');
    await page.fill('input#email', email);
    await page.fill('input#password', 'password123');
    await Promise.all([
      page.waitForNavigation({ url: url => url.pathname === '/calendar' }),
      page.click('button[type="submit"]')
    ]);
    
    // Navigate to settings and logout
    await page.goto('/settings');
    await page.click('button:has-text("Odhlásit se")');
    
    // Should redirect to login
    await page.waitForURL(url => url.pathname === '/login');
    
    // Try to go back (simulating back button)
    await page.goto('/settings');
    
    // Should still redirect to login (session cleared)
    await page.waitForURL(url => url.pathname === '/login');
  });
});
