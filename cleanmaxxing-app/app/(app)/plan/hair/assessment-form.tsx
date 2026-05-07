'use client';

// Hair assessment form. Four questions on one page (face shape, density
// state, hair type, current routine + optional goal text). Submitting
// POSTs to /api/plan/hair/assessment and waits for the report to
// generate (synchronous, ~3-6s). On success we router.push('/plan/hair')
// — using push rather than refresh so an ?edit=1 param drops out of the
// URL once the new report is live.
//
// initialValues lets the page hydrate the form from a saved assessment
// (edit mode + retry-after-failure). Both flows reuse the same upsert
// endpoint — submitting unchanged values regenerates the report; changed
// values overwrite the assessment row first. One feature, two reasons.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  DENSITY_STATE_LABEL,
  FACE_SHAPE_HINT,
  FACE_SHAPE_LABEL,
  HAIR_TYPE_DENSITY_LABEL,
  HAIR_TYPE_PATTERN_LABEL,
  HAIR_TYPE_STRAND_LABEL,
  WHO_CUTS_LABEL,
  type CurrentRoutine,
  type DensityState,
  type FaceShape,
  type HairTypeDensity,
  type HairTypePattern,
  type HairTypeStrand,
  type WhoCuts,
} from '@/lib/hair/types';

export type HairAssessmentInitialValues = {
  face_shape: FaceShape;
  density_state: DensityState;
  hair_type_strand: HairTypeStrand;
  hair_type_pattern: HairTypePattern;
  hair_type_density: HairTypeDensity;
  current_routine: CurrentRoutine;
  hair_goal_text: string | null;
};

const FACE_SHAPES: FaceShape[] = [
  'oval',
  'round',
  'square',
  'long_rectangular',
  'heart_triangle',
];

const DENSITY_STATES: DensityState[] = [
  'full',
  'mature_hairline',
  'receding_hairline',
  'crown_thinning',
  'diffuse_thinning',
  'advanced_thinning',
  'shaved_or_buzzed',
];

const STRANDS: HairTypeStrand[] = ['fine', 'medium', 'thick_coarse'];
const PATTERNS: HairTypePattern[] = ['straight', 'wavy', 'curly', 'coily'];
const DENSITIES: HairTypeDensity[] = ['low', 'medium', 'high'];
const WHO_CUTS_OPTIONS: WhoCuts[] = ['self', 'chain', 'dedicated_barber'];

export function HairAssessmentForm({
  initialValues,
  hasBaselinePhoto = false,
}: {
  initialValues?: HairAssessmentInitialValues;
  /** When true, the face shape question shows a "Use my photo to detect"
   *  button that classifies the user's baseline photo via the LLM and
   *  pre-fills the radio. Manual selection still works either way. */
  hasBaselinePhoto?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Face shape auto-detection state. detecting = LLM call in flight.
  // detectedNote = the message to show under the radios after a
  // successful detection (or refusal). Cleared if the user manually
  // picks a different face shape.
  const [detecting, setDetecting] = useState(false);
  const [detectedNote, setDetectedNote] = useState<string | null>(null);
  const [detectedShape, setDetectedShape] = useState<FaceShape | null>(null);

  // Q1
  const [faceShape, setFaceShape] = useState<FaceShape | null>(
    initialValues?.face_shape ?? null,
  );

  function pickFaceShape(s: FaceShape) {
    setFaceShape(s);
    // If the user changes their pick away from what was auto-detected,
    // clear the detection note so the surface doesn't keep claiming
    // "Mister P picked X" when they overrode it.
    if (detectedShape && s !== detectedShape) {
      setDetectedNote(null);
      setDetectedShape(null);
    }
  }

  async function detectFromPhoto() {
    setDetecting(true);
    setDetectedNote(null);
    setDetectedShape(null);
    try {
      const res = await fetch('/api/plan/hair/detect-face-shape', {
        method: 'POST',
      });
      const body = (await res.json()) as
        | {
            face_shape: FaceShape | null;
            reasoning: string;
            refused: boolean;
            refusal_reason: string | null;
          }
        | { error: string; message?: string };
      if (!res.ok) {
        const err = body as { error: string; message?: string };
        if (err.error === 'no_baseline_photo') {
          setDetectedNote(
            err.message ??
              'No baseline photo on file. Capture one at /photos first.',
          );
        } else {
          setDetectedNote(
            err.message ?? 'Detection failed. Pick manually below.',
          );
        }
        return;
      }
      const ok = body as {
        face_shape: FaceShape | null;
        reasoning: string;
        refused: boolean;
        refusal_reason: string | null;
      };
      if (ok.refused || !ok.face_shape) {
        setDetectedNote(
          `Mister P couldn’t make a confident call: ${ok.refusal_reason ?? 'unclear photo'}. Pick manually below.`,
        );
        return;
      }
      setFaceShape(ok.face_shape);
      setDetectedShape(ok.face_shape);
      setDetectedNote(`Mister P picked this from your photo. ${ok.reasoning} Override below if it’s wrong.`);
    } catch (err) {
      setDetectedNote(
        `Network error: ${(err as Error).message}. Pick manually below.`,
      );
    } finally {
      setDetecting(false);
    }
  }
  // Q2
  const [densityState, setDensityState] = useState<DensityState | null>(
    initialValues?.density_state ?? null,
  );
  // Q3
  const [strand, setStrand] = useState<HairTypeStrand | null>(
    initialValues?.hair_type_strand ?? null,
  );
  const [pattern, setPattern] = useState<HairTypePattern | null>(
    initialValues?.hair_type_pattern ?? null,
  );
  const [density, setDensity] = useState<HairTypeDensity | null>(
    initialValues?.hair_type_density ?? null,
  );
  // Q4
  const [cutCadenceWeeks, setCutCadenceWeeks] = useState(
    initialValues?.current_routine.cut_cadence_weeks != null
      ? String(initialValues.current_routine.cut_cadence_weeks)
      : '',
  );
  const [productsUsed, setProductsUsed] = useState(
    initialValues?.current_routine.products_used ?? '',
  );
  const [usesBlowDry, setUsesBlowDry] = useState(
    initialValues?.current_routine.uses_blow_dry ?? false,
  );
  const [whoCuts, setWhoCuts] = useState<WhoCuts | null>(
    initialValues?.current_routine.who_cuts ?? null,
  );
  // Optional free text
  const [goalText, setGoalText] = useState(
    initialValues?.hair_goal_text ?? '',
  );

  const isEditing = initialValues !== undefined;

  function submit() {
    setError(null);

    if (!faceShape) return setError('Pick a face shape.');
    if (!densityState) return setError('Pick a density state.');
    if (!strand) return setError('Pick a strand thickness.');
    if (!pattern) return setError('Pick a hair pattern.');
    if (!density) return setError('Pick how dense your hair is on your head.');

    const cadenceNum = cutCadenceWeeks.trim() ? Number(cutCadenceWeeks) : null;
    if (
      cadenceNum !== null &&
      (!Number.isFinite(cadenceNum) || cadenceNum < 1 || cadenceNum > 52)
    ) {
      return setError('Cut cadence should be between 1 and 52 weeks.');
    }

    const payload = {
      face_shape: faceShape,
      density_state: densityState,
      hair_type_strand: strand,
      hair_type_pattern: pattern,
      hair_type_density: density,
      current_routine: {
        cut_cadence_weeks: cadenceNum,
        products_used: productsUsed.trim() || null,
        uses_blow_dry: usesBlowDry,
        who_cuts: whoCuts,
      },
      hair_goal_text: goalText.trim() || null,
    };

    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/hair/assessment', {
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
        // Push (not refresh) so the ?edit=1 query param drops out of the
        // URL once the regenerated report is live.
        router.push('/plan/hair');
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="space-y-10">
      <Question
        number={1}
        title="What's the closest match for your face shape?"
        helper="Look straight on, even light, hair ignored. Pick the closest match — not the perfect one."
      >
        {hasBaselinePhoto && (
          <div className="mb-4 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
            <button
              type="button"
              onClick={detectFromPhoto}
              disabled={detecting || pending}
              className="text-sm font-medium text-zinc-900 underline decoration-dotted underline-offset-2 disabled:opacity-50 dark:text-zinc-100"
            >
              {detecting
                ? 'Mister P is reading your photo…'
                : 'Use my baseline photo to auto-detect →'}
            </button>
            {detectedNote && (
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                {detectedNote}
              </p>
            )}
          </div>
        )}
        <div className="space-y-2">
          {FACE_SHAPES.map((s) => (
            <RadioRow
              key={s}
              checked={faceShape === s}
              onChange={() => pickFaceShape(s)}
              disabled={pending || detecting}
              label={FACE_SHAPE_LABEL[s]}
              hint={FACE_SHAPE_HINT[s]}
              name="face_shape"
              imageBase={`/images/face-shapes/${s}`}
            />
          ))}
        </div>
      </Question>

      <Question
        number={2}
        title="How does your hair density and hairline read in normal indoor light?"
        helper="Not the bathroom mirror with the overhead light frying the top of your head — that lies."
      >
        <div className="space-y-2">
          {DENSITY_STATES.map((s) => (
            <RadioRow
              key={s}
              checked={densityState === s}
              onChange={() => setDensityState(s)}
              disabled={pending}
              label={DENSITY_STATE_LABEL[s]}
              name="density_state"
            />
          ))}
        </div>
      </Question>

      <Question
        number={3}
        title="What's your hair type?"
        helper="Three picks. Strand thickness is about each strand. Density is about how many hairs are on your head. You can have fine dense hair, thick low-density hair, or anything in between."
      >
        <div className="space-y-5">
          <SubGroup label="Strand thickness">
            {STRANDS.map((s) => (
              <RadioRow
                key={s}
                checked={strand === s}
                onChange={() => setStrand(s)}
                disabled={pending}
                label={HAIR_TYPE_STRAND_LABEL[s]}
                name="hair_type_strand"
              />
            ))}
          </SubGroup>
          <SubGroup label="Pattern">
            {PATTERNS.map((p) => (
              <RadioRow
                key={p}
                checked={pattern === p}
                onChange={() => setPattern(p)}
                disabled={pending}
                label={HAIR_TYPE_PATTERN_LABEL[p]}
                name="hair_type_pattern"
              />
            ))}
          </SubGroup>
          <SubGroup label="How dense is the hair on your head">
            {DENSITIES.map((d) => (
              <RadioRow
                key={d}
                checked={density === d}
                onChange={() => setDensity(d)}
                disabled={pending}
                label={HAIR_TYPE_DENSITY_LABEL[d]}
                name="hair_type_density"
              />
            ))}
          </SubGroup>
        </div>
      </Question>

      <Question
        number={4}
        title="What's your current routine?"
        helper="Skip what doesn't apply."
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="cut-cadence"
              className="block text-xs text-zinc-600 dark:text-zinc-400"
            >
              Cut cadence (weeks between cuts)
            </label>
            <input
              id="cut-cadence"
              type="number"
              min={1}
              max={52}
              value={cutCadenceWeeks}
              onChange={(e) => setCutCadenceWeeks(e.target.value)}
              disabled={pending}
              placeholder="e.g. 4"
              className="mt-1.5 w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          <div>
            <label
              htmlFor="products-used"
              className="block text-xs text-zinc-600 dark:text-zinc-400"
            >
              Products you currently use (optional)
            </label>
            <input
              id="products-used"
              type="text"
              value={productsUsed}
              onChange={(e) => setProductsUsed(e.target.value)}
              disabled={pending}
              maxLength={500}
              placeholder="e.g. clay, light pomade, nothing"
              className="mt-1.5 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="uses-blow-dry"
              type="checkbox"
              checked={usesBlowDry}
              onChange={(e) => setUsesBlowDry(e.target.checked)}
              disabled={pending}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <label
              htmlFor="uses-blow-dry"
              className="text-sm text-zinc-700 dark:text-zinc-300"
            >
              I blow dry
            </label>
          </div>

          <div>
            <span className="block text-xs text-zinc-600 dark:text-zinc-400">
              Who cuts your hair?
            </span>
            <div className="mt-2 space-y-2">
              {WHO_CUTS_OPTIONS.map((w) => (
                <RadioRow
                  key={w}
                  checked={whoCuts === w}
                  onChange={() => setWhoCuts(w)}
                  disabled={pending}
                  label={WHO_CUTS_LABEL[w]}
                  name="who_cuts"
                />
              ))}
            </div>
          </div>
        </div>
      </Question>

      <Question
        number={5}
        title="Anything you want Mister P to know? (optional)"
        helper="One line. What you want from your hair, what you've tried, what's not working."
      >
        <input
          type="text"
          value={goalText}
          onChange={(e) => setGoalText(e.target.value)}
          disabled={pending}
          maxLength={280}
          placeholder="e.g. I want professional but not corporate"
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
              : 'Get my hair plan'}
        </button>
        {pending && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Takes about five seconds.
          </span>
        )}
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

function SubGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="block text-xs text-zinc-600 dark:text-zinc-400">
        {label}
      </span>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

function RadioRow({
  checked,
  onChange,
  disabled,
  label,
  hint,
  name,
  imageBase,
}: {
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
  label: string;
  hint?: string;
  name: string;
  // Path prefix without extension. The component tries .png → .jpg →
  // .webp via successive onError swaps. If none of them load, the
  // image vanishes and the row falls back to text-only — that's the
  // intended degraded state when reference assets aren't shipped yet.
  imageBase?: string;
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
      {imageBase && <FallbackImage base={imageBase} alt={label} />}
      <span className="flex-1">
        <span className="block text-sm text-zinc-900 dark:text-zinc-100">
          {label}
        </span>
        {hint && (
          <span className="mt-0.5 block text-[12px] text-zinc-500 dark:text-zinc-400">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}

// Tries the three common image extensions in order. Hides itself
// gracefully when none load — the surrounding row stays usable as
// text-only. Used so reference assets can be dropped in incrementally
// without the UI breaking when only some are present.
function FallbackImage({ base, alt }: { base: string; alt: string }) {
  const [extIndex, setExtIndex] = useState(0);
  const [hidden, setHidden] = useState(false);
  const exts = ['.png', '.jpg', '.webp'];
  if (hidden) return null;
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={`${base}${exts[extIndex]}`}
      alt={alt}
      onError={() => {
        if (extIndex < exts.length - 1) setExtIndex(extIndex + 1);
        else setHidden(true);
      }}
      className="h-40 w-40 shrink-0 rounded object-cover"
    />
  );
}
