import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { expectScene, goViaMap } from './helpers';

const AUDIO_URL = '/audio/cundamani.mp3';
const soundButton = (page: Page) => page.getByRole('button', { name: 'Suara', exact: true });
const playButton = (page: Page) => page.getByRole('button', { name: 'Putar musik', exact: true });
const audio = (page: Page) => page.getByTestId('viewer-audio');

/**
 * Emulate the browser's autoplay rule instead of its outcome: `play()` rejects until real pointer
 * or key input arrives, however many times the effect mounts (React StrictMode rehearses it).
 * Playwright's Chromium reports sticky user activation, so the gate is our own gesture flag.
 * Decoding and playback stay native.
 */
async function denyAutoplayUntilGesture(page: Page): Promise<void> {
  await page.addInitScript(() => {
    let gestured = false;
    const grant = () => {
      gestured = true;
    };
    window.addEventListener('pointerdown', grant, { capture: true, once: true });
    window.addEventListener('keydown', grant, { capture: true, once: true });
    const nativePlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (!this.src.includes('/audio/cundamani.mp3')) return nativePlay.call(this);
      const attempts = Number(this.dataset.testPlayAttempts ?? '0') + 1;
      this.dataset.testPlayAttempts = String(attempts);
      if (!gestured) {
        return Promise.reject(new DOMException('Autoplay requires a gesture', 'NotAllowedError'));
      }
      return nativePlay.call(this);
    };
  });
}

async function expectRealPlayback(element: Locator): Promise<void> {
  await expect(element).toHaveCount(1);
  await expect
    .poll(() => element.evaluate((node: HTMLAudioElement) => node.readyState))
    .toBeGreaterThanOrEqual(2); // HTMLMediaElement.HAVE_CURRENT_DATA; assertions run in Node.
  await expect(element).toHaveJSProperty('paused', false);
  const media = await element.evaluate((node: HTMLAudioElement) => ({
    duration: node.duration,
    error: node.error?.code ?? null,
  }));
  expect(media.error).toBeNull();
  expect(Number.isFinite(media.duration)).toBe(true);
  expect(media.duration).toBeGreaterThan(1);
  const start = await element.evaluate((node: HTMLAudioElement) => node.currentTime);
  await expect
    .poll(() => element.evaluate((node: HTMLAudioElement) => node.currentTime))
    .toBeGreaterThan(start + 0.2);
}

test('[FR-01] the bundled soundtrack is served and decodes in the browser', async ({
  page,
  request,
}) => {
  // A static file under `public/`: no route handler, so no byte-range contract to assert.
  const response = await request.get(AUDIO_URL);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('audio/mpeg');
  expect((await response.body()).byteLength).toBeGreaterThan(1024);

  await denyAutoplayUntilGesture(page);
  await page.goto('/w/demo-wedding');
  await expect(playButton(page)).toBeVisible();
  await playButton(page).click();
  await expectRealPlayback(audio(page));
});

test('[FR-01] blocked autoplay offers a gesture retry without an unhandled error', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await denyAutoplayUntilGesture(page);
  await page.goto('/w/demo-wedding');

  const element = audio(page);
  await expect(element).toHaveAttribute('data-test-play-attempts', /^[1-9]\d*$/);
  await expect(element).toHaveJSProperty('paused', true);
  await expect(playButton(page)).toBeVisible();
  await expect(page.getByTestId('soundtrack')).toHaveAttribute('data-audio-state', 'blocked');
  await playButton(page).click();
  await expectRealPlayback(element);
  await expect(page.getByTestId('soundtrack')).toHaveAttribute('data-audio-state', 'playing');
  await expect(playButton(page)).toHaveCount(0);
  await expect(soundButton(page)).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('[§3.4] turning demo music off persists and reload does not attempt autoplay', async ({
  page,
}) => {
  await denyAutoplayUntilGesture(page);
  await page.goto('/w/demo-wedding');
  await playButton(page).click();
  await expectRealPlayback(audio(page));

  await soundButton(page).click();
  await expect(soundButton(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(audio(page)).toHaveJSProperty('paused', true);
  expect(await page.evaluate(() => localStorage.getItem('undangan.sound'))).toBe('off');

  await page.reload();
  await expectScene(page.getByTestId('world-status'), 'entrance');
  await expect(soundButton(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(audio(page)).toHaveJSProperty('paused', true);
  await expect(audio(page)).not.toHaveAttribute('data-test-play-attempts');
  await expect(playButton(page)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('undangan.sound'))).toBe('off');
});

test('[FR-04] demo music keeps its element and playback position across a scene change', async ({
  page,
}) => {
  await denyAutoplayUntilGesture(page);
  await page.goto('/w/demo-wedding');
  await playButton(page).click();
  const element = audio(page);
  await expectRealPlayback(element);
  const status = page.getByTestId('world-status');
  await expectScene(status, 'entrance');

  // Seeking also exercises real byte-range playback. A scene remount resetting audio to zero
  // cannot pass just because several seconds elapsed while the new canvas became ready.
  const position = await element.evaluate((node: HTMLAudioElement) => {
    node.dataset.testIdentity = 'continuing-demo-music';
    const target = Math.min(20, node.duration / 2);
    node.currentTime = target;
    return target;
  });
  await expect
    .poll(() => element.evaluate((node: HTMLAudioElement) => node.currentTime))
    .toBeGreaterThanOrEqual(position);
  await goViaMap(page, 'Taman Pernikahan');
  await expectScene(status, 'wedding-garden');
  await expect(element).toHaveAttribute('data-test-identity', 'continuing-demo-music');
  await expect(element).toHaveJSProperty('paused', false);
  expect(await element.evaluate((node: HTMLAudioElement) => node.currentTime)).toBeGreaterThan(
    position,
  );
  await expectRealPlayback(element);
});
