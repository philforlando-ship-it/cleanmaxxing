/**
 * Maps a goal's measurement_type to a contextual action affordance
 * shown next to its daily tick in the check-in card.
 *
 * The default check-in is a tick — that works for the majority of
 * habit_adherence goals. The other measurement types each have a
 * better proof-of-progress surface elsewhere on the app, and the
 * action link is the bridge: it points the user at the right
 * tracker (workout log, sleep log, /profile photo capture, weekly
 * reflection, etc.) without removing the daily-tick mechanic.
 *
 * Returns null when no action belongs alongside the tick. That's
 * the right answer for habit_adherence (tick is the action) and
 * appointment_milestone (the goal page itself is the surface; a
 * daily action would create false motion on a milestone goal).
 */
import type { MeasurementType } from '@/content/goal-templates';

export type MeasurementAction = {
  label: string;
  // Anchor on the same page (/today). Section IDs added to the
  // corresponding cards in the same wave.
  anchor?: string;
  // Cross-page link. Used for photo capture which lives on /profile.
  href?: string;
};

export function actionForMeasurement(
  type: MeasurementType | null,
): MeasurementAction | null {
  switch (type) {
    case 'session_log':
    case 'progression':
      return { label: 'Log session', anchor: 'workout-log' };
    case 'wake_time_consistency':
      return { label: 'Log sleep', anchor: 'sleep-log' };
    case 'photo_comparison':
      return { label: 'Capture photo', href: '/profile' };
    case 'self_check':
      return { label: 'Reflect', anchor: 'weekly-reflection' };
    case 'macro_tracking':
    case 'body_metric':
    case 'closet_audit':
    case 'appointment_milestone':
    case 'habit_adherence':
    case null:
    case undefined:
      return null;
    default: {
      // Exhaustiveness check — adding a new MeasurementType without
      // updating this switch will trip the type system here.
      const _exhaustive: never = type;
      void _exhaustive;
      return null;
    }
  }
}
