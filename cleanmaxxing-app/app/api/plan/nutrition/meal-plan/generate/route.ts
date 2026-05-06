// POST /api/plan/nutrition/meal-plan/generate
// On-demand 7-day meal plan generation. Idempotent for the current
// week (upsert on user + week_start_app_day). Mirrors the sleep
// weekly review endpoint shape.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNutritionAssessment } from '@/lib/nutrition/service';
import { generateAndSaveMealPlan } from '@/lib/nutrition/generate-meal-plan';
import { appDayFor } from '@/lib/date/app-day';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const assessment = await getNutritionAssessment(supabase, user.id);
  if (!assessment) {
    return NextResponse.json(
      { error: 'no_assessment', message: 'Complete the assessment first.' },
      { status: 400 },
    );
  }

  // App-day in the user's timezone — same convention as sleep/strength.
  const { data: userRow } = await supabase
    .from('users')
    .select('timezone')
    .eq('id', user.id)
    .maybeSingle();
  const tz =
    (userRow as { timezone: string | null } | null)?.timezone ??
    'America/New_York';
  const todayAppDay = appDayFor(tz);

  try {
    const plan = await generateAndSaveMealPlan(
      supabase,
      user.id,
      assessment,
      todayAppDay,
    );
    return NextResponse.json({
      ok: true,
      plan: {
        id: plan.id,
        week_start_app_day: plan.week_start_app_day,
        week_end_app_day: plan.week_end_app_day,
        plan_text: plan.plan_text,
        generated_at: plan.generated_at,
      },
    });
  } catch (err) {
    console.error('nutrition_meal_plan_generation_failed', err);
    return NextResponse.json(
      { error: 'generation_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
