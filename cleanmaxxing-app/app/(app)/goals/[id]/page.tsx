// Goal detail page. Consolidates per-goal context in one place — the
// walkthrough week, baseline adjust control, POV link, and status actions.
// Replaces the need to hunt across /today + /goals + /povs to manage a
// single goal.

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TierBadge } from '@/components/tier-badge';
import {
  onrampFor,
  currentState,
  isBaselineStage,
  type BaselineStage,
} from '@/lib/content/onramp';
import { povExists } from '@/lib/content/pov';
import { getGoalWeeklySummary } from '@/lib/check-in/service';
import { AdjustBaseline } from '@/app/(app)/today/adjust-baseline';
import { StatusActions } from './status-actions';
import { GoalMisterPChat, type ChatMessage } from './goal-mister-p-chat';

type Props = {
  params: Promise<{ id: string }>;
};

function relativeAge(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return '1 month ago';
  return `${Math.floor(days / 30)} months ago`;
}

export default async function GoalDetailPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: goal } = await supabase
    .from('goals')
    .select(
      'id, title, description, category, priority_tier, goal_type, status, source_slug, baseline_stage, created_at',
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!goal) notFound();

  const onramp = onrampFor(goal.source_slug);
  const stage: BaselineStage = isBaselineStage(goal.baseline_stage)
    ? goal.baseline_stage
    : 'new';
  const state = onramp
    ? currentState(onramp, new Date(goal.created_at), stage)
    : null;

  const isActive = goal.status === 'active';

  const weekly = isActive
    ? await getGoalWeeklySummary(supabase, user.id, goal.id, goal.created_at)
    : null;

  // Hydrate the goal-scoped chat thread server-side so the user sees
  // prior turns immediately on page load. Messages are loaded oldest-
  // first and flattened into alternating user/assistant pairs. We
  // intentionally bypass the conversation.ts loader here: that helper
  // truncates messages for prompt-context economy, but the visible
  // UI wants full text. The 50-pair cap is a pathological-size guard,
  // not an expected ceiling.
  let initialChatMessages: ChatMessage[] = [];
  if (isActive) {
    const { data: threadRows } = await supabase
      .from('mister_p_queries')
      .select('question, answer, created_at')
      .eq('user_id', user.id)
      .eq('goal_id', goal.id)
      .order('created_at', { ascending: true })
      .limit(50);
    initialChatMessages = (threadRows ?? []).flatMap((r) => {
      const row = r as { question: string; answer: string };
      return [
        { role: 'user' as const, content: row.question },
        { role: 'assistant' as const, content: row.answer },
      ];
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/goals"
        className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        ← Goals
      </Link>

      <header className="mt-6">
        <div className="mb-3 flex items-center gap-2 text-xs">
          <TierBadge tier={goal.priority_tier} />
          <span
            className={`rounded-full px-2 py-0.5 ${
              goal.goal_type === 'process'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
            }`}
          >
            {goal.goal_type}
          </span>
          {!isActive && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {goal.status}
            </span>
          )}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{goal.title}</h1>
        {goal.description && (
          <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {goal.description}
          </p>
        )}
        <p className="mt-3 text-xs text-zinc-500">
          Accepted {relativeAge(goal.created_at)}
        </p>
      </header>

      {isActive && onramp && state && (
        <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-medium">This week&rsquo;s focus</h2>
            {state.kind === 'active' ? (
              <span className="text-xs text-zinc-500">Week {state.week}</span>
            ) : (
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Walkthrough complete
              </span>
            )}
          </div>
          {state.kind === 'active' ? (
            <>
              <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {state.block.focus}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {state.block.detail}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {state.graduation}
            </p>
          )}
          {weekly && weekly.daysPossible > 0 && (
            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
              Ticked {weekly.daysCompleted} of the last {weekly.daysPossible} day
              {weekly.daysPossible === 1 ? '' : 's'}.
            </p>
          )}
          <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <AdjustBaseline goalId={goal.id} currentStage={stage} />
          </div>
        </section>
      )}

      {isActive && !onramp && (
        <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-medium">No walkthrough yet</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            This goal doesn&rsquo;t have a weekly walkthrough authored yet. Read
            the full POV for the complete framework.
          </p>
          {weekly && weekly.daysPossible > 0 && (
            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
              Ticked {weekly.daysCompleted} of the last {weekly.daysPossible} day
              {weekly.daysPossible === 1 ? '' : 's'}.
            </p>
          )}
        </section>
      )}

      {povExists(goal.source_slug) && (
        <section className="mt-6">
          <Link
            href={`/povs/${goal.source_slug}`}
            className="text-sm text-zinc-700 underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            Read the full POV →
          </Link>
        </section>
      )}

      {isActive && (
        <section className="mt-8">
          <GoalMisterPChat
            goalId={goal.id}
            initialMessages={initialChatMessages}
          />
        </section>
      )}

      {isActive && (
        <section className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Goal status
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Completing a goal moves it to history. Abandoning removes it from
            the active set — you can re-add it from the library later if you
            change your mind.
          </p>
          <div className="mt-4">
            <StatusActions goalId={goal.id} />
          </div>
        </section>
      )}

      {!isActive && (
        <section className="mt-10 rounded-xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            This goal is {goal.status}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            It&rsquo;s no longer in your active set.{' '}
            <Link href="/goals/library" className="underline">
              Browse the library
            </Link>{' '}
            to re-add it or pick something new.
          </p>
        </section>
      )}
    </main>
  );
}
