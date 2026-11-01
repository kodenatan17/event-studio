// Optimizes the owner's 2D invitation art (D-036): assets/source/2d-asset → public WebP.
import { mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

import sharp from 'sharp';

const SOURCE = 'assets/source/2d-asset';
const OUTPUT = 'apps/web/public/templates/joglo/1.0.0/invitation';
const WIDTH = 860;
const QUALITY = 80;

const chatgpt = (suffix) => `ChatGPT Image Nov 1, 2026, ${suffix}.png`;

/**
 * Each crop is the art's opaque bounding box. The doors differ in size, and the wreath keeps only
 * its top half: the lower half has a stray white blob, so CSS mirrors the top half instead.
 */
const ASSETS = [
  { from: 'undangan-door-left.png', to: 'door-left', extract: bounds(234, 3, 453, 1663) },
  { from: 'undangan-door-right.png', to: 'door-right', extract: bounds(337, 5, 411, 1656) },
  { from: chatgpt('07_57_28 AM-5'), to: 'landscape' },
  { from: chatgpt('07_57_27 AM-4'), to: 'frame-carved', extract: bounds(32, 20, 878, 1624) },
  { from: chatgpt('07_57_29 AM-6'), to: 'garland', extract: bounds(27, 32, 921, 1349) },
  { from: chatgpt('07_57_30 AM-7'), to: 'orchid', extract: bounds(210, 2, 904, 1379) },
  { from: chatgpt('07_57_30 AM-8'), to: 'florals', extract: bounds(0, 637, 941, 983) },
  { from: chatgpt('07_57_31 AM-9'), to: 'frame-oval', extract: bounds(19, 18, 1048, 1413) },
  { from: chatgpt('07_57_32 AM-10'), to: 'wreath', extract: bounds(0, 40, 941, 620) },
];

function bounds(left, top, width, height) {
  return { left, top, width, height };
}

await mkdir(OUTPUT, { recursive: true });

let total = 0;
for (const asset of ASSETS) {
  let image = sharp(join(SOURCE, asset.from));
  if (asset.extract) image = image.extract(asset.extract);
  const target = join(OUTPUT, `${asset.to}.webp`);
  const info = await image
    .resize({ width: WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY, alphaQuality: 85, effort: 6 })
    .toFile(target);
  const { size } = await stat(target);
  total += size;
  process.stdout.write(
    `${asset.to}.webp ${info.width}x${info.height} ${Math.round(size / 1024)} KB\n`,
  );
}
process.stdout.write(`total ${Math.round(total / 1024)} KB\n`);
