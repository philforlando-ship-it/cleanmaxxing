import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  saveQuarterlySurvey,
  type QuarterlyAnswers,
} from '@/lib/quarterly-survey/service';

const VALID_FOCUS = new Set([
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

const VALID_MOTIVATION = new Set([
  'feel-better-in-own-skin',
  'social-professional-confidence',
  'specific-event',
  'structured-plan',
  'something-specific-bothering-me',
  'not-sure-yet',
]);

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = body as Partial<QuarterlyAnswers> | null;
  if (!parsed) return NextResponse.json({ error: 'Missing body' }, { status: 400 });

  const focusAreas = Array.isArray(parsed.focusAreas) ? parsed.focusAreas : [];
  if (focusAreas.length === 0 || focusAreas.length > 3) {
    return NextResponse.json(
      { error: 'Pick 1 to 3 focus areas' },
      { status: 400 },
    );
  }
  if (focusAreas.some((f) => typeof f !== 'string' || !VALID_FOCUS.has(f))) {
    return NextResponse.json({ error: 'Invalid focus area' }, { status: 400 });
  }

  const motivationSegment = parsed.motivationSegment;
  if (typeof motivationSegment !== 'string' || !VALID_MOTIVATION.has(motivationSegment)) {
    return NextResponse.json({ error: 'Invalid motivation segment' }, { status: 400 });
  }

  let specificThing: string | null = null;
  if (parsed.specificThing != null) {
    if (typeof parsed.specificThing !== 'string') {
      return NextResponse.json({ error: 'Invalid specific_thing' }, { status: 400 });
    }
    const trimmed = parsed.specificThing.trim();
    specificThing = trimmed.length === 0 ? null : trimmed.slice(0, 500);
  }

  const { suggestions } = await saveQuarterlySurvey(supabase, user.id, {
    focusAreas,
    motivationSegment,
    specificThing,
  });

  return NextResponse.json({ ok: true, suggestions });
}
