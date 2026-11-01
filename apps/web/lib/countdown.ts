export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** Time left until `target` (ms), or `null` once it has passed. */
export function countdownParts(target: number, now: number): CountdownParts | null {
  const left = Math.floor((target - now) / 1000);
  if (!Number.isFinite(left) || left <= 0) return null;
  return {
    days: Math.floor(left / 86_400),
    hours: Math.floor(left / 3_600) % 24,
    minutes: Math.floor(left / 60) % 60,
    seconds: left % 60,
  };
}
