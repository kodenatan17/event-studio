'use client';

import { useEffect, useState } from 'react';

import { countdownParts } from '@/lib/countdown';

const UNITS = [
  ['days', 'Hari'],
  ['hours', 'Jam'],
  ['minutes', 'Menit'],
  ['seconds', 'Detik'],
] as const;

/** Time to the first event. Clock-dependent, so it renders only after hydration. */
export function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const parts = now === null ? null : countdownParts(Date.parse(target), now);
  if (!parts) return null;
  return (
    <dl data-testid="invitation-countdown" className="inv-countdown">
      {UNITS.map(([unit, label]) => (
        <div key={unit}>
          <dt>{label}</dt>
          <dd>{parts[unit]}</dd>
        </div>
      ))}
    </dl>
  );
}
