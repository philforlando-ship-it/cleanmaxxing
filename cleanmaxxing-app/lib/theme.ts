// Theme hook. Three modes:
//   'system' — follow the OS's prefers-color-scheme (default)
//   'light'  — force light
//   'dark'   — force dark
//
// Persistence via localStorage. A no-FOUC inline script in
// app/layout.tsx applies the initial class before React hydrates; this
// hook handles the in-session changes and re-renders via
// useSyncExternalStore so we don't trip the set-state-in-effect lint.

'use client';

import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'cleanmaxxing:theme';

// -- Stored-theme subscription -----------------------------------------

function subscribeTheme(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    // localStorage unavailable (private browsing, quota) — fall through.
  }
  return 'system';
}

function getServerTheme(): Theme {
  return 'system';
}

// -- OS-preference subscription ----------------------------------------

function subscribePrefers(callback: () => void): () => void {
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getServerPrefersDark(): boolean {
  return false;
}

// -- Hook --------------------------------------------------------------

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getStoredTheme,
    getServerTheme,
  );
  const prefersDark = useSyncExternalStore(
    subscribePrefers,
    getPrefersDark,
    getServerPrefersDark,
  );
  const resolved: ResolvedTheme =
    theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;

  function setTheme(next: Theme) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
      // Dispatch a storage event so useSyncExternalStore subscribers
      // in the same tab re-read. Cross-tab updates come for free via
      // the native storage event.
      window.dispatchEvent(
        new StorageEvent('storage', { key: THEME_STORAGE_KEY }),
      );
    } catch {
      // Non-fatal — the toggle still works via component state in the
      // current render, just won't persist.
    }
  }

  return { theme, resolved, setTheme };
}
