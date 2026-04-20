// Weekly focus walkthroughs per POV doc.
// Source: content/povs/[slug].onramp.json (authored manually).
// Surfaced on the Today screen as per-goal "this week's focus" cards.
//
// Each file follows the schema in types below. The week-range language
// ("1-4", "5", "11+") mirrors the prose in the POV on-ramp sections, so
// the content can be read in either place without conflict.
//
// The `stage_weeks` map lets a user declare their baseline on acceptance
// ("not at all" → "already consistent") and jump into the walkthrough at
// the appropriate week, rather than starting everyone at week 1. See
// migration 0007_goals_baseline_stage.sql.

import onramp04 from '@/content/povs/04-peptides.onramp.json';
import onramp07 from '@/content/povs/07-skincare-antiaging.onramp.json';
import onramp08 from '@/content/povs/08-head-hair-balding.onramp.json';
import onramp09 from '@/content/povs/09-facial-hair.onramp.json';
import onramp10 from '@/content/povs/10-grooming.onramp.json';
import onramp11 from '@/content/povs/11-teeth-smile.onramp.json';
import onramp12 from '@/content/povs/12-style-clothing.onramp.json';
import onramp15 from '@/content/povs/15-looksmaxxing-system.onramp.json';
import onramp16 from '@/content/povs/16-facial-definition-jawline.onramp.json';
import onramp17 from '@/content/povs/17-environment-lifestyle-design.onramp.json';
import onramp18 from '@/content/povs/18-tanning.onramp.json';
import onramp19 from '@/content/povs/19-strength-training.onramp.json';
import onramp20 from '@/content/povs/20-diet-macros.onramp.json';
import onramp21 from '@/content/povs/21-protein-creatine.onramp.json';
import onramp23 from '@/content/povs/23-cardio.onramp.json';
import onramp24 from '@/content/povs/24-alcohol-cannabis.onramp.json';
import onramp25 from '@/content/povs/25-acne.onramp.json';
import onramp27 from '@/content/povs/27-hair-loss-treatments.onramp.json';
import onramp30 from '@/content/povs/30-appetite-control.onramp.json';
import onramp31 from '@/content/povs/31-calorie-macro-framework.onramp.json';
import onramp33 from '@/content/povs/33-niche-enhancements.onramp.json';
import onramp34 from '@/content/povs/34-recovery-tools-polish.onramp.json';
import onramp41 from '@/content/povs/41-medical-conditions.onramp.json';
import onramp42 from '@/content/povs/42-sleep.onramp.json';
import onramp45 from '@/content/povs/45-meal-plans.onramp.json';
import onramp48 from '@/content/povs/48-skin-tone-guidance.onramp.json';
import onramp50 from '@/content/povs/50-posture.onramp.json';
import onramp51 from '@/content/povs/51-dating-apps.onramp.json';

export type BaselineStage = 'new' | 'light' | 'partial' | 'established';

export const BASELINE_STAGES: BaselineStage[] = ['new', 'light', 'partial', 'established'];

export function isBaselineStage(v: unknown): v is BaselineStage {
  return typeof v === 'string' && (BASELINE_STAGES as string[]).includes(v);
}

export type OnrampWeek = {
  range: string;
  focus: string;
  detail: string;
};

export type Onramp = {
  slug: string;
  start_cue?: string;
  weeks: OnrampWeek[];
  graduation: string;
  // Starting week per baseline stage. `null` means "jump straight to
  // graduation" — used for the `established` stage across most POVs
  // because already-consistent users don't need the walkthrough.
  stage_weeks: Record<BaselineStage, number | null>;
};

const DEFAULT_STAGE_WEEKS: Record<BaselineStage, number | null> = {
  new: 1,
  light: 1,
  partial: 1,
  established: null,
};

const BY_SLUG: Record<string, Onramp> = {
  '04-peptides': onramp04 as Onramp,
  '07-skincare-antiaging': onramp07 as Onramp,
  '08-head-hair-balding': onramp08 as Onramp,
  '09-facial-hair': onramp09 as Onramp,
  '10-grooming': onramp10 as Onramp,
  '11-teeth-smile': onramp11 as Onramp,
  '12-style-clothing': onramp12 as Onramp,
  '15-looksmaxxing-system': onramp15 as Onramp,
  '16-facial-definition-jawline': onramp16 as Onramp,
  '17-environment-lifestyle-design': onramp17 as Onramp,
  '18-tanning': onramp18 as Onramp,
  '19-strength-training': onramp19 as Onramp,
  '20-diet-macros': onramp20 as Onramp,
  '21-protein-creatine': onramp21 as Onramp,
  '23-cardio': onramp23 as Onramp,
  '24-alcohol-cannabis': onramp24 as Onramp,
  '25-acne': onramp25 as Onramp,
  '27-hair-loss-treatments': onramp27 as Onramp,
  '30-appetite-control': onramp30 as Onramp,
  '31-calorie-macro-framework': onramp31 as Onramp,
  '33-niche-enhancements': onramp33 as Onramp,
  '34-recovery-tools-polish': onramp34 as Onramp,
  '41-medical-conditions': onramp41 as Onramp,
  '42-sleep': onramp42 as Onramp,
  '45-meal-plans': onramp45 as Onramp,
  '48-skin-tone-guidance': onramp48 as Onramp,
  '50-posture': onramp50 as Onramp,
  '51-dating-apps': onramp51 as Onramp,
};

export function onrampFor(slug: string | null | undefined): Onramp | null {
  if (!slug) return null;
  return BY_SLUG[slug] ?? null;
}

// A week range is one of:
//   "N"     — a single week (min = max = N)
//   "N-M"   — an inclusive range
//   "N+"    — open-ended from N onward (graduation never fires)
function parseRange(range: string): { min: number; max: number | null } {
  const m = range.match(/^(\d+)(?:-(\d+)|(\+))?$/);
  if (!m) throw new Error(`Invalid on-ramp week range: "${range}"`);
  const min = Number(m[1]);
  if (m[3]) return { min, max: null };
  if (m[2]) return { min, max: Number(m[2]) };
  return { min, max: min };
}

// How many full 7-day windows have passed since the goal was accepted.
// 0 on the same day, 1 after seven days, etc. This is an *offset* on top
// of the stage's starting week — not the current-week label itself.
function weeksSinceAccepted(acceptedAt: Date, now: Date): number {
  const days = Math.floor((now.getTime() - acceptedAt.getTime()) / 86_400_000);
  return Math.max(0, Math.floor(days / 7));
}

export type OnrampState =
  | { kind: 'active'; week: number; block: OnrampWeek }
  | { kind: 'graduated'; week: number; graduation: string };

export function currentState(
  onramp: Onramp,
  acceptedAt: Date,
  stage: BaselineStage = 'new',
  now: Date = new Date(),
): OnrampState {
  // Tolerate older JSON files that don't have stage_weeks populated — fall
  // back to "always start at week 1 except established, which graduates."
  const stageWeeks = onramp.stage_weeks ?? DEFAULT_STAGE_WEEKS;
  const stageStart = stageWeeks[stage];

  if (stageStart === null) {
    return { kind: 'graduated', week: 0, graduation: onramp.graduation };
  }

  const effectiveWeek = stageStart + weeksSinceAccepted(acceptedAt, now);

  for (const block of onramp.weeks) {
    const { min, max } = parseRange(block.range);
    if (effectiveWeek >= min && (max === null || effectiveWeek <= max)) {
      return { kind: 'active', week: effectiveWeek, block };
    }
  }

  return { kind: 'graduated', week: effectiveWeek, graduation: onramp.graduation };
}
