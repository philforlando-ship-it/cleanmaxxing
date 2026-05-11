import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { saveQuarterlySurvey } from '@/lib/quarterly-survey/service';

// Focus-area enum mirrors the onboarding journey-picker (post-2026-05-07)
// while keeping the legacy vocabulary accepted so historical answers
// stored in survey_responses remain valid. The card itself only renders
// the canonical journey slugs (hair / style / body_composition /
// strength / cardio / sleep / skincare / facial_hair).
const FocusAreaEnum = z.enum([
  // Canonical journey slugs
  'hair',
  'style',
  'body_composition',
  'strength',
  'cardio',
  'sleep',
  'skincare',
  'facial_hair',
  // Legacy values still in old survey_responses rows
  'fitness',
  'skin',
  'facial_aesthetics',
  'posture',
  'grooming',
  'anti_aging',
]);

const MotivationEnum = z.enum([
  'feel-better-in-own-skin',
  'social-professional-confidence',
  'specific-event',
  'structured-plan',
  'something-specific-bothering-me',
  'maintenance-aging',
  'not-sure-yet',
]);

const BodySchema = z.object({
  focusAreas: z.array(FocusAreaEnum).min(1).max(3),
  motivationSegment: MotivationEnum,
  // Free text — trimmed + capped at 500 chars to bound DB row size.
  specificThing: z
    .string()
    .transform((s) => s.trim().slice(0, 500))
    .nullable()
    .optional()
    .transform((s) => (s == null || s === '' ? null : s)),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = BodySchema.safeParse(raw);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: result.error.issues },
      { status: 400 },
    );
  }

  await saveQuarterlySurvey(supabase, user.id, result.data);

  return NextResponse.json({ ok: true });
}
