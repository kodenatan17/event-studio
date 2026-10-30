import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();

vi.mock('server-only', () => ({}));
vi.mock('@/lib/manifest-source', () => ({ getManifestSource: () => ({ get }) }));
vi.mock('@/components/viewer/Viewer', () => ({ Viewer: () => null }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_HTTP_ERROR_FALLBACK;404');
  },
}));

import WeddingViewerPage from './page';

const props = (slug: string) =>
  ({ params: Promise.resolve({ slug }), searchParams: Promise.resolve({}) }) as never;

describe('WeddingViewerPage', () => {
  beforeEach(() => get.mockReset());

  it('[FR-01] unknown slug → notFound (404)', async () => {
    get.mockResolvedValue(null);
    await expect(WeddingViewerPage(props('unknown'))).rejects.toThrow(/404/);
  });

  it('[FR-01] invalid manifest → "Data undangan tidak valid" panel without internals', async () => {
    get.mockResolvedValue({
      raw: { schemaVersion: 1, secretInternalField: 'LEAK-ME', scenes: 'nope' },
      origin: 'published',
    });
    const html = renderToStaticMarkup(await WeddingViewerPage(props('bad')));
    expect(html).toContain('Data undangan tidak valid');
    expect(html).toContain('role="alert"');
    expect(html).not.toMatch(/LEAK-ME|secretInternalField|ZodError|expected|invalid_type|scenes/i);
  });
});
