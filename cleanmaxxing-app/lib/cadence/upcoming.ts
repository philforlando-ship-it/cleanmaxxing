/**
 * Upcoming cadence events — scheduled (date-predictable) surfaces over
 * a forward window. Powers the "Coming up" strip on /reflection.
 *
 * Scope is deliberately narrow: only events with a real anchor date.
 * Habits (daily SPF, daily protein, weekly beard upkeep) and condition-
 * driven prompts (drift, off-track, fatigue) are excluded — those are
 * either too noisy (habits) or not plannable (condition-driven).
 *
 * Sources:
 *   1. Weekly reflection — Sunday of the current ISO week, or next
 *      Sunday if this week's reflection is already logged
 *   2. Monthly checkpoint — users.created_at + {30, 60, 90} days
 *   3. Facial-structure monthly photo — last_facial_photo_logged_at + 30d
 *      (gated on report_text + stage_1_acknowledged_at)
 *   4. Facial-structure Stage-3 maintenance — stage_3_acknowledged_at + 28d
 *   5. Journey 90-day mark — journey_states.entered_at + 90d, phase=implementing
 *
 * Past-due items (photo, weekly reflection) clamp to today rather than
 * disappearing — the user should still see them surface as "due now."
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { JOURNEYS, type JourneySlug } from '@/lib/today/journeys';

const DAYS_MS = 24 * 60 * 60 * 1000;

export type CadenceEventKind =
  | 'weekly_reflection'
  | 'monthly_checkpoint'
  | 'facial_structure_photo'
  | 'facial_structure_stage_3_maintenance'
  | 'journey_anniversary';

export type CadenceEvent = {
  // YYYY-MM-DD in local time (server timezone).
  date: string;
  // 0 = today, 1 = tomorrow, etc. Clamps at 0 for past-due items.
  daysFromToday: number;
  kind: CadenceEventKind;
  title: string;
  detail: string;
  journeySlug: JourneySlug | null;
  journeyLabel: string | null;
  href: string;
};

export async function getUpcomingCadenceEvents(
  supabase: SupabaseClient,
  userId: string,
  windowDays: number = 14,
  now: Date = new Date(),
): Promise<CadenceEvent[]> {
  const today = startOfLocalDay(now);
  const horizonMs = today.getTime() + windowDays * DAYS_MS;
  const mondayThisWeek = mondayDate(now);
  const mondayKey = localDateString(mondayThisWeek);

  const [userRow, fsRow, journeyStateRows, weeklyRefThisWeek] =
    await Promise.all([
      supabase.from('users').select('created_at').eq('id', userId).maybeSingle(),
      supabase
        .from('facial_structure_assessments')
        .select(
          'last_facial_photo_logged_at, stage_1_acknowledged_at, stage_3_acknowledged_at, report_text',
        )
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('journey_states')
        .select('journey_slug, entered_at, phase')
        .eq('user_id', userId)
        .eq('phase', 'implementing'),
      supabase
        .from('weekly_reflections')
        .select('week_start')
        .eq('user_id', userId)
        .eq('week_start', mondayKey)
        .maybeSingle(),
    ]);

  const events: CadenceEvent[] = [];

  // 1) Weekly reflection — Sunday of this week, or next Sunday if
  //    already logged or this Sunday has passed.
  {
    const sunday = new Date(mondayThisWeek);
    sunday.setDate(sunday.getDate() + 6);
    if (
      weeklyRefThisWeek.data !== null &&
      weeklyRefThisWeek.data !== undefined
    ) {
      sunday.setDate(sunday.getDate() + 7);
    } else if (sunday.getTime() < today.getTime()) {
      // This Sunday has passed but no reflection logged — push to next
      // Sunday (this can happen on Monday before the new week_start
      // rolls over).
      sunday.setDate(sunday.getDate() + 7);
    }
    if (sunday.getTime() <= horizonMs) {
      events.push({
        date: localDateString(sunday),
        daysFromToday: dayDiff(today, sunday),
        kind: 'weekly_reflection',
        title: 'Weekly reflection',
        detail: 'Process adherence + outcomes for the week',
        journeySlug: null,
        journeyLabel: null,
        href: '/reflection#weekly-reflection',
      });
    }
  }

  // 2) Monthly checkpoint — 30/60/90-day anniversaries from
  //    users.created_at.
  const createdAtRaw = userRow.data?.created_at as string | null | undefined;
  if (createdAtRaw) {
    const createdAt = new Date(createdAtRaw);
    if (!Number.isNaN(createdAt.getTime())) {
      for (const anchorDay of [30, 60, 90]) {
        const date = new Date(createdAt.getTime() + anchorDay * DAYS_MS);
        if (date.getTime() < today.getTime()) continue;
        if (date.getTime() > horizonMs) continue;
        events.push({
          date: localDateString(date),
          daysFromToday: dayDiff(today, date),
          kind: 'monthly_checkpoint',
          title: `${anchorDay}-day checkpoint`,
          detail: 'Step back: is the original framing still the right one?',
          journeySlug: null,
          journeyLabel: null,
          href: '/reflection',
        });
      }
    }
  }

  // 3) Facial-structure monthly photo cadence.
  const fs = fsRow.data as
    | {
        last_facial_photo_logged_at: string | null;
        stage_1_acknowledged_at: string | null;
        stage_3_acknowledged_at: string | null;
        report_text: string | null;
      }
    | null;
  if (fs && fs.report_text && fs.stage_1_acknowledged_at) {
    let due: Date;
    if (fs.last_facial_photo_logged_at) {
      due = new Date(
        new Date(fs.last_facial_photo_logged_at).getTime() + 30 * DAYS_MS,
      );
    } else {
      due = today;
    }
    const surface = due.getTime() < today.getTime() ? today : due;
    if (surface.getTime() <= horizonMs) {
      events.push({
        date: localDateString(surface),
        daysFromToday: dayDiff(today, surface),
        kind: 'facial_structure_photo',
        title: 'Monthly facial photo',
        detail: 'Same lighting, morning, casual face',
        journeySlug: 'facial_structure',
        journeyLabel: 'Facial structure',
        href: '/today',
      });
    }
  }

  // 4) Facial-structure Stage-3 maintenance gate.
  if (fs && fs.stage_3_acknowledged_at) {
    const gate = new Date(
      new Date(fs.stage_3_acknowledged_at).getTime() + 28 * DAYS_MS,
    );
    if (gate.getTime() >= today.getTime() && gate.getTime() <= horizonMs) {
      events.push({
        date: localDateString(gate),
        daysFromToday: dayDiff(today, gate),
        kind: 'facial_structure_stage_3_maintenance',
        title: 'Facial-structure maintenance check',
        detail: 'Four weeks since you acknowledged the framing layer',
        journeySlug: 'facial_structure',
        journeyLabel: 'Facial structure',
        href: '/plan/facial-structure',
      });
    }
  }

  // 5) Journey 90-day mark from journey_states.entered_at (implementing
  //    phase only).
  const journeyMap = new Map(JOURNEYS.map((j) => [j.slug, j]));
  const stateRows =
    (journeyStateRows.data as
      | { journey_slug: string; entered_at: string; phase: string }[]
      | null) ?? [];
  for (const row of stateRows) {
    const cfg = journeyMap.get(row.journey_slug as JourneySlug);
    if (!cfg) continue;
    const enteredAt = new Date(row.entered_at);
    if (Number.isNaN(enteredAt.getTime())) continue;
    const ninety = new Date(enteredAt.getTime() + 90 * DAYS_MS);
    if (ninety.getTime() < today.getTime()) continue;
    if (ninety.getTime() > horizonMs) continue;
    events.push({
      date: localDateString(ninety),
      daysFromToday: dayDiff(today, ninety),
      kind: 'journey_anniversary',
      title: `90 days on ${cfg.label.toLowerCase()}`,
      detail: 'Three months in — worth a step back',
      journeySlug: cfg.slug,
      journeyLabel: cfg.label,
      href: cfg.planPath,
    });
  }

  events.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.title.localeCompare(b.title);
  });

  return events;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function dayDiff(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAYS_MS);
}

function mondayDate(now: Date): Date {
  const d = startOfLocalDay(now);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}
