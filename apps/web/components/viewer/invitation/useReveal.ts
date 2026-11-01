'use client';

import { useEffect } from 'react';
import type { RefObject } from 'react';

/** Marks `[data-reveal]` elements `data-in` the first time they scroll into `root`. */
export function useReveal(root: RefObject<HTMLElement | null>, enabled: boolean): void {
  useEffect(() => {
    const element = root.current;
    if (!enabled || !element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute('data-in', '');
          observer.unobserve(entry.target);
        }
      },
      { root: element, threshold: 0.1, rootMargin: '0px 0px -6% 0px' },
    );
    element.querySelectorAll('[data-reveal]').forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [root, enabled]);
}
