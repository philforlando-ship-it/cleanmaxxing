// Stage 5 content — monitoring habit (photo cadence).
//
// Authored Mister P-voice copy. The protocol is non-negotiable for
// photo-comparison to actually work — bad photos invent progress that
// isn't there or panic that isn't earned. The panic-timeline reminder
// is the most load-bearing piece for users on the Treat path because
// month 5–10 reads as failure even when the treatment is working.
//
// Photos are NOT stored in the app in v1. The user takes them with
// their phone, keeps them in their own photo library. This card
// provides the protocol + the reminder; the user runs the comparison
// themselves.

import type { CutFamily, DensityState, Stage2Path } from './types';

export const STAGE_5_INTRO = `Hair changes slowly. Bad photos invent progress that isn't there or panic that isn't earned. Stage 5 is the cadence that gives future-you a baseline so the next decision runs on evidence, not mood.`;

export type Stage5ProtocolItem = {
  heading: string;
  body: string;
};

export const STAGE_5_PROTOCOL_HAIR: Stage5ProtocolItem[] = [
  {
    heading: 'The angles (5 required, 1 optional)',
    body: '1. Front, eye level, neutral face. 2. Hairline close-up, hair lightly pulled back if needed. 3. One side profile (your choice — same side every time). 4. Crown, camera above your head. 5. Styled result, normal distance, how you actually look. Optional 6: opposite side profile, only if your hairline recedes asymmetrically.',
  },
  {
    heading: 'Lighting',
    body: 'Indirect daylight or bright indoor light. No flash. Never harsh overhead bathroom light — it lies. Don\'t compare a wet shot to a dry one. Don\'t compare a fresh cut to overgrown.',
  },
  {
    heading: 'Where to keep them',
    body: 'Your phone. Make a dedicated album so you can scroll the comparison without hunting. Mister P is not asking you to upload anything to the app in this version — your hair-loss photos belong in your own library.',
  },
];

export const STAGE_5_PROTOCOL_BALD: Stage5ProtocolItem[] = [
  {
    heading: 'The angles (3 required)',
    body: '1. Top-down, full crown. 2. Side profile, one side, same side every time — shows the horseshoe transition. 3. Front, eye level — captures scalp tone, beard alignment, overall presentation.',
  },
  {
    heading: 'What to watch for',
    body: 'Even tone across scalp, beard, neck, ears (the bald look depends on color matching). Razor bumps, ingrowns, dryness, flakes. The bald presentation reads sharp when scalp looks intentional and reads neglected when it looks irritated or ashy.',
  },
  {
    heading: 'Lighting',
    body: 'Same place, same time of day. Indirect light. Avoid the shadow line that overhead bathroom lights cast on the crown — it makes any unevenness look dramatic.',
  },
];

export const STAGE_5_PANIC_TIMELINE_REMINDER = `If you're on the Treat path: months 5–10 of finasteride/minoxidil typically read as failure even when the treatment is working. Existing weak hairs cycle out before stronger ones grow in. The 12-to-24-month photo comparison is the only reliable measure. Don't quit at month 7 because of what the mirror says — that's the most common reason people abandon a working protocol.`;

// Modifier-aware default cadence. Pulled at start time and stored on
// the row so later changes to density_state or interventions don't
// silently change the user's commitment mid-run.
export type Stage5CadenceContext = {
  density_state: DensityState;
  stage_2_path: Stage2Path | null;
  cut_family: CutFamily | null;
  current_interventions: string[];
  pattern_d_treatment_started_at: string | null;
};

export function computeStage5DefaultCadence(
  ctx: Stage5CadenceContext,
): number {
  // Bald-track / clean-shave / transition: 30 days. Scalp condition is
  // what's being monitored, and scalp issues develop on a faster
  // timeline than hair density change.
  if (
    ctx.density_state === 'shaved_or_buzzed' ||
    ctx.cut_family === 'bald_track' ||
    ctx.cut_family === 'clean_shave' ||
    ctx.stage_2_path === 'transition'
  ) {
    return 30;
  }

  // Active loss signal OR on-protocol: 90 days (quarterly). Either the
  // user has visible loss to track or they're running a treatment whose
  // effect needs photographic measurement on a regular cadence.
  const onProtocol =
    ctx.pattern_d_treatment_started_at !== null ||
    ctx.current_interventions.includes('finasteride') ||
    ctx.current_interventions.includes('minoxidil');
  const hasActiveLossSignal =
    ctx.density_state === 'crown_thinning' ||
    ctx.density_state === 'diffuse_thinning' ||
    ctx.density_state === 'advanced_thinning' ||
    ctx.stage_2_path === 'monitor' ||
    ctx.stage_2_path === 'treat';
  if (onProtocol || hasActiveLossSignal) {
    return 90;
  }

  // Stable / no treatment: 180 days. Annual would be too sparse for
  // catching slow change; semi-annual is the sweet spot for stable
  // density.
  return 180;
}

// Compute next-due date from last session + cadence, or null if the
// user hasn't logged a session yet (in which case "due now" is the
// implicit answer).
export function nextDueDate(
  lastSessionAt: string | null,
  cadenceDays: number,
): Date | null {
  if (!lastSessionAt) return null;
  const last = new Date(lastSessionAt);
  return new Date(last.getTime() + cadenceDays * 24 * 60 * 60 * 1000);
}

// Returns days until next session (negative if overdue, 0 if due
// today, null if no prior session).
export function daysUntilNext(
  lastSessionAt: string | null,
  cadenceDays: number,
  now: Date = new Date(),
): number | null {
  const due = nextDueDate(lastSessionAt, cadenceDays);
  if (!due) return null;
  const diffMs = due.getTime() - now.getTime();
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}
