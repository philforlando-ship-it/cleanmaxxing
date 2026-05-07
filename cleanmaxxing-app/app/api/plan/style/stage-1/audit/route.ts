// POST /api/plan/style/stage-1/audit
// User submits their keep/cut/replace marks against the closet-audit
// chip catalog for their target archetype. We validate slug shape,
// persist the selections, and synchronously generate Mister P's
// audit recommendation. Failure of the LLM step still persists the
// selections so the user can retry without re-clicking chips.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStyleAssessment } from '@/lib/style/service';
import { generateAndSaveStyleStage1 } from '@/lib/style/generate-stage-1';
import { validateChipSelections } from '@/lib/style/closet-audit-content';
import { StyleStage1AuditSchema } from '@/lib/style/types';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Body must be JSON.' },
      { status: 400 },
    );
  }

  const parsed = StyleStage1AuditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Malformed audit submission.' },
      { status: 400 },
    );
  }

  const assessment = await getStyleAssessment(supabase, user.id);
  if (!assessment) {
    return NextResponse.json(
      { error: 'No style assessment on file.' },
      { status: 400 },
    );
  }
  if (!assessment.report_text) {
    return NextResponse.json(
      { error: 'Generate the personal report first.' },
      { status: 400 },
    );
  }

  const offendingSlug = validateChipSelections(
    assessment.target_archetype,
    parsed.data.chip_selections,
  );
  if (offendingSlug !== null) {
    return NextResponse.json(
      { error: `Unknown chip slug: ${offendingSlug}` },
      { status: 400 },
    );
  }

  try {
    await generateAndSaveStyleStage1(
      supabase,
      user.id,
      assessment,
      parsed.data.chip_selections,
    );
  } catch (err) {
    console.error('style_stage_1_generation_failed', err);
    return NextResponse.json(
      {
        error:
          'Mister P couldn’t finish your audit recommendation. Try again in a moment.',
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
