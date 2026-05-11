'use client';

// Style assessment form, v2 reframe (2026-05-09). Replaces the
// single coarse frame_estimate with five granular dimensions
// (shoulder width, build, arm length, leg length, skin undertone)
// per POV 12's Guzy + RMRS body-first hierarchy. The legacy
// frame_estimate is derived server-side from build + shoulder_width
// so downstream call sites unchanged.
//
// Aesthetic-feasibility hints surfaced inline under each target
// archetype option so users see the realistic feasibility floor
// before committing (per POV 12's per-archetype % framing).

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { CMSpinner } from '@/components/cm-logo';
import { useRouter } from 'next/navigation';
import {
  StreamingPlanPreview,
  consumeTextStream,
} from '@/components/streaming-plan-preview';
import {
  ARCHETYPE_FEASIBILITY_HINT,
  ARCHETYPE_HINT,
  ARCHETYPE_LABEL,
  ARM_LENGTH_LABEL,
  ARM_LENGTHS,
  BUILD_LABEL,
  BUILDS,
  CLOSET_STATE_LABEL,
  DRESS_CODE_CONTEXT_LABEL,
  DRESS_CODE_CONTEXTS,
  EYE_COLOR_LABEL,
  EYE_COLORS,
  FRAME_DENSITIES,
  FRAME_DENSITY_LABEL,
  LEG_LENGTH_LABEL,
  LEG_LENGTHS,
  SHOULDER_WIDTH_LABEL,
  SHOULDER_WIDTHS,
  SKIN_UNDERTONE_LABEL,
  SKIN_UNDERTONES,
  WRIST_SIZE_LABEL,
  WRIST_SIZES,
  type ArmLength,
  type Build,
  type ClosetState,
  type CurrentArchetype,
  type DressCodeContext,
  type EyeColor,
  type FrameDensity,
  type LegLength,
  type ShoulderWidth,
  type SkinUndertone,
  type StyleArchetype,
  type WristSize,
} from '@/lib/style/types';
import {
  FEASIBILITY_TIER_LABEL,
  type FeasibilityMap,
} from '@/lib/style/aesthetic-feasibility';

const TARGET_ARCHETYPES: StyleArchetype[] = [
  'clean_minimalist',
  'athletic_casual',
  'rugged_masculine',
  'mature_professional',
  'streetwear',
  'creative_eclectic',
];

const CURRENT_ARCHETYPES: CurrentArchetype[] = [
  ...TARGET_ARCHETYPES,
  'no_clear_archetype',
];

const CLOSET_STATES: ClosetState[] = [
  'well_curated',
  'functional',
  'outdated',
  'starting_from_scratch',
];

export type StyleAssessmentInitialValues = {
  // V2 granular fields. Nullable on pre-migration assessments — the
  // form requires them on next submit.
  shoulder_width: ShoulderWidth | null;
  arm_length: ArmLength | null;
  leg_length: LegLength | null;
  build: Build | null;
  frame_density: FrameDensity | null;
  skin_undertone: SkinUndertone | null;
  eye_color: EyeColor | null;
  wrist_size: WristSize | null;
  dress_code_context: DressCodeContext | null;
  current_archetype: CurrentArchetype;
  target_archetype: StyleArchetype;
  closet_state: ClosetState;
  style_goal_text: string | null;
};

export function StyleAssessmentForm({
  initialValues,
  feasibility,
  cancelHref,
}: {
  initialValues?: StyleAssessmentInitialValues;
  // Style v2 Phase 2b — per-user feasibility map computed server-side
  // from the user's body data + age. When the picked target archetype
  // is 'fights_your_frame', the form surfaces an inline warning with
  // the per-user rationale (not the static hint).
  feasibility?: FeasibilityMap;
  // When set (only on edit-flow with an existing report), renders a
  // "Cancel — keep current plan" link next to the submit button.
  cancelHref?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string | null>(null);

  const [shoulderWidth, setShoulderWidth] = useState<ShoulderWidth | null>(
    initialValues?.shoulder_width ?? null,
  );
  const [build, setBuild] = useState<Build | null>(initialValues?.build ?? null);
  const [frameDensity, setFrameDensity] = useState<FrameDensity | null>(
    initialValues?.frame_density ?? null,
  );
  const [armLength, setArmLength] = useState<ArmLength | null>(
    initialValues?.arm_length ?? null,
  );
  const [legLength, setLegLength] = useState<LegLength | null>(
    initialValues?.leg_length ?? null,
  );
  const [skinUndertone, setSkinUndertone] = useState<SkinUndertone | null>(
    initialValues?.skin_undertone ?? null,
  );
  const [eyeColor, setEyeColor] = useState<EyeColor | null>(
    initialValues?.eye_color ?? null,
  );
  const [wristSize, setWristSize] = useState<WristSize | null>(
    initialValues?.wrist_size ?? null,
  );
  const [dressCodeContext, setDressCodeContext] =
    useState<DressCodeContext | null>(
      initialValues?.dress_code_context ?? null,
    );
  const [currentArchetype, setCurrentArchetype] =
    useState<CurrentArchetype | null>(
      initialValues?.current_archetype ?? null,
    );
  const [targetArchetype, setTargetArchetype] =
    useState<StyleArchetype | null>(initialValues?.target_archetype ?? null);
  const [closetState, setClosetState] = useState<ClosetState | null>(
    initialValues?.closet_state ?? null,
  );
  const [goalText, setGoalText] = useState(
    initialValues?.style_goal_text ?? '',
  );

  const isEditing = initialValues !== undefined;

  function submit() {
    setError(null);
    if (!shoulderWidth) return setError('Pick a shoulder width.');
    if (!build) return setError('Pick a build.');
    if (!frameDensity) return setError('Pick a frame density.');
    if (!armLength) return setError('Pick an arm length.');
    if (!legLength) return setError('Pick a leg length.');
    if (!skinUndertone) return setError('Pick a skin undertone.');
    if (!eyeColor) return setError('Pick an eye color.');
    if (!wristSize) return setError('Pick a wrist size.');
    if (!dressCodeContext) return setError('Pick a dress code.');
    if (!currentArchetype) return setError('Pick a current archetype.');
    if (!targetArchetype) return setError('Pick a target archetype.');
    if (!closetState) return setError('Pick your closet state.');

    const payload = {
      shoulder_width: shoulderWidth,
      build,
      frame_density: frameDensity,
      arm_length: armLength,
      leg_length: legLength,
      skin_undertone: skinUndertone,
      eye_color: eyeColor,
      wrist_size: wristSize,
      dress_code_context: dressCodeContext,
      current_archetype: currentArchetype,
      target_archetype: targetArchetype,
      closet_state: closetState,
      style_goal_text: goalText.trim() || null,
    };

    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/style/assessment', {
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
        router.push('/plan/style');
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
        title="Shoulder width — relative to your waist"
        helper="The primary silhouette driver. Honest read: stand in a mirror in a fitted tee and read the shape, not what you wish you saw."
      >
        <div className="space-y-2">
          {SHOULDER_WIDTHS.map((s) => (
            <RadioRow
              key={s}
              checked={shoulderWidth === s}
              onChange={() => setShoulderWidth(s)}
              disabled={pending}
              label={SHOULDER_WIDTH_LABEL[s]}
              name="shoulder_width"
            />
          ))}
        </div>
      </Question>

      <Question
        number={2}
        title="Build"
        helper="Distinct from shoulder width — this is body composition + frame size taken together. Stocky is broader-and-shorter; muscular-and-tall is athletic."
      >
        <div className="space-y-2">
          {BUILDS.map((b) => (
            <RadioRow
              key={b}
              checked={build === b}
              onChange={() => setBuild(b)}
              disabled={pending}
              label={BUILD_LABEL[b]}
              name="build"
            />
          ))}
        </div>
      </Question>

      <Question
        number={3}
        title="How does your weight read?"
        helper="Orthogonal to build — this is whether your current weight reads as muscle, lean lines, or a soft layer. Two athletic builds can look very different depending on this: one is V-tapered and sharp, the other is athletic with a softer cover."
      >
        <div className="space-y-2">
          {FRAME_DENSITIES.map((d) => (
            <RadioRow
              key={d}
              checked={frameDensity === d}
              onChange={() => setFrameDensity(d)}
              disabled={pending}
              label={FRAME_DENSITY_LABEL[d]}
              name="frame_density"
            />
          ))}
        </div>
      </Question>

      <Question
        number={4}
        title="Arm length — relative to torso"
        helper="Drives sleeve and cuff visibility rules. Honest read: when arms hang relaxed, where do off-the-rack sleeves usually land?"
      >
        <div className="space-y-2">
          {ARM_LENGTHS.map((a) => (
            <RadioRow
              key={a}
              checked={armLength === a}
              onChange={() => setArmLength(a)}
              disabled={pending}
              label={ARM_LENGTH_LABEL[a]}
              name="arm_length"
            />
          ))}
        </div>
      </Question>

      <Question
        number={5}
        title="Leg length — relative to torso"
        helper="The single highest-leverage proportion lever. Long-torso/short-legs benefits massively from high-rise trousers; short-torso/long-legs runs different rules."
      >
        <div className="space-y-2">
          {LEG_LENGTHS.map((l) => (
            <RadioRow
              key={l}
              checked={legLength === l}
              onChange={() => setLegLength(l)}
              disabled={pending}
              label={LEG_LENGTH_LABEL[l]}
              name="leg_length"
            />
          ))}
        </div>
      </Question>

      <Question
        number={6}
        title="Skin undertone — the jewelry test"
        helper="Look at silver/platinum vs. gold jewelry held against your wrist or jawline. One usually flatters more than the other. If both look fine, you’re neutral."
      >
        <div className="space-y-2">
          {SKIN_UNDERTONES.map((u) => (
            <RadioRow
              key={u}
              checked={skinUndertone === u}
              onChange={() => setSkinUndertone(u)}
              disabled={pending}
              label={SKIN_UNDERTONE_LABEL[u]}
              name="skin_undertone"
            />
          ))}
        </div>
      </Question>

      <Question
        number={7}
        title="Eye color"
        helper="Look at your eyes in natural daylight (not under warm indoor light, which shifts the read). The clearest signal you have for color direction — works regardless of hair, beard, or skin undertone."
      >
        <div className="space-y-2">
          {EYE_COLORS.map((c) => (
            <RadioRow
              key={c}
              checked={eyeColor === c}
              onChange={() => setEyeColor(c)}
              disabled={pending}
              label={EYE_COLOR_LABEL[c]}
              name="eye_color"
            />
          ))}
        </div>
      </Question>

      <Question
        number={8}
        title="Wrist size"
        helper="The honest read so Mister P sizes watch recs to your frame. Use a flexible tape if you have one — under 6.75 in / 17 cm is small, 6.75–7.5 in is average, over 7.5 in is large. Eyeball it if you don't."
      >
        <div className="space-y-2">
          {WRIST_SIZES.map((w) => (
            <RadioRow
              key={w}
              checked={wristSize === w}
              onChange={() => setWristSize(w)}
              disabled={pending}
              label={WRIST_SIZE_LABEL[w]}
              name="wrist_size"
            />
          ))}
        </div>
      </Question>

      <Question
        number={9}
        title="Where do your clothes mostly need to land?"
        helper="The work environment your wardrobe actually serves. Two clean-minimalists in finance vs. WFH need different shoes / outerwear / shirts — this is the axis the report uses to bias formality. Pick the one closest to your weekly average."
      >
        <div className="space-y-2">
          {DRESS_CODE_CONTEXTS.map((d) => (
            <RadioRow
              key={d}
              checked={dressCodeContext === d}
              onChange={() => setDressCodeContext(d)}
              disabled={pending}
              label={DRESS_CODE_CONTEXT_LABEL[d]}
              name="dress_code_context"
            />
          ))}
        </div>
      </Question>

      <Question
        number={10}
        title="What are you dressing as today?"
        helper="The honest current read — what your wardrobe actually looks like, not what you'd like it to be. 'No clear archetype yet' is a fine answer."
      >
        <div className="space-y-2">
          {CURRENT_ARCHETYPES.map((a) => (
            <RadioRow
              key={a}
              checked={currentArchetype === a}
              onChange={() => setCurrentArchetype(a)}
              disabled={pending}
              label={ARCHETYPE_LABEL[a]}
              hint={ARCHETYPE_HINT[a]}
              name="current_archetype"
            />
          ))}
        </div>
      </Question>

      <Question
        number={11}
        title="What are you moving toward?"
        helper="Pick the one closest to who you want to look like in a year. Each option is tagged with the honest per-user read — strong fit, workable, or fights your frame — based on the body data you just entered. Not a hard gate, but worth weighing before you commit."
      >
        <div className="space-y-2">
          {TARGET_ARCHETYPES.map((a) => {
            const fr = feasibility?.[a];
            return (
              <ArchetypeRow
                key={a}
                checked={targetArchetype === a}
                onChange={() => setTargetArchetype(a)}
                disabled={pending}
                label={ARCHETYPE_LABEL[a]}
                feasibilityTier={fr?.tier ?? null}
                feasibilityRationale={fr?.rationale ?? ARCHETYPE_FEASIBILITY_HINT[a]}
              />
            );
          })}
        </div>
        {targetArchetype &&
          feasibility?.[targetArchetype]?.tier === 'fights_your_frame' && (
            <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-[13px] leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
              <span className="font-semibold">Heads up — this fights your frame.</span>{' '}
              {feasibility[targetArchetype].rationale} You can still pick it; the plan will lean into the moves that make it workable on your body, but expect more friction than a stronger-fit choice.
            </div>
          )}
      </Question>

      <Question
        number={12}
        title="What's the state of your closet?"
        helper="Drives whether the plan focuses on auditing what you have or building from scratch."
      >
        <div className="space-y-2">
          {CLOSET_STATES.map((c) => (
            <RadioRow
              key={c}
              checked={closetState === c}
              onChange={() => setClosetState(c)}
              disabled={pending}
              label={CLOSET_STATE_LABEL[c]}
              name="closet_state"
            />
          ))}
        </div>
      </Question>

      <Question
        number={13}
        title="Anything you want Mister P to know? (optional)"
        helper="One line. Specific situation, a stuck point, a budget reality."
      >
        <input
          type="text"
          value={goalText}
          onChange={(e) => setGoalText(e.target.value)}
          disabled={pending}
          maxLength={280}
          placeholder="e.g. work is hybrid, I want one outfit that covers both"
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
              : 'Get my style plan'}
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

// Archetype option row — RadioRow + per-user feasibility badge and
// rationale. Used only on Q7. The tier badge is colored: strong_fit
// reads green, workable reads neutral, fights_your_frame reads amber
// to flag the friction without blocking the choice.
function ArchetypeRow({
  checked,
  onChange,
  disabled,
  label,
  feasibilityTier,
  feasibilityRationale,
}: {
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
  label: string;
  feasibilityTier:
    | 'strong_fit'
    | 'workable'
    | 'fights_your_frame'
    | null;
  feasibilityRationale: string;
}) {
  const tierBadgeClass =
    feasibilityTier === 'strong_fit'
      ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200'
      : feasibilityTier === 'fights_your_frame'
        ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
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
        name="target_archetype"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700"
      />
      <span className="flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm text-zinc-900 dark:text-zinc-100">
            {label}
          </span>
          {feasibilityTier && (
            <span
              className={
                'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ' +
                tierBadgeClass
              }
            >
              {FEASIBILITY_TIER_LABEL[feasibilityTier]}
            </span>
          )}
        </span>
        <span className="mt-1 block text-[12px] leading-snug text-zinc-500 dark:text-zinc-400">
          {feasibilityRationale}
        </span>
      </span>
    </label>
  );
}

function RadioRow({
  checked,
  onChange,
  disabled,
  label,
  hint,
  name,
}: {
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
  label: string;
  hint?: string;
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
        {hint && (
          <span className="mt-0.5 block text-[12px] leading-snug text-zinc-500 dark:text-zinc-400">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}
