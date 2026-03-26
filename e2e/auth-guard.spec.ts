import { test, expect } from '@playwright/test';

const uniqueEmail = (prefix: string, projectName: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${projectName}@example.com`;

test.describe('Auth Guard - Route Protection', () => {
  test('redirects to login when accessing protected routes without session', async ({ page }) => {
    // Clear any existing cookies/state
    await page.context().clearCookies();
    
    // Try to access calendar directly
    await page.goto('/calendar');
    
    // Should redirect to login
    await page.waitForURL(url => url.pathname === '/login');
  });

  test('redirects to login when accessing settings without session', async ({ page }) => {
    await page.context().clearCookies();
    
    await page.goto('/settings');
    await page.waitForURL(url => url.pathname === '/login');
  });

  test('redirects to login when accessing food page without session', async ({ page }) => {
    await page.context().clearCookies();
    
    await page.goto('/food');
    await page.waitForURL(url => url.pathname === '/login');
  });

  test('redirects authenticated user away from login page', async ({ page }, testInfo) => {
    // First register and login
    const email = uniqueEmail('guard-test', testInfo.project.name);
    
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await page.fill('input#name', 'Guard Test');
    await page.fill('input#email', email);
    await page.fill('input#password', 'password123');
    await Promise.all([
      page.waitForNavigation({ url: url => url.pathname === '/calendar' }),
      page.click('button[type="submit"]')
    ]);
    
    // Now try to go to login
    await page.goto('/login');
    
    // Should redirect to calendar
    await page.waitForURL(url => url.pathname === '/calendar');
  });
});
