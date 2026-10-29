import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEMO_SLUG } from './dev-fixture';
import { getManifestSource, publishedManifestSource } from './manifest-source';

// `server-only` throws outside the react-server condition; Vitest runs plain Node (hoisted).
vi.mock('server-only', () => ({}));

describe('getManifestSource', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('[FR-01] unknown slug → null', async () => {
    vi.stubEnv('NODE_ENV', 'development');

    await expect(getManifestSource().get('unknown')).resolves.toBeNull();
  });

  it('[T-003] production without flag → null', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DEV_FIXTURE_MANIFESTS', '');

    await expect(getManifestSource().get(DEMO_SLUG)).resolves.toBeNull();
  });

  it('[T-003] demo slug served as fixture when enabled', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DEV_FIXTURE_MANIFESTS', '1');

    const result = await getManifestSource().get(DEMO_SLUG);

    expect(result?.origin).toBe('fixture');
    expect(result?.raw).toMatchObject({ schemaVersion: 1, wedding: { slug: DEMO_SLUG } });
  });

  it('[T-105] published source is not wired yet (BLOCKED)', async () => {
    await expect(publishedManifestSource.get(DEMO_SLUG)).resolves.toBeNull();
  });
});
