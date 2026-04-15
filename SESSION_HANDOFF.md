# Session Handoff

Per `cleanmaxxing_mvp_spec.md` §10: write this at the end of every build session,
read it at the start of the next one.

---

## Last session: 2026-04-15 — Week 4 complete + Thread B spec-amendment code landed (Today screen + check-in loop + Mister P chat + weekly reflection + chart + monthly checkpoint + weekly email cron + motivation segment)

### Current repo state

- **Dev server:** running on http://localhost:3000 (background task `bvw0ud6dd`). Dev reset button still lives on `/today` top-right when `NODE_ENV=development`.
- **Supabase project:** `zmdijizkxcconyisjcht`. **Migrations 0001–0005 applied.** 0005 added `users.motivation_segment` + `users.motivation_specific_detail` per spec §7 amendment. Always use SQL Editor, not the Migrations panel.
- **Working tree:** dirty at session end — Week 4 + Thread B changes unstaged. Resend package added to `package.json` + `package-lock.json`.
- **Mister P smoke test:** 22/22 all behaving correctly (20 original + Q21 lab-interpretation + Q22 hierarchy-framing). Two new refusal categories fire in-voice.

### Session 4 — what shipped

**Slice 0 — Morning spec amendments + Mister P refusal update (pulled forward before Week 4 code).**
- `cleanmaxxing_mvp_spec.md` §1 / §2 Feature 1 / §5 / §6 / §7 / §13 / new §14 v2 Backlog amended per the 2026-04-15 morning notes batch. Two explicit brand lines ("Not medical" + "No hierarchy of worth"), visible tier badges + motivation-aware routing in Feature 1, new `motivation_segment` enum column in §5, two new Mister P hard refusals (lab interpretation + alpha/high-value-male hierarchy framing), Q4 motivation question in §7, anti-hierarchy commitment in §13, v2 backlog section covering blood labs / tracking utilities / influencer scoring / medical-adjacent-restraint discipline.
- `lib/mister-p/prompt.ts` — two new hard-refusal sections with in-voice example responses ("I'm not going to interpret lab values — that's a conversation for your doctor" / "I don't think about it that way, and Cleanmaxxing doesn't either").
- `scripts/smoke-test.ts` — Q21 + Q22 added (total 22), refusal regex broadened to catch new phrasings (`not going to interpret`, `don't think about it that way`, `worth isn't a ranking`, `take (the numbers|this|that) to your (doctor|physician)`, `conversation for your doctor`), expected refusal count updated to 8.
- `tests/mister_p_smoke.md` — matching Q21 + Q22 entries.

**Slice 1 — Today screen + daily check-in loop.**
- `lib/check-in/service.ts` — `getTodayCheckInState`, `saveTodayCheckIn`, `undoTodayCheckIn`, `todayDateString`. Validates goal ownership belt-and-suspenders against RLS. Clears + re-inserts `goal_check_ins` on save so updates reflect current state. Returns enriched goal shape including `description`, `source_slug`, and `plain_language` lookup.
- `app/api/check-in/route.ts` — GET (today's state), POST (save), DELETE (clear today).
- `app/(app)/today/daily-check-in-card.tsx` — checkbox per goal with "Did you work on this today? Check the ones you moved forward on." framing, Save/Update/Clear-today buttons, optimistic draft state, empty-state CTA to library. **Per-goal "What is this?" disclosure** revealing description + plain-language helper + "Ask Mister P about this" button that dispatches a `mister-p:prefill` window event.
- `app/(app)/today/page.tsx` — rewritten. Redirects unonboarded users to `/onboarding`. Loads check-in state + reflection state + checkpoint state in parallel via `Promise.all`. Renders MonthlyCheckpointCard (eligible-only) → DailyCheckInCard → ConfidenceTrendChart → WeeklyReflectionCard → MisterPChatCard.

**Slice 2 — Mister P chat UI (the capstone).**
- `app/(app)/today/mister-p-chat-card.tsx` — client chat. Streams plain text from `/api/mister-p/ask` via native `ReadableStream.getReader()` (no AI SDK react hooks — deliberately zero new dependency). `sendQuestion(question)` is a single reusable callback. Per-role message rendering: **user messages** right-aligned dark bubble (asymmetric `rounded-tr-sm`, 85% max width), **Mister P messages** full-width left-border accent, "MISTER P" uppercase label, **serif 15px relaxed line-height** to read as a column rather than a chat reply (leans into the voice positioning). Stop button mid-stream via `AbortController`, Clear to reset, streamingRef guard against rapid repeats, pulse cursor on the streaming message. Listens for `mister-p:prefill` window events — smooth-scrolls the card into view and auto-sends the question. First time goal awareness + proactive suggestions + depth calibration + circuit breaker + new refusals are user-testable in a browser.

**Slice 3 — Weekly reflection form + confidence trend chart.**
- `lib/weekly-reflection/service.ts` — `weekStartString` (ISO Monday), `getWeeklyReflectionState` (current + last 12 weeks history), `saveWeeklyReflection` (upsert on `user_id,week_start`), `averageConfidence`.
- `app/api/weekly-reflection/route.ts` — GET + POST, zod-validated dimensions (int 1–10), optional notes.
- `app/(app)/today/weekly-reflection-card.tsx` — four contextual sliders with prompts from spec §13 ("this week, in social situations, I felt…"), live `contextFor` label on each slider, optional notes field, summary view after save with per-dimension boxes and labels, Update to re-edit. **After save calls `router.refresh()`** so the sibling ConfidenceTrendChart picks up the new history without a manual reload.
- `app/(app)/today/confidence-trend-chart.tsx` — Recharts `LineChart`, averaged confidence across the four dimensions per week, Y domain 1–10, tooltip shows score + `contextFor` label ("6.5 · Steady"), empty-state copy before first reflection. Uses `currentColor` for stroke so light/dark mode both read correctly.

**Slice 4 — Monthly checkpoint (stickiness 5b).**
- `lib/checkpoint/service.ts` — `getCheckpointState` returns discriminated union `{ not_eligible | dismissed | eligible }`. Computes days-since-start from `users.created_at`, confidence delta (earliest vs latest weekly reflection averages) via `deltaPhrase`, lifetime goal completion rate from `goal_check_ins`, and three fresh suggestions via `rankCandidates` + `pickTopN` filtered against already-touched slugs (active/completed/abandoned). Reads `motivation_segment` and threads it through the ranker. `dismissCheckpoint` persists dismissal via `survey_responses` under key `monthly_checkpoint_dismissed_at` (pragmatic, avoids a migration for one boolean).
- `app/api/checkpoint/route.ts` — GET state, POST to dismiss.
- `app/(app)/today/monthly-checkpoint-card.tsx` — amber-themed card, only rendered when `status === 'eligible'`. Shows Day N badge, confidence delta with bolded numbers + delta phrase, completion % ("You completed 73% of your goal check-ins"), three suggested new goals with tier badges + plain language, "Browse the library" link, Dismiss button + `router.refresh()`.

**Slice 5 — Weekly reflection email cron (stickiness 5a).**
- `resend@latest` added as dependency.
- `lib/email/weekly-reflection-email.ts` — `computeWeeklyEmailData` reads last 7 days of check-ins + goal completion rate, runs day-of-week clustering (only emits pattern observation when signal is strong — early-week spike with late-week drop, weekday-only, weekend-only), picks adaptive suggestion based on days-checked-in + completion rate. `renderWeeklyEmail` returns `{ subject, html, text }` — HTML is a simple responsive template with inline styles matching the Today screen aesthetic.
- `app/api/cron/weekly-email/route.ts` — scans `users` where `onboarding_completed_at IS NOT NULL` AND `subscription_status IN ('trial','active')`. Respects §13 step-away mode by skipping users with `tracking_paused_at` set. Pulls auth email via `service.auth.admin.getUserById`. Calls Resend when `RESEND_API_KEY` is set and otherwise returns dry-run results. Authorized via `CRON_SECRET` Bearer header in production, open in dev. Returns a summary payload `{ total, sent, dry_run, skipped, errors, dry_run_mode }`.
- `vercel.json` — cron at `0 23 * * 0` (Sunday 23:00 UTC = 6pm ET / 3pm PT).
- **Dry-run verified end-to-end against live dev server** — hit `/api/cron/weekly-email`, returned 2 eligible users, 0 errors, `dry_run_mode: true` because `RESEND_API_KEY` is empty.

**Slice 6 — Thread B: motivation segment routing.**
- **Migration 0005** — `users.motivation_segment` (text + check constraint for six enum values) and `users.motivation_specific_detail` (text, nullable). User applied via Supabase SQL Editor.
- `lib/onboarding/questions.ts` — motivation question inserted at position 3 (between `effort_level` and `referral_source`), plain `choice` type so the existing onboarding flow renders it without any new type plumbing. Six options per spec §7.
- `app/api/onboarding/submit/route.ts` — validates `motivation_segment` against an enum set, persists to `users` in the same update as `age` + `age_segment` + `clinical_screen_flagged`.
- `lib/onboarding/goal-suggest.ts` — new `MotivationSegment` exported type. `scoreDoc` signature extended with optional `motivationSegment` + `category` params. New `motivationAdjustment` helper: `feel-better-in-own-skin` / `not-sure-yet` → process +2 / outcome -2 / self-acceptance (`category === 'safety'`) +3; `specific-event` → outcome +2; the remaining three segments are neutral in the ranker (their routing lives elsewhere — circuit breaker threshold, Mister P priming, weekly reflection dimension weighting). `rankCandidates` accepts `motivationSegment` and threads it through.
- `app/api/onboarding/suggestions/route.ts` — reads `motivation_segment` from profile, passes to `rankCandidates`.
- `lib/checkpoint/service.ts` — same treatment so monthly checkpoint suggestions respect the segment.
- `app/(app)/onboarding/complete/goals-picker.tsx` — one-line rationale added above the suggestions list: *"We suggested these three because they're the highest-impact starting points for your age segment and the focus areas you picked."*

### Verified working this session

- `npm run typecheck` — clean after every slice
- `npm run build` — clean when the .next lock isn't held (the EPERM error on `unlink` is a Windows/OneDrive dev-server file lock, not a code issue)
- `npm run smoke-test` — 22/22, all categories behave, Q21 + Q22 answers reviewed manually and both in-voice
- Browser end-to-end: Today page renders all four cards, daily check-in persists and reloads cleanly, weekly reflection saves and immediately updates the chart via `router.refresh()`, chart stroke reads in both light and dark mode
- `/api/cron/weekly-email` dry-run returns `{ dry_run: 2, errors: 0, dry_run_mode: true }`

### Not verified (no natural surface in current state)

- **Circuit breaker firing** — still requires 5 semantically similar questions in 7 days against a single account. Not tested manually.
- **Proactive suggestion firing** — still requires a user with 2+ priors asking a brand new topic. Code path reached but actual one-liner hasn't been eyeballed.
- **Monthly checkpoint card live rendering** — requires `users.created_at` to be ≥ 30 days old. User's dev account doesn't meet the threshold; can be tested by backdating `created_at` in Supabase or by adding a dev-only force-eligible flag.
- **Weekly email actual send** — requires `RESEND_API_KEY` + verified `cleanmaxxing.com` domain in Resend. Dry-run is the furthest local validation can go.
- **Motivation-segment-driven ranking differences** — needs a user with each motivation segment to A/B the top-3 output. Worth eyeballing in session 5 when onboarding + reset can be run end-to-end.

### Outstanding — what the next session should start with

**Option A: Week 5 — content pages + affiliate + public homepage.** Spec §9 Week 5 list: "Is Clav Right?" page (polish existing draft), Mister P Background page (write in own voice, do NOT generate with Claude), Rewardful integration with Stripe, creator landing page template, onboarding email sequence via Resend (welcome + day 3 + day 7 + day 14 trial ending), public homepage with signup CTA, **"Ways to build self-confidence" framework section** on the homepage (four-path framing per §1), launch monthly checkpoint copy review, user testing on stickiness loop.

**Option B: Thread B polish (small remaining pieces).**
1. **Conditional follow-up detail field** — when user picks `something-specific-bothering-me` in Q4, show a one-line free-text follow-up that writes to `users.motivation_specific_detail`. Requires a conditional question rendering path in the survey flow (medium change — current rendering is strictly linear). Column already exists.
2. **Tier badge one-tap explainers** — badges already render ("Foundation / High impact / Refinement / Top performers / Polish / Situational") but the spec amendment asks for a tap-to-explain. Minor polish.
3. **Corpus audit (pre-launch gate, manual)** — half-day sweep of the 90k-word POV corpus for alpha/beta, "high-value male," PSL/decile/tier-list, and worth-ranking language. Not urgent for development but non-negotiable before public launch per §13.
4. **Dev-only force-eligible flag for monthly checkpoint card** — so the checkpoint can be tested without backdating `users.created_at`. 10-minute change to `lib/checkpoint/service.ts`.

**Recommendation:** Week 5, with a 15-minute detour at the start to add the force-eligible dev flag so the monthly checkpoint copy can be eyeballed and reviewed in-browser during the stickiness loop user testing that's on the Week 5 list anyway.

### Known issues / limitations carried forward

- **Title-based duplicate detection in `/api/goals/add`** — still pending, should migrate to `source_slug` matching. One-line change, not blocking.
- **In-memory topic similarity** scales to ~500 queries per user before becoming a latency concern. Migrate to Postgres RPC when needed.
- **Eye-area retrieval gap** (Q9 smoke test) — still deferred. Probably chunk-size tuning in docs 44/47.
- **Mister P refusal regex** pattern-matches rather than LLM-classifies. Good enough for MVP. Expanded this session to cover lab-interpretation and hierarchy-framing phrasings.
- **Circuit breaker not manually verified end-to-end** — still needs a user with real query volume.
- **`.env.local` secrets** still not rotated. User decision.
- **No Google OAuth, Stripe Checkout, PostHog** — still deferred.
- **`RESEND_API_KEY` empty** — weekly email code is in place but sends are gated. Needs key + domain verification before going live.
- **`CRON_SECRET` not set** — currently the cron endpoint is open in dev (correct) and would fail-closed in production (also correct). Set it alongside the Resend key when deploying.
- **`NEXT_PUBLIC_APP_URL`** — not set locally, defaults to `https://cleanmaxxing.com` in email templates. Set this per environment.
- **Supabase SQL Editor, not Migrations panel.** Always.
- **Build EPERM on Windows** — `.next/static/*` file locks when dev server is running and build is invoked against the same directory. Kill dev server before running `npm run build` for a clean production build locally. Not a code issue.

### Spec amendments landed this session

See the "Spec amendments landed 2026-04-15" block below for the full itemized list from the morning notes batch. Every bullet in that list now has corresponding code except for: (a) the conditional follow-up detail field for the motivation question, (b) tier badge tap-explainers, and (c) the pre-launch corpus audit (manual).

### How to resume next session

```bash
# Dev server may still be running. If not:
npm run dev

# Sanity checks:
npm run typecheck
npm run smoke-test   # should still be 22/22, 8 refusals detected

# Start state: /today renders five cards (or four if checkpoint is not eligible):
#   Monthly checkpoint (amber, eligible-only)
#   Daily check-in
#   Confidence trend chart
#   Weekly reflection
#   Mister P chat
#
# Week 5 starting points (recommended order):
# 1. 15 min — add dev-only force-eligible flag to lib/checkpoint/service.ts so
#    the checkpoint card can be reviewed in-browser without backdating created_at
# 2. "Is Clav Right?" page — polish existing draft, ship as /clav or /is-clav-right
# 3. Public homepage + "Ways to build self-confidence" framework section
# 4. Onboarding email sequence (reuse resend client from lib/email/)
# 5. Rewardful + Stripe affiliate tracking
# 6. Mister P Background page (WRITE IN YOUR OWN VOICE — do not generate)
```

### Commit plan for this session

Not yet committed. Suggested split:
1. Spec amendments + Mister P refusals (two new hard refusals, smoke test update)
2. Week 4 Today screen + check-in + chat UI + weekly reflection + chart
3. Monthly checkpoint + weekly email cron (+ Resend dep + vercel.json)
4. Thread B motivation segment (migration 0005 + questions + ranker routing + one-line rationale)

---

## Previous session: 2026-04-14 — Week 3 Session 3 complete (library browse, instrumentation, Mister P context awareness)

### Current repo state

- **Latest commit:** `16e133d` — "Give Mister P goal awareness, proactive suggestions, and depth calibration"
- **Dev server:** still running from prior sessions on http://localhost:3000. Dev reset button lives on `/today` top-right when `NODE_ENV=development` — nukes active goals + clears `onboarding_completed_at` so you can re-test the full flow without a new signup.
- **Supabase project:** `zmdijizkxcconyisjcht`. Migrations 0001–0004 applied. No new migrations needed for Week 4 unless you add fields to `check_ins` or `weekly_reflections` (both already exist).
- **Working tree:** clean at session end.

### Session 3 — what shipped (all three slices)

**Slice A — Goal library browse.**
- `/goals/library` page with category filter chips, personalized score ordering (reuses `rankCandidates` logic via `scoreDoc` + `focusSlugsFor` helpers)
- `/api/goals/templates` returns all templates joined with POV metadata, age-filtered, flagged `already_active` per user
- `/api/goals/add` inserts one goal for already-onboarded users, refuses duplicates by title (crude but works — see "known limitations" below)

**Slice B — Instrumentation.**
- Refusal regex broadened to catch `can't help / hard line / off-limits / off the table` in both `ask/route.ts` and `smoke-test.ts`. Q13 "I'm 17" now correctly tagged as a refusal in production logging.
- **Migration 0004** applied via Supabase SQL Editor: `goals.source_slug text` + partial index, `mister_p_queries.topic_embedding vector(1536)` + HNSW index.
- Topic clustering + §13 circuit breaker end-to-end: every question gets embedded once (shared between retrieval and topic analysis), up to 200 prior queries fetched for in-memory cosine similarity. `TOPIC_SIMILARITY_THRESHOLD = 0.82`, 7-day window, trigger at 5+ similar. When triggered, `CIRCUIT_BREAKER_ADVISORY` is appended to the system prompt for that turn so Mister P names the pattern without refusing the answer.
- **Slice B goal-corpus linkage addition (from user feedback)**: self-acceptance templates for docs 54/55/56 landed in `goal-templates.ts`, `safety: 'Self-acceptance'` added to `CATEGORY_LABELS`. §13's "second leg of the stool" now visible in the library.

**Slice B.5 — Spec amendment follow-through.**
- **Plain-language helper wiring.** `content/povs/_plain_language.json` scaffolded with summaries for ~27 templated docs. `lib/content/plain-language.ts` exports `plainLanguageFor(slug)`. Surfaced in both `goals-picker.tsx` and `library-browser.tsx` as `<details><summary>What does this mean?</summary></details>` disclosures — falls back to description-only when the summary is empty.
- **Process goal soft override.** When user clicks "Start with these" with fewer than 2 of 3 process goals, inline amber nudge shows spec copy with "Swap one" (lowest-scoring outcome → highest-scoring unused process) and "Keep my picks" (dismisses, re-click goes through).
- **Active goal cap at 5 with soft override.** `/api/goals/add` returns 409 `goal_limit_reached` when active count ≥ 5 and `force: true` isn't set. Client catches, shows inline nudge under the card, re-posts with `force: true` on "Add anyway." Per-request check re-fires every attempt at 5+.
- **Template schema refactor.** `GOAL_TEMPLATES` is now `Record<templateKey, {source_slug, ...}>` instead of keyed by slug. Multiple templates can anchor to the same POV doc (process + outcome pairs). `rankCandidates` and `/api/goals/templates` both iterate templates and look up docs by `source_slug`.
- **Outcome templates added.** `weight-loss-10-percent`, `body-fat-15-percent`, `muscle-gain-10lb-6mo`, `hair-retention-one-year`, `clear-skin-30-days`, plus pre-existing `jawline-through-fat-loss` = 6 outcome templates total.
- **Process title rewrites.** "Optimize facial hair" → "Match your facial hair to your face." "Improve the eye area" → "Run an eye-area skincare routine." Same for grooming / style / posture / smile / appetite / gut. All outcome-verb titles rewritten with clear action verbs.
- **Alternatives queue fix.** `/api/onboarding/suggestions` now puts outcome goals at the front of the swap queue so they actually surface on "Swap this one" — previously outcomes sank below 7 process alternatives and were never reachable, which made the process-goal nudge impossible to trigger.
- **Dev reset endpoint.** `app/api/dev/reset-onboarding` + `app/(app)/today/dev-reset-button.tsx`. Marks active goals as abandoned (preserves history), clears `onboarding_completed_at`, leaves survey_responses + age_segment alone. User lands back on `/onboarding/complete` without re-signup. Gated on `NODE_ENV === 'development'` on both server and client.

**Slice B follow-through — Mister P context awareness (the capstone).**
- **Goal awareness.** `ask/route.ts` loads user's active goals with `created_at` and injects them into the system prompt via `formatGoalsBlock`. Each goal shows title + human-readable duration ("active 3 months") + source slug. Mister P anchors responses to active goals when relevant but is explicitly told not to force connections.
- **Depth calibration.** Each goal in the block also carries `priorCitationCount` — how many prior Mister P answers cited this goal's source doc. Counted per-query (one answer citing 5 chunks from doc 21 counts as 1, not 5). Tells Mister P when a user has already read a doc multiple times so he skips the foundations and gets to the next layer. Mister P picks the depth turn-by-turn based on goal age and citation history.
- **Stickiness 5c — proactive suggestions.** When a question is a new topic for the user (`isNewTopic` true) AND they have ≥ 2 prior queries (so the nudge feels earned), the ask route injects a proactive-suggestion advisory telling Mister P to answer the question normally, then append a single natural one-liner offering a deeper dive into the top retrieved POV doc. Explicitly tells him to skip the offer if the doc isn't a good match. Circuit breaker takes priority in the unlikely case both conditions fire (they're mutually exclusive by definition — circuit breaker needs similar topic, proactive needs new).

### Verified working this session

- `npm run typecheck` — clean after every change
- `npm run build` — clean, all routes compiled
- `npm run smoke-test` — **20/20 functional pass, 9 refusals detected** (up from 7 — the broadened regex is catching more real refusals, not false positives; Q11 coffee-and-growth and Q14 500-cal-diet are both spec-expected refusal paths)
- Browser end-to-end: dev reset → `/onboarding/complete` → suggestions with plain-language disclosures → swap to outcome goals → process-goal nudge fires → "Swap one" works → accept → `/goals` list → `/goals/library` with category chips and personalized ordering → add 5 goals → 6th add triggers soft cap nudge → "Add anyway" works

### Not verified (no natural surface in MVP yet)

- **Circuit breaker firing** — requires 5 semantically similar questions in 7 days. Not tested manually.
- **Proactive suggestion firing** — requires a user with 2+ priors asking a brand new topic. Should fire organically once real users exist; for now, the code path is reached but the LLM-generated suggestion hasn't been eyeballed.
- **Goal awareness chat output** — the prompt injection is confirmed, but Mister P's actual in-voice calibration hasn't been seen in browser because `/today` still has no chat UI (Week 4 scope). The prompt structure is sound.

### Outstanding — what the next session should start with

**Week 4 — Today screen + check-in loop + chart + chat UI.** This is the critical-path home screen and the last MVP scope block before Week 5 content pages. Spec §9 Week 4 list:

1. **Build Today screen layout.** Currently a stub with three placeholder sections. Replace with: today's daily check-in (or confirmation), confidence trend chart, active goals short list, Ask Mister P entry point. Keep it calm — spec §2 Feature 4 says "Apple Fitness rings energy, not Bloomberg terminal energy." Four things, no widgets.
2. **Daily check-in component.** One checkbox per active goal (no confidence rating — that's weekly). Writes to `check_ins` (`user_id, date` unique) + `goal_check_ins` (one row per goal per check-in). State: loads today's check-in if it exists, otherwise an empty form. "Already checked in today" handled gracefully — show the completed state with an undo option.
3. **Confidence trend chart.** Uses Recharts per spec. Reads `weekly_reflections` (already in schema from migration 0001). X-axis is week_start, Y-axis is 1–10, one line per contextual dimension (social, work, physical, appearance) or an averaged line. Updates weekly, not daily — consistent with spec §13 psychological safety. For MVP, start with averaged single line; add per-dimension toggle later.
4. **Weekly reflection form.** Shown on Sundays per spec §2 Feature 2 ("Weekly, 60 seconds"). Four sliders, notes field, one week_start per user. Probably lives on Today screen as a prominent card on Sundays, or at `/reflect/weekly`.
5. **Mister P chat UI into Today screen.** Entry point on Today that opens a simple chat (can be a modal, a pane, or a separate page — spec says "always one tap away"). Use the existing `/api/mister-p/ask` endpoint which already handles streaming, goal awareness, topic clustering, circuit breaker, and proactive suggestions. Client needs to handle streamed text (the AI SDK has helpers for this). This is where all the Session 3 Mister P work becomes user-testable for the first time.
6. **Stickiness 5a — Weekly reflection email.** Sunday 6pm trigger, Resend template, pulls days-checked-in + goal completion rate + one pattern observation. **Depends on check-ins existing**, so build after item 2.
7. **Stickiness 5b — Monthly checkpoint.** Day 30 screen showing confidence delta, goal completion rate, three new suggested goals. Reuses `rankCandidates`. **Depends on weekly reflections existing**, so build after item 3 + 4.

**Rough ordering for session 4:** Today layout → daily check-in → chat UI → weekly reflection form → chart → then emails/checkpoint. Chat UI is where the goal-aware Mister P finally becomes demoable, so prioritize it.

### Known issues / limitations carried forward

- **Title-based duplicate detection in `/api/goals/add`** — should migrate to `source_slug` matching now that the column exists. One-line change, not blocking.
- **In-memory topic similarity** scales to ~500 queries per user before becoming a latency concern. Migrate to Postgres RPC when needed.
- **Eye-area retrieval gap** (Q9 smoke test) — still deferred. Probably chunk-size tuning in docs 44/47.
- **Mister P refusal regex** caught the under-18 case after the Slice B fix but still pattern-matches rather than LLM-classifies. Good enough for MVP.
- **Circuit breaker not manually verified end-to-end** — needs a user with real query volume.
- **`.env.local` secrets** still not rotated. User decision.
- **No Google OAuth, Stripe Checkout, PostHog** — deferred from earlier weeks.
- **Supabase SQL Editor, not Migrations panel.** The Migrations panel throws "Unexpected identifier 'table'" on ad-hoc DDL. Always use SQL Editor.

### Spec amendments landed this session

- §1: "One path among several" framing added — Cleanmaxxing owns physical attributes, acknowledges therapy/relationships/purpose as the other three routes.
- §2 Feature 1: Process goal soft override, plain-language helper text requirement, active goal cap at 5 with soft override, three new Done-when bullets.
- §3: v2 backlog entry for scoring named influencers across the "Is Clav Right" methodology (month 4–6, after subscribers exist).
- §9 Week 5: "Ways to build self-confidence" homepage framework section added as explicit deliverable.
- §13: Active goal cap at 5 commitment added, referencing Feature 1 for implementation detail.

### Spec amendments landed 2026-04-15 (morning notes batch, pre-session)

- §1: two explicit brand lines added — "Not medical" (Mister P never interprets labs, diagnoses, or advises on treatment) and "No hierarchy of worth" (explicit rejection of alpha/high-value-male/attractiveness-ranking framing; stated in Cleanmaxxing's voice as a defensive posture against the category's origin baggage).
- §2 Feature 1: visible tier badges on every goal card with one-tap explainer + one-line rationale on the suggestions screen; motivation-aware routing (ambient, not labeled) driven by new `motivation_segment` field. Five Done-when bullets added for tier badges, rationale line, motivation persistence, and motivation-weighted ranking.
- §5 Data model: `users.motivation_segment` (enum, 6 values) and `users.motivation_specific_detail` (nullable text) added.
- §6 Mister P system prompt: hard refusal added for lab interpretation / diagnosis / treatment recommendations (Mister P may contextualize lifestyle but must redirect clinical questions to a physician); hard refusal added for alpha/high-value-male/attractiveness-hierarchy framings with an in-voice redirect ("I don't think about it that way…").
- §7 Onboarding survey: new motivation question inserted as Q4 in Bucket A (6 single-select options + optional follow-up free text when user picks "something specific bothering me"); Q5 onward renumbered; total survey length 16 questions. "After submit" block updated to persist `motivation_segment` and feed it into the suggestion algorithm.
- §13: new anti-hierarchy commitment bullet (brand line enforced via §1 + §6 + a pre-launch corpus audit to sweep the 90k-word POV corpus for alpha/high-value/worth-via-attractiveness framings).
- New §14 "v2 Backlog": blood labs with LLM analysis (2–3 months, non-negotiable scope constraint that Mister P contextualizes but never interprets), in-app frictionless tracking utilities (~6 weeks, opinionated per-category trackers not a generic framework, integrations as year-2 play), pointer to influencer scoring, and a standing medical-adjacent-restraint discipline that applies to all v2 decisions. Former §14 "What This Doc Is Not" renumbered to §15.
- **Implementation follow-through not yet landed in code** (next session pickup): add `motivation_segment` + `motivation_specific_detail` columns via a new migration, wire Q4 into the onboarding survey flow and the suggestion algorithm, add tier badges to `goals-picker.tsx` + `library-browser.tsx`, and add the lab-interpretation / hierarchy refusal rules to the Mister P prompt + smoke tests.
- **Corpus audit task queued pre-launch**: half-day sweep of all POV docs for alpha/beta, "high-value male," PSL/decile/tier-list, and worth-ranking language. Flag and rewrite.

### How to resume next session

```bash
# Dev server probably still running. If not:
npm run dev

# Sanity checks:
npm run typecheck
npm run smoke-test   # optional, should still be 20/20

# Week 4 starting points (in rough order):
# 1. Replace the /today page stub with a real layout (3 sections + Ask Mister P entry)
# 2. Build lib/check-in/ helpers and /api/check-in POST/GET
# 3. Wire the daily check-in card into /today — this is the simplest loop
# 4. Build a chat UI for Mister P — modal or pane on /today
#    (this is where goal awareness + proactive suggestions + depth calibration
#    become testable for the first time — prioritize it)
# 5. Build the weekly reflection form
# 6. Build the confidence trend chart (Recharts, reads weekly_reflections)
# 7. Weekly email + monthly checkpoint if time
```

### Commit history this session

- `f21ddd1` — library browse with personalized ordering (Slice A)
- `b5158e3` — topic clustering, circuit breaker, goal-corpus linkage (Slice B)
- `0e8f5af` — spec amendments + multivitamin framing (between slices)
- `02e00c3` — plain-language helpers, outcome goals, goal cap, dev reset (Slice B.5)
- `16e133d` — goal awareness, proactive suggestions, depth calibration (capstone)
