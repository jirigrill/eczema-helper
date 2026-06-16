/**
 * Smoke tests for CSS atoms defined in app.css @layer components.
 *
 * jsdom does not process Tailwind CSS, so these Playwright tests verify
 * that @apply rules inside @layer components actually resolve to the
 * expected computed values in a real Chromium browser.
 *
 * Each test injects a minimal element, then checks a concrete CSS property
 * that can only be set by the atom under test (not by default browser styles).
 *
 * Run: bunx playwright test tests/e2e/css-atoms.test.ts
 */

import { test, expect, type Page } from '@playwright/test';

/** Append a div with the given className / attributes and return its locator. */
async function injectElement(
  page: Page,
  opts: { id: string; className?: string; dataState?: string },
): Promise<ReturnType<Page['locator']>> {
  await page.evaluate(
    ({ id, className, dataState }) => {
      const el = document.createElement('div');
      el.id = id;
      if (className) el.className = className;
      if (dataState) el.setAttribute('data-state', dataState);
      document.body.appendChild(el);
    },
    opts,
  );
  return page.locator(`#${opts.id}`);
}

test.beforeEach(async ({ page }) => {
  // Any app route works — we just need the global Tailwind stylesheet loaded.
  // networkidle is required here: in dev, Tailwind CSS is injected via JS after
  // the load event, so a lighter wait sees transparent backgrounds.
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});

// ---------------------------------------------------------------------------
// card-base
// rounded-2xl = 16px, p-4 = 16px, bg-white = rgb(255,255,255)
// ---------------------------------------------------------------------------

test('card-base applies rounded-2xl border-radius', async ({ page }) => {
  const el = await injectElement(page, { id: 'test-card-base', className: 'card-base' });
  await expect(el).toHaveCSS('border-radius', '16px');
});

test('card-base applies p-4 padding', async ({ page }) => {
  const el = await injectElement(page, { id: 'test-card-padding', className: 'card-base' });
  await expect(el).toHaveCSS('padding-top', '16px');
  await expect(el).toHaveCSS('padding-right', '16px');
  await expect(el).toHaveCSS('padding-bottom', '16px');
  await expect(el).toHaveCSS('padding-left', '16px');
});

// ---------------------------------------------------------------------------
// eyebrow (issue #302 — supersedes section-label / micro-label)
// text-xs = 12px, font-semibold, uppercase, tracking-wide, text-text-muted
// ---------------------------------------------------------------------------

test('eyebrow applies text-xs font-size', async ({ page }) => {
  const el = await injectElement(page, { id: 'test-eyebrow', className: 'eyebrow' });
  await expect(el).toHaveCSS('font-size', '12px');
});

test('eyebrow applies uppercase text-transform', async ({ page }) => {
  const el = await injectElement(page, { id: 'test-eyebrow-case', className: 'eyebrow' });
  await expect(el).toHaveCSS('text-transform', 'uppercase');
});

test('eyebrow applies semibold font-weight (600)', async ({ page }) => {
  const el = await injectElement(page, { id: 'test-eyebrow-weight', className: 'eyebrow' });
  await expect(el).toHaveCSS('font-weight', '600');
});

// ---------------------------------------------------------------------------
// caption (issue #302)
// text-[11px] = 11px, text-text-muted color
// ---------------------------------------------------------------------------

test('caption applies 11px font-size', async ({ page }) => {
  const el = await injectElement(page, { id: 'test-caption', className: 'caption' });
  await expect(el).toHaveCSS('font-size', '11px');
});

test('caption applies muted text color (#7A6468)', async ({ page }) => {
  const el = await injectElement(page, { id: 'test-caption-color', className: 'caption' });
  // text-text-muted = #7A6468 = rgb(122, 100, 104)
  await expect(el).toHaveCSS('color', 'rgb(122, 100, 104)');
});

// ---------------------------------------------------------------------------
// body
// text-sm = 14px
// ---------------------------------------------------------------------------

test('body atom applies text-sm font-size', async ({ page }) => {
  const el = await injectElement(page, { id: 'test-body', className: 'body' });
  await expect(el).toHaveCSS('font-size', '14px');
});

// ---------------------------------------------------------------------------
// body-muted
// text-sm = 14px (unified from previous text-xs usages per issue spec)
// ---------------------------------------------------------------------------

test('body-muted atom applies text-sm font-size', async ({ page }) => {
  const el = await injectElement(page, { id: 'test-body-muted', className: 'body-muted' });
  await expect(el).toHaveCSS('font-size', '14px');
});

// ---------------------------------------------------------------------------
// page-container
// max-w-lg = 512px max-width, px-4 = 16px horizontal padding
// ---------------------------------------------------------------------------

test('page-container applies max-w-lg max-width', async ({ page }) => {
  const el = await injectElement(page, { id: 'test-page-container', className: 'page-container' });
  await expect(el).toHaveCSS('max-width', '512px');
});

test('page-container applies px-4 horizontal padding', async ({ page }) => {
  const el = await injectElement(page, { id: 'test-page-container-px', className: 'page-container' });
  await expect(el).toHaveCSS('padding-left', '16px');
  await expect(el).toHaveCSS('padding-right', '16px');
});

// ---------------------------------------------------------------------------
// [data-state] block
// danger background must be non-transparent (bg-danger/10 fires)
// ---------------------------------------------------------------------------

test('data-state="danger" applies non-transparent background', async ({ page }) => {
  const el = await injectElement(page, { id: 'test-state-danger', dataState: 'danger' });
  const bg = await el.evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  expect(bg).not.toBe('transparent');
});

test('data-state="success" applies non-transparent background', async ({ page }) => {
  const el = await injectElement(page, { id: 'test-state-success', dataState: 'success' });
  const bg = await el.evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  expect(bg).not.toBe('transparent');
});

test('data-state="warning" applies non-transparent background', async ({ page }) => {
  const el = await injectElement(page, { id: 'test-state-warning', dataState: 'warning' });
  const bg = await el.evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  expect(bg).not.toBe('transparent');
});

test('data-state="info" applies non-transparent background', async ({ page }) => {
  const el = await injectElement(page, { id: 'test-state-info', dataState: 'info' });
  const bg = await el.evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  expect(bg).not.toBe('transparent');
});

test('data-state="neutral" applies surface background', async ({ page }) => {
  const el = await injectElement(page, { id: 'test-state-neutral', dataState: 'neutral' });
  // bg-surface = #FAF8F8 = rgb(250, 248, 248)
  await expect(el).toHaveCSS('background-color', 'rgb(250, 248, 248)');
});
