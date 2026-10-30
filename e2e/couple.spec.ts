import { expect, test } from '@playwright/test';

import { expectScene, goViaMap, settledGeometries } from './helpers';

test('[§3.3] wedding garden shows groom and bride', async ({ page }) => {
  await page.goto('/w/demo-wedding');
  const status = page.getByTestId('world-status');
  await expectScene(status, 'entrance');
  await expect(status).toHaveAttribute('data-couple', '');

  await goViaMap(page, 'Taman Pernikahan');
  await expectScene(status, 'wedding-garden');
  await expect(status).toHaveAttribute('data-couple', 'ready');

  // They belong to the garden: leaving releases them.
  await goViaMap(page, 'Gerbang');
  await expectScene(status, 'entrance');
  await expect(status).toHaveAttribute('data-couple', '');
});

test('[FR-04] entrance↔garden ×5 does not grow data-gl-geometries', async ({ page }) => {
  test.slow(true, 'two extra characters on SwiftShader (D-031); timeout only');
  await page.goto('/w/demo-wedding');
  const status = page.getByTestId('world-status');
  await expectScene(status, 'entrance');
  await goViaMap(page, 'Taman Pernikahan');
  await expectScene(status, 'wedding-garden');
  await goViaMap(page, 'Gerbang');
  await expectScene(status, 'entrance');
  const first = await settledGeometries(status);

  for (let round = 0; round < 5; round += 1) {
    await goViaMap(page, 'Taman Pernikahan');
    await expectScene(status, 'wedding-garden');
    await expect(status).toHaveAttribute('data-couple', 'ready');
    await goViaMap(page, 'Gerbang');
    await expectScene(status, 'entrance');
  }

  expect(await settledGeometries(status)).toBeLessThanOrEqual(first);
});
