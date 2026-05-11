'use client';

// Facial structure assessment form. 6 questions, Pattern A v0 shape.
// Q3 (postural_pattern) is multi-select with a "none / unsure" pair
// of mutual-exclusion semantics — picking 'none_apparent' clears the
// others; picking any cluster value clears 'none_apparent' / 'unsure'.

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CMSpinner } from '@/components/cm-logo';
import {
  StreamingPlanPreview,
  consumeTextStream,
} from '@/components/streaming-plan-preview';
import {
  BODY_FAT_LABEL,
  CHIN_JAW_CONCERN_LABEL,
  COSMETIC_PROCEDURE_OPENNESS_LABEL,
  FACE_FIRST_DISTRIBUTION_LABEL,
  FACIAL_PUFF_BASELINE_LABEL,
  POSTURAL_PATTERN_LABEL,
  type ChinJawConcern,
  type CosmeticProcedureOpenness,
  type FaceFirstDistribution,
  type FacialPuffBaseline,
  type FacialStructureBodyFat,
  type PosturalPattern,
} from '@/lib/facial-structure/types';

const BODY_FATS: FacialStructureBodyFat[] = [
  'under_12',
  '12_to_15',
  '15_to_20',
  '20_to_25',
  'over_25',
];

const DISTRIBUTIONS: FaceFirstDistribution[] = [
  'face_sharper_than_body',
  'face_matches_body',
  'face_softer_than_body',
  'not_sure',
];

const POSTURAL: PosturalPattern[] = [
  'forward_head',
  'rounded_shoulders',
  'anterior_pelvic_tilt',
  'none_apparent',
  'unsure',
];

const CONCERNS: ChinJawConcern[] = [
  'chin_projection_side',
  'jaw_definition_front',
  'chin_neck_transition',
  'submental_fullness',
  'overall_softness',
  'no_specific_concern',
];

const PUFFS: FacialPuffBaseline[] = [
  'rarely',
  'few_days_per_month',
  'most_mornings',
  'persistent',
];

const OPENNESS: CosmeticProcedureOpenness[] = [
  'not_open',
  'curious_about_options',
  'actively_considering',
  'already_done',
];

export type FacialStructureAssessmentInitialValues = {
  body_fat_estimate: FacialStructureBodyFat;
  face_first_distribution: FaceFirstDistribution;
  postural_pattern: PosturalPattern[];
  chin_jaw_concern: ChinJawConcern[];
  facial_puff_baseline: FacialPuffBaseline;
  cosmetic_procedure_openness: CosmeticProcedureOpenness;
  notes: string | null;
};

export function FacialStructureAssessmentForm({
  initialValues,
  cancelHref,
}: {
  initialValues?: FacialStructureAssessmentInitialValues;
  cancelHref?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string | null>(null);

  const [bodyFat, setBodyFat] = useState<FacialStructureBodyFat | null>(
    initialValues?.body_fat_estimate ?? null,
  );
  const [distribution, setDistribution] =
    useState<FaceFirstDistribution | null>(
      initialValues?.face_first_distribution ?? null,
    );
  const [postural, setPostural] = useState<PosturalPattern[]>(
    initialValues?.postural_pattern ?? [],
  );
  const [concern, setConcern] = useState<ChinJawConcern[]>(
    initialValues?.chin_jaw_concern ?? [],
  );
  const [puff, setPuff] = useState<FacialPuffBaseline | null>(
    initialValues?.facial_puff_baseline ?? null,
  );
  const [openness, setOpenness] = useState<CosmeticProcedureOpenness | null>(
    initialValues?.cosmetic_procedure_openness ?? null,
  );
  const [notes, setNotes] = useState(initialValues?.notes ?? '');

  const isEditing = initialValues !== undefined;

  function toggleConcern(value: ChinJawConcern) {
    setConcern((prev) => {
      const has = prev.includes(value);
      // 'no_specific_concern' is mutually exclusive with everything else
      // (same pattern as postural_pattern's 'none_apparent' / 'unsure').
      // Picking it clears all other concerns; picking any specific
      // concern clears 'no_specific_concern'.
      if (value === 'no_specific_concern') {
        return has ? [] : [value];
      }
      const filtered = prev.filter((c) => c !== 'no_specific_concern');
      return has
        ? filtered.filter((c) => c !== value)
        : [...filtered, value];
    });
  }

  function togglePostural(value: PosturalPattern) {
    setPostural((prev) => {
      const has = prev.includes(value);
      // 'none_apparent' and 'unsure' are mutually exclusive with the
      // specific cluster values — picking one of them clears the
      // pattern set to just that one; picking a specific pattern clears
      // 'none_apparent' / 'unsure'.
      if (value === 'none_apparent' || value === 'unsure') {
        return has ? prev.filter((p) => p !== value) : [value];
      }
      const filtered = prev.filter(
        (p) => p !== 'none_apparent' && p !== 'unsure',
      );
      return has ? filtered.filter((p) => p !== value) : [...filtered, value];
    });
  }

  function submit() {
    setError(null);
    if (!bodyFat) return setError('Pick a body-fat estimate.');
    if (!distribution) return setError('Pick a distribution.');
    if (postural.length === 0) return setError('Pick at least one option for posture.');
    if (concern.length === 0) return setError('Pick at least one chin/jaw concern.');
    if (!puff) return setError('Pick your facial puff baseline.');
    if (!openness) return setError('Pick your cosmetic procedure openness.');

    const payload = {
      body_fat_estimate: bodyFat,
      face_first_distribution: distribution,
      postural_pattern: postural,
      chin_jaw_concern: concern,
      facial_puff_baseline: puff,
      cosmetic_procedure_openness: openness,
      notes: notes.trim() || null,
    };

    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/facial-structure/assessment', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? `Save failed (${res.status})`);
        }
        await consumeTextStream(res, setStreamingText);
        router.push('/plan/facial-structure');
        router.refresh();
      } catch (err) {
        setStreamingText(null);
        setError((err as Error).message);
      }
    });
  }

  if (streamingText !== null) {
    return <StreamingPlanPreview text={streamingText} />;
  }

  return (
    <div className="space-y-10">
      <Question
        number={1}
        title="Where is your body fat right now?"
        helper="Best honest estimate. The optimal facial-definition band for most men is 10–15% — over 20% and the face is downstream of the cut."
      >
        <div className="space-y-2">
          {BODY_FATS.map((b) => (
            <RadioRow
              key={b}
              checked={bodyFat === b}
              onChange={() => setBodyFat(b)}
              disabled={pending}
              label={BODY_FAT_LABEL[b]}
              name="body_fat"
            />
          ))}
        </div>
      </Question>

      <Question
        number={2}
        title="Face-first or body-first?"
        helper="The self-test that calibrates your personal BF target. Some people get a sharp face at higher BF; others have to push leaner before the face follows."
      >
        <div className="space-y-2">
          {DISTRIBUTIONS.map((d) => (
            <RadioRow
              key={d}
              checked={distribution === d}
              onChange={() => setDistribution(d)}
              disabled={pending}
              label={FACE_FIRST_DISTRIBUTION_LABEL[d]}
              name="distribution"
            />
          ))}
        </div>
      </Question>

      <Question
        number={3}
        title="What's your posture doing?"
        helper="Multi-select. Forward head specifically compresses the chin-to-neck line by ~1 inch. None or unsure clear the others."
      >
        <div className="space-y-2">
          {POSTURAL.map((p) => (
            <CheckRow
              key={p}
              checked={postural.includes(p)}
              onChange={() => togglePostural(p)}
              disabled={pending}
              label={POSTURAL_PATTERN_LABEL[p]}
            />
          ))}
        </div>
      </Question>

      <Question
        number={4}
        title="Where is the structural concern?"
        helper="Multi-select. Chin vs jaw is a system. Side profile is chin; front-on is jaw line. Submental fullness is the under-chin area. No specific concern clears the others."
      >
        <div className="space-y-2">
          {CONCERNS.map((c) => (
            <CheckRow
              key={c}
              checked={concern.includes(c)}
              onChange={() => toggleConcern(c)}
              disabled={pending}
              label={CHIN_JAW_CONCERN_LABEL[c]}
            />
          ))}
        </div>
      </Question>

      <Question
        number={5}
        title="How often does your face puff?"
        helper="Persistent morning puff in an otherwise-lean person is almost always upstream — sleep, alcohol, sodium — not structural."
      >
        <div className="space-y-2">
          {PUFFS.map((p) => (
            <RadioRow
              key={p}
              checked={puff === p}
              onChange={() => setPuff(p)}
              disabled={pending}
              label={FACIAL_PUFF_BASELINE_LABEL[p]}
              name="puff"
            />
          ))}
        </div>
      </Question>

      <Question
        number={6}
        title="Cosmetic procedures — where are you?"
        helper="Gates whether the report names procedures. Honest read; nothing is recommended either way until the lifestyle floor is held."
      >
        <div className="space-y-2">
          {OPENNESS.map((o) => (
            <RadioRow
              key={o}
              checked={openness === o}
              onChange={() => setOpenness(o)}
              disabled={pending}
              label={COSMETIC_PROCEDURE_OPENNESS_LABEL[o]}
              name="openness"
            />
          ))}
        </div>
      </Question>

      <Question
        number={7}
        title="Anything you want Mister P to know? (optional)"
        helper="One line. A specific situation, a constraint, a pattern."
      >
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={pending}
          maxLength={280}
          placeholder="e.g. always had a soft jaw line even when I cut"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Question>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex items-center gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending
            ? 'Mister P is writing your plan…'
            : isEditing
              ? 'Save changes and re-generate'
              : 'Get my facial structure plan'}
        </button>
        {cancelHref && !pending && (
          <Link
            href={cancelHref}
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Cancel — keep current plan
          </Link>
        )}
        {pending && <CMSpinner label="Takes about fifteen seconds." />}
      </div>
    </div>
  );
}

function Question({
  number,
  title,
  helper,
  children,
}: {
  number: number;
  title: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        <span className="mr-2 text-zinc-400">{number}.</span>
        {title}
      </h2>
      {helper && (
        <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          {helper}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function RadioRow({
  checked,
  onChange,
  disabled,
  label,
  name,
}: {
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
  label: string;
  name: string;
}) {
  return (
    <label
      className={
        checked
          ? 'flex cursor-pointer items-start gap-3 rounded-md border border-zinc-900 bg-zinc-50 px-3 py-2 dark:border-zinc-100 dark:bg-zinc-800'
          : 'flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 px-3 py-2 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900'
      }
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700"
      />
      <span className="flex-1">
        <span className="block text-sm text-zinc-900 dark:text-zinc-100">
          {label}
        </span>
      </span>
    </label>
  );
}

function CheckRow({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <label
      className={
        checked
          ? 'flex cursor-pointer items-start gap-3 rounded-md border border-zinc-900 bg-zinc-50 px-3 py-2 dark:border-zinc-100 dark:bg-zinc-800'
          : 'flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 px-3 py-2 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900'
      }
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700"
      />
      <span className="flex-1">
        <span className="block text-sm text-zinc-900 dark:text-zinc-100">
          {label}
        </span>
      </span>
    </label>
  );
}
