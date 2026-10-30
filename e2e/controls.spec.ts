import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { avatarPosition, expectScene, goViaMap, settledAvatar } from './helpers';

/** Holds a key for `ms`. */
async function hold(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

/** Holds `key` until `reached` holds for the probed position (frame rate independent). */
async function holdUntil(
  page: Page,
  status: Locator,
  key: string,
  reached: (position: [number, number]) => boolean,
) {
  await page.keyboard.down(key);
  await expect
    .poll(async () => reached(await avatarPosition(status)), { timeout: 30_000 })
    .toBe(true);
  await page.keyboard.up(key);
}

const DESKTOP_ONLY = 'keyboard controls: desktop project';
const MOBILE_ONLY = 'touch controls: mobile project';
// Avatar motion runs per rendered frame; SwiftShader in parallel workers renders a few fps.
const FRAME_BOUND = 'avatar motion is frame-rate bound on SwiftShader; timeout only';

test.describe('desktop keyboard controls', () => {
  test('[FR-04] W/D keys move avatar camera-relative', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', DESKTOP_ONLY);
    test.slow(true, FRAME_BOUND);
    await page.goto('/w/demo-wedding');
    const status = page.getByTestId('world-status');
    await expectScene(status, 'entrance');
    const start = await settledAvatar(status);

    // W walks camera-forward (−z here); x stays put.
    await holdUntil(page, status, 'KeyW', ([, z]) => z < start[1] - 0.3);
    const afterW = await settledAvatar(status);
    expect(afterW[1]).toBeLessThan(start[1] - 0.3);
    expect(Math.abs(afterW[0] - start[0])).toBeLessThanOrEqual(0.05);

    // D walks camera-right (+x); z stays put.
    await holdUntil(page, status, 'KeyD', ([x]) => x > afterW[0] + 0.3);
    const afterD = await settledAvatar(status);
    expect(afterD[0]).toBeGreaterThan(afterW[0] + 0.3);
    expect(Math.abs(afterD[1] - afterW[1])).toBeLessThanOrEqual(0.05);
  });

  test('[§8.4] holding W in the garden stops at the akad canopy (z ≥ −2.61)', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', DESKTOP_ONLY);
    test.slow(true, FRAME_BOUND);
    await page.goto('/w/demo-wedding');
    const status = page.getByTestId('world-status');
    await expectScene(status, 'entrance');
    await goViaMap(page, 'Taman Pernikahan');
    await expectScene(status, 'wedding-garden');

    await page.keyboard.down('KeyW');
    await expect
      .poll(async () => (await avatarPosition(status).catch(() => [0, 99]))[1], {
        timeout: 40_000,
      })
      .toBeLessThanOrEqual(-2.5);
    // Keep pushing into the canopy: the avatar never enters its collider.
    await page.waitForTimeout(800);
    await page.keyboard.up('KeyW');
    const [x, z] = await settledAvatar(status);
    expect(z).toBeGreaterThanOrEqual(-2.61);
    expect(z).toBeLessThanOrEqual(-2.55);
    expect(Math.abs(x)).toBeLessThanOrEqual(0.05);
  });

  test('[§3.4] E near the akad table opens Info Acara (same action as the control)', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', DESKTOP_ONLY);
    test.slow(true, FRAME_BOUND);
    await page.goto('/w/demo-wedding');
    const status = page.getByTestId('world-status');
    await expectScene(status, 'entrance');
    await goViaMap(page, 'Taman Pernikahan');
    await expectScene(status, 'wedding-garden');
    await expect(status).toHaveAttribute('data-nearby', '');

    await page.keyboard.down('KeyW');
    await expect(status).toHaveAttribute('data-nearby', 'ceremony-info', { timeout: 40_000 });
    await page.keyboard.up('KeyW');
    await expect(page.getByRole('button', { name: 'Buka Info akad nikah' })).toBeVisible();

    await page.keyboard.press('KeyE');
    await expect(status).toHaveAttribute('data-world-status', 'OVERLAY_OPEN');
    const events = page.getByRole('dialog', { name: 'Info Acara' });
    // Same `open_event_info { eventId }` as the "Info akad nikah" control and the 3D table.
    await expect(events.locator('[data-event-id="ceremony-1"]')).toHaveAttribute(
      'aria-current',
      'true',
    );
    await page.keyboard.press('Escape');
    await expect(events).toHaveCount(0);
    await expectScene(status, 'wedding-garden');
  });

  test('[§8.2] movement keys ignored while Peta is open', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', DESKTOP_ONLY);
    test.slow(true, FRAME_BOUND);
    await page.goto('/w/demo-wedding');
    const status = page.getByTestId('world-status');
    await expectScene(status, 'entrance');
    const before = await settledAvatar(status);

    await page.getByRole('button', { name: 'Peta', exact: true }).click();
    const map = page.getByRole('dialog', { name: 'Peta' });
    await expect(map).toBeVisible();
    await hold(page, 'KeyW', 800);
    await hold(page, 'KeyD', 400);
    await page.keyboard.press('KeyE');
    await expect(status).toHaveAttribute('data-world-status', 'OVERLAY_OPEN');
    await page.keyboard.press('Escape');
    await expect(map).toHaveCount(0);
    await expect(status).toHaveAttribute('data-world-status', 'READY');

    expect(await settledAvatar(status)).toEqual(before);
  });
});

test.describe('mobile touch controls', () => {
  test('[FR-04] mobile joystick drag moves the avatar; release stops', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', MOBILE_ONLY);
    test.slow(true, FRAME_BOUND);
    await page.goto('/w/demo-wedding');
    const status = page.getByTestId('world-status');
    await expectScene(status, 'entrance');
    const start = await settledAvatar(status);

    const stick = page.getByTestId('joystick');
    await expect(stick).toBeVisible();
    const box = await stick.boundingBox();
    if (!box) throw new Error('joystick not rendered');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - 40, { steps: 4 });
    await expect
      .poll(async () => (await avatarPosition(status))[1], { timeout: 40_000 })
      .toBeLessThan(start[1] - 0.5);
    await page.mouse.up();

    const stopped = await settledAvatar(status);
    await page.waitForTimeout(600);
    expect(await avatarPosition(status)).toEqual(stopped);
  });

  test('[§12] mobile renders without post-processing', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', MOBILE_ONLY);
    await page.goto('/w/demo-wedding');
    const status = page.getByTestId('world-status');
    await expectScene(status, 'entrance');
    await expect(status).toHaveAttribute('data-postfx', 'off');
    await expect(page.getByTestId('touch-controls')).toBeVisible();
  });
});
