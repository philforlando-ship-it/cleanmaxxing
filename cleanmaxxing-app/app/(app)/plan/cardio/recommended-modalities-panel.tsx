// Recommended-modalities panel for /plan/cardio. Renders top 3
// modality candidates ranked by the user's equipment access,
// outdoor access, time per session, and injury constraints.
//
// Read-only — informational, not action-driving. If the user wants
// to change their modality_preference, they go through Edit
// answers on the assessment form. Matches the strength + nutrition
// picker pattern's "show what fits" posture without forcing the
// user into another decision moment.
//
// Server component (no client interaction needed).

import { getRecommendedModalities } from '@/lib/cardio/recommended-modalities';
import type {
  CardioEquipmentAccess,
  CardioInjuryConstraint,
  CardioModalityPreference,
  CardioOutdoorAccess,
  CardioTimePerSession,
} from '@/lib/cardio/types';

type Props = {
  // Migration 0090 — equipment_access is now an array; can hold
  // multiple selections (full gym AND home treadmill, etc.).
  equipment_access: CardioEquipmentAccess[];
  outdoor_access: CardioOutdoorAccess | null;
  time_per_session: CardioTimePerSession | null;
  injury_constraints: CardioInjuryConstraint[];
  // Highlight the user's current modality_preference picks if any
  // appear in the top 3. Quiet visual marker, not a CTA. Now an
  // array under migration 0090.
  current_preferences: CardioModalityPreference[];
};

export function RecommendedModalitiesPanel({
  equipment_access,
  outdoor_access,
  time_per_session,
  injury_constraints,
  current_preferences,
}: Props) {
  // Need at least one equipment_access entry plus outdoor_access +
  // time_per_session to produce a meaningful ranking. Pre-migration
  // assessments leave these unset; don't render until the user
  // updates them via Edit answers.
  if (
    equipment_access.length === 0 ||
    !outdoor_access ||
    !time_per_session
  ) {
    return null;
  }

  const ranked = getRecommendedModalities({
    equipment_access,
    outdoor_access,
    time_per_session,
    injury_constraints,
  });

  if (ranked.length === 0) return null;

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        Modalities ranked for your situation
      </h3>
      <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">
        Top 3 picks based on your equipment, outdoor access, time
        budget, and any injury constraints. The plan above already
        leans on your preference — this is here for context if you
        want to switch.
      </p>

      <ol className="mt-4 space-y-3">
        {ranked.map((r, i) => {
          const isCurrent = current_preferences.includes(r.modality);
          return (
            <li
              key={r.modality}
              className={
                isCurrent
                  ? 'rounded-md border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30'
                  : 'rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40'
              }
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                  {i + 1}. {r.label}
                </p>
                {isCurrent && (
                  <span className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    Your current pick
                  </span>
                )}
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                {r.rationale}
              </p>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-[11px] text-zinc-500 dark:text-zinc-400">
        Want to switch? Use Edit answers on the form above and update
        your modality preference.
      </p>
    </section>
  );
}
