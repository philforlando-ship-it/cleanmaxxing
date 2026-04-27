'use client';

import { useState, useTransition } from 'react';
import {
  INTERVENTIONS,
  type UserProfile,
  type Intervention,
  type HairStatus,
  type BudgetTier,
  type RelationshipStatus,
} from '@/lib/profile/service';

type Props = {
  initial: UserProfile;
};

const HAIR_OPTIONS: Array<{ value: HairStatus; label: string }> = [
  { value: 'full', label: 'Full head of hair' },
  { value: 'thinning', label: 'Thinning' },
  { value: 'receding', label: 'Receding' },
  { value: 'treating', label: 'On a treatment (finasteride / minoxidil / similar)' },
  { value: 'shaved', label: 'Shaved or buzzed by choice' },
];

const SKIN_TYPE_OPTIONS = [
  { value: 1, label: 'I — Always burns, never tans' },
  { value: 2, label: 'II — Usually burns, tans minimally' },
  { value: 3, label: 'III — Sometimes burns, tans gradually' },
  { value: 4, label: 'IV — Burns rarely, tans well' },
  { value: 5, label: 'V — Very rarely burns, tans deeply' },
  { value: 6, label: 'VI — Never burns' },
];

const INTERVENTION_LABELS: Record<Intervention, string> = {
  trt: 'TRT (testosterone replacement)',
  glp1: 'GLP-1 (Ozempic, Wegovy, Mounjaro)',
  finasteride: 'Finasteride',
  minoxidil: 'Minoxidil',
  retinoid: 'Topical retinoid (tretinoin, adapalene)',
  accutane: 'Isotretinoin (Accutane)',
};

const BUDGET_OPTIONS: Array<{ value: BudgetTier; label: string }> = [
  { value: 'under_50', label: 'Under $50/month' },
  { value: '50_to_150', label: '$50–$150/month' },
  { value: '150_to_500', label: '$150–$500/month' },
  { value: 'no_limit', label: 'No real budget constraint' },
];

const RELATIONSHIP_OPTIONS: Array<{ value: RelationshipStatus; label: string }> = [
  { value: 'single', label: 'Single' },
  { value: 'dating', label: 'Dating' },
  { value: 'partnered', label: 'In a relationship' },
  { value: 'married', label: 'Married' },
];

export function ProfileForm({ initial }: Props) {
  const [hairStatus, setHairStatus] = useState<HairStatus | null>(initial.hair_status);
  const [skinType, setSkinType] = useState<number | null>(initial.skin_type);
  const [interventions, setInterventions] = useState<Intervention[]>(
    initial.current_interventions ?? [],
  );
  const [budgetTier, setBudgetTier] = useState<BudgetTier | null>(initial.budget_tier);
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus | null>(
    initial.relationship_status,
  );
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleIntervention(v: Intervention) {
    setInterventions((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
    );
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/profile', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            hair_status: hairStatus,
            skin_type: skinType,
            current_interventions: interventions,
            budget_tier: budgetTier,
            relationship_status: relationshipStatus,
          }),
        });
        if (!res.ok) throw new Error(`Save failed (${res.status})`);
        setSavedAt(new Date());
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="space-y-10">
      <Field label="Hair">
        <SelectButtons
          value={hairStatus}
          onChange={setHairStatus}
          options={HAIR_OPTIONS}
          allowNull
          disabled={pending}
        />
      </Field>

      <Field
        label="Skin type"
        help="Fitzpatrick scale. Pick the closest match for how your skin reacts to a full day in summer sun."
      >
        <SelectButtons
          value={skinType}
          onChange={setSkinType}
          options={SKIN_TYPE_OPTIONS}
          allowNull
          disabled={pending}
        />
      </Field>

      <Field
        label="Current interventions"
        help="Anything you're actively on. Affects what advice fits."
      >
        <div className="flex flex-wrap gap-2">
          {INTERVENTIONS.map((v) => {
            const selected = interventions.includes(v);
            return (
              <button
                key={v}
                type="button"
                disabled={pending}
                onClick={() => toggleIntervention(v)}
                className={
                  selected
                    ? 'rounded-full bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900'
                    : 'rounded-full border border-zinc-300 px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }
              >
                {INTERVENTION_LABELS[v]}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Budget for appearance work">
        <SelectButtons
          value={budgetTier}
          onChange={setBudgetTier}
          options={BUDGET_OPTIONS}
          allowNull
          disabled={pending}
        />
      </Field>

      <Field label="Relationship status">
        <SelectButtons
          value={relationshipStatus}
          onChange={setRelationshipStatus}
          options={RELATIONSHIP_OPTIONS}
          allowNull
          disabled={pending}
        />
      </Field>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        {savedAt && !pending && (
          <span className="text-xs text-zinc-500">
            Saved at {savedAt.toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</div>
      {help && (
        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{help}</div>
      )}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function SelectButtons<T extends string | number>({
  value,
  onChange,
  options,
  allowNull,
  disabled,
}: {
  value: T | null;
  onChange: (v: T | null) => void;
  options: Array<{ value: T; label: string }>;
  allowNull?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            disabled={disabled}
            onClick={() => onChange(allowNull && selected ? null : opt.value)}
            className={
              selected
                ? 'rounded-full bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900'
                : 'rounded-full border border-zinc-300 px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
