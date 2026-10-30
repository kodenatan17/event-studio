import base from '@undangan/config/eslint';
import nextVitals from 'eslint-config-next/core-web-vitals';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';

const restrictEngineImports = (allowFixtures) => [
  'error',
  {
    paths: [
      {
        name: '@undangan/contracts',
        message: 'world-engine may only import @undangan/contracts/world.',
      },
      {
        name: '@undangan/wedding-features',
        message: 'world-engine must not depend on wedding-features (architecture.md §4.3).',
      },
    ],
    patterns: [
      {
        group: ['@undangan/wedding-features/*'],
        message: 'world-engine must not depend on wedding-features (architecture.md §4.3).',
      },
      {
        group: [
          '@undangan/contracts/*',
          '!@undangan/contracts/world',
          ...(allowFixtures
            ? ['!@undangan/contracts/fixtures', '!@undangan/contracts/fixtures/*']
            : []),
        ],
        message: allowFixtures
          ? 'world-engine tests may only import @undangan/contracts/world and fixtures.'
          : 'world-engine may only import @undangan/contracts/world.',
      },
    ],
  },
];

export default defineConfig(
  // Asset source packs (assets/source/*) hold generator scripts and viewers; never linted.
  { ignores: ['assets/source/**'] },
  base,
  {
    files: ['apps/web/**/*.{js,jsx,mjs,ts,tsx}'],
    extends: [nextVitals],
    settings: {
      next: { rootDir: 'apps/web/' },
    },
  },
  {
    // Shared packages are not covered by nextVitals; they still need the hooks rules.
    files: ['packages/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
  },
  {
    // D-009: the fake demo fixture is reachable only through the server-only ManifestSource.
    files: ['**/*.{js,jsx,mjs,ts,tsx}'],
    ignores: ['apps/web/lib/manifest-source.ts', '**/*.test.*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@undangan/contracts/fixtures', '@undangan/contracts/fixtures/*'],
              message:
                'Dev fixtures may only be imported by apps/web/lib/manifest-source.ts and tests (D-009).',
            },
          ],
        },
      ],
    },
  },
  {
    // architecture.md §4.3: overlays get props, never the world store; contracts as types only,
    // so zod stays out of the client bundle.
    files: ['packages/wedding-features/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@undangan/contracts',
              allowTypeImports: true,
              message: 'wedding-features imports contracts as types only.',
            },
            {
              name: '@undangan/contracts/world',
              allowTypeImports: true,
              message: 'wedding-features imports contracts as types only.',
            },
            { name: 'zod', message: 'No runtime schemas in client overlays.' },
            {
              name: '@undangan/world-engine',
              allowTypeImports: true,
              message: 'Overlays receive props; they never import the world store.',
            },
          ],
        },
      ],
    },
  },
  {
    // architecture.md §4.3: world-engine knows nothing about weddings.
    files: ['packages/world-engine/**/*.{js,jsx,mjs,ts,tsx}'],
    rules: { 'no-restricted-imports': restrictEngineImports(false) },
  },
  {
    // Dev-only tests may use the fake demo fixture as reference data.
    files: ['packages/world-engine/**/*.test.{ts,tsx}'],
    rules: { 'no-restricted-imports': restrictEngineImports(true) },
  },
);
