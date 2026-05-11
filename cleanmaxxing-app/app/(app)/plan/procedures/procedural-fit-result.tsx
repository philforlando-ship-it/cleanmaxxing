// Renders a stored procedural_fit_analyses.output JSON into the page.
// Server component — pure render, no state. Mirrors the structure
// defined in lib/procedural-fit/prompt.ts ProceduralFitOutputSchema.

import {
  PROCEDURE_LABEL,
  type ProceduralFitOutput,
  type ProcedureKey,
} from '@/lib/procedural-fit/prompt';

type Props = {
  output: ProceduralFitOutput;
  refused: boolean;
  refusalReason: string | null;
};

export function ProceduralFitResult({ output, refused, refusalReason }: Props) {
  if (refused) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          {refusalReason ?? 'Analysis was suppressed.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {output.foundations_check && (
        <FoundationsCheckCard text={output.foundations_check} />
      )}

      {output.primary_lever ? (
        <LeverCard
          rank="Primary"
          procedure={output.primary_lever.procedure}
          reasoning={output.primary_lever.reasoning}
          realisticOutcome={output.primary_lever.realistic_outcome}
          considerations={output.primary_lever.considerations}
          costEstimate={output.primary_lever.cost_estimate}
          readyNow={output.primary_lever.ready_now}
        />
      ) : (
        <NoPrimaryLeverCard />
      )}

      {output.secondary_levers.map((lever, idx) => (
        <LeverCard
          key={`${lever.procedure}-${idx}`}
          rank={`Secondary ${idx + 1}`}
          procedure={lever.procedure}
          reasoning={lever.reasoning}
          realisticOutcome={lever.realistic_outcome}
          considerations={lever.considerations}
          costEstimate={lever.cost_estimate}
          readyNow={lever.ready_now}
        />
      ))}

      {output.not_yet.length > 0 && <NotYetCard items={output.not_yet} />}

      {output.budget_reality && (
        <BudgetRealityCard text={output.budget_reality} />
      )}
    </div>
  );
}

function LeverCard({
  rank,
  procedure,
  reasoning,
  realisticOutcome,
  considerations,
  costEstimate,
  readyNow,
}: {
  rank: string;
  procedure: ProcedureKey;
  reasoning: string;
  realisticOutcome: string;
  considerations: string[];
  costEstimate: string;
  readyNow: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
          {PROCEDURE_LABEL[procedure]}
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {rank}
        </span>
      </div>
      {!readyNow && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          Not yet — see foundations check above before pursuing this.
        </p>
      )}
      <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        <p>{reasoning}</p>
        <p>{realisticOutcome}</p>
      </div>
      {considerations.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Considerations
          </h4>
          <ul className="mt-2 ml-5 list-disc space-y-1 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            {considerations.map((c, idx) => (
              <li key={idx}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-4 border-t border-zinc-100 pt-3 text-[13px] text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Cost:</span>{' '}
        {costEstimate}
      </div>
    </div>
  );
}

function NoPrimaryLeverCard() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
        No primary recommendation
      </h3>
      <p className="mt-3 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        Nothing in scope rises above the foundations-first threshold for
        you right now. Check the foundations note above (if present) for
        what to address first; the recommendation may change after that
        work compounds. Re-run the check when something foundational has
        moved.
      </p>
    </div>
  );
}

function FoundationsCheckCard({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-900/60">
      <h3 className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
        Foundations check
      </h3>
      <p className="mt-3 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        {text}
      </p>
    </div>
  );
}

function NotYetCard({
  items,
}: {
  items: ProceduralFitOutput['not_yet'];
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
        Not yet
      </h3>
      <p className="mt-2 text-[12px] text-zinc-500 dark:text-zinc-400">
        Procedures the read explicitly down-weighted for you, with why.
      </p>
      <ul className="mt-4 space-y-3">
        {items.map((item, idx) => (
          <li
            key={`${item.procedure}-${idx}`}
            className="border-l-2 border-zinc-200 pl-3 dark:border-zinc-700"
          >
            <div className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100">
              {PROCEDURE_LABEL[item.procedure]}
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              {item.reason}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BudgetRealityCard({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
        Budget reality
      </h3>
      <p className="mt-3 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        {text}
      </p>
    </div>
  );
}
