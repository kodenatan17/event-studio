import { MANIFEST_SCHEMA_VERSION, WeddingManifestV1Schema } from '@undangan/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Viewer } from '@/components/viewer/Viewer';
import { getManifestSource } from '@/lib/manifest-source';

export const metadata: Metadata = {
  robots: { index: false },
};

/** Manifest written by a newer app version (api-contracts.md §7.1: recoverable error). */
function isFutureSchemaVersion(raw: unknown): boolean {
  if (typeof raw !== 'object' || raw === null || !('schemaVersion' in raw)) return false;
  const { schemaVersion } = raw;
  return typeof schemaVersion === 'number' && schemaVersion > MANIFEST_SCHEMA_VERSION;
}

function ManifestErrorPanel({ slug, message }: { slug: string; message: string }) {
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <p role="alert">{message}</p>
      <a
        className="inline-flex min-h-11 items-center rounded-full bg-[#7a4a2a] px-5 text-sm font-medium text-[#fbf7ee]"
        href={`/w/${encodeURIComponent(slug)}`}
      >
        Muat ulang
      </a>
    </main>
  );
}

export default async function WeddingViewerPage({ params, searchParams }: PageProps<'/w/[slug]'>) {
  const { slug } = await params;
  // `?mode=2d`: accessible 2D link (FR-01, T-108); anything else starts in 3D.
  const { mode } = await searchParams;
  const initialMode = mode === '2d' ? '2d' : '3d';
  const source = await getManifestSource().get(slug);
  if (!source) notFound();

  if (isFutureSchemaVersion(source.raw)) {
    return (
      <ManifestErrorPanel
        slug={slug}
        message="Undangan ini memerlukan versi aplikasi yang lebih baru."
      />
    );
  }

  const parsed = WeddingManifestV1Schema.safeParse(source.raw);
  if (!parsed.success) {
    // Never render validation internals to guests.
    return <ManifestErrorPanel slug={slug} message="Data undangan tidak valid." />;
  }

  return (
    <main className="fixed inset-0 overflow-hidden overscroll-none">
      <Viewer manifest={parsed.data} initialMode={initialMode}>
        {source.origin === 'fixture' ? (
          <p className="w-full bg-amber-200/90 px-3 pt-[calc(env(safe-area-inset-top)_+_0.25rem)] pb-1 text-center text-sm text-amber-950">
            Data contoh (fixture pengembangan)
          </p>
        ) : null}
      </Viewer>
    </main>
  );
}
