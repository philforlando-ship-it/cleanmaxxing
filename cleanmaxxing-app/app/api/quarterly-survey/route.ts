import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { saveQuarterlySurvey } from '@/lib/quarterly-survey/service';

const FocusAreaEnum = z.enum([
  'fitness',
  'body_composition',
  'skin',
  'hair',
  'facial_aesthetics',
  'style',
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

  const { suggestions } = await saveQuarterlySurvey(
    supabase,
    user.id,
    result.data,
  );

  return NextResponse.json({ ok: true, suggestions });
}
