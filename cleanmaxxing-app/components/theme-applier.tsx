'use client';

// Keeps the <html> element's .dark class in sync with the user's theme
// preference. The inline no-FOUC script in app/layout.tsx sets the
// class on initial page load; this component handles changes made
// during the session (via the ThemeToggle) without a full page reload.

import { useEffect } from 'react';
import { useTheme } from '@/lib/theme';

export function ThemeApplier() {
  const { resolved } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolved]);

  return null;
}
