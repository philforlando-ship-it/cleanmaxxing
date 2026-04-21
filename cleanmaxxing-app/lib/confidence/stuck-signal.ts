/**
 * Stuck-low confidence detection for the /today contextual-POV surface.
 *
 * Fires when a user has logged at least N consecutive weekly reflections
 * and every one of them holds a dimension strictly below `threshold`.
 * This is deliberately conservative: a single dip or a wavering score
 * should not trigger a "you seem stuck" nudge — we only surface the card
 * when the low reading is persistent enough to be a real pattern.
 *
 * When multiple dimensions qualify we pick the lowest-averaged one so
 * the card speaks to the hardest area. The return includes a suggested
 * POV slug and a one-line framing prompt; the component turns those
 * into a Link.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConfidenceDimension } from '@/lib/goals/confidence-mapping';

export type StuckSignal = {
  dimension: ConfidenceDimension;
  dimensionLabel: string; // "appearance" / "social" / "work" / "physical"
  averageRecent: number; // mean of the most-recent N readings, rounded to 1dp
  povSlug: string;
  povTitle: string;
  prompt: string;
};

type ReflectionDimRow = {
  social_confidence: number;
  work_confidence: number;
  physical_confidence: number;
  appearance_confidence: number;
  week_start: string;
};

const DEFAULT_WINDOW = 3;
const DEFAULT_THRESHOLD = 4;

// Per-dimension recommended reading. Hand-authored rather than scored
// because the "stuck" signal calls for safety-oriented content
// specifically — not the same material the goal ranker surfaces.
// 55 and 56 are the anti-hierarchy / acceptance POVs that exist
// precisely for this moment.
const DIMENSION_RECOMMENDATION: Record<
  ConfidenceDimension,
  { povSlug: string; povTitle: string; prompt: string; label: string }
> = {
  appearance_confidence: {
    povSlug: '56-identity-beyond-appearance',
    povTitle: 'Identity Beyond Appearance',
    label: 'appearance',
    prompt:
      'Your appearance reading has stayed low for a few weeks running. Not a cue to work harder \u2014 a cue that this POV is worth reading.',
  },
  social_confidence: {
    povSlug: '55-limits-self-improvement',
    povTitle: 'Limits of Self-Improvement',
    label: 'social',
    prompt:
      'Your social reading has stayed low for a few weeks running. Appearance work does not close every social gap; this POV names what it can and cannot do.',
  },
  physical_confidence: {
    povSlug: '54-when-to-stop',
    povTitle: 'When to Stop',
    label: 'physical',
    prompt:
      'Your physical reading has stayed low for a few weeks running. Worth reading this before adding more load \u2014 sometimes the answer is less, not more.',
  },
  work_confidence: {
    povSlug: '55-limits-self-improvement',
    povTitle: 'Limits of Self-Improvement',
    label: 'work',
    prompt:
      'Your work reading has stayed low for a few weeks running. Outside the domain this app operates on, but worth reading this for the framing.',
  },
};

const DIMENSION_KEYS: ConfidenceDimension[] = [
  'appearance_confidence',
  'social_confidence',
  'physical_confidence',
  'work_confidence',
];

export async function getStuckConfidenceSignal(
  supabase: SupabaseClient,
  userId: string,
  window = DEFAULT_WINDOW,
  threshold = DEFAULT_THRESHOLD,
): Promise<StuckSignal | null> {
  const { data: rowsRaw } = await supabase
    .from('weekly_reflections')
    .select(
      'week_start, social_confidence, work_confidence, physical_confidence, appearance_confidence',
    )
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(window);

  const rows = (rowsRaw ?? []) as ReflectionDimRow[];
  // Conservative: require at least `window` reflections. Early users see
  // nothing; the card starts firing only once there's enough data for
  // the "persistent" claim to actually mean something.
  if (rows.length < window) return null;

  let winner: StuckSignal | null = null;
  let lowestAverage = Infinity;

  for (const dim of DIMENSION_KEYS) {
    const values = rows.map((r) => r[dim]);
    const allBelow = values.every((v) => v < threshold);
    if (!allBelow) continue;
    const avg = values.reduce((acc, v) => acc + v, 0) / values.length;
    if (avg >= lowestAverage) continue;
    lowestAverage = avg;
    const rec = DIMENSION_RECOMMENDATION[dim];
    winner = {
      dimension: dim,
      dimensionLabel: rec.label,
      averageRecent: Number(avg.toFixed(1)),
      povSlug: rec.povSlug,
      povTitle: rec.povTitle,
      prompt: rec.prompt,
    };
  }

  return winner;
}
