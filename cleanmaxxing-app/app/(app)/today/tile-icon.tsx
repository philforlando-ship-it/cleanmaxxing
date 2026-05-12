// TileIcon — the rounded-square icon container used at the top-left
// of /today's daily-action tiles. Pairs a Phosphor duotone glyph
// with a tinted background so each tile reads at a glance (a Moon
// for sleep commitments, a Sun for SPF, etc.) and the page no
// longer presents as a wall of text-only cards.
//
// Kept neutral about which Phosphor weight / size to use; defaults
// match the journey-grid treatment so the visual language is
// consistent across the page.

import type { Icon } from '@phosphor-icons/react';

export type TileIconTone =
  | 'sky'        // sleep / cool foundation
  | 'emerald'    // body / training / closure
  | 'amber'      // aesthetic refinements (skincare / hair / facial hair / photos)
  | 'violet'     // presence / voice / facial-structure
  | 'rose'       // urgent / concerning (rare)
  | 'zinc';      // default / unknown / first-run

const TONE_CLASSES: Record<TileIconTone, { bg: string; icon: string }> = {
  sky: {
    bg: 'bg-sky-100 dark:bg-sky-950/40',
    icon: 'text-sky-700 dark:text-sky-300',
  },
  emerald: {
    bg: 'bg-emerald-100 dark:bg-emerald-950/40',
    icon: 'text-emerald-700 dark:text-emerald-300',
  },
  amber: {
    bg: 'bg-amber-100 dark:bg-amber-950/40',
    icon: 'text-amber-700 dark:text-amber-300',
  },
  violet: {
    bg: 'bg-violet-100 dark:bg-violet-950/40',
    icon: 'text-violet-700 dark:text-violet-300',
  },
  rose: {
    bg: 'bg-rose-100 dark:bg-rose-950/40',
    icon: 'text-rose-700 dark:text-rose-300',
  },
  zinc: {
    bg: 'bg-zinc-100 dark:bg-zinc-800',
    icon: 'text-zinc-700 dark:text-zinc-300',
  },
};

type Props = {
  icon: Icon;
  tone?: TileIconTone;
  size?: number;
  // Compact swatch (h-7 w-7) for inline-text positions like log-row
  // headers. The default (h-10 w-10) suits card heros.
  compact?: boolean;
};

export function TileIcon({
  icon: Icon,
  tone = 'zinc',
  size,
  compact = false,
}: Props) {
  const accent = TONE_CLASSES[tone];
  const dimension = compact ? 'h-7 w-7' : 'h-10 w-10';
  const glyphSize = size ?? (compact ? 16 : 20);
  return (
    <span
      aria-hidden="true"
      className={`inline-flex ${dimension} shrink-0 items-center justify-center rounded-lg ${accent.bg} ${accent.icon}`}
    >
      <Icon size={glyphSize} weight="duotone" />
    </span>
  );
}
