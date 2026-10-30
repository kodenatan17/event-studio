import { describe, expect, it } from 'vitest';

import { isSoftwareRenderer, resolveRenderTier } from './capabilities';
import type { RenderTierInput } from './capabilities';

const desktop: RenderTierInput = {
  quality: 'auto',
  coarsePointer: false,
  reducedMotion: false,
  softwareRenderer: false,
};

function renderer(name: string, masked = false) {
  return {
    getContext: () => ({
      RENDERER: 0x1f01,
      getExtension: (extension: string) =>
        !masked && extension === 'WEBGL_debug_renderer_info'
          ? { UNMASKED_RENDERER_WEBGL: 0x9246 }
          : null,
      getParameter: (parameter: number) => (parameter === 0x9246 ? name : 'WebKit WebGL'),
    }),
  };
}

describe('render tier', () => {
  it('[§12] low/coarse/reduced-motion disable bloom; software renderer unless high', () => {
    expect(resolveRenderTier(desktop)).toEqual({
      bloom: true,
      physicalMaterials: true,
      textureSize: 512,
    });
    expect(resolveRenderTier({ ...desktop, quality: 'low' }).bloom).toBe(false);
    expect(resolveRenderTier({ ...desktop, coarsePointer: true })).toEqual({
      bloom: false,
      physicalMaterials: false,
      textureSize: 256,
    });
    // Reduced motion turns bloom off but keeps the material tier.
    expect(resolveRenderTier({ ...desktop, reducedMotion: true })).toEqual({
      bloom: false,
      physicalMaterials: true,
      textureSize: 512,
    });
    expect(resolveRenderTier({ ...desktop, softwareRenderer: true }).bloom).toBe(false);
    expect(resolveRenderTier({ ...desktop, softwareRenderer: true, quality: 'high' }).bloom).toBe(
      true,
    );
    expect(resolveRenderTier({ ...desktop, quality: 'high', coarsePointer: true }).bloom).toBe(
      false,
    );
  });

  it('[§12] SwiftShader and llvmpipe count as software renderers', () => {
    expect(isSoftwareRenderer(renderer('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))'))).toBe(
      true,
    );
    expect(isSoftwareRenderer(renderer('llvmpipe (LLVM 15.0.7, 256 bits)'))).toBe(true);
    expect(isSoftwareRenderer(renderer('ANGLE (Apple, ANGLE Metal Renderer: Apple M2)'))).toBe(
      false,
    );
    // Masked renderer string: treated as hardware.
    expect(isSoftwareRenderer(renderer('SwiftShader', true))).toBe(false);
    expect(
      isSoftwareRenderer({
        getContext: () => {
          throw new Error('lost');
        },
      }),
    ).toBe(false);
  });
});
