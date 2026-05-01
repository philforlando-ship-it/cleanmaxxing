// Rules-based selector for the Mister P daily note. Pure
// function: takes a snapshot of the user's state, returns one
// {key, observation, question} that fires today. Priority order
// matters — the first matching condition wins. The cascade goes:
// safety-adjacent intervention signals first, then state-based
// observations, then a tenure-based default that always matches.
//
// Voice rules (Mister P): direct, a little dry, willing to say
// nothing dramatic. Never narrates that he's tracking ("I see
// you missed your sleep goal" reads as surveillance). Never
// says streak/grind/journey. The questions are real questions,
// not rhetorical — the user is expected to answer in a sentence
// or two.

export type SelectorState = {
  daysSinceOnboarding: number;
  // 0 = Sunday, 1 = Monday, ... (matches Date.prototype.getDay).
  weekday: number;
  sleepRecentAvgHours: number | null;
  sleepRecentCount: number;
  // null when no goals are active or insufficient data.
  weeklyCompletionRate: number | null;
  staleGoalTitle: string | null;
  // Days since the stale goal was last ticked. Used in the
  // observation copy ("Tuesday" feels different from "12 days
  // ago"). Null when no stale goal.
  staleGoalDaysIdle: number | null;
  // Lowercase dimension names (social/work/physical/appearance)
  // that have been below threshold across the last 3 reflections.
  stuckDimensions: string[];
  // True for users who finished onboarding but haven't yet seen
  // a daily note (i.e. just completed first conversation).
  isFirstDailyNote: boolean;
};

export type DailyNote = {
  key: string;
  observation: string;
  question: string;
};

export function selectDailyNote(state: SelectorState): DailyNote {
  // ---- Priority 1: intervention signals ----------------------

  if (state.stuckDimensions.length > 0) {
    const dim = state.stuckDimensions[0];
    return {
      key: 'STUCK-DIM',
      observation: `Your ${dim} dimension has been low for three weeks. Sometimes the answer isn't more fixing — it's less checking.`,
      question: 'What would a week of stepping back from this look like?',
    };
  }

  if (state.staleGoalTitle && state.staleGoalDaysIdle !== null) {
    const days = state.staleGoalDaysIdle;
    const idleDescriptor =
      days < 14 ? `${days} days` : days < 30 ? 'two weeks' : 'a few weeks';
    return {
      key: 'STALE-GOAL',
      observation: `Your "${state.staleGoalTitle}" goal hasn't been ticked in ${idleDescriptor}. Life happens. Just don't let it become a habit.`,
      question: 'What actually got in the way?',
    };
  }

  // ---- Priority 2: just-completed first conversation ---------

  if (state.isFirstDailyNote && state.daysSinceOnboarding <= 1) {
    return {
      key: 'POST-FIRST-CONVO',
      observation:
        "Two answers in the bank. Those shape every response I give you from here — the more you tell me, the less generic I am. New question for today below.",
      question: 'What does a normal weekday look like for you, food-wise?',
    };
  }

  // ---- Priority 3: state-based observations ------------------

  // Sunday after the first week — reflection-shaped prompt.
  if (state.weekday === 0 && state.daysSinceOnboarding >= 7) {
    return {
      key: 'SUNDAY',
      observation:
        "Sunday. Closest the week gets to a checkpoint — the reflection card below covers four dimensions instead of one global score.",
      question: 'One thing that stuck this week?',
    };
  }

  if (
    state.sleepRecentCount >= 3 &&
    state.sleepRecentAvgHours !== null &&
    state.sleepRecentAvgHours < 6
  ) {
    return {
      key: 'SLEEP-LOW',
      observation: `Recent sleep is averaging ${state.sleepRecentAvgHours}h. Everything else gets harder when this is broken — it's the one I'd fix first this week.`,
      question: "What's actually getting in the way?",
    };
  }

  if (
    state.weeklyCompletionRate !== null &&
    state.weeklyCompletionRate < 0.3 &&
    state.daysSinceOnboarding >= 7
  ) {
    return {
      key: 'COMP-LOW',
      observation:
        "Rough stretch on goal-ticks — under a third are hitting. That's information, not failure.",
      question: 'What got in the way?',
    };
  }

  if (
    state.weeklyCompletionRate !== null &&
    state.weeklyCompletionRate > 0.8 &&
    state.daysSinceOnboarding >= 7
  ) {
    return {
      key: 'COMP-HIGH',
      observation:
        "Strong stretch — you're hitting most of what you set out to do.",
      question: 'Anything starting to feel redundant?',
    };
  }

  if (
    state.sleepRecentCount >= 3 &&
    state.sleepRecentAvgHours !== null &&
    state.sleepRecentAvgHours >= 7.5
  ) {
    return {
      key: 'SLEEP-HIGH',
      observation: `Sleep's been solid — ${state.sleepRecentAvgHours}h average. That's the variable that quietly moves everything else.`,
      question: "What's working that you want to keep?",
    };
  }

  if (state.sleepRecentCount === 0 && state.daysSinceOnboarding >= 5) {
    return {
      key: 'SLEEP-MISSING',
      observation:
        "Haven't logged sleep yet. Doesn't have to be every night — just enough to see the pattern.",
      question: 'What time do you typically go to bed?',
    };
  }

  // ---- Priority 4: tenure default ----------------------------

  if (state.daysSinceOnboarding <= 2) {
    return {
      key: 'T-NEW',
      observation:
        "First day or two in. Don't try to optimize yet — just see what the rhythm feels like.",
      question: 'What did you expect this would feel like?',
    };
  }

  if (state.daysSinceOnboarding <= 7) {
    return {
      key: 'T-WEEK',
      observation:
        "First week. The boring stuff is what works — and it usually doesn't feel like much yet.",
      question: 'Anything already feeling different?',
    };
  }

  if (state.daysSinceOnboarding <= 14) {
    return {
      key: 'T-EARLY',
      observation:
        "Past the initial bump. The real test starts now — when motivation drops, does the structure hold?",
      question: 'Which goal are you least excited to tick today?',
    };
  }

  if (state.daysSinceOnboarding <= 30) {
    return {
      key: 'T-MONTH',
      observation:
        "Building-habit territory. A few more weeks until things stop feeling effortful.",
      question: "What's harder than you expected?",
    };
  }

  return {
    key: 'T-MULTI',
    observation:
      "A month plus in. The compound is in the boring days, not the dramatic ones.",
    question: "What's actually changed, in your eyes?",
  };
}
