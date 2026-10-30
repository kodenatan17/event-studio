import {
  CanvasTexture,
  ClampToEdgeWrapping,
  Color,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import type { Texture } from 'three';

import { seeded } from '../scenes/decor/Part';
import type { BatikPattern } from './wardrobe';

/**
 * Generated character textures (FR-07, §2): deterministic, tileable, no image downloads. Drawn in
 * a unit square, so 256 px and 512 px hold the same design. Cached by design + size, because every
 * character of a scene shares them; `retain`/`release` count users, and the last release frees the
 * GPU copy only. The canvases stay, so a later character re-uploads without redrawing (D-023).
 */

export type TextureSize = 256 | 512;
export type EmbroideryKind = 'beskap' | 'kebaya';

/** Canvas 2D drawing in unit coordinates (the context is already scaled to the texture size). */
export type DrawRoutine = (context: CanvasRenderingContext2D) => void;

/** Injectable: Vitest runs in Node, which has no canvas. */
export interface TextureProvider {
  create(size: number, draw: DrawRoutine): Texture;
}

export const canvasTextureProvider: TextureProvider = {
  create(size, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas unavailable');
    context.setTransform(size, 0, 0, size, 0, 0);
    draw(context);
    return new CanvasTexture(canvas);
  },
};

const hex = (color: Color): string => `#${color.getHexString()}`;
const mix = (from: string, to: string, amount: number): string =>
  hex(new Color(from).lerp(new Color(to), amount));

/** Soga cream and indigo-brown ink laid over a fabric ground. */
const SOGA_CREAM = '#e6cda0';
const SOGA_INK = '#170d07';
const GOLD_THREAD = '#d9b35c';

interface BatikInks {
  ground: string;
  motif: string;
  line: string;
}

function fillGround(context: CanvasRenderingContext2D, color: string): void {
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
}

function dot(context: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

/** Diagonal rows of curved blades with mlinjon dots between them. */
function drawParang(context: CanvasRenderingContext2D, inks: BatikInks): void {
  const rows = 3;
  const length = Math.SQRT2 / rows;
  const width = length * 0.26;
  context.lineWidth = 0.008;
  for (let row = -rows; row <= rows; row += 1) {
    for (let step = -1; step <= rows; step += 1) {
      context.save();
      context.translate((step + row) / rows, step / rows);
      context.rotate(Math.PI / 4);
      context.beginPath();
      context.moveTo(-length / 2, 0);
      context.bezierCurveTo(-length / 4, -width, length / 4, -width, length / 2, 0);
      context.bezierCurveTo(length / 4, width * 0.25, -length / 4, width * 0.25, -length / 2, 0);
      context.fillStyle = inks.motif;
      context.strokeStyle = inks.line;
      context.fill();
      context.stroke();
      context.fillStyle = inks.line;
      dot(context, 0, -width * 0.32, width * 0.14);
      context.fillStyle = inks.motif;
      dot(context, length * 0.5, width * 0.42, width * 0.2);
      context.restore();
    }
  }
}

/** Four-petal kolang-kaling rosettes on a square lattice. */
function drawKawung(context: CanvasRenderingContext2D, inks: BatikInks): void {
  const cells = 3;
  const reach = 0.5 / cells;
  context.lineWidth = 0.008;
  for (let i = -1; i <= cells; i += 1) {
    for (let j = -1; j <= cells; j += 1) {
      for (let petal = 0; petal < 4; petal += 1) {
        const angle = Math.PI / 4 + (petal * Math.PI) / 2;
        const x = (i + 0.5) / cells + Math.cos(angle) * reach * 0.72;
        const y = (j + 0.5) / cells + Math.sin(angle) * reach * 0.72;
        context.beginPath();
        context.ellipse(x, y, reach * 0.68, reach * 0.36, angle, 0, Math.PI * 2);
        context.fillStyle = inks.motif;
        context.strokeStyle = inks.line;
        context.fill();
        context.stroke();
        context.fillStyle = inks.line;
        dot(context, x, y, reach * 0.09);
      }
      context.fillStyle = inks.line;
      dot(context, (i + 0.5) / cells, (j + 0.5) / cells, reach * 0.12);
    }
  }
}

/** Staggered eight-point stars over scattered dots (isen). */
function drawTruntum(context: CanvasRenderingContext2D, inks: BatikInks): void {
  const random = seeded(0.17);
  const rows = 6;
  context.fillStyle = inks.motif;
  for (let k = 0; k < 90; k += 1) {
    const x = random();
    const y = random();
    for (const dx of [-1, 0, 1]) dot(context, x + dx, y, 0.005);
  }
  for (let row = -1; row <= rows; row += 1) {
    const stagger = row % 2 === 0 ? 0 : 0.5 / rows;
    for (let column = -1; column <= rows; column += 1) {
      const x = column / rows + stagger + 0.25 / rows;
      const y = (row + 0.5) / rows;
      context.fillStyle = inks.motif;
      for (let petal = 0; petal < 8; petal += 1) {
        const angle = (petal * Math.PI) / 4;
        const px = x + Math.cos(angle) * 0.034;
        const py = y + Math.sin(angle) * 0.034;
        context.beginPath();
        context.ellipse(px, py, 0.024, 0.009, angle, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = inks.line;
      dot(context, x, y, 0.012);
    }
  }
}

/** Staggered five-petal flowers joined by thin stems (men's batik shirts). */
function drawSekar(context: CanvasRenderingContext2D, inks: BatikInks): void {
  const rows = 4;
  context.lineWidth = 0.01;
  for (let row = -1; row <= rows; row += 1) {
    const stagger = row % 2 === 0 ? 0 : 0.5 / rows;
    for (let column = -1; column <= rows; column += 1) {
      const x = (column + 0.5) / rows + stagger;
      const y = (row + 0.5) / rows;
      context.strokeStyle = inks.motif;
      context.beginPath();
      context.moveTo(x, y);
      context.quadraticCurveTo(x + 0.08, y + 0.07, x + 0.5 / rows, y + 1 / rows);
      context.stroke();
      context.fillStyle = inks.motif;
      for (let petal = 0; petal < 5; petal += 1) {
        const angle = (petal * Math.PI * 2) / 5 - Math.PI / 2;
        const px = x + Math.cos(angle) * 0.04;
        const py = y + Math.sin(angle) * 0.04;
        context.beginPath();
        context.ellipse(px, py, 0.036, 0.021, angle, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = inks.line;
      dot(context, x, y, 0.016);
    }
  }
}

const BATIK_DRAW: Readonly<
  Record<BatikPattern, (context: CanvasRenderingContext2D, inks: BatikInks) => void>
> = {
  parang: drawParang,
  kawung: drawKawung,
  truntum: drawTruntum,
  sekar: drawSekar,
};

/**
 * Tileable gold vines with leaves. Runs twice per design, once per canvas, with the same seed, so
 * the colour and the roughness/metalness data line up exactly.
 */
function drawVines(context: CanvasRenderingContext2D, kind: EmbroideryKind, thread: string): void {
  const beskap = kind === 'beskap';
  const random = seeded(beskap ? 0.31 : 0.53);
  const columns = beskap ? 6 : 5;
  const bends = 3;
  const amplitude = 0.46 / columns;
  context.strokeStyle = thread;
  context.fillStyle = thread;
  context.lineCap = 'round';
  context.lineWidth = beskap ? 0.016 : 0.013;
  for (let column = 0; column < columns; column += 1) {
    const base = (column + 0.5) / columns;
    const vine = (y: number) =>
      base + amplitude * Math.sin((y + column / columns) * Math.PI * 2 * bends);
    context.beginPath();
    for (let step = 0; step <= 60; step += 1) {
      const y = step / 60;
      if (step === 0) context.moveTo(vine(y), y);
      else context.lineTo(vine(y), y);
    }
    context.stroke();
    const leaves = 18;
    for (let leaf = 0; leaf < leaves; leaf += 1) {
      const y = (leaf + random() * 0.5) / leaves;
      const side = leaf % 2 === 0 ? 1 : -1;
      const angle = side * (0.5 + random() * 0.5);
      const size = 0.034 * (0.8 + random() * 0.4);
      const x = vine(y);
      context.beginPath();
      context.ellipse(x + side * size * 0.9, y, size, size * 0.42, angle, 0, Math.PI * 2);
      context.fill();
      if (leaf % 3 === 1) {
        for (let petal = 0; petal < 5; petal += 1) {
          const turn = (petal * Math.PI * 2) / 5;
          dot(
            context,
            x - side * size * 1.1 + Math.cos(turn) * size * 0.6,
            y + Math.sin(turn) * size * 0.6,
            size * 0.32,
          );
        }
      }
    }
  }
}

/** G = roughness, B = metalness (three's channels): cloth where bare, polished thread on vines. */
const DATA_CLOTH = 'rgb(0, 230, 0)';
const DATA_THREAD = 'rgb(0, 89, 255)';

/** Alpha is read from green: a diamond net with a bead in each gap, about half opaque. */
function drawLace(context: CanvasRenderingContext2D): void {
  const cells = 6;
  fillGround(context, '#000000');
  context.strokeStyle = '#ffffff';
  context.fillStyle = '#ffffff';
  context.lineWidth = 0.032;
  for (let i = -1; i <= cells; i += 1) {
    for (let j = -1; j <= cells; j += 1) {
      const x = i / cells;
      const y = j / cells;
      const half = 0.5 / cells;
      context.beginPath();
      context.moveTo(x, y - half);
      context.lineTo(x + half, y);
      context.lineTo(x, y + half);
      context.lineTo(x - half, y);
      context.closePath();
      context.stroke();
      dot(context, x + half, y + half, half * 0.42);
    }
  }
}

/** Forehead paes: a tall centre cusp between smaller scallops, opaque (white) on black. */
function drawPaes(context: CanvasRenderingContext2D): void {
  fillGround(context, '#000000');
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(1, 0);
  const cusps: readonly (readonly [x: number, depth: number])[] = [
    [0.92, 0.26],
    [0.74, 0.5],
    [0.5, 0.86],
    [0.26, 0.5],
    [0.08, 0.26],
  ];
  let previous = 1;
  for (const [x, depth] of cusps) {
    context.quadraticCurveTo((previous + x) / 2, depth * 1.08, x, depth * 0.34);
    previous = x;
  }
  context.quadraticCurveTo(previous / 2, 0.14, 0, 0);
  context.closePath();
  context.fill();
}

function drawContactShadow(context: CanvasRenderingContext2D): void {
  fillGround(context, '#000000');
  const gradient = context.createRadialGradient(0.5, 0.5, 0, 0.5, 0.5, 0.5);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.55, '#8c8c8c');
  gradient.addColorStop(1, '#000000');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1, 1);
}

export interface EmbroideryMaps {
  /** sRGB colour: velvet with gold thread. */
  map: Texture;
  /** Linear data: G = roughness, B = metalness. */
  data: Texture;
}

export interface CharacterTextures {
  batik(pattern: BatikPattern, ground: string, size: TextureSize): Texture;
  embroidery(kind: EmbroideryKind, velvet: string, size: TextureSize): EmbroideryMaps;
  /** Alpha map; sampled through `uv1`. */
  lace(size: TextureSize): Texture;
  /** Alpha map for the bride's forehead decal. */
  paes(size: TextureSize): Texture;
  /** 64² radial alpha map. */
  contactShadow(): Texture;
  retain(texture: Texture): void;
  /** The last release frees the GPU copy; the texture stays cached and re-uploads on next use. */
  release(texture: Texture): void;
  /** Frees all GPU copies and forgets every texture (canvas unmount). */
  clear(): void;
}

const CONTACT_SHADOW_SIZE = 64;

export function createCharacterTextures(
  provider: TextureProvider = canvasTextureProvider,
): CharacterTextures {
  const cache = new Map<string, Texture>();
  const users = new Map<Texture, number>();

  const cached = (
    key: string,
    size: number,
    draw: DrawRoutine,
    setup: (texture: Texture) => void,
  ): Texture => {
    let texture = cache.get(key);
    if (!texture) {
      texture = provider.create(size, draw);
      texture.name = key;
      setup(texture);
      cache.set(key, texture);
    }
    return texture;
  };

  const colour = (texture: Texture) => {
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
  };
  const tiledData = (texture: Texture) => {
    texture.colorSpace = NoColorSpace;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
  };
  const decalData = (texture: Texture) => {
    texture.colorSpace = NoColorSpace;
    texture.wrapS = ClampToEdgeWrapping;
    texture.wrapT = ClampToEdgeWrapping;
  };

  return {
    batik(pattern, ground, size) {
      const inks: BatikInks = {
        ground,
        motif: mix(ground, SOGA_CREAM, 0.72),
        line: mix(ground, SOGA_INK, 0.55),
      };
      return cached(
        `batik:${pattern}:${ground}:${size}`,
        size,
        (context) => {
          fillGround(context, inks.ground);
          BATIK_DRAW[pattern](context, inks);
        },
        colour,
      );
    },
    embroidery(kind, velvet, size) {
      return {
        map: cached(
          `embroidery:${kind}:${velvet}:${size}`,
          size,
          (context) => {
            fillGround(context, velvet);
            drawVines(context, kind, GOLD_THREAD);
          },
          colour,
        ),
        data: cached(
          `embroidery-data:${kind}:${size}`,
          size,
          (context) => {
            fillGround(context, DATA_CLOTH);
            drawVines(context, kind, DATA_THREAD);
          },
          tiledData,
        ),
      };
    },
    lace(size) {
      return cached(`lace:${size}`, size, drawLace, (texture) => {
        tiledData(texture);
        texture.channel = 1;
      });
    },
    paes(size) {
      return cached(`paes:${size}`, size, drawPaes, decalData);
    },
    contactShadow() {
      return cached('contact-shadow', CONTACT_SHADOW_SIZE, drawContactShadow, decalData);
    },
    retain(texture) {
      users.set(texture, (users.get(texture) ?? 0) + 1);
    },
    release(texture) {
      const remaining = (users.get(texture) ?? 0) - 1;
      if (remaining > 0) {
        users.set(texture, remaining);
        return;
      }
      users.delete(texture);
      texture.dispose();
    },
    clear() {
      for (const texture of cache.values()) texture.dispose();
      cache.clear();
      users.clear();
    },
  };
}
