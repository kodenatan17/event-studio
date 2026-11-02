import { CanvasTexture, LinearFilter, SRGBColorSpace, Sprite, SpriteMaterial } from 'three';
import type { Object3D } from 'three';

const WIDTH = 512;
const HEIGHT = 200;
const TAIL = 22;
const PADDING = 34;
const RADIUS = 34;
const FONT_SIZE = 38;
const LINE_HEIGHT = 46;
const FONT = `600 ${FONT_SIZE}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
const PAPER = '#fffaf0';
const EDGE = '#b8935a';
const INK = '#3b2a1e';

/** One line, or two of even length: template lines are written short enough to fit. */
function wrap(context: CanvasRenderingContext2D, text: string, width: number): string[] {
  if (context.measureText(text).width <= width) return [text];
  const words = text.split(' ');
  let best: string[] = [text];
  let longest = Infinity;
  for (let split = 1; split < words.length; split += 1) {
    const lines = [words.slice(0, split).join(' '), words.slice(split).join(' ')];
    const widest = Math.max(...lines.map((line) => context.measureText(line).width));
    if (widest < longest) {
      best = lines;
      longest = widest;
    }
  }
  return best;
}

function draw(context: CanvasRenderingContext2D, text: string): void {
  context.clearRect(0, 0, WIDTH, HEIGHT);
  context.font = FONT;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const lines = wrap(context, text, WIDTH - PADDING * 2);
  const longest = Math.max(...lines.map((line) => context.measureText(line).width));
  const boxWidth = Math.min(WIDTH - 6, longest + PADDING * 2);
  const boxHeight = lines.length * LINE_HEIGHT + 34;
  const left = (WIDTH - boxWidth) / 2;
  const top = HEIGHT - TAIL - boxHeight - 3;
  const bottom = top + boxHeight;

  context.beginPath();
  // Safari before 16 has no `roundRect`; a square bubble beats a crash to the 2D fallback.
  if (context.roundRect) context.roundRect(left, top, boxWidth, boxHeight, RADIUS);
  else context.rect(left, top, boxWidth, boxHeight);
  context.moveTo(WIDTH / 2 - TAIL, bottom);
  context.lineTo(WIDTH / 2, bottom + TAIL);
  context.lineTo(WIDTH / 2 + TAIL, bottom);
  context.fillStyle = PAPER;
  context.fill();
  context.strokeStyle = EDGE;
  context.lineWidth = 3;
  context.stroke();
  // Hides the outline where the tail meets the box.
  context.fillRect(WIDTH / 2 - TAIL + 2, bottom - 3, TAIL * 2 - 4, 5);

  context.fillStyle = INK;
  lines.forEach((line, index) => {
    context.fillText(line, WIDTH / 2, top + 17 + LINE_HEIGHT * (index + 0.5));
  });
}

export interface SpeechBubble {
  /** Shows `text`, or hides the bubble for `null`. Redraws only on a new line. */
  say(text: string | null): void;
  /** Keeps the bubble `widthPx` wide on any screen, wherever the character stands. */
  fit(widthPx: number, screenHeightPx: number, fovDegrees: number): void;
  dispose(): void;
}

/**
 * A bubble above a character, in the scene so it follows them with no HTML or React render per
 * frame. Decorative: nothing a guest needs is ever said only here (§3.4). Drawn over the scene,
 * screen-sized and never raycast. Created on a character's first line; the canvas texture is its
 * only GPU cost, freed by `dispose`.
 */
export function createSpeechBubble(parent: Object3D, height: number): SpeechBubble | null {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  const material = new SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    sizeAttenuation: false,
    toneMapped: false,
  });
  const sprite = new Sprite(material);
  sprite.name = 'SPEECH_BUBBLE';
  sprite.position.y = height;
  sprite.center.set(0.5, 0);
  sprite.renderOrder = 20;
  sprite.visible = false;
  sprite.raycast = () => {};
  parent.add(sprite);

  let shown: string | null = null;
  return {
    say(text) {
      if (text === shown) return;
      shown = text;
      sprite.visible = text !== null;
      if (text === null) return;
      draw(context, text);
      texture.needsUpdate = true;
    },
    fit(widthPx, screenHeightPx, fovDegrees) {
      // Without attenuation a sprite's scale is its size at 1 m from the camera.
      const viewHeight = 2 * Math.tan((fovDegrees * Math.PI) / 360);
      const width = (widthPx / screenHeightPx) * viewHeight;
      sprite.scale.set(width, (width * HEIGHT) / WIDTH, 1);
    },
    dispose() {
      parent.remove(sprite);
      material.dispose();
      texture.dispose();
    },
  };
}
