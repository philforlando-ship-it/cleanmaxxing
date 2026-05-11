export function TodayClosureCard() {
  return (
    <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-950">
      <h2 className="text-lg font-medium text-emerald-900 dark:text-emerald-100">
        Done for today.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-emerald-800 dark:text-emerald-200">
        All your check-ins are resolved. Come back tomorrow — no need to
        keep refreshing.
      </p>
    </section>
  );
}
