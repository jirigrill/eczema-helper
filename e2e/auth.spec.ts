import { test, expect } from '@playwright/test';
import { clearAuthState, createTestUser } from './helpers/auth';

test.describe('Registration and Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('user can register and is redirected to calendar', async ({ page }) => {
    const user = createTestUser('register-test');

    // 1. Navigate to register page
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // 2. Fill registration form
    await page.fill('input#name', user.name);
    await page.fill('input#email', user.email);
    await page.fill('input#password', user.password);

    // 3. Submit form and wait for redirect
    await Promise.all([
      page.waitForNavigation({ url: url => url.pathname === '/calendar' }),
      page.click('button[type="submit"]')
    ]);

    // 4. Verify user is logged in
    await expect(page.locator('header')).toBeVisible();
  });

  test('user can login with valid credentials', async ({ page }) => {
    const user = createTestUser('login-test');

    // First register via UI
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await page.fill('input#name', user.name);
    await page.fill('input#email', user.email);
    await page.fill('input#password', user.password);
    await Promise.all([
      page.waitForNavigation({ url: url => url.pathname === '/calendar' }),
      page.click('button[type="submit"]')
    ]);

    // Logout via UI
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Odhlásit se")');
    await page.waitForURL(url => url.pathname === '/login');

    // Now login via UI with the same credentials
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input#email', user.email);
    await page.fill('input#password', user.password);
    await Promise.all([
      page.waitForNavigation({ url: url => url.pathname === '/calendar' }),
      page.click('button[type="submit"]')
    ]);

    // Verify logged in
    await expect(page.locator('header')).toBeVisible();
  });

  test('login fails with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input#email', 'nonexistent@example.com');
    await page.fill('input#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should stay on login page and show error
    await expect(page).toHaveURL(url => url.pathname === '/login');
    await expect(page.locator('text=Nesprávné přihlašovací údaje')).toBeVisible({ timeout: 10000 });
  });
});
