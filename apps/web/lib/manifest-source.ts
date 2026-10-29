import 'server-only';

import { demoWeddingManifest } from '@undangan/contracts/fixtures/demo-wedding';

import { DEMO_SLUG, isDevFixtureEnabled } from './dev-fixture';

/** Where a manifest came from; `fixture` is dev/test-only fake data (D-009). */
export type ManifestOrigin = 'fixture' | 'published';

export interface ManifestSourceResult {
  /** Unvalidated manifest JSON; the page parses it with `WeddingManifestV1Schema`. */
  raw: unknown;
  origin: ManifestOrigin;
}

export interface ManifestSource {
  get(slug: string): Promise<ManifestSourceResult | null>;
}

/** Serves only the fake demo wedding, and only when dev fixtures are enabled (D-009). */
export const devFixtureManifestSource: ManifestSource = {
  async get(slug) {
    if (slug !== DEMO_SLUG || !isDevFixtureEnabled()) return null;
    return { raw: structuredClone(demoWeddingManifest), origin: 'fixture' };
  },
};

/**
 * Active published manifest (`weddings.active_publication_id`).
 * BLOCKED (T-105): no Supabase project yet, so nothing is ever published.
 */
export const publishedManifestSource: ManifestSource = {
  async get() {
    return null;
  },
};

/** Published manifests first; the dev fixture only fills in where nothing is published. */
export function getManifestSource(): ManifestSource {
  return {
    async get(slug) {
      return (
        (await publishedManifestSource.get(slug)) ?? (await devFixtureManifestSource.get(slug))
      );
    },
  };
}
