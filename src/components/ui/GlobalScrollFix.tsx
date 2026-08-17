'use client';

import { useEffect } from 'react';

export function GlobalScrollFix() {
  useEffect(() => {
    // Prevent mouse wheel on number inputs from changing the value
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        target.tagName === 'INPUT' &&
        (target as HTMLInputElement).type === 'number'
      ) {
        if (document.activeElement === target) {
          (target as HTMLInputElement).blur();
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return null;
}
