import { test, expect } from '@playwright/test';

// Cycle 1 — tracer bullet: manifest link is wired into the HTML head
test('page head contains manifest link', async ({ page }) => {
  await page.goto('/');
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBe('/manifest.webmanifest');
});

// Cycle 3 — service worker is registered (required for "Add to Home Screen")
test('service worker is registered', async ({ page, context }) => {
  // Wait for SW to appear in the browser context
  const [sw] = await Promise.all([
    context.waitForEvent('serviceworker', { timeout: 10000 }),
    page.goto('/'),
  ]);
  expect(sw.url()).toContain('sw');
});

// Cycle 2 — manifest has all fields required for PWA installability
test('manifest contains required PWA fields', async ({ page }) => {
  const response = await page.request.get('/manifest.webmanifest');
  expect(response.ok()).toBeTruthy();

  const manifest = await response.json();
  expect(manifest.name).toBeTruthy();
  expect(manifest.short_name).toBeTruthy();
  expect(manifest.display).toBe('standalone');
  expect(manifest.theme_color).toBe('#8B4557');
  expect(manifest.lang).toBe('cs');
  expect(Array.isArray(manifest.icons)).toBeTruthy();
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
});
