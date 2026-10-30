import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

async function expectScene(status: Locator, sceneId: string) {
  await expect(status).toHaveAttribute('data-world-status', 'READY', { timeout: 30_000 });
  await expect(status).toHaveAttribute('data-scene-id', sceneId);
}

function control(page: Page, id: string): Locator {
  return page.locator(`[data-hotspot-id="${id}"]`);
}

type Box = { x: number; y: number; width: number; height: number };

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

test('E2E-12 mobile: no horizontal scroll, nav buttons ≥44×44 inside viewport and not overlapping, tapping a hotspot control opens the overlay, canvas keeps ≥60% visible', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile viewport only');

  await page.goto('/w/demo-wedding');
  const status = page.getByTestId('world-status');
  await expectScene(status, 'entrance');
  await control(page, 'front-door').tap();
  await expectScene(status, 'living-room');

  const viewport = page.viewportSize();
  if (!viewport) throw new Error('viewport size missing');

  const horizontal = await page.evaluate(() => {
    window.scrollTo(500, 0);
    const root = document.scrollingElement ?? document.documentElement;
    return { x: window.scrollX, overflow: root.scrollWidth - window.innerWidth };
  });
  expect(horizontal).toEqual({ x: 0, overflow: 0 });

  // Four buttons plus the "Mode 2D" link (works without JS).
  const buttons = page
    .getByRole('navigation', { name: 'Navigasi undangan' })
    .locator('button, a[href]');
  await expect(buttons).toHaveCount(5);
  const boxes: Box[] = [];
  for (const button of await buttons.all()) {
    const box = await button.boundingBox();
    if (!box) throw new Error('nav button not rendered');
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    boxes.push(box);
  }
  boxes.forEach((box, i) => {
    boxes.slice(i + 1).forEach((other) => expect(overlaps(box, other)).toBe(false));
  });

  // The 3D view between the header and the bottom controls keeps ≥60% of the viewport.
  const header = await page.getByTestId('viewer-header').boundingBox();
  const controls = await page.getByTestId('viewer-controls').boundingBox();
  if (!header || !controls) throw new Error('viewer chrome not rendered');
  const visible = (controls.y - (header.y + header.height)) / viewport.height;
  expect(visible).toBeGreaterThanOrEqual(0.6);

  await control(page, 'photo-frame-01').tap();
  await expect(status).toHaveAttribute('data-world-status', 'OVERLAY_OPEN');
  const dialog = page.getByRole('dialog', { name: 'Galeri Foto' });
  await expect(dialog.getByTestId('gallery-progress')).toHaveText('1 / 6');
  const dialogBox = await dialog.boundingBox();
  if (!dialogBox) throw new Error('dialog not rendered');
  expect(dialogBox.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(viewport.width);
  await dialog.getByRole('button', { name: 'Tutup' }).tap();
  await expect(dialog).toHaveCount(0);
});
