// Replaced at build time by the bundler; available natively under Vitest/Node.
declare const process: { env: Record<string, string | undefined> };

/** Developer-visible warning; silent in production builds (architecture.md §8.3). */
export function devWarn(message: string, ...details: unknown[]): void {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[world-engine] ${message}`, ...details);
  }
}
