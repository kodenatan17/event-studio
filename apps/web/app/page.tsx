import Link from 'next/link';

import { DEMO_SLUG } from '@/lib/dev-fixture';

export default function HomePage() {
  const showDemoLink = process.env.NODE_ENV !== 'production';

  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Undangan AI</h1>
      <p>Undangan pernikahan digital dalam dunia 3D interaktif.</p>
      {showDemoLink ? (
        <Link className="underline" href={`/w/${DEMO_SLUG}`}>
          Buka undangan contoh (pengembangan)
        </Link>
      ) : null}
    </main>
  );
}
