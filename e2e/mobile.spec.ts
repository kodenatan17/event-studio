import { expect, test } from '@playwright/test';

import { expectScene, sceneControl } from './helpers';

type Box = { x: number; y: number; width: number; height: number };

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

test('E2E-12 mobile: no horizontal scroll, nav buttons ≥44×44 inside viewport and not overlapping, tapping a hotspot control opens the overlay, canvas keeps ≥60% visible', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile viewport only');
  test.slow(); // GLB living room is slow on SwiftShader (D-031); timeout only.

  await page.goto('/w/demo-wedding');
  const status = page.getByTestId('world-status');
  await expectScene(status, 'entrance');
  await (await sceneControl(page, 'front-door')).tap();
  await expectScene(status, 'living-room');

  const viewport = page.viewportSize();
  if (!viewport) throw new Error('viewport size missing');
  const inViewport = (box: Box) => {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  };

  const horizontal = await page.evaluate(() => {
    window.scrollTo(500, 0);
    const root = document.scrollingElement ?? document.documentElement;
    return { x: window.scrollX, overflow: root.scrollWidth - window.innerWidth };
  });
  expect(horizontal).toEqual({ x: 0, overflow: 0 });

  // "Interaksi", four buttons and the "Mode 2D" link (works without JS).
  const buttons = page
    .getByRole('navigation', { name: 'Navigasi undangan' })
    .locator('button, a[href]');
  await expect(buttons).toHaveCount(6);
  const boxes: Box[] = [];
  for (const button of await buttons.all()) {
    const box = await button.boundingBox();
    if (!box) throw new Error('nav button not rendered');
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    inViewport(box);
    boxes.push(box);
  }
  boxes.forEach((box, i) => {
    boxes.slice(i + 1).forEach((other) => expect(overlaps(box, other)).toBe(false));
  });
  // Short visible labels keep their full accessible names (WCAG 2.5.3).
  await expect(page.getByRole('button', { name: 'Info Acara', exact: true })).toHaveText('Acara', {
    useInnerText: true,
  });
  await expect(page.getByRole('link', { name: 'Mode 2D', exact: true })).toHaveText('2D', {
    useInnerText: true,
  });

  // The 3D view between the header and the bottom controls keeps ≥60% of the viewport.
  const header = await page.getByTestId('viewer-header').boundingBox();
  const controls = await page.getByTestId('viewer-controls').boundingBox();
  if (!header || !controls) throw new Error('viewer chrome not rendered');
  const visible = (controls.y - (header.y + header.height)) / viewport.height;
  expect(visible).toBeGreaterThanOrEqual(0.6);

  // Touch controls: ≥44 px, inside the viewport, clear of the nav, the header and each other.
  const touch = page.getByTestId('touch-controls');
  await expect(touch).toBeVisible();
  const touchTargets = touch.locator('button, [data-testid="joystick"]');
  await expect(touchTargets).toHaveCount(4);
  const touchBoxes: Box[] = [];
  for (const target of await touchTargets.all()) {
    const box = await target.boundingBox();
    if (!box) throw new Error('touch control not rendered');
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    inViewport(box);
    expect(overlaps(box, header)).toBe(false);
    for (const navBox of boxes) expect(overlaps(box, navBox)).toBe(false);
    touchBoxes.push(box);
  }
  touchBoxes.forEach((box, i) => {
    touchBoxes.slice(i + 1).forEach((other) => expect(overlaps(box, other)).toBe(false));
  });

  // The scene's controls open from "Interaksi" as one panel above the bar, within 40% height.
  const toggle = page.getByRole('button', { name: 'Interaksi', exact: true });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  const frame = await sceneControl(page, 'photo-frame-01');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(touch).toBeHidden();
  const panel = await page.locator(`#${await toggle.getAttribute('aria-controls')}`).boundingBox();
  if (!panel) throw new Error('interaction panel not rendered');
  inViewport(panel);
  expect(panel.height).toBeLessThanOrEqual(viewport.height * 0.4 + 1);
  expect(panel.y + panel.height).toBeLessThanOrEqual(controls.y);

  await frame.tap();
  await expect(status).toHaveAttribute('data-world-status', 'OVERLAY_OPEN');
  const dialog = page.getByRole('dialog', { name: 'Galeri Foto' });
  await expect(dialog.getByTestId('gallery-progress')).toHaveText('1 / 6');
  const dialogBox = await dialog.boundingBox();
  if (!dialogBox) throw new Error('dialog not rendered');
  expect(dialogBox.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(viewport.width);
  await dialog.getByRole('button', { name: 'Tutup' }).tap();
  await expect(dialog).toHaveCount(0);
  // The panel stayed open behind the dialog, so focus returns to the control.
  await expect(frame).toBeFocused();

  // Escape closes the panel and returns focus to the toggle.
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await expect(touch).toBeVisible();
});
