import { expect, test } from '@playwright/test';

test('[T-002] health endpoint returns ok', async ({ request }) => {
  const response = await request.get('/api/health');

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: 'ok' });
});

test('[T-003] demo wedding shows dev banner and renders the 3D canvas', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  const response = await page.goto('/w/demo-wedding');

  expect(response?.status()).toBe(200);
  await expect(page.getByText('Data contoh (fixture pengembangan)')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Raka & Sekar');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('world-status')).toHaveAttribute('data-world-status', 'READY', {
    timeout: 30_000,
  });
  await expect(page.getByText('Tampilan 3D tidak dapat dimuat')).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test('[FR-01][T-003] unknown wedding slug returns 404', async ({ page }) => {
  const response = await page.goto('/w/unknown');

  expect(response?.status()).toBe(404);
});

test('[D-015] viewer sends baseline security headers and noindex', async ({ page }) => {
  const response = await page.goto('/w/demo-wedding');
  const headers = response?.headers() ?? {};

  // Production build (webServer runs `next start`): no 'unsafe-eval'.
  expect(headers['content-security-policy']).toBeTruthy();
  expect(headers['content-security-policy']).not.toContain("'unsafe-eval'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['permissions-policy']).toContain('camera=()');
  expect(headers['x-powered-by']).toBeUndefined();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /^noindex/);
});

test('[T-003] mobile canvas fills viewport, no page scroll', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile viewport only');

  await page.goto('/w/demo-wedding');
  const canvas = page.locator('canvas');
  // The canvas is sized by R3F after mount; measure once the scene is ready.
  await expect(page.getByTestId('world-status')).toHaveAttribute('data-world-status', 'READY', {
    timeout: 30_000,
  });

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  await expect
    .poll(() => canvas.boundingBox())
    .toMatchObject({ x: 0, y: 0, width: viewport?.width, height: viewport?.height });
  await expect(canvas).toHaveCSS('touch-action', 'none');

  const scroll = await page.evaluate(() => {
    window.scrollTo(0, 500);
    const root = document.scrollingElement ?? document.documentElement;
    return { y: window.scrollY, overflow: root.scrollHeight - window.innerHeight };
  });
  expect(scroll).toEqual({ y: 0, overflow: 0 });
});
