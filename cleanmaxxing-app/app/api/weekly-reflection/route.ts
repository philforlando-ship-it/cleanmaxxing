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
  process_adherence: z.record(
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

  const parsed = PostSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const state = await saveWeeklyReflectionV2(supabase, user.id, parsed.data);
  return NextResponse.json(state);
}
