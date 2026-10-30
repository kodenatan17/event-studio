import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { expectScene, goViaMap } from './helpers';

const AUDIO_URL = '/api/dev/demo-audio';
const soundButton = (page: Page) => page.getByRole('button', { name: 'Suara', exact: true });
const playButton = (page: Page) => page.getByRole('button', { name: 'Putar musik', exact: true });
const audio = (page: Page) => page.getByTestId('viewer-audio');

/**
 * Make the denied-autoplay path deterministic without replacing decoding/playback: only the
 * first play() rejects. Every later call uses Chromium's native HTMLMediaElement.play().
 */
async function denyFirstAutoplay(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const nativePlay = HTMLMediaElement.prototype.play;
    let first = true;
    HTMLMediaElement.prototype.play = function () {
      if (!this.src.includes('/api/dev/demo-audio')) return nativePlay.call(this);
      const attempts = Number(this.dataset.testPlayAttempts ?? '0') + 1;
      this.dataset.testPlayAttempts = String(attempts);
      if (first) {
        first = false;
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

test('[FR-01] local demo music supports byte ranges and decodes in the browser', async ({
  page,
  request,
}) => {
  const range = await request.get(AUDIO_URL, { headers: { Range: 'bytes=0-1023' } });
  expect(range.status()).toBe(206);
  expect(range.headers()['content-type']).toContain('audio/mpeg');
  expect(range.headers()['accept-ranges']).toBe('bytes');
  expect(range.headers()['content-range']).toMatch(/^bytes 0-1023\/\d+$/);
  expect(range.headers()['content-length']).toBe('1024');
  expect((await range.body()).byteLength).toBe(1024);

  const total = Number(range.headers()['content-range']?.split('/')[1]);
  expect(total).toBeGreaterThan(1024);
  const invalid = await request.get(AUDIO_URL, { headers: { Range: `bytes=${total}-` } });
  expect(invalid.status()).toBe(416);
  expect(invalid.headers()['content-range']).toBe(`bytes */${total}`);

  await denyFirstAutoplay(page);
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
  await denyFirstAutoplay(page);
  await page.goto('/w/demo-wedding');

  const element = audio(page);
  await expect(element).toHaveAttribute('data-test-play-attempts', '1');
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
  await denyFirstAutoplay(page);
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
  await denyFirstAutoplay(page);
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
