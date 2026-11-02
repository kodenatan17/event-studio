import { expect, test } from '@playwright/test';

import { expectScene, goViaMap } from './helpers';

const WAIT_FOR_LINE = { timeout: 30_000 };

test('[D-037] greeters at the gate and walkers in each room, released on leaving', async ({
  page,
}) => {
  test.slow(true, 'four extra characters per room on SwiftShader (D-031); timeout only');
  await page.goto('/w/demo-wedding');
  const status = page.getByTestId('world-status');
  await expectScene(status, 'entrance');
  await expect(status).toHaveAttribute('data-figures', '2');

  await goViaMap(page, 'Ruang Tamu');
  await expectScene(status, 'living-room');
  await expect(status).toHaveAttribute('data-figures', '3');

  // Four walkers beside the bride and groom.
  await goViaMap(page, 'Taman Pernikahan');
  await expectScene(status, 'wedding-garden');
  await expect(status).toHaveAttribute('data-figures', '6');

  await goViaMap(page, 'Pendopo Resepsi');
  await expectScene(status, 'reception-hall');
  await expect(status).toHaveAttribute('data-figures', '4');

  await goViaMap(page, 'Gerbang');
  await expectScene(status, 'entrance');
  await expect(status).toHaveAttribute('data-figures', '2');
});

test('[D-037] a bubble comes and goes, and an overlay clears it', async ({ page }) => {
  await page.goto('/w/demo-wedding');
  const status = page.getByTestId('world-status');
  await expectScene(status, 'entrance');
  await expect(status).not.toHaveAttribute('data-npc-bubbles', '0', WAIT_FOR_LINE);

  await page.getByRole('button', { name: 'Peta', exact: true }).click();
  await expect(status).toHaveAttribute('data-npc-bubbles', '0');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Peta' })).toHaveCount(0);
  await expect(status).not.toHaveAttribute('data-npc-bubbles', '0', WAIT_FOR_LINE);
});

test('[D-037] characters stand still under reduced motion but still speak', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/w/demo-wedding');
  const status = page.getByTestId('world-status');
  await expectScene(status, 'entrance');
  await expect(status).not.toHaveAttribute('data-npc-bubbles', '0', WAIT_FOR_LINE);
});
