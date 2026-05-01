'use client';

// Registers /sw.js after the page has loaded. Runs in production
// only — caching during dev makes hot-reload confusing and serves
// stale code when the user is iterating. The user can manually
// register the SW via DevTools if they want to test PWA behavior
// locally.

import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Swallow registration errors. A missing or broken SW is
        // not user-facing — the app still works without it, just
        // without the offline shell + install prompt eligibility.
      });
    };

    if (document.readyState === 'complete') {
      register();
      return;
    }
    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
