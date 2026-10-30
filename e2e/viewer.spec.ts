import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

async function expectScene(status: Locator, sceneId: string) {
  await expect(status).toHaveAttribute('data-world-status', 'READY', { timeout: 30_000 });
  await expect(status).toHaveAttribute('data-scene-id', sceneId);
}

function control(page: Page, id: string): Locator {
  return page.locator(`[data-hotspot-id="${id}"]`);
}

async function openLivingRoom(page: Page): Promise<Locator> {
  await page.goto('/w/demo-wedding');
  const status = page.getByTestId('world-status');
  await expectScene(status, 'entrance');
  await control(page, 'front-door').click();
  await expectScene(status, 'living-room');
  return status;
}

test('E2E-02 entrance → living room → story → next chapter → close returns focus', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const status = await openLivingRoom(page);

  const book = control(page, 'story-book');
  await book.click();
  await expect(status).toHaveAttribute('data-world-status', 'OVERLAY_OPEN');
  const dialog = page.getByRole('dialog', { name: 'Kisah Kami' });
  await expect(dialog.getByRole('heading', { name: 'Pertama Bertemu' })).toBeVisible();
  await expect(dialog.getByText('12 Juni 2021')).toBeVisible();
  await expect(dialog.getByTestId('story-progress')).toHaveText('1 / 3');

  await dialog.getByRole('button', { name: 'Berikutnya' }).click();
  await expect(dialog.getByRole('heading', { name: 'Saling Mengenal' })).toBeVisible();
  await expect(dialog.getByTestId('story-progress')).toHaveText('2 / 3');
  await expect(dialog.getByRole('button', { name: '2. Saling Mengenal' })).toHaveAttribute(
    'aria-current',
    'step',
  );

  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByRole('heading', { name: 'Lamaran' })).toBeVisible();
  await expect(dialog.getByTestId('story-progress')).toHaveText('3 / 3');
  await page.keyboard.press('ArrowLeft');
  await expect(dialog.getByTestId('story-progress')).toHaveText('2 / 3');

  await dialog.getByRole('button', { name: 'Tutup' }).click();
  await expect(dialog).toHaveCount(0);
  await expectScene(status, 'living-room');
  await expect(book).toBeFocused();
  expect(pageErrors).toEqual([]);
});

test('E2E-03 gallery: open photo 1, ArrowRight shows 2/6, Escape closes; reopen, browser back closes dialog and URL unchanged', async ({
  page,
}) => {
  const status = await openLivingRoom(page);
  const url = page.url();
  const frame = control(page, 'photo-frame-01');

  await frame.click();
  const dialog = page.getByRole('dialog', { name: 'Galeri Foto' });
  await expect(dialog.getByTestId('gallery-progress')).toHaveText('1 / 6');
  await expect(dialog.getByText('Foto contoh pertama')).toBeVisible();
  // Fixture media never resolve (D-016): the designed fallback tile renders, with the alt text.
  await expect(
    dialog.getByRole('img', { name: /Foto contoh pasangan di bawah gapura janur/ }),
  ).toBeVisible();
  await expect(dialog.getByText('Foto belum tersedia')).toBeVisible();

  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByTestId('gallery-progress')).toHaveText('2 / 6');
  await expect(dialog.getByText('Foto contoh kedua')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expectScene(status, 'living-room');
  await expect(frame).toBeFocused();
  expect(page.url()).toBe(url);

  await frame.click();
  await expect(dialog.getByTestId('gallery-progress')).toHaveText('1 / 6');
  await page.goBack();
  await expect(dialog).toHaveCount(0);
  await expectScene(status, 'living-room');
  expect(page.url()).toBe(url);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Raka & Sekar');
});

test('[FR-02] living room shows 6 photo controls', async ({ page }) => {
  const status = await openLivingRoom(page);

  for (let index = 1; index <= 6; index += 1) {
    const frame = control(page, `photo-frame-0${index}`);
    await expect(frame).toBeVisible();
    await expect(frame).toHaveText(`Foto ${index}`);
  }

  // The last frame opens the gallery at its own photo.
  await control(page, 'photo-frame-06').click();
  const dialog = page.getByRole('dialog', { name: 'Galeri Foto' });
  await expect(dialog.getByTestId('gallery-progress')).toHaveText('6 / 6');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expectScene(status, 'living-room');
});

test('[FR-05] event info shows Akad Nikah with WIB time and https maps link', async ({ page }) => {
  await page.goto('/w/demo-wedding');
  await expectScene(page.getByTestId('world-status'), 'entrance');

  // Reachable from global UI, not only from a hotspot.
  await page.getByRole('button', { name: 'Info Acara', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Info Acara' });
  const akad = dialog.locator('[data-event-id="ceremony-1"]');
  await expect(akad.getByRole('heading', { name: 'Akad Nikah' })).toBeVisible();
  await expect(akad.getByTestId('event-time')).toContainText('14 Februari 2027');
  await expect(akad.getByTestId('event-time')).toContainText('09.00–11.00 WIB');
  await expect(akad).toContainText('Pendopo Contoh');

  const maps = akad.getByRole('link', { name: /Buka di Maps/ });
  await expect(maps).toHaveAttribute('href', /^https:\/\//);
  await expect(maps).toHaveAttribute('target', '_blank');
  await expect(maps).toHaveAttribute('rel', 'noopener noreferrer');
});

test('[FR-05] RSVP shows invitation-only message, no form', async ({ page }) => {
  await page.goto('/w/demo-wedding');
  await expectScene(page.getByTestId('world-status'), 'entrance');

  await page.getByRole('button', { name: 'RSVP', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'RSVP' });
  await expect(dialog.getByText('Khusus tamu undangan')).toBeVisible();
  await expect(dialog).toContainText('tautan undangan pribadi');
  await expect(dialog.locator('form, input, textarea, select')).toHaveCount(0);
});

test('[T-301] garden/hall hotspots open event, booth and guestbook overlays', async ({ page }) => {
  test.slow(); // GLB living room is slow on SwiftShader; timeout only.
  await page.goto('/w/demo-wedding');
  const status = page.getByTestId('world-status');
  await expectScene(status, 'entrance');

  await control(page, 'front-door').click();
  await expectScene(status, 'living-room');
  await control(page, 'garden-door').click();
  await expectScene(status, 'wedding-garden');

  await control(page, 'ceremony-info').click();
  const events = page.getByRole('dialog', { name: 'Info Acara' });
  await expect(events.locator('[data-event-id="ceremony-1"]')).toHaveAttribute(
    'aria-current',
    'true',
  );
  await page.keyboard.press('Escape');
  await expect(events).toHaveCount(0);

  await control(page, 'photo-booth').click();
  const booth = page.getByRole('dialog', { name: 'Photo Booth' });
  await expect(booth.getByText('Segera hadir')).toBeVisible();
  await expect(booth).toContainText('tidak akan pernah menggunakan kamera');
  await page.keyboard.press('Escape');
  await expect(booth).toHaveCount(0);

  await control(page, 'back-to-living').click();
  await expectScene(status, 'living-room');
  await control(page, 'hall-door').click();
  await expectScene(status, 'reception-hall');

  await control(page, 'wish-book').click();
  const guestbook = page.getByRole('dialog', { name: 'Buku Tamu' });
  await expect(guestbook.getByText('Khusus tamu undangan')).toBeVisible();
  await expect(guestbook.locator('form, input, textarea, select')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(guestbook).toHaveCount(0);
  await expectScene(status, 'reception-hall');
});
