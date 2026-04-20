'use client';

// Three-state theme toggle: system → light → dark → system ...
// Compact icon-only button for the nav. aria-label communicates state
// for screen readers; the title attribute gives a hover hint on desktop.

import { useTheme, type Theme } from '@/lib/theme';

const ORDER: Theme[] = ['system', 'light', 'dark'];

const LABELS: Record<Theme, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

function nextTheme(current: Theme): Theme {
  const i = ORDER.indexOf(current);
  return ORDER[(i + 1) % ORDER.length];
}

function Icon({ theme }: { theme: Theme }) {
  if (theme === 'light') {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    );
  }
  if (theme === 'dark') {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }
  // system
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const upcoming = nextTheme(theme);

  return (
    <button
      type="button"
      onClick={() => setTheme(upcoming)}
      aria-label={`Theme: ${LABELS[theme]}. Click to switch to ${LABELS[upcoming]}.`}
      title={`Theme: ${LABELS[theme]} · click for ${LABELS[upcoming]}`}
      className="flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      <Icon theme={theme} />
      <span className="hidden sm:inline">{LABELS[theme]}</span>
    </button>
  );
}
