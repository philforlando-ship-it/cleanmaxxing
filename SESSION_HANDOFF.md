# Session Handoff

Per `cleanmaxxing_mvp_spec.md` §10: write this at the end of every build session,
read it at the start of the next one.

---

## Last session: 2026-04-14 — Week 3 Session 3 complete (library browse, instrumentation, Mister P context awareness)

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
