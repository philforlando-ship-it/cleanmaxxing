# Spec — Slice 3: Fold /log into /today

**Status**: Proposed
**Author**: drafted by Claude, awaiting Phil sign-off
**Date**: 2026-05-11
**Lineage**: Slice 3 of the /today daily-check-in reframe (Slice 1 shipped 2026-05-10). Slice 2 (nav demotion) parked.

---

## Goal

Eliminate `/log` as a separate destination. Daily-basics logging surfaces (sleep, workout, nutrition, hair Stage 4) live on `/today`, consistent with the "Today's Check-in" reframe.

After this slice, the cadence ladder is:
- **/today** — daily check-in (primary action + journey tiles + daily-action tiles + log the basics)
- **/reflection** — weekly+ cadence (weekly letter, weekly reflection, monthly checkpoint, quarterly survey, the new Coming-up strip)

Two destinations, not three.

---

## Why now

1. Phase C's split (May 2026) was driven by /today's "decreasing-prominence" discipline. The Slice 1 reframe to "Today's Check-in" already implies logging happens here — the page identity now contradicts the URL split.
2. EscapeHatch already had to add a "Log the basics" link 2026-05-10 because first-time users had no in-page signal that /log existed. That fix is a symptom of the split being wrong.
3. /reflection is the destination that's genuinely different in voice and cadence; /log is not. Killing /log preserves the meaningful split.

---

## What moves

| Surface | From | To |
|---|---|---|
| `SleepLogCard` | /log | /today |
| `WorkoutLogCard` (+ planExercises lookup) | /log | /today |
| `NutritionLogCard` | /log | /today |
| `HairRoutineCard` (Stage 4) | /log + /today (deduped) | /today (single render) |

---

## Key design decisions

### D1. Inline vs. collapsible

**Recommend: collapsible disclosure, default expanded.**

Options:
- **A — Always-inline**: 4 cards permanently stacked. Simple, but reverses Phase B's "page got too long" gains (~150 lines back).
- **B (recommended) — Collapsible section**: A "Log today's basics" disclosure with a chevron. Default expanded. User can collapse if they only want to check the primary action and tiles. State persisted via localStorage so the choice sticks across visits.
- **C — Modal / drawer**: A "Log" button opens a side panel. Hides the cards entirely until invoked. Lowest visual cost; highest friction.

Rationale: B keeps the daily check-in identity (cards visible and scannable) while preserving the option to collapse. C buries logging too far given that logging IS the check-in.

### D2. Position on /today

**Recommend: between PrimaryActionCard and JourneysGrid.**

Options:
- **X (recommended) — Between Area 1 (primary action) and journey grid**: Reading order matches "this is what you came here to do, here's what to log, here are your journeys to explore."
- **Y — After daily-action tiles, before activity readout**: Demotes logging to "scroll to find it." Inconsistent with the check-in framing.
- **Z — Just before EscapeHatch at the bottom**: Even more demoted. No.

### D3. Hair Stage 4 dedup

`HairRoutineCard` currently renders on /today (Stage 4 users only) AND on /log (Stage 4 users only). After this slice, render once on /today. Remove the /log instance.

### D4. /log route handling

**Recommend: 308 permanent redirect to /today.**

Options:
- **Delete `/log/page.tsx`** — bookmarks 404.
- **Redirect (recommended)** — bookmarks land on /today. The redirect is a 3-line server component; cleanup ticket can delete it after a few weeks.

### D5. EscapeHatch

Drop the "Log the basics" link (since /log no longer exists). Back to two links: "Browse the system", "Ask Mister P". Per the file's own comment, "exactly two" was the original constraint — we restore it.

### D6. Sub-header copy on /today

Current Slice 1 sub-header: *"Your check-in for today. Log and Reflection are there when you need them."*

Updated: *"Your check-in for today. Reflection is there when you want to step back."*

### D7. AppNav

Remove the /log entry from `LINKS`. Resulting nav: Today · Reflection · Photos · Profile · The System · Settings.

---

## Files touched

1. **`app/(app)/today/page.tsx`**
   - Add fetches: `getSleepState`, `getWorkoutState`, `getNutritionState`, `getStrengthAssessment`, `getRecommendedExercises`, `buildRecentWeightLookup` (move from /log)
   - Compute `planExercises` array (move from /log)
   - Render new `<DailyBasicsSection>` between `<PrimaryActionCard>` and `<JourneysGrid>`
   - Update sub-header copy
2. **`app/(app)/today/daily-basics-section.tsx`** (new)
   - Client component (needs `useState` for collapse + `useEffect` for localStorage)
   - Accepts the four cards' props
   - Renders chevron header + collapsible body
3. **`app/(app)/log/page.tsx`**
   - Replace with `redirect('/today')` from `next/navigation`. Three-line file.
4. **`components/app-nav.tsx`**
   - Remove the /log entry from `LINKS`
5. **`app/(app)/today/escape-hatch.tsx`**
   - Remove the "Log the basics" link
6. **References** — grep for `/log` href values in source; repoint any to /today

---

## Data / cost impact

Three extra fetches on every /today render: `getSleepState`, `getWorkoutState`, `getNutritionState`. /today already does ~25 parallel fetches; three more is negligible. No new tables, no migrations.

Strength assessment + recommended-exercises lookup is already paid for in some flows on /today (e.g., the recovery-check), so may collapse to zero net new on warm paths.

---

## What stays unchanged

- /reflection (untouched — Coming-up strip, weekly letter, etc.)
- Pattern A/B/C/D content and journey state
- All logging API endpoints
- All log card components (SleepLogCard, WorkoutLogCard, NutritionLogCard, HairRoutineCard) — only their import sites change

---

## Acceptance criteria

- `/log` returns a redirect to `/today` (server-side, no flash)
- Nav no longer shows "Log"
- `/today` renders the 4 log cards in a collapsible "Log today's basics" section between primary action and journey grid
- Hair Stage 4 users see exactly one `HairRoutineCard` (not two)
- EscapeHatch shows 2 links (not 3)
- TodayClosureCard rendering logic for the all-quiet bucket is unaffected
- `npx tsc --noEmit` clean on touched files
- `npx eslint` clean on touched files
- Manual: hard-refresh /today as a logged-in user, verify the section renders, toggle collapse, refresh and confirm the collapse state persists
- Manual: visit /log directly, confirm redirect to /today
- No migrations, no new env vars

---

## Out of scope (deferred)

- Smart auto-collapse (e.g., collapse when all four logs are already submitted today). Adds per-card "logged today" detection complexity. Revisit if user feedback says the default-expanded section is noisy.
- Per-journey log surfaces (sleep card on /plan/sleep, etc.). Could be a future refactor but doesn't belong in this slice.
- Deleting the `/log/page.tsx` redirect file once enough time has passed.

---

## Estimated effort

~2-3 hours focused work. Mostly mechanical relocation; the new component is small.
