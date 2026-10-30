import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { expectScene, goViaMap, settledGeometries } from './helpers';

const avatarButton = (page: Page) => page.getByRole('button', { name: 'Ubah avatar' });
const editor = (page: Page) => page.getByRole('dialog', { name: 'Ubah Avatar' });

async function openEditor(page: Page): Promise<Locator> {
  await avatarButton(page).click();
  const dialog = editor(page);
  await expect(dialog).toBeVisible();
  return dialog;
}

async function currentLook(status: Locator): Promise<string> {
  const look = await status.getAttribute('data-avatar');
  if (!look) throw new Error('avatar look not reported');
  return look;
}

test('E2E-11 avatar appearance persists after reload; localStorage holds only undangan.sound/undangan.avatar.v1', async ({
  page,
}) => {
  await page.goto('/w/demo-wedding');
  const status = page.getByTestId('world-status');
  await expectScene(status, 'entrance');
  const before = await currentLook(status);

  const dialog = await openEditor(page);
  await dialog.getByRole('button', { name: 'Wanita', exact: true }).click();
  await expect(status).not.toHaveAttribute('data-avatar', before);
  await dialog.getByRole('tab', { name: 'Kepala' }).click();
  await dialog.getByRole('button', { name: 'Hijab', exact: true }).click();
  await dialog.getByRole('button', { name: 'Biru', exact: true }).click();
  const chosen = await currentLook(status);
  expect(chosen).toContain('headwear=hijab:biru');
  await dialog.getByRole('button', { name: 'Simpan' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(status).toHaveAttribute('data-avatar', chosen);
  await expect(status).toHaveAttribute('data-world-status', 'READY');

  await page.getByRole('button', { name: 'Suara', exact: true }).click();
  await page.reload();
  await expectScene(status, 'entrance');
  await expect(status).toHaveAttribute('data-avatar', chosen);
  await expect(status).toHaveAttribute('data-avatar-built', chosen);

  const keys = await page.evaluate(() => Object.keys(window.localStorage).sort());
  expect(keys).toEqual(['undangan.avatar.v1', 'undangan.sound']);
  const stored = await page.evaluate(() => window.localStorage.getItem('undangan.avatar.v1'));
  expect(Object.keys(JSON.parse(stored ?? '{}') as object).sort()).toEqual([
    'body',
    'skin',
    'slots',
    'v',
  ]);
});

test('[FR-07] Escape discards changes and restores focus', async ({ page }) => {
  await page.goto('/w/demo-wedding');
  const status = page.getByTestId('world-status');
  await expectScene(status, 'entrance');
  const before = await currentLook(status);

  const dialog = await openEditor(page);
  await dialog.getByRole('button', { name: 'Cokelat', exact: true }).click();
  await expect(status).not.toHaveAttribute('data-avatar', before);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(status).toHaveAttribute('data-avatar', before);
  await expect(status).toHaveAttribute('data-world-status', 'READY');
  await expect(avatarButton(page)).toBeFocused();
  expect(await page.evaluate(() => window.localStorage.getItem('undangan.avatar.v1'))).toBeNull();

  // "Batal" discards the same way.
  const again = await openEditor(page);
  await again.getByRole('button', { name: 'Wanita', exact: true }).click();
  await again.getByRole('button', { name: 'Batal' }).click();
  await expect(again).toHaveCount(0);
  await expect(status).toHaveAttribute('data-avatar', before);
});

test('[FR-07] browser back closes the avatar editor first', async ({ page }) => {
  await page.goto('/w/demo-wedding');
  const status = page.getByTestId('world-status');
  await expectScene(status, 'entrance');
  const url = page.url();
  const before = await currentLook(status);

  const dialog = await openEditor(page);
  await dialog.getByRole('button', { name: 'Wanita', exact: true }).click();
  await expect(status).not.toHaveAttribute('data-avatar', before);

  await page.goBack();
  await expect(dialog).toHaveCount(0);
  expect(page.url()).toBe(url);
  await expect(status).toHaveAttribute('data-avatar', before);
  await expect(status).toHaveAttribute('data-world-status', 'READY');
});

test('[FR-07] the rotate surface and buttons turn the preview; the world stays inert', async ({
  page,
}) => {
  await page.goto('/w/demo-wedding');
  const status = page.getByTestId('world-status');
  await expectScene(status, 'entrance');

  const dialog = await openEditor(page);
  await expect(status).toHaveAttribute('data-world-status', 'OVERLAY_OPEN');
  await expect(page.getByTestId('world-layer')).toHaveAttribute('inert', '');

  const surface = dialog.getByRole('slider', { name: 'Putar avatar' });
  await expect(surface).toHaveAttribute('aria-valuenow', '0');
  await surface.focus();
  await page.keyboard.press('ArrowRight');
  await expect(surface).toHaveAttribute('aria-valuenow', '15');
  await dialog.getByRole('button', { name: 'Putar kiri' }).click();
  await dialog.getByRole('button', { name: 'Putar kiri' }).click();
  await expect(surface).toHaveAttribute('aria-valuenow', '-15');

  // Tabs move with the arrow keys.
  const tubuh = dialog.getByRole('tab', { name: 'Tubuh' });
  await tubuh.focus();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByRole('tab', { name: 'Kepala' })).toBeFocused();
  await expect(dialog.getByRole('tab', { name: 'Kepala' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('[FR-07] mobile sheet ≤ 60% height, controls ≥ 44 px', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile viewport only');
  await page.goto('/w/demo-wedding');
  const status = page.getByTestId('world-status');
  await expectScene(status, 'entrance');
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('viewport size missing');

  const opener = await avatarButton(page).boundingBox();
  if (!opener) throw new Error('avatar button not rendered');
  expect(opener.height).toBeGreaterThanOrEqual(44);
  expect(opener.width).toBeGreaterThanOrEqual(44);
  expect(opener.x + opener.width).toBeLessThanOrEqual(viewport.width);

  const dialog = await openEditor(page);
  const panel = dialog.locator('section');
  // Measured once the slide-in has finished.
  await expect
    .poll(async () => {
      const settled = await panel.boundingBox();
      return settled ? Math.round(settled.y + settled.height) : null;
    })
    .toBe(viewport.height);
  const box = await panel.boundingBox();
  if (!box) throw new Error('panel not rendered');
  expect(box.height).toBeLessThanOrEqual(viewport.height * 0.6);

  for (const tab of ['Tubuh', 'Kepala', 'Pakaian', 'Aksesori']) {
    await dialog.getByRole('tab', { name: tab }).click();
    // Read at once from layout: controls scrolled out of the panel still have their size.
    const sizes = await dialog
      .locator('section')
      .getByRole('button')
      .evaluateAll((controls) =>
        controls.map((control) => {
          const { width, height } = control.getBoundingClientRect();
          return { width, height };
        }),
      );
    expect(sizes.length).toBeGreaterThan(2);
    for (const { width, height } of sizes) {
      expect(height).toBeGreaterThanOrEqual(44);
      expect(width).toBeGreaterThanOrEqual(44);
    }
  }
  for (const name of ['Putar kiri', 'Putar kanan']) {
    const target = await dialog.getByRole('button', { name }).boundingBox();
    if (!target) throw new Error('rotate button not rendered');
    expect(target.height).toBeGreaterThanOrEqual(44);
    expect(target.y + target.height).toBeLessThanOrEqual(box.y);
  }
});

test('[FR-07] look changes rebuild the character and do not grow data-gl-geometries', async ({
  page,
}) => {
  await page.goto('/w/demo-wedding');
  const status = page.getByTestId('world-status');
  await expectScene(status, 'entrance');
  const pria = await currentLook(status);
  await expect(status).toHaveAttribute('data-avatar-built', pria);
  const first = await settledGeometries(status);

  const dialog = await openEditor(page);
  for (let round = 0; round < 6; round += 1) {
    await dialog.getByRole('button', { name: 'Wanita', exact: true }).click();
    await expect(status).not.toHaveAttribute('data-avatar-built', pria);
    await dialog.getByRole('button', { name: 'Pria', exact: true }).click();
    await expect(status).toHaveAttribute('data-avatar-built', pria);
  }

  expect(await settledGeometries(status)).toBeLessThanOrEqual(first);
});

test('[FR-07] "Ubah avatar" stays clear of long couple names on a 360 px phone', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile viewport only');
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/w/demo-wedding');
  const status = page.getByTestId('world-status');
  await expectScene(status, 'entrance');

  const names = page.getByRole('heading', { level: 1 });
  for (const text of [null, 'Muhammad Abdurrahman & Khadijah Kusumawardhani']) {
    if (text) await names.evaluate((heading, value) => (heading.textContent = value), text);
    const pill = await names.locator('..').boundingBox();
    const button = await avatarButton(page).boundingBox();
    if (!pill || !button) throw new Error('header not rendered');
    expect(pill.x).toBeGreaterThanOrEqual(0);
    expect(pill.x + pill.width).toBeLessThanOrEqual(360);
    expect(button.height).toBeGreaterThanOrEqual(44);
    expect(button.x + button.width).toBeLessThanOrEqual(360);
    expect(button.y).toBeGreaterThanOrEqual(pill.y + pill.height);
  }
});

test('[FR-08] three scene changes keep data-avatar and READY', async ({ page }) => {
  await page.goto('/w/demo-wedding');
  const status = page.getByTestId('world-status');
  await expectScene(status, 'entrance');

  const dialog = await openEditor(page);
  await dialog.getByRole('button', { name: 'Wanita', exact: true }).click();
  await dialog.getByRole('button', { name: 'Simpan' }).click();
  await expect(dialog).toHaveCount(0);
  const look = await currentLook(status);
  await expect(status).toHaveAttribute('data-avatar-built', look);

  // `data-avatar-built` is reported by the character in the new scene, not by the store.
  await goViaMap(page, 'Taman Pernikahan');
  await expectScene(status, 'wedding-garden');
  await expect(status).toHaveAttribute('data-avatar-built', look);
  await goViaMap(page, 'Pendopo Resepsi');
  await expectScene(status, 'reception-hall');
  await expect(status).toHaveAttribute('data-avatar-built', look);
  await goViaMap(page, 'Gerbang');
  await expectScene(status, 'entrance');
  await expect(status).toHaveAttribute('data-avatar-built', look);
});
