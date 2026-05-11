'use client';

// Stage cards for /plan/facial-structure (Slice 3 of the facial
// structure journey). Four stages in a Pattern A progression:
//
//   Stage 1 — ack the report; user confirms they read the lever
//             assignment and are ready to start.
//   Stage 2 — lever-specific execution. Five variants per
//             primary lever (computePrimaryLever).
//   Stage 3 — framing layer check; deep-links hair / style /
//             facial-hair so the user verifies the framing pieces
//             are coordinated.
//   Stage 4 — Pattern D cosmetic shell deep-link. Gated on
//             stage_4_unlocked_at being set (Stage 2 done + openness
//             >= curious_about_options).
//
// All cards live in this single file because each is small enough
// that splitting per file would be more ceremony than value. If any
// individual card grows past ~150 lines, split.

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { PrimaryLever } from '@/lib/facial-structure/primary-lever';
import { PRIMARY_LEVER_LABEL } from '@/lib/facial-structure/primary-lever';

type StageAction = 'ack' | 'start' | 'complete';

async function callStage(stage: 1 | 2 | 3 | 4, action: StageAction) {
  const res = await fetch('/api/plan/facial-structure/stage', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ stage, action }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    throw new Error(
      body.message ?? body.error ?? `Request failed (${res.status})`,
    );
  }
}

function useStageCall() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (stage: 1 | 2 | 3 | 4, action: StageAction) => {
    setError(null);
    startTransition(async () => {
      try {
        await callStage(stage, action);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };
  return { pending, error, run };
}

// ============================================================
// Stage 1 — acknowledge the report
// ============================================================

export function FacialStructureStage1Card({
  primaryLever,
  acknowledgedAt,
}: {
  primaryLever: PrimaryLever;
  acknowledgedAt: string | null;
}) {
  const { pending, error, run } = useStageCall();
  if (acknowledgedAt) return null;
  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Stage 1 — read the plan
      </p>
      <h2 className="mt-1 text-base font-medium text-zinc-900 dark:text-zinc-100">
        Your primary lever:{' '}
        <span className="font-semibold">
          {PRIMARY_LEVER_LABEL[primaryLever]}
        </span>
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        The plan above names one move. Acknowledge that you read it and
        Stage 2 unlocks — the lever-specific work, sized to what you
        actually said.
      </p>
      {error && (
        <p className="mt-3 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => run(1, 'ack')}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? 'Saving…' : 'I read it — move to Stage 2'}
        </button>
      </div>
    </section>
  );
}

// ============================================================
// Stage 2 — lever-specific execution
// ============================================================

export function FacialStructureStage2Card({
  primaryLever,
  stage1Ack,
  stage2Started,
  stage2Completed,
}: {
  primaryLever: PrimaryLever;
  stage1Ack: string | null;
  stage2Started: string | null;
  stage2Completed: string | null;
}) {
  const { pending, error, run } = useStageCall();
  if (!stage1Ack) return null;
  if (stage2Completed) return null;

  const body = STAGE_2_BODY[primaryLever];

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Stage 2 — {body.subtitle}
      </p>
      <h2 className="mt-1 text-base font-medium text-zinc-900 dark:text-zinc-100">
        {body.title}
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        {body.intro}
      </p>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        {body.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {body.crossLinks.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 text-[13px]">
          {body.crossLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {link.label} →
            </Link>
          ))}
        </div>
      )}
      {error && (
        <p className="mt-3 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="mt-4 flex items-center gap-2">
        {!stage2Started ? (
          <button
            type="button"
            onClick={() => run(2, 'start')}
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending ? 'Saving…' : body.startLabel}
          </button>
        ) : (
          <>
            <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
              {body.inProgressNote}
            </p>
            <button
              type="button"
              onClick={() => run(2, 'complete')}
              disabled={pending}
              className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {pending ? 'Saving…' : body.completeLabel}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

type Stage2Body = {
  subtitle: string;
  title: string;
  intro: string;
  items: string[];
  crossLinks: Array<{ href: string; label: string }>;
  startLabel: string;
  inProgressNote: string;
  completeLabel: string;
};

const STAGE_2_BODY: Record<PrimaryLever, Stage2Body> = {
  body_comp: {
    subtitle: 'body composition',
    title: 'Cut to the band where your face reads sharp.',
    intro:
      'The face is downstream of the cut at your current BF. Don\'t duplicate the work here — the nutrition plan is the surface that owns it.',
    items: [
      'Open your nutrition plan and confirm the protein floor and calorie target.',
      'If you don\'t have a nutrition plan yet, build one — that\'s the actual Stage 2 work.',
      'Mark complete when you\'re on the cut and have logged at least one week of compliance.',
    ],
    crossLinks: [
      { href: '/plan/nutrition', label: 'Open nutrition plan' },
    ],
    startLabel: 'Start: open nutrition',
    inProgressNote:
      'On the cut. Come back when you\'ve held a week of compliance.',
    completeLabel: 'I\'ve held the cut for a week',
  },
  puff_diagnostic: {
    subtitle: 'puff diagnostic (POV 44 framework)',
    title: 'Run a 2-week sleep / sodium / alcohol audit.',
    intro:
      'Persistent puff in a lean person is almost always upstream. The face responds to the source in 7-14 days. Find the variable that\'s elevated.',
    items: [
      'Log sleep nightly for 2 weeks — pull the average. Under 7 hours is the heaviest hitter.',
      'Track alcohol — pay attention to the week pattern, not the night. Weekend spikes show in Monday\'s face.',
      'Audit sodium on heavy-meal days — restaurant food, sauces, snacks. Most non-cooked food is salt-loaded.',
      'After 2 weeks at baseline behaviors, mark complete. The face will tell you if there\'s anything structural left.',
    ],
    crossLinks: [
      { href: '/plan/sleep', label: 'Open sleep plan' },
      { href: '/plan/nutrition', label: 'Open nutrition plan' },
    ],
    startLabel: 'Start the 2-week audit',
    inProgressNote: 'Audit running. Two weeks of honest baseline.',
    completeLabel: 'Two weeks in — face reads cleaner',
  },
  posture_neck: {
    subtitle: 'posture + neck training',
    title: 'Forward head compresses the chin-to-neck line.',
    intro:
      'Posture protocol lives in the posture content; neck training is owned here. Both compound — neck training without posture work doesn\'t produce the visible jaw / chin line.',
    items: [
      'Read POV 50 on posture — the 4-phase progression (workstation → resets → gym → automaticity).',
      'Neck training 2x/week: front + sides + back, 2-3 sets each, light load, 8-12 reps. 8-12 weeks for visible improvement.',
      'Photograph your side profile at week 0 and week 8 — same angle, same lighting. The chin-to-neck line is the read.',
      'Mark complete when posture feels like the default rest position AND you have 8 weeks of consistent neck work.',
    ],
    crossLinks: [
      { href: '/povs/50-posture', label: 'POV 50 — Posture' },
    ],
    startLabel: 'Start: 8-week protocol',
    inProgressNote:
      '8-week posture + neck protocol running. Photograph at week 0 and 8.',
    completeLabel: 'Eight weeks done — side profile reads cleaner',
  },
  cosmetic_patternd: {
    subtitle: 'cosmetic procedures (Pattern D)',
    title: 'You\'ve done the lifestyle work — open the procedural-fit surface.',
    intro:
      'You\'re lean, posture is clean, puff is in check, and you\'re open to procedures. The procedural-fit AI takes your variables and ranks options for you specifically — filler as diagnostic before anything permanent. We do not name specific procedures here.',
    items: [
      'Open /plan/procedures and run the procedural-fit analysis.',
      'Read the ranked output honestly — the AI flags both fit AND regret-risk per option.',
      'For chin / jaw concerns: filler is the diagnostic step before implants. Test the change before it\'s permanent.',
      'Mark complete when you\'ve read the analysis and made a decision (which may be "not now").',
    ],
    crossLinks: [
      { href: '/plan/procedures', label: 'Open procedural-fit analysis' },
    ],
    startLabel: 'Open procedural-fit',
    inProgressNote: 'Procedural-fit surface open. Make a decision honestly.',
    completeLabel: 'I\'ve read the analysis',
  },
  framing: {
    subtitle: 'framing layer',
    title: 'Coordinate hair, beard, tanning, and glasses with the face you have.',
    intro:
      'Lifestyle floor is held and you don\'t have a primary structural lever to chase. Framing is the lever that\'s actually open — small adjustments to the layer around the face read as bigger changes than the same effort spent on the structure itself.',
    items: [
      'Hair length / cut: the cut should complement face shape. Check the hair plan if you haven\'t.',
      'Beard cadence / shape: if you have density, the right cadence is owned by the facial-hair plan.',
      'Tanning for contrast (POV 18): a modest, even tan increases facial contrast — cheekbones and jaw read sharper.',
      'Glasses: frame shape coordinates with face shape — if your frames fight the face, that\'s 10% of perceived structure right there.',
    ],
    crossLinks: [
      { href: '/plan/hair', label: 'Open hair plan' },
      { href: '/plan/facial-hair', label: 'Open facial-hair plan' },
      { href: '/plan/style', label: 'Open style plan' },
    ],
    startLabel: 'Start framing pass',
    inProgressNote: 'Framing pass running. Hit each surface above.',
    completeLabel: 'Framing layer is coordinated',
  },
};

// ============================================================
// Stage 3 — framing layer check
// ============================================================

export function FacialStructureStage3Card({
  primaryLever,
  stage2Completed,
  stage3Ack,
}: {
  primaryLever: PrimaryLever;
  stage2Completed: string | null;
  stage3Ack: string | null;
}) {
  const { pending, error, run } = useStageCall();
  if (!stage2Completed) return null;
  if (stage3Ack) return null;

  // If Stage 2 already WAS framing, Stage 3 is redundant — auto-ack at
  // the UI level by surfacing a simpler one-click confirmation rather
  // than re-listing the same cross-links.
  const wasFramingLever = primaryLever === 'framing';

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Stage 3 — framing layer check
      </p>
      <h2 className="mt-1 text-base font-medium text-zinc-900 dark:text-zinc-100">
        {wasFramingLever
          ? 'Framing was your primary lever — confirm it\'s held.'
          : 'Check the framing layer.'}
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        {wasFramingLever
          ? 'You did the framing work in Stage 2. Confirm hair / beard / tanning / glasses are still coordinated and mark this stage.'
          : 'Your primary lever was elsewhere, but the framing layer compounds whatever structural change you produced. Walk the cross-links once and confirm.'}
      </p>
      {!wasFramingLever && (
        <div className="mt-4 flex flex-wrap gap-2 text-[13px]">
          <Link
            href="/plan/hair"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Hair plan →
          </Link>
          <Link
            href="/plan/facial-hair"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Facial-hair plan →
          </Link>
          <Link
            href="/plan/style"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Style plan →
          </Link>
        </div>
      )}
      {error && (
        <p className="mt-3 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => run(3, 'ack')}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? 'Saving…' : 'Framing is coordinated'}
        </button>
      </div>
    </section>
  );
}

// ============================================================
// Stage 4 — Pattern D cosmetic shell deep-link
// ============================================================

export function FacialStructureStage4Card({
  stage4UnlockedAt,
  stage4Ack,
}: {
  stage4UnlockedAt: string | null;
  stage4Ack: string | null;
}) {
  const { pending, error, run } = useStageCall();
  if (!stage4UnlockedAt) return null;
  if (stage4Ack) return null;

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Stage 4 — cosmetic procedure path (optional)
      </p>
      <h2 className="mt-1 text-base font-medium text-zinc-900 dark:text-zinc-100">
        You said you&rsquo;re open to procedures. The lifestyle floor is held.
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        The procedural-fit analysis at <Link
          href="/plan/procedures"
          className="underline decoration-dotted underline-offset-2"
        >
          /plan/procedures
        </Link>{' '}
        ranks options for your specific variables — fit AND
        regret-risk, including the buccal fat removal warning if it
        applies. Filler is the diagnostic step before anything permanent.
        Bone smashing is not a route Cleanmaxxing supports under any
        framing.
      </p>
      <p className="mt-3 text-[13px] text-zinc-600 dark:text-zinc-400">
        Marking acknowledged tells us you&rsquo;ve read the analysis and
        understood the trade-offs — not that you&rsquo;ve done a procedure.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href="/plan/procedures"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-[13px] text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Open procedural-fit →
        </Link>
        <button
          type="button"
          onClick={() => run(4, 'ack')}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? 'Saving…' : 'I read the analysis'}
        </button>
      </div>
      {error && (
        <p className="mt-3 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}
