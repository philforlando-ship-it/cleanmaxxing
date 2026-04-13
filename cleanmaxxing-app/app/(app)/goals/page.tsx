import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function tierLabel(tier: string | null): string {
  if (!tier) return '';
  switch (tier) {
    case 'tier-1': return 'Foundation';
    case 'tier-2': return 'High impact';
    case 'tier-3': return 'Refinement';
    case 'tier-4': return 'Top performers';
    case 'tier-5': return 'Polish';
    case 'conditional-tier-1': return 'Situational';
    default: return tier;
  }
}

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: goals } = await supabase
    .from('goals')
    .select('id, title, description, category, priority_tier, goal_type, status, created_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Goals</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {goals?.length ?? 0} active
          </p>
        </div>
        <a
          href="/today"
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Back to Today
        </a>
      </div>

      {!goals || goals.length === 0 ? (
        <p className="mt-10 text-sm text-zinc-500">
          No active goals yet. Goal browsing and creation are coming next.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {goals.map((goal) => (
            <li
              key={goal.id}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-2 flex items-center gap-2 text-xs">
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {tierLabel(goal.priority_tier)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 ${
                    goal.goal_type === 'process'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {goal.goal_type}
                </span>
              </div>
              <h2 className="text-lg font-semibold leading-tight">{goal.title}</h2>
              {goal.description && (
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {goal.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
