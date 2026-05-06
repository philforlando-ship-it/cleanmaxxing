// POST /api/plan/strength/exercise-preferences
// Save the user's exercise picker preferences (selected, excluded,
// free-form constraints) to the strength_assessments row WITHOUT
// triggering a report regeneration. Regenerating is a separate
// explicit action via /api/plan/strength/regenerate so the user can
// curate freely before paying for a new LLM call.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StrengthExercisePreferencesInputSchema } from '@/lib/strength/types';
import { saveExercisePreferences } from '@/lib/strength/service';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = StrengthExercisePreferencesInputSchema.safeParse(body);
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
    const updated = await saveExercisePreferences(
      supabase,
      user.id,
      parsed.data,
    );
    return NextResponse.json({
      ok: true,
      selected_exercise_slugs: updated.selected_exercise_slugs,
      excluded_exercise_slugs: updated.excluded_exercise_slugs,
      exercise_filter_text: updated.exercise_filter_text,
    });
  } catch (err) {
    console.error('strength_exercise_preferences_save_failed', err);
    return NextResponse.json(
      { error: 'save_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
