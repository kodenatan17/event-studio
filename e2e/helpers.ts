import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export async function expectScene(status: Locator, sceneId: string) {
  await expect(status).toHaveAttribute('data-world-status', 'READY', { timeout: 30_000 });
  await expect(status).toHaveAttribute('data-scene-id', sceneId);
}

/**
 * The labelled HTML control of a hotspot/portal in the current scene. Below sm the controls sit
 * behind the "Interaksi" disclosure; it is opened when the control is hidden.
 */
export async function sceneControl(page: Page, id: string): Promise<Locator> {
  const control = page.locator(`[data-hotspot-id="${id}"]`);
  await expect(control).toHaveCount(1);
  if (await control.isVisible()) return control;
  const toggle = page.getByRole('button', { name: 'Interaksi', exact: true });
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  await expect(control).toBeVisible();
  return control;
}

/** Avatar floor position from the ≤ 4 Hz probe (`[x, z]`, 0.05 m grid). */
export async function avatarPosition(status: Locator): Promise<[number, number]> {
  const [x, z] = await Promise.all([
    status.getAttribute('data-avatar-x'),
    status.getAttribute('data-avatar-z'),
  ]);
  if (!x || !z) throw new Error('avatar probe not reported yet');
  return [Number(x), Number(z)];
}

/** Waits until the avatar position stops changing (two probe reads 700 ms apart agree). */
export async function settledAvatar(status: Locator): Promise<[number, number]> {
  let previous = '';
  let settled: [number, number] | null = null;
  await expect
    .poll(
      async () => {
        const position = await avatarPosition(status).catch(() => null);
        const key = position ? position.join(',') : '';
        settled = position && key === previous ? position : null;
        previous = key;
        return settled !== null;
      },
      { timeout: 30_000, intervals: [700] },
    )
    .toBe(true);
  if (!settled) throw new Error('avatar never settled');
  return settled;
}

/** Opens the global "Peta" dialog and picks a scene, like a guest would. */
export async function goViaMap(page: Page, label: string) {
  await page.getByRole('button', { name: 'Peta', exact: true }).click();
  const map = page.getByRole('dialog', { name: 'Peta' });
  await map.getByRole('button', { name: label, exact: true }).click();
  await expect(map).toHaveCount(0);
}
