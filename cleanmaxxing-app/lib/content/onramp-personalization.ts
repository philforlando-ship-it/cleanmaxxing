/**
 * Per-user "for you" line rendered above the focus/detail prose on
 * each Current Focus entry. The onramp content stays static (good
 * pedagogy — teaches the rule with an example); this layer adds a
 * specific number derived from the user's own profile so they don't
 * have to do the conversion in their head.
 *
 * Scope is deliberately narrow — only POVs whose phase guidance
 * has a single high-variance number that depends on user state
 * (protein grams, calorie targets, current sleep delta). Onramps
 * about wall resets, wardrobe fit, dental work, hair products,
 * etc. don't have a meaningful per-user number, so they pass
 * through with no extra line.
 *
 * Returns null when:
 *   - the slug isn't on the personalization roster, or
 *   - the user data needed to compute the number is missing.
 *
 * Falling back to null (rather than e.g. inserting a placeholder)
 * keeps the static prose's authored example as the safety net.
 */
import type { MisterPUserState } from '@/lib/mister-p/user-state';
import type { ActivityLevel } from '@/lib/profile/service';

// Pull the most-current value the user has supplied. /profile
// (current_weight_lbs, height_inches) takes precedence over the
// onboarding survey because it's the surface the user updates over
// time.
function effectiveWeight(state: MisterPUserState): number | null {
  return state.profile.current_weight_lbs ?? state.weightLbs;
}

function effectiveHeight(state: MisterPUserState): number | null {
  return state.profile.height_inches ?? state.heightInches;
}

// Mifflin-St Jeor BMR for adult males. The product audience is
// men 30-55; using the male equation by default is intentional.
// Returns kcal/day at rest.
function bmrMen(weightLbs: number, heightInches: number, ageYears: number): number {
  const weightKg = weightLbs * 0.4536;
  const heightCm = heightInches * 2.54;
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
}

function tdeeMultiplier(activity: ActivityLevel | null): number {
  switch (activity) {
    case 'sedentary':
      return 1.2;
    case 'lightly_active':
      return 1.375;
    case 'moderately_active':
      return 1.55;
    case 'very_active':
      return 1.725;
    default:
      // Sensible default for the audience (30-55 men engaged enough
      // to be using the app — most are at least light-to-moderate).
      return 1.45;
  }
}

function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

export function personalizationFor(
  slug: string,
  state: MisterPUserState,
): string | null {
  switch (slug) {
    case '21-protein-creatine': {
      const weight = effectiveWeight(state);
      if (weight === null) return null;
      const target = Math.round(weight);
      const perMeal = Math.round(target / 4);
      return `For you at ${weight} lb: ~${target} g protein/day, roughly ${perMeal} g per meal across four meals.`;
    }

    case '20-diet-macros':
    case '31-calorie-macro-framework': {
      const weight = effectiveWeight(state);
      const height = effectiveHeight(state);
      if (weight === null || height === null || state.age === null) return null;
      const tdee = roundTo(
        bmrMen(weight, height, state.age) * tdeeMultiplier(state.profile.activity_level),
        50,
      );
      const cut = roundTo(tdee - 400, 50);
      const bulk = roundTo(tdee + 250, 50);
      const proteinG = Math.round(weight);
      return `For you: TDEE ≈ ${tdee} kcal. Cut: ~${cut} kcal. Lean gain: ~${bulk} kcal. Protein: ~${proteinG} g/day.`;
    }

    case '42-sleep': {
      if (state.sleepRecentCount < 3 || state.sleepRecentAvgHours === null) {
        return null;
      }
      const avg = state.sleepRecentAvgHours;
      const targetLow = 7;
      const targetHigh = 9;
      const nightsCopy = `${state.sleepRecentCount} logged night${
        state.sleepRecentCount === 1 ? '' : 's'
      }`;
      if (avg >= targetLow && avg <= targetHigh) {
        return `For you: averaging ${avg.toFixed(1)} h over your last ${nightsCopy} — sitting in the ${targetLow}–${targetHigh} h band.`;
      }
      if (avg < targetLow) {
        const gap = (targetLow - avg).toFixed(1);
        return `For you: averaging ${avg.toFixed(1)} h over your last ${nightsCopy} — about ${gap} h short of the ${targetLow}–${targetHigh} h band.`;
      }
      return `For you: averaging ${avg.toFixed(1)} h over your last ${nightsCopy} — running over the ${targetLow}–${targetHigh} h band, which is fine if you wake feeling rested.`;
    }

    default:
      return null;
  }
}
