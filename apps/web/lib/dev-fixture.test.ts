import { afterEach, describe, expect, it, vi } from 'vitest';

import { isDevFixtureEnabled } from './dev-fixture';

describe('isDevFixtureEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('[T-003] fixture disabled in production without flag', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DEV_FIXTURE_MANIFESTS', '');

    expect(isDevFixtureEnabled()).toBe(false);
  });

  it('[T-003] fixture enabled in production with DEV_FIXTURE_MANIFESTS=1', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DEV_FIXTURE_MANIFESTS', '1');

    expect(isDevFixtureEnabled()).toBe(true);
  });

  it('[T-003] fixture enabled outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DEV_FIXTURE_MANIFESTS', '');

    expect(isDevFixtureEnabled()).toBe(true);
  });
});
