// "Considering remedies" card on /plan/hair. Surfaces only when the
// user is on the bald-track / advanced-thinning path AND hasn't
// already committed to medication-only OR a remedy. Content-only v0;
// state machine + per-remedy logging are deferred to a follow-up.

import {
  REMEDIES,
  REMEDIES_CONSIDERING_INTRO,
  REMEDIES_CONSIDERING_OUTRO,
  type Remedy,
} from '@/lib/hair/remedies-considering-content';

export function RemediesConsideringCard() {
  return (
    <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <header>
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Considering remedies
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          {REMEDIES_CONSIDERING_INTRO}
        </p>
      </header>

      <ul className="mt-6 space-y-6">
        {REMEDIES.map((remedy) => (
          <RemedyBlock key={remedy.slug} remedy={remedy} />
        ))}
      </ul>

      <p className="mt-8 border-t border-zinc-200 pt-5 text-[13px] leading-relaxed text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        {REMEDIES_CONSIDERING_OUTRO}
      </p>
    </section>
  );
}

function RemedyBlock({ remedy }: { remedy: Remedy }) {
  return (
    <li className="rounded-lg border border-zinc-200 bg-zinc-50/40 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        {remedy.title}
      </h3>
      <p className="mt-1 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        {remedy.oneLine}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <BulletGroup label="Pros" items={remedy.pros} />
        <BulletGroup label="Cons" items={remedy.cons} />
      </div>

      <dl className="mt-4 grid gap-2 text-[12px] leading-relaxed sm:grid-cols-2">
        <div>
          <dt className="font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Cost band
          </dt>
          <dd className="mt-1 text-zinc-700 dark:text-zinc-300">
            {remedy.costBand}
          </dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Timeline
          </dt>
          <dd className="mt-1 text-zinc-700 dark:text-zinc-300">
            {remedy.timeline}
          </dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Fits
          </dt>
          <dd className="mt-1 text-zinc-700 dark:text-zinc-300">
            {remedy.fitsWho}
          </dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Doesn’t fit
          </dt>
          <dd className="mt-1 text-zinc-700 dark:text-zinc-300">
            {remedy.doesntFitWho}
          </dd>
        </div>
      </dl>
    </li>
  );
}

function BulletGroup({
  label,
  items,
}: {
  label: string;
  items: ReadonlyArray<string>;
}) {
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <ul className="mt-1 space-y-1.5 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-zinc-400">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
