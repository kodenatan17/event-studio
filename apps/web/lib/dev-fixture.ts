/** Slug of the development-only demo wedding (fake data, never a real couple). */
export const DEMO_SLUG = 'demo-wedding';

/**
 * Dev/test fixtures are served outside production, or in production only when
 * `DEV_FIXTURE_MANIFESTS=1` is set explicitly (e.g. CI E2E). Never set it in real production.
 */
export function isDevFixtureEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.DEV_FIXTURE_MANIFESTS === '1';
}
