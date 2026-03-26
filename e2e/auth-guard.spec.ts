import { test, expect } from '@playwright/test';
import { setupAuthenticatedPage } from './helpers/auth';

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

  test('redirects authenticated user away from login page', async ({ page, request, baseURL }) => {
    // Set up authenticated session via API (more reliable than UI)
    await setupAuthenticatedPage(page, request, baseURL!, 'guard-test');

    // Now try to go to login
    await page.goto('/login');

    // Should redirect to calendar
    await page.waitForURL(url => url.pathname === '/calendar');
  });
});
