// POST /api/plan/nutrition/food-preferences
// Save food picker preferences without triggering report
// regeneration. Mirrors strength's exercise-preferences endpoint.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NutritionFoodPreferencesInputSchema } from '@/lib/nutrition/types';
import { saveFoodPreferences } from '@/lib/nutrition/service';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = NutritionFoodPreferencesInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_request', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const updated = await saveFoodPreferences(supabase, user.id, parsed.data);
    return NextResponse.json({
      ok: true,
      food_preferences: updated.food_preferences,
      food_exclusions: updated.food_exclusions,
      food_filter_text: updated.food_filter_text,
    });
  } catch (err) {
    console.error('nutrition_food_preferences_save_failed', err);
    return NextResponse.json(
      { error: 'save_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
