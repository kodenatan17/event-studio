import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

async function expectScene(status: Locator, sceneId: string) {
  await expect(status).toHaveAttribute('data-world-status', 'READY', { timeout: 30_000 });
  await expect(status).toHaveAttribute('data-scene-id', sceneId);
}

async function requestId(status: Locator): Promise<number> {
  return Number(await status.getAttribute('data-request-id'));
}

function control(page: Page, id: string): Locator {
  return page.locator(`[data-hotspot-id="${id}"]`);
}

/** Opens the global "Peta" dialog and picks a scene, like a guest would. */
async function goViaMap(page: Page, label: string) {
  await page.getByRole('button', { name: 'Peta', exact: true }).click();
  const map = page.getByRole('dialog', { name: 'Peta' });
  await map.getByRole('button', { name: label, exact: true }).click();
  await expect(map).toHaveCount(0);
}

/** `gl.info.memory.geometries` once two samples (renderer reports every 0.5 s) agree. */
async function settledGeometries(status: Locator): Promise<number> {
  let previous = -1;
  let settled = -1;
  await expect
    .poll(
      async () => {
        const value = Number((await status.getAttribute('data-gl-geometries')) || '-1');
        settled = value > 0 && value === previous ? value : -1;
        previous = value;
        return settled;
      },
      { timeout: 15_000, intervals: [600] },
    )
    .toBeGreaterThan(0);
  return settled;
}

test('[FR-04] HTML controls switch entrance → living room → garden → back; double click on a portal control raises data-request-id by exactly 1', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/w/demo-wedding');
  const status = page.getByTestId('world-status');
  await expectScene(status, 'entrance');
  await expect(status).toContainText('Gerbang siap');

  const beforeDoor = await requestId(status);
  await control(page, 'front-door').dblclick();
  await expectScene(status, 'living-room');
  expect(await requestId(status)).toBe(beforeDoor + 1);
  await expect(status).toContainText('Ruang Tamu siap');

  // Every hotspot of the living room has a labelled control (architecture.md §3.4).
  for (const id of ['story-book', 'photo-frame-01', 'photo-frame-02', 'photo-frame-03']) {
    await expect(control(page, id)).toBeVisible();
  }

  await control(page, 'garden-door').click();
  await expectScene(status, 'wedding-garden');

  await control(page, 'back-to-living').click();
  await expectScene(status, 'living-room');

  await page.getByRole('button', { name: 'Peta', exact: true }).click();
  const map = page.getByRole('dialog', { name: 'Peta' });
  await expect(map.getByRole('button', { name: 'Ruang Tamu', exact: true })).toHaveAttribute(
    'aria-current',
    'location',
  );
  await page.keyboard.press('Escape');
  await expect(map).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test('E2E-04 scene map navigates all four scenes incl. living room; return to entrance', async ({
  page,
}) => {
  await page.goto('/w/demo-wedding');
  const status = page.getByTestId('world-status');
  await expectScene(status, 'entrance');

  for (const [label, sceneId] of [
    ['Ruang Tamu', 'living-room'],
    ['Taman Pernikahan', 'wedding-garden'],
    ['Pendopo Resepsi', 'reception-hall'],
    ['Gerbang', 'entrance'],
  ] as const) {
    await goViaMap(page, label);
    await expectScene(status, sceneId);
  }
});

test('[FR-04] 10 transitions do not grow data-gl-geometries', async ({ page }) => {
  await page.goto('/w/demo-wedding');
  const status = page.getByTestId('world-status');
  await expectScene(status, 'entrance');
  const first = await settledGeometries(status);

  for (let round = 0; round < 5; round += 1) {
    await control(page, 'front-door').click();
    await expectScene(status, 'living-room');
    await control(page, 'back-to-entrance').click();
    await expectScene(status, 'entrance');
  }

  expect(await settledGeometries(status)).toBeLessThanOrEqual(first);
});

test('[§8.2] hotspot control opens a modal overlay that blocks input until closed', async ({
  page,
}) => {
  await page.goto('/w/demo-wedding');
  const status = page.getByTestId('world-status');
  await expectScene(status, 'entrance');
  const before = await requestId(status);

  const opener = control(page, 'welcome-sign');
  await opener.click();
  await expect(status).toHaveAttribute('data-world-status', 'OVERLAY_OPEN');
  const panel = page.getByRole('dialog', { name: 'Sambutan' });
  await expect(panel).toHaveAttribute('data-overlay-type', 'open_welcome');
  await expect(panel).toHaveAttribute('aria-modal', 'true');
  await expect(panel.getByRole('button', { name: 'Tutup' })).toBeFocused();

  // Everything behind the dialog is inert: controls cannot be clicked or focused.
  await expect(page.getByTestId('world-layer')).toHaveAttribute('inert', '');
  await expect(control(page, 'front-door').click({ timeout: 1_000 })).rejects.toThrow();
  await page.evaluate(() => {
    const record = window as unknown as { focusOutside: number };
    record.focusOutside = 0;
    document.addEventListener('focusin', (event) => {
      if (!(event.target instanceof Element && event.target.closest('dialog'))) {
        record.focusOutside += 1;
      }
    });
  });
  await page.keyboard.press('Tab');
  await expect(panel.getByRole('button', { name: 'Mulai' })).toBeFocused();
  for (let i = 0; i < 4; i += 1) await page.keyboard.press('Tab');
  expect(
    await page.evaluate(() => (window as unknown as { focusOutside: number }).focusOutside),
  ).toBe(0);
  await expect(status).toHaveAttribute('data-world-status', 'OVERLAY_OPEN');
  expect(await requestId(status)).toBe(before);

  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(status).toHaveAttribute('data-world-status', 'READY');
  await expect(page.getByTestId('world-layer')).not.toHaveAttribute('inert');
  await expect(opener).toBeFocused();
});
