// Weekly reflection v2 API route (Phase F).
//
// POST writes the v2 columns only — process_adherence map +
// outcome observations + directional flag + free-text reflection.
// The legacy v1 columns (social/work/physical/appearance
// confidence) are intentionally left null on new submissions per
// the freeze.
//
// GET returns the same WeeklyReflectionState shape as before;
// rows from before the migration carry v1 fields populated, rows
// from after carry v2 fields. Consumers branch via hasV1Data /
// hasV2Data.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  getWeeklyReflectionState,
  saveWeeklyReflectionV2,
} from '@/lib/weekly-reflection/service';

const PostSchema = z.object({
  // Zod 4: z.record(keyEnum, ...) is exhaustive — would require every
  // topic in the enum to be present. The form only sends entries for
  // the user's active journeys, so we want partial coverage. partialRecord
  // restores the v3 "any subset of keys is fine" semantics.
  process_adherence: z.partialRecord(
    z.enum([
      'hair',
      'style',
      'facial_hair',
      'sleep',
      'skincare',
      'nutrition',
      'strength',
      'cardio',
      'glp1',
    ]),
    z.enum(['most_days', 'some_days', 'few_or_none']),
  ),
  outcome_appearance_comment: z.boolean().nullable(),
  outcome_appearance_comment_text: z.string().max(280).nullable(),
  outcome_initiated: z.enum(['yes', 'no', 'not_applicable']).nullable(),
  outcome_physical_feel: z
    .enum(['better', 'same', 'worse', 'mixed'])
    .nullable(),
  directional_flag: z
    .enum([
      'more_on_track',
      'about_the_same',
      'less_on_track',
      'losing_momentum',
    ])
    .nullable(),
  prompt_used: z
    .enum([
      'something_worth_noting',
      'something_surprising',
      'tried_what_worked',
    ])
    .nullable(),
  notes: z.string().max(2000).nullable(),
  // D2: optional weekly weigh-in. When non-null, the route also
  // updates user_profile.current_weight_lbs so downstream consumers
  // (nutrition rate cap, milestone triggers, BMR calculator, /plan
  // pages) see the fresh value without a separate save round-trip.
  weight_lbs: z.number().min(80).max(500).nullable().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const state = await getWeeklyReflectionState(supabase, user.id);
  return NextResponse.json(state);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawBody = await req.json().catch(() => ({}));
  const parsed = PostSchema.safeParse(rawBody);
  if (!parsed.success) {
    console.error(
      'weekly_reflection_validation_failed',
      JSON.stringify(
        {
          process_adherence: rawBody?.process_adherence ?? null,
          issues: parsed.error.issues,
        },
        null,
        2,
      ),
    );
    return NextResponse.json(
      { error: 'Invalid request', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { weight_lbs, ...reflectionInput } = parsed.data;

  const state = await saveWeeklyReflectionV2(
    supabase,
    user.id,
    reflectionInput,
  );

  // Side-effect: update the user's current weight when they entered
  // one. This is non-fatal — the reflection is the primary write and
  // already succeeded; if the profile patch fails we still return the
  // saved reflection so the user doesn't lose their entry.
  if (weight_lbs != null) {
    const rounded = Math.round(weight_lbs * 10) / 10;
    await supabase
      .from('user_profile')
      .update({ current_weight_lbs: rounded })
      .eq('user_id', user.id);
  }

  return NextResponse.json(state);
}
