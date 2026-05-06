// Stage 4 microcopy. Authored Mister P-voice strings for the daily
// styling tile + milestone moments. Centralized so the /today tile and
// the /plan/hair Stage 4 card use identical phrasing.
//
// Chris-feedback principles baked in:
// - One action per day, not a checklist.
// - Missed days are forgiven without scolding.
// - Streak milestones are quiet, not loud — no confetti, no shame.
// - The "Day X of N" framing makes pacing visible.

// Hair-track variant strings (the default). Bald-track users see the
// _BALD variants below — the styling routine is irrelevant when there's
// no hair to style; the daily action is scalp care, not hair care.

export const STAGE_4_TILE_TITLE = 'Style your hair';
export const STAGE_4_TILE_BODY =
  'Three minutes. Damp hair, small amount of product, shape, finish. That’s it.';

export const STAGE_4_TILE_TITLE_BALD = 'Scalp routine';
export const STAGE_4_TILE_BODY_BALD =
  'Two minutes. Moisturizer + SPF on the scalp — treat it like facial skin. Touch-up shave if you need it.';

export const STAGE_4_TILE_DONE = 'Logged for today';

export const STAGE_4_TILE_LOG_BUTTON = 'Mark done';

// Helper for callers — picks the right title / body based on whether
// the user is on the bald track. Cuts down on "did I switch both?"
// drift if we ever add a third variant.
export function stage4Copy(isBaldTrack: boolean): {
  title: string;
  body: string;
} {
  if (isBaldTrack) {
    return { title: STAGE_4_TILE_TITLE_BALD, body: STAGE_4_TILE_BODY_BALD };
  }
  return { title: STAGE_4_TILE_TITLE, body: STAGE_4_TILE_BODY };
}

// Soft note when user hasn't logged today, surfaced under the body
// copy on the /today tile so the day-X-of-N framing is always visible.
export function progressLine(count: number, target: number): string {
  if (count === 0) return `Day 1 of ${target}`;
  if (count >= target) return `${target} of ${target} — Stage 4 complete`;
  return `Day ${count + 1} of ${target}`;
}

// Quiet milestone copy. Used by the /today tile after a successful log.
// Designed to be NOT loud — Chris's complaint was overload, and
// achievement confetti at every check-in is its own kind of overload.
//
// One variant per track: the Day 7 milestone is the only one that
// references the cut/style framing; others read fine for both tracks.
export function milestoneFor(
  count: number,
  target: number,
  isBaldTrack = false,
): string | null {
  if (count >= target) {
    return 'That’s the gate. Stage 5 unlocks next.';
  }
  if (count === 3) return 'Three days in. Building the baseline.';
  if (count === 7) {
    return isBaldTrack
      ? 'A week locked. The bald presentation reads sharp when the scalp looks intentional, not neglected.'
      : 'A week locked. The cut is half the upgrade — the daily finish is the rest.';
  }
  if (count === Math.floor(target / 2)) return 'Halfway. Keep the rhythm.';
  return null;
}

export const STAGE_4_MISSED_DAY_COPY =
  'Skipped a day. Not a problem. Reset tomorrow — the count picks up where it left off.';

// Calculate the modifier-aware target for a given user. The framework
// memory specifies that mental-health-flagged users get an eased gate
// (7 vs 14). The cleanest data signal we currently have for that flag
// is current_interventions including 'ssri' or 'adhd_stimulant' —
// these are imperfect proxies but they're what's already on the
// profile and they're directionally right (a user on either is more
// likely to need pacing accommodation). Document the proxy explicitly.
//
// Storing the result at start time (not deriving on every read) means
// later changes to the user's interventions don't mid-flight retarget
// the gate the user is working toward.
export function computeStage4Target(currentInterventions: string[]): number {
  const easedSet = new Set(['ssri', 'adhd_stimulant']);
  const eased = currentInterventions.some((i) => easedSet.has(i));
  return eased ? 7 : 14;
}
