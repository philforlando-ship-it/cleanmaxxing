# Beta Watch Notes — What to Look For in PostHog Session Replays

Internal reference. What to watch for, what signals matter, what to ignore.
The goal is to find the top 5 UX issues fast so they can be fixed before the
beta cohort compounds negative word-of-mouth. Update this doc as new patterns
emerge during watch sessions.

---

## Golden paths to verify

These should feel smooth. If you see hesitation, backtracking, or repeated
scrolling, flag them — that's a "user can do it but it's not obvious" signal.

1. **Signup → onboarding → goal acceptance.** Full path from `/signup` through
   all 16 onboarding questions to the three-goal suggestion screen to
   `/today`. The motivation question (Q4) and the new conditional detail
   field are the newest — watch those specifically. Clinical screen (Q16)
   should route cleanly to resources when flagged, to `/today` when not.

2. **First daily check-in.** User lands on `/today`, finds the daily
   check-in card, checks off at least one goal, hits Save. Watch for
   confusion about what "Did you work on this today?" means in context of
   specific goal types. Process goals should read intuitively; outcome
   goals might feel weird to check off daily.

3. **First Mister P question.** User clicks the chat card, types a question,
   gets a streamed response. Watch whether the response feels in-voice,
   whether users scroll back through it (engagement), and whether they ask
   a follow-up (depth signal).

4. **Browsing the library.** User hits `/goals/library` from the settings
   or the goals page. Does the tier hierarchy read? Do they understand that
   goals are grouped Foundation → High impact → etc.? Do they tap any tier
   badges to read the explainers?

5. **Trial → subscription conversion.** User hits `/settings/billing`,
   clicks a plan, completes Stripe checkout, lands back on `/today` with
   the success banner. Mostly instrumentation — any drop-off in this
   flow is very expensive.

---

## Rage-click surfaces to watch

Places where users might click multiple times in frustration because something
isn't responding or isn't doing what they expect.

- **Daily check-in Save button** — if optimistic state isn't clear, users may
  double-click thinking nothing happened.
- **Mister P "Ask" button during streaming** — if users try to send a new
  question before the previous response finishes, the UI should handle it
  cleanly.
- **Tier badge taps** — new behavior this session. If the explainer tooltip
  doesn't appear within ~100ms, users will re-tap.
- **Plan buttons on billing page** — if Stripe Checkout redirect delays,
  users may double-click.
- **Dev reset button** — shouldn't be visible in prod, but verify.

---

## Drop-off checkpoints

These are the moments where losing a user is expensive. Watch session length
at each and compare to the cohort baseline once you have one.

| Checkpoint | Signal | Fix priority |
|---|---|---|
| Signup form → first onboarding question | abandon after email entry | high |
| Age question (Q1) → next | age < 18 bounce is intended; otherwise investigate | medium |
| Motivation question (Q4) → next | new question this session, watch completion rate | high |
| Goal acceptance → `/today` first landing | abandon means goal suggestions didn't land | high |
| Day 1 → Day 3 return | weak early habit; the day-3 onboarding email is supposed to pull them back | high |
| Day 7 → Day 14 | mid-trial attrition; the day-7 email targets this | medium |
| Day 14 → subscription | the decision gate; day-14 email is already framed as a real choice | high |

---

## Qualitative signals worth coding

Things that don't show up on a funnel chart but matter.

- **Does the user talk back to Mister P?** Single-shot questions are
  information queries. Multi-turn threads are engagement. Threads that go
  5+ messages are where Mister P's depth calibration and goal awareness
  pay off — those should read well.
- **Do they use the tier badge explainers?** Click rate on tier pills is a
  proxy for whether the hierarchy is landing or just noise.
- **Do they edit their goals after the initial picker?** Swapping goals
  from the library after a few days means they're engaging with the
  system, not just accepting the default.
- **Do they hit the step-away button?** Not a bad signal — the feature is
  designed for it. But cluster patterns matter — if everyone hits
  step-away in the first week, the product is too heavy out of the gate.
- **What do they ask Mister P about most?** The query topics tell you
  what content they actually care about. Gaps in coverage show up here
  first. Also — if the same question keeps coming back, it probably
  deserves a dedicated POV doc section.

---

## What to ignore

Don't over-rotate on these in week one.

- **UI aesthetic complaints** unless they cluster around the same element.
  Individual "I don't like the color" takes are noise.
- **Single-user feature requests** that don't match anyone else's behavior.
- **Mister P answer quality nitpicks** on niche topics — the corpus has
  known gaps, and they'll surface as real ones only if multiple users hit
  them.
- **Performance on slow connections** unless a real pattern emerges — the
  app is not a spa with heavy JS, so most issues will be network-side.

---

## Feedback capture pattern

Watch the replay, note the moment that felt off, write a one-line
observation, tag it with severity (high / medium / low) and category
(onboarding / daily loop / chat / billing / library / other). Review
the list weekly and pick the top five for the next iteration cycle.
Five is the cap — any more and the work fragments.

Anything that keeps showing up across multiple users gets prioritized
regardless of severity tag. Frequency beats magnitude for a product in
beta — one annoying bug that hits everyone matters more than one
catastrophic bug that hits one person.
