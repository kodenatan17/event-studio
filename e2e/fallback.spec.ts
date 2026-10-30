import { expect, test } from '@playwright/test';

import { sceneControl } from './helpers';

test('E2E-10 WebGL disabled → 2D fallback with names, Akad Nikah, a chapter title, gallery fallback tiles, Khusus tamu undangan', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    const blocked = new Set(['webgl', 'webgl2', 'experimental-webgl']);
    HTMLCanvasElement.prototype.getContext = function getContext(
      this: HTMLCanvasElement,
      type: string,
      ...rest: unknown[]
    ) {
      if (blocked.has(type)) return null;
      return original.apply(this, [type, ...rest] as Parameters<typeof original>);
    } as typeof original;
  });

  await page.goto('/w/demo-wedding');
  await expect(page.getByTestId('world-status')).toHaveAttribute(
    'data-world-status',
    'FALLBACK_2D',
  );
  const fallback = page.getByTestId('fallback-2d');
  await expect(fallback.getByRole('heading', { level: 1 })).toHaveText('Natan & Nurul');
  await expect(fallback.getByRole('heading', { name: 'Akad Nikah' })).toBeVisible();
  await expect(fallback.getByRole('heading', { name: 'Pertama Bertemu' })).toBeVisible();
  await expect(fallback).toContainText('09.00–11.00 WIB');

  const gallery = fallback.getByRole('region', { name: 'Galeri Foto' });
  await gallery.scrollIntoViewIfNeeded();
  await expect(gallery.getByTestId('photo-fallback')).toHaveCount(6);
  await expect(gallery.getByText('Foto belum tersedia').first()).toBeVisible();

  const rsvp = fallback.getByRole('region', { name: 'RSVP' });
  await expect(rsvp.getByText('Khusus tamu undangan')).toBeVisible();
  await expect(fallback.getByText('Photo booth tidak didukung di mode 2D.')).toBeVisible();
  await expect(fallback.locator('form, input, textarea, select')).toHaveCount(0);

  // WebGL is unavailable, so no way back to a blank 3D canvas.
  await expect(page.getByRole('button', { name: 'Kembali ke 3D' })).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test('[T-108] ?mode=2d shows 2D view and Kembali ke 3D', async ({ page }) => {
  const response = await page.goto('/w/demo-wedding?mode=2d');
  // Server-rendered: the 2D invitation is in the HTML before any script runs.
  const html = (await response?.text()) ?? '';
  expect(html).toContain('Akad Nikah');
  expect(html).toContain('Kembali ke 3D');

  const status = page.getByTestId('world-status');
  await expect(status).toHaveAttribute('data-world-status', 'FALLBACK_2D');
  const fallback = page.getByTestId('fallback-2d');
  await expect(fallback.getByRole('heading', { level: 1 })).toHaveText('Natan & Nurul');
  await expect(page.locator('canvas')).toHaveCount(0);

  await fallback.getByRole('button', { name: 'Kembali ke 3D' }).click();
  // `?mode=2d` is dropped so a reload stays in 3D.
  await expect(page).toHaveURL(/\/w\/demo-wedding$/);
  await expect(status).toHaveAttribute('data-world-status', 'READY', { timeout: 30_000 });
  await expect(status).toHaveAttribute('data-scene-id', 'entrance');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(fallback).toHaveCount(0);
});

test('[T-108] Mode 2D button switches a running 3D world to the 2D invitation', async ({
  page,
}) => {
  await page.goto('/w/demo-wedding');
  const status = page.getByTestId('world-status');
  await expect(status).toHaveAttribute('data-world-status', 'READY', { timeout: 30_000 });

  // A real link (works without JS) that switches in place when JS is running.
  const link = page.getByRole('link', { name: 'Mode 2D', exact: true });
  await expect(link).toHaveAttribute('href', '?mode=2d');
  await page.evaluate(() => {
    (window as Window & { __sameDocument?: boolean }).__sameDocument = true;
  });
  await link.click();
  await expect(status).toHaveAttribute('data-world-status', 'FALLBACK_2D');
  expect(
    await page.evaluate(() => (window as Window & { __sameDocument?: boolean }).__sameDocument),
  ).toBe(true);
  const fallback = page.getByTestId('fallback-2d');
  await expect(fallback.getByRole('heading', { name: 'Akad Nikah' })).toBeVisible();

  // 2D gallery tiles open the same lightbox action.
  const gallery = fallback.getByRole('region', { name: 'Galeri Foto' });
  await gallery.getByRole('button', { name: /^Buka foto 2/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Galeri Foto' });
  await expect(dialog.getByTestId('gallery-progress')).toHaveText('2 / 6');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('[D-017] living-room GLB 404 → ERROR panel with Coba lagi and Mode 2D', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/templates/joglo/**', (route) => route.fulfill({ status: 404 }));

  await page.goto('/w/demo-wedding');
  const status = page.getByTestId('world-status');
  await expect(status).toHaveAttribute('data-world-status', 'READY', { timeout: 30_000 });
  await (await sceneControl(page, 'front-door')).click();

  // Asset failure is ERROR (retry + 2D), not the render-error 2D fallback (D-017).
  await expect(status).toHaveAttribute('data-world-status', 'ERROR', { timeout: 30_000 });
  const alert = page.getByRole('alert').filter({ hasText: 'Ruangan tidak dapat dimuat.' });
  await expect(alert).toBeVisible();
  await expect(alert.getByRole('button', { name: 'Coba lagi' })).toBeVisible();
  await expect(alert.getByRole('button', { name: 'Mode 2D' })).toBeVisible();
  await expect(page.getByTestId('fallback-2d')).toHaveCount(0);

  // Once the asset is reachable again, "Coba lagi" loads the living room (no cached failure).
  await page.unroute('**/templates/joglo/**');
  await alert.getByRole('button', { name: 'Coba lagi' }).click();
  await expect(status).toHaveAttribute('data-world-status', 'READY', { timeout: 30_000 });
  await expect(status).toHaveAttribute('data-scene-id', 'living-room');
  expect(pageErrors).toEqual([]);
});
