// Cleanmaxxing brand assets. Three source PNGs:
//   /cleanmaxxing-logo.png  — full mark + wordmark stacked (homepage
//                             hero) — preprocessed via
//                             scripts/strip-logo-bg.ts (white bg →
//                             alpha 0, mark → opaque black, edges
//                             semi-transparent for anti-aliasing).
//                             Renders cleanly on any background.
//   /cleanmaxxing-logo2.png — CM monogram only (nav, spinner) — has
//                             true alpha transparency (preprocessed
//                             via PIL: white bg → alpha 0, black mark
//                             → alpha 255, anti-aliased edges become
//                             semi-transparent black). Renders cleanly
//                             on any background, including during the
//                             spinner rotation where the previous
//                             blend-mode hack revealed bg artifacts.
//   /cleanmaxxing-logo3.png — CLEANMAXXING wordmark only (nav)
//
// Dark-mode handling differs by asset:
//   - logo.png + logo2.png (transparent bg): just apply `dark:invert`
//     to flip the black mark → white. No blend-mode needed.
//   - logo3.png (opaque white bg): keep the legacy
//     `mix-blend-multiply dark:invert dark:mix-blend-screen` so the
//     white bg disappears against page chrome.

/* eslint-disable @next/next/no-img-element */
import * as React from 'react';

type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const FULL_DIM: Record<LogoSize, string> = {
  xs: 'h-6',
  sm: 'h-8',
  md: 'h-12',
  lg: 'h-24',
  // xl is the homepage hero size — scales up at each breakpoint so
  // it doesn't dominate small screens but reads as a real brand mark
  // on desktop.
  xl: 'h-40 sm:h-56 md:h-72',
};

// CM mark is rendered inside a square wrapper (h == w) so the
// animate-spin rotation stays tidy. logo2.png has a wider-than-tall
// natural aspect ratio (sparkle to the right of the M), so the inner
// img uses object-contain to fit without distortion.
const MARK_DIM: Record<LogoSize, string> = {
  xs: 'h-5 w-5',
  sm: 'h-7 w-7',
  md: 'h-10 w-10',
  lg: 'h-20 w-20',
  xl: 'h-32 w-32',
};

// Wordmark is wide-and-short (~8:1). Setting only the height + auto
// width keeps it proportional in horizontal contexts (e.g. nav).
const WORDMARK_DIM: Record<LogoSize, string> = {
  xs: 'h-3',
  sm: 'h-4',
  md: 'h-6',
  lg: 'h-10',
  xl: 'h-14',
};

// Blend modes hide the white background of the legacy PNGs (logo.png,
// logo3.png) without requiring a transparent-bg export:
//   light mode — multiply: white × light page bg = page bg (vanishes);
//                black × light = black (mark stays).
//   dark mode  — invert flips white→black and black→white; screen
//                lifts the new black bg into the dark page bg, leaving
//                only the white mark visible.
const BLEND_FILTER = 'mix-blend-multiply dark:invert dark:mix-blend-screen';

// Filter for the alpha-transparent logo2.png. No blend-mode is needed
// because the PNG already has correct alpha — `dark:invert` alone
// flips the black mark to white in dark mode, and the transparent
// regions stay transparent regardless of mode.
const MARK_FILTER = 'dark:invert';

type LogoProps = {
  size?: LogoSize;
  className?: string;
};

// Full stacked logo (CM + wordmark). Used on the homepage hero.
// Uses MARK_FILTER (no blend-mode) because logo.png has true alpha
// transparency now — the strip-logo-bg.ts preprocessor ran the same
// pipeline that logo2.png went through.
export function CleanmaxxingLogo({ size = 'md', className = '' }: LogoProps) {
  return (
    <img
      src="/cleanmaxxing-logo.png"
      alt="Cleanmaxxing"
      className={`${FULL_DIM[size]} w-auto ${MARK_FILTER} ${className}`}
    />
  );
}

// CM monogram only. Used standalone in compact contexts and as the
// spinning element in CMSpinner. The square wrapper keeps rotation
// uniform; object-contain preserves the asset's natural aspect.
// Uses MARK_FILTER (no blend-mode) because logo2.png has true alpha
// transparency — the previous blend-mode hack revealed bg artifacts
// during rotation in both light and dark mode.
export function CleanmaxxingMark({ size = 'sm', className = '' }: LogoProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${MARK_DIM[size]} ${className}`}
    >
      <img
        src="/cleanmaxxing-logo2.png"
        alt="Cleanmaxxing"
        className={`h-full w-full object-contain ${MARK_FILTER}`}
      />
    </span>
  );
}

// CLEANMAXXING wordmark only. Used in the persistent app nav.
export function CleanmaxxingWordmark({ size = 'sm', className = '' }: LogoProps) {
  return (
    <img
      src="/cleanmaxxing-logo3.png"
      alt="Cleanmaxxing"
      className={`${WORDMARK_DIM[size]} w-auto ${BLEND_FILTER} ${className}`}
    />
  );
}

type CMSpinnerProps = {
  size?: LogoSize;
  // Optional message rendered next to the spinning mark, e.g.
  // "Mister P is writing your plan…". Lets every caller keep its
  // existing copy so timing expectations stay in place.
  label?: React.ReactNode;
  className?: string;
};

// Spinning CM monogram. Used wherever a plan / report / image is
// being generated by an LLM call. The animation is slowed from
// Tailwind's default 1s to 1.6s so it reads as a brand mark, not
// a frenetic loader.
export function CMSpinner({ size = 'sm', label, className = '' }: CMSpinnerProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <CleanmaxxingMark
        size={size}
        className="animate-spin [animation-duration:1.6s]"
      />
      {label && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
      )}
    </span>
  );
}
