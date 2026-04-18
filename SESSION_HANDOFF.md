# Session Handoff

Per `cleanmaxxing_mvp_spec.md` §10: write this at the end of every build session,
read it at the start of the next one.

---

## Last session: 2026-04-17/18 — Stripe end-to-end, Resend pipeline proven, Thread B polish, tiered library layout, corpus audit complete (five commits)

### Current repo state

- **Dev server:** running on http://localhost:3000 at session end.
- **Supabase project:** `zmdijizkxcconyisjcht`. No new migrations applied this session. Two ad-hoc SQL updates run via the SQL Editor: `update public.pov_docs set priority_tier='tier-2' where slug='23-cardio'` + the mirror update on `public.goals` for any users with cardio already added; and a one-off `update auth.users set email='philforlando@gmail.com' where email='philmington@outlook.com'` to consolidate two test accounts during Resend smoke testing.
- **Working tree:** clean for session work. Pre-existing uncommitted changes on `.gitignore`, `content/povs/07-skincare-antiaging.md`, `19-strength-training.md`, `21-protein-creatine.md`, `33-niche-enhancements.md`, and `cleanmaxxing_mvp_spec.docx` carried in from before this session — intentionally untouched. Local test artifact `tests/mister_p_smoke_results.md` still untracked (same handling as prior sessions).
- **Stripe test mode:** fully provisioned. `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` populated with `sk_test_…` / `pk_test_…` values, `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_ANNUAL` populated with test-mode price IDs, `STRIPE_WEBHOOK_SECRET` populated from `stripe listen`. Customer portal configured in the Stripe Dashboard under Settings → Billing → Customer Portal.
- **Resend:** sandbox mode live. `RESEND_API_KEY` set to a real `re_…` key, `RESEND_FROM_EMAIL=onboarding@resend.dev` (sandbox domain, only delivers to the Resend account owner's email). Domain verification for `cleanmaxxing.com` is still pending DNS work — prod emails cannot reach arbitrary users until that happens.
- **Mister P smoke test:** not re-run this session. No refusal-rule changes landed that would affect the 22/22 baseline; should still be 22/22.
- **Onboarding:** new conditional follow-up field appears on the motivation question when the user picks "something specific is bothering me," persists to `users.motivation_specific_detail` via the expanded `/api/onboarding/answer` route.

### Session — what shipped

**Slice 1 — Stripe webhook and customer portal (commit `538835b`).**
- `app/api/stripe/webhook/route.ts` — new. Signature-verified handler mapping `checkout.session.completed`, `customer.subscription.created/updated/deleted`, and `invoice.payment_failed` onto `public.users.subscription_status`. Maps Stripe's richer statuses into the schema's four values (`trial | active | canceled | past_due`). Uses `createServiceClient()` because the webhook has no auth cookie and `public.users` has RLS on `auth.uid() = id`. Raw body via `req.text()` for signature verification. Node runtime pinned explicitly.
- `app/api/stripe/portal/route.ts` — new. Auth-gated POST that reads the user's `stripe_customer_id` and creates a `billingPortal.sessions.create()` session. 400s cleanly when the user has no customer on file.
- `app/(app)/settings/billing/billing-portal-button.tsx` — new. Client button that POSTs and redirects.
- `app/(app)/settings/billing/page.tsx` — replaced the "coming soon" copy with the portal button when `status === 'active'`.
- **Verified end-to-end in test mode:** full checkout via `4242 4242 4242 4242` → redirect to `/today?billing=success` → `stripe listen` terminal logs `checkout.session.completed → 200` → `public.users.subscription_status` flips `trial → active` + `stripe_customer_id` populated. Portal button opens the Stripe-hosted management page and returns to `/settings/billing` correctly.
- **Env gotcha encountered:** during testing the user's `.env.local` briefly contained `sk_live_…` / `pk_live_…` keys. Confirmed no real charges happened (test cards are rejected in live mode; `stripe listen` without `--live` only forwards test events; the test-mode event ID for the completed checkout loaded in `/test/events/…` but not in `/events/…`). Swapped back to test keys and retested cleanly. Worth flagging that the live/test key copy-paste surface in the Stripe Dashboard is a real foot-gun.

**Slice 2 — Resend sandbox wiring.**
- No code changes — the three email routes (`/api/email/welcome`, `/api/cron/weekly-email`, `/api/cron/onboarding-emails`) already gated on `RESEND_API_KEY` and dry-ran when empty.
- Config: `RESEND_API_KEY=re_…` + `RESEND_FROM_EMAIL=onboarding@resend.dev` added to `.env.local`.
- **Verified end-to-end:** hit `/api/cron/weekly-email` with one eligible user → response `{"total":1,"sent":1,"dry_run":0,"errors":0,"dry_run_mode":false}` → email landed in inbox.
- **Still pending pre-launch:** DNS records for `cleanmaxxing.com` on the domain registrar (MX + SPF TXT + DKIM TXT, optional DMARC). Once verified, swap `RESEND_FROM_EMAIL` to `noreply@cleanmaxxing.com` and the weekly + welcome + onboarding sequences can reach real users. Code is already in place — this is purely config + DNS propagation.

**Slice 3 — Thread B: motivation detail + tier explainers + tiered library (commit `c20dca9`).**
- `app/api/onboarding/answer/route.ts` — accepts optional `detail` in the POST body. When the question is `motivation_segment` and the user picked `something-specific-bothering-me`, persists a second row to `survey_responses` under key `motivation_specific_detail` (500-char cap). Wipes any prior detail row on re-answer so a segment swap doesn't leave stale text.
- `app/(app)/onboarding/[step]/page.tsx` — fetches prior `motivation_specific_detail` row when the current question is motivation, passes as `initialDetail` prop to the form.
- `app/(app)/onboarding/[step]/question-form.tsx` — accepts `initialDetail`, shows a conditional 3-row textarea below the choice buttons when the trigger option is selected, includes `detail` in the POST body.
- `app/api/onboarding/submit/route.ts` — reads the detail from `survey_responses` and writes it to `users.motivation_specific_detail`; nulls it if the segment isn't the triggering one (defense-in-depth against stale rows).
- `lib/goals/tier.ts` — new shared util. `TierKey`, `tierLabel()`, `tierExplainer()`, `TIER_ORDER`, `tierRank()`. Six tier keys with one-line explainers. Replaces three duplicated `tierLabel()` functions that previously lived inline in `goals/page.tsx`, `library-browser.tsx`, and `goals-picker.tsx`.
- `components/tier-badge.tsx` — new shared clickable badge component. Renders the pill and toggles an inline tooltip-style explainer on tap. Uses `stopPropagation` so it works inside parent click targets.
- `app/(app)/goals/library/library-browser.tsx` — grouped the templates by tier (Foundation → High impact → Refinement → Top performers → Polish → Situational), each group with a large section header (`text-2xl font-semibold`, thicker underline, count pill). Category filter still works — grouping applies within the filtered view.
- `app/(app)/goals/library/page.tsx` — added framing subtitle: "Build from the bottom up. Foundation first, then high impact, then refinement. Polish is last — easy to over-invest in before the real work is done. Tap any tier label to see what it means."
- `app/(app)/onboarding/complete/goals-picker.tsx` — extended existing rationale line to name the hierarchy explicitly: "Cleanmaxxing runs a hierarchy — Foundation first, then high impact, then refinement. These start at the bottom of that ladder."
- `app/(app)/goals/page.tsx` — replaced inline tierLabel + span with `<TierBadge>`.

**Slice 4 — Cardio tier bump + v2 spec note (commit `5bfffe7`).**
- `content/povs/_metadata.json` — `23-cardio` bumped from `tier-3` (Refinement) to `tier-2` (High impact). Rationale: the doc itself argues cardio is "necessary after 35" for longevity and metabolic health, and the Zone 2 content frames it as a foundation for metabolic flexibility. Tier-3 undersold that; tier-1 would have overstated it for the 18-32 aesthetic case. Tier-2 is the honest middle.
- Live DB sync done via SQL Editor: `update public.pov_docs set priority_tier='tier-2' where slug='23-cardio'` + matching update on `public.goals` for users already added.
- `cleanmaxxing_mvp_spec.md` — added new entry to §14 v2 Backlog: **Age-segment-specific tier overrides for goal templates.** Proposes `priority_tier_overrides: { "33-40": "tier-1" }` field on `_metadata.json` entries, scoped away from per-motivation and per-focus overrides (those belong in the scorer). Revisit trigger: 33-40 user feedback saying cardio/recovery/mobility should have been pushed harder earlier.

**Slice 5 — Corpus expansion: eight new sections across five docs (commit `2622858`).**
- Doc 05 (Supplements): new **B-Complex and B12** section. GLP-1 users, low-meat diets, and 50+ are the deficiency-prone populations. Methylcobalamin dosing. Bloodwork-first posture.
- Doc 10 (Grooming): new **Naturally bushy brows — lean in, don't fight them** section. Reframes thick brows as an asset, explicit pushback against the thinning instinct. Also new **Styling around eye spacing** section for close-set and wide-set eyes — framed explicitly as normal human variation that can be styled around, not a problem to fix. Step 1 center cleanup expanded with tactical detail (direction-of-growth tweezing, nostril-distance gap reference, maintenance cadence, lighted magnifying mirror as the tool).
- Doc 18 (Tanning): new **When Tanning Isn't the Right Path — Fair Complexions** section for Fitzpatrick I-II. Self-tanner as the primary tool, tinted moisturizer as adjunct, wardrobe shifts, and the long-run aging advantage of protecting fair skin through the 20s and 30s.
- Doc 28 (Cosmetic Procedures): new **Non-surgical framing to try first** subsection inside the rhinoplasty section — chin projection, jaw definition, hair, beard, and glasses all pull perceived weight away from a prominent nose. Also new **Functional rhinoplasty and the insurance angle** subsection covering septoplasty vs cosmetic rhinoplasty, the septorhinoplasty combination option, and why bad-faith inflation of functional complaints is both wrong and increasingly impractical.
- Doc 41 (Medical Conditions): new **Eye-Area Medical Conditions — Strabismus, Ptosis, and Chronic Dry Eye** section following the doc's standard What-changes / What-stays-the-same / Physician-involvement structure. Names ophthalmologist and oculoplastic surgeon as correct specialists. Flags that under-eye filler specifically should not be placed while an unmanaged medical eye condition is active.
- Doc 05 also carried a pre-existing relocation of the "Why Not a Multivitamin?" section from C-tier up into the S-tier context — that change was landing in the working tree before this session started and was committed alongside the B12 addition.

**Slice 6 — Pre-launch corpus audit + hierarchy-language cleanup (commit `3999ba2`).**
- Full corpus scan completed. Clean on: `alpha male`, `beta male`, `sigma male`, `HVM`, `SMV`, `PSL`, `chad`, `mogger`, `looksmatch`, `blackpill`/`redpill`, percentile ranking, `out of league`, `dating market`, `objectively attractive`, `top N%`.
- Two passages rewrote hierarchy vocabulary used in refutation (refuting the culture is good, but borrowing its words gives them oxygen):
  - Doc 16 line 111: `"gigachad jaw" obsession` → `internet fixation on maximally-wide jaws`
  - Doc 55 line 36: `the global top decile` → `the most optimized men currently visible online`
- Deliberately kept: `incel forums` in doc 06 (factual origin citation for bone-smashing); `tier list` throughout doc 15 (refers to Cleanmaxxing's S/A/B/C *intervention* tier system, not human ranking); `genetic ceiling` framing in docs 15/16/55 (methodological concept, explicitly anti-hierarchy); the "Most people are not unattractive — they are under-optimized" line in doc 37 (dismissive reframe).
- This completes the §13 pre-launch corpus audit commitment. Future content should stay on the right side of this: tier lists of *interventions* = OK, tier lists of *humans* = not OK.

### Verified working this session

- `npm run typecheck` — clean after every slice.
- Browser end-to-end: full checkout → webhook fires → subscription flips → portal button renders and opens Stripe-hosted management page → cancellation fires `customer.subscription.deleted` webhook and flips back to canceled.
- Resend: one real email delivered end-to-end via `/api/cron/weekly-email`.
- Corpus: two flagged passages rewritten, full scan confirms clean.

### Not verified (deliberately skipped or blocked on external)

- **Stripe live mode** — keys were deliberately swapped back to test after a brief live-key scare. Live webhook endpoint still needs to be created in the Stripe Dashboard, pointed at `https://yourdomain.com/api/stripe/webhook`, and its signing secret pasted into prod env at deploy time.
- **Resend real-domain sends** — DNS records pending. Sandbox is enough for local development but no prod emails land until cleanmaxxing.com is verified.
- **Circuit breaker + proactive suggestion firing** — same carry-over from prior sessions. Both require real user query volume to eyeball.
- **Monthly checkpoint card live-rendering** — same. Flip `CHECKPOINT_FORCE_ELIGIBLE=1` to eyeball locally.
- **Mister P smoke test** — not re-run. No refusal rules changed, should still be 22/22.

### Outstanding — what the next session should start with

Week 5 code is effectively done. What's left is primarily non-code:

1. **Resend production domain verification** — DNS records on the registrar, Resend dashboard verification, swap `RESEND_FROM_EMAIL`. ~15 min of work + propagation wait. Has to happen before any beta user gets real emails.
2. **Stripe live mode cutover** — create the live webhook endpoint in the Dashboard, create live-mode products + prices, set prod env vars. Only at deploy time, not in `.env.local`.
3. **Beta invites + watch sessions** — spec §9 Week 6. Still the next real gate. Invite 10-30 testers from a creator partner, watch PostHog daily, fix top 5 UX issues.
4. **Optional corpus extensions** — if more gaps surface during beta testing (users asking about topics not covered), the pattern is: user identifies the gap, Claude drafts in-voice, Phil polishes. Worked well this session for 8 additions across 5 docs.
5. **Mister P smoke test re-run** — worth doing once more before beta invites just as a sanity check, even though no refusal rules changed.

**Recommendation for next session:** DNS for Resend → beta invite outreach → sit with PostHog after the first few sessions. That's the path to real feedback, which is what everything else in the system is built to respond to.

### Known issues / limitations carried forward

- **Title-based duplicate detection in `/api/goals/add`** — still pending. Should migrate to `source_slug` matching. One-line change, not blocking.
- **In-memory topic similarity** scales to ~500 queries per user. Migrate to Postgres RPC when needed.
- **Eye-area retrieval gap (Q9 smoke test)** — still deferred.
- **Circuit breaker not manually verified end-to-end** — needs real user query volume.
- **`NEXT_PUBLIC_REWARDFUL_API_KEY` empty** — Rewardful loader renders nothing, `getRewardfulReferral()` returns null, Stripe checkout gets null `client_reference_id`. Everything degrades cleanly. Set when the Rewardful account is set up.
- **`CRON_SECRET` not set** — cron endpoints open in dev, fail-closed in production. Set at deploy time.
- **`NEXT_PUBLIC_APP_URL`** — not set locally, defaults to `https://cleanmaxxing.com` in email templates. Set per environment.
- **Build EPERM on Windows** — `.next/static/*` file locks when dev server is running. Kill dev server before `npm run build` for clean production builds locally.

### Spec amendments landed this session

- §14 v2 Backlog: **Age-segment-specific tier overrides for goal templates** — new entry capturing the cardio tier discussion. Scoped to per-age-segment only; per-motivation and per-focus weighting belong in the scorer.

### How to resume next session

```bash
# Dev server may or may not still be running. If not:
npm run dev

# Sanity checks:
npm run typecheck
npm run smoke-test   # should still be 22/22

# Quick eyeball pass:
# - http://localhost:3000/goals/library (tier-grouped sections)
# - http://localhost:3000/settings/billing (portal button visible when active)
# - http://localhost:3000/onboarding/4 (motivation question with conditional textarea)
#
# Next session recommended order:
# 1. DNS records for cleanmaxxing.com → Resend domain verification
# 2. Once Resend is real-domain ready, swap RESEND_FROM_EMAIL, retest welcome + cron
# 3. Create live-mode Stripe webhook endpoint in the Dashboard (only when deploying)
# 4. Beta invite outreach — first creator partner, 10-30 testers
```

### Commits this session

Five commits, all on `master`, not pushed to remote:

1. **`538835b`** — Wire Stripe webhook and customer portal
2. **`c20dca9`** — Add motivation detail field, tier explainers, and tiered library layout
3. **`5bfffe7`** — Bump cardio to tier-2 and note age-segment tier overrides for v2
4. **`2622858`** — Expand corpus: B12, fair complexions, eye medical, nose framing, bushy brows
5. **`3999ba2`** — Remove hierarchy-culture vocabulary from docs 16 and 55

---

## Previous session: 2026-04-15 — Week 4 AND Week 5 substantially shipped (full Today screen, all stickiness mechanics, full marketing surface, Rewardful + Stripe scaffold, settings + billing + step-away, committed in four clean commits)

### Current repo state

- **Dev server:** running on http://localhost:3000 (background task `bvw0ud6dd`). Dev reset button still lives on `/today` top-right when `NODE_ENV=development`. `CHECKPOINT_FORCE_ELIGIBLE=1` in `.env.local` will make the monthly checkpoint card render regardless of days-since-signup (dev-gated, never leaks to prod).
- **Supabase project:** `zmdijizkxcconyisjcht`. **Migrations 0001–0006 applied.** 0005 added `users.motivation_segment` + `users.motivation_specific_detail`. 0006 added `user_email_events` (append-only email dedupe log with unique `(user_id, event_key)`). Always use SQL Editor, not the Migrations panel.
- **Working tree:** clean at session end. Only untracked artifact is `cleanmaxxing-app/tests/mister_p_smoke_results.md` (local test output, previously flagged as gitignored even though `.gitignore` doesn't actually include it — skipped intentionally).
- **Mister P smoke test:** 22/22 all behaving correctly (20 original + Q21 lab-interpretation + Q22 hierarchy-framing). Two new refusal categories fire in-voice.
- **Commits this session (four, in order):**
  - `8210b44` — Add Mister P lab + hierarchy refusals and v2 backlog spec
  - `4887b25` — Ship Week 4 Today screen with check-in, chat, reflection, and motivation routing
  - `80e97a2` — Add monthly checkpoint, weekly email cron, and onboarding email sequence
  - `2243a5a` — Ship Week 5 marketing surface, settings, billing, and step-away

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

**Slice 7 — Dev force-eligible flag for monthly checkpoint.**
- `lib/checkpoint/service.ts` now honors `CHECKPOINT_FORCE_ELIGIBLE=1` when `NODE_ENV !== 'production'`. Lets the card render for review without backdating `users.created_at` in Supabase. Prod-gated — cannot leak.

**Slice 8 — Week 5 marketing surface.**
- `content/marketing/is-clav-right.md` + `app/is-clav-right/page.tsx` — polished version of the existing Clav draft with docx escape characters stripped, bold syntax fixed, reframed in Cleanmaxxing's voice, "That's what Cleanmaxxing is built for" closer. Server component reads the markdown at request time and renders via `react-markdown` with custom component overrides (sans headings, serif 17px body, zinc palette). OG/Twitter metadata + back-link + CTA section. `react-markdown` added as dep.
- `content/marketing/mister-p-background.md` + `app/mister-p/page.tsx` — written from Phil's 11-minute transcript in his own voice. First-person origin story: birthmark, acne, hair loss (college grocery store insults + follow-through at first financial-institution job + Propecia $85/month + X Fusion years with pillows/cars/wind/water detail), body (easy muscle + easy fat + on/off cycles), anti-aging miss, peak ("6 to 8, with hair maybe 8.75"), reckoning ("mistook a three-year genetic window for a personality"), grounding (wife of 9 years, second kid incoming), closes on the scoreboard-vs-process framing with Crocker + Branden as the research backing, then Mister P's will-and-won't-do list, then Clav-page thesis echo. Page component **strips HTML comment blocks server-side before render** so authoring notes never leak.
- `app/page.tsx` — public homepage fully rebuilt. Hero + **four-path framework** ("Ways to build self-confidence" — horizontal responsive grid `sm:grid-cols-2 lg:grid-cols-4` so path 04 "Physical attributes" stays visible with a thicker 2px border and shadow) + "What we own" product breakdown + brand lines ("Not medical" / "Not a hierarchy of worth") + "Is Clav Right?" pointer + final CTA + footer with `/mister-p` and `/is-clav-right` links. Same typography system across all three public pages.
- `content/marketing/creators.ts` + `app/from/[creator]/page.tsx` — parameterized creator landing route. Static `generateStaticParams` per registered slug, per-creator `hook` copy, `tone` enum (direct / analytical / warm) shifts hero intro without forking the template. Three seed entries: `clav`, `hamza`, `tren-twins`. Unknown slugs 404. Signup CTA carries `?via=slug`.
- `app/(auth)/signup/page.tsx` — reads `?via=slug` via `useSearchParams`, persists to `localStorage` as `cm_via` as a Rewardful fallback, **fires welcome email fire-and-forget** via `POST /api/email/welcome` right after `supabase.auth.signUp` succeeds (doesn't await, doesn't block the redirect).
- `lib/supabase/proxy.ts` — `/mister-p` removed from `protectedPaths` (it's a public marketing page now, not a dashboard route). Comment preserved so a future dev doesn't re-add it.

**Slice 9 — Onboarding email sequence (stickiness, welcome + day 3/7/14).**
- Migration 0006 — `user_email_events` append-only dedupe log, unique `(user_id, event_key)`, RLS on with own-read policy.
- `lib/email/onboarding-sequence.ts` — four templates (welcome, day_3, day_7, day_14) in Phil-voice (direct, a little dry, the day_14 email frames the trial end as a real choice point rather than a dark pattern: "If it hasn't been useful, walk away. We'd rather you leave now than stay on something that isn't earning its keep"). Shared inline-styled HTML template + plain-text fallback. `hasStepBeenSent` / `markStepSent` helpers for idempotent delivery.
- `app/api/email/welcome/route.ts` — server route called fire-and-forget from signup. Authed, dedupes via `hasStepBeenSent`, dry-runs when key unset (still marks sent so local repeats stay idempotent), logs but doesn't fail on send errors.
- `app/api/cron/onboarding-emails/route.ts` — daily cron picks up day 3/7/14 by matching `floor((now - created_at) / 1 day)`. Skips paused users. Returns `{ summary, results }` matching the weekly-email cron shape.
- `vercel.json` — adds `0 15 * * *` (daily 15:00 UTC = 11am ET).
- **Dry-run verified end-to-end**: `/api/cron/onboarding-emails` returned `day_3 dry_run` for a day-3 user and `day_2_no_step` skip for a day-2 user on first hit; on second hit the day-3 user correctly dedupes with `already_sent`.

**Slice 10 — Rewardful + Stripe Checkout scaffold.**
- `components/rewardful-loader.tsx` — client script loader via `next/script`. `beforeInteractive` queue shim + `afterInteractive` main script. Gated on `NEXT_PUBLIC_REWARDFUL_API_KEY`. Mounted in `app/layout.tsx` so every public page captures `?via=slug` referrals.
- `lib/rewardful.ts` — `getRewardfulReferral()` reads `window.Rewardful?.referral` safely. Declares `window.Rewardful` global typing inline.
- `lib/stripe/server.ts` — lazy-cached `getStripe()` returning null when env unset. `getPriceIds()` reads `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_ANNUAL`.
- `app/api/stripe/checkout/route.ts` — authed Checkout session creator. Zod body (`plan: 'monthly'|'annual'`, optional `rewardful_referral`). Passes referral as `client_reference_id` so Rewardful reconciles via its Stripe integration. Threads `user_id` through `metadata` + `subscription_data.metadata` so the future webhook has what it needs. Returns 503 with clear error when Stripe env unset.

**Slice 11 — Settings + billing + step-away.**
- `app/(app)/settings/page.tsx` — auth-gated landing with three cards: Billing (links to `/settings/billing`, shows current `subscription_status` badge), StepAwayCard (real, not stub), Account (signed-in email + sign-out).
- `app/(app)/settings/billing/page.tsx` — server component handling `?billing=success` and `?billing=cancelled` query params with toast-style banners (emerald for success, neutral for cancelled). Trial-days-left computed from `created_at + 14 days`. Plan picker only renders when `status !== 'active'`.
- `app/(app)/settings/billing/billing-plan-picker.tsx` — client component, monthly/annual cards (annual emphasized with 2px border + "Save 34%" floating badge). Clicking calls `POST /api/stripe/checkout` with plan + `getRewardfulReferral()`, redirects to Stripe-hosted URL on success, surfaces errors inline.
- `app/api/settings/tracking-paused/route.ts` — zod-validated POST toggling `users.tracking_paused_at` between `now()` and `null`.
- `app/(app)/settings/step-away-card.tsx` — client card with Step-away / Resume-tracking button, pending state, error surface, `router.refresh()` after save.
- `app/(app)/today/page.tsx` — reads `tracking_paused_at`. When paused: daily check-in + weekly reflection + monthly checkpoint hide behind a **"You're stepped away" banner**. **Chart and chat stay accessible** — chart history is useful for reflection and chat has no tracking side effects.

### Verified working this session

- `npm run typecheck` — clean after every slice
- `npm run build` — clean when .next lock isn't held (the EPERM on `unlink` is a Windows/OneDrive dev-server file lock, not a code issue)
- `npm run smoke-test` — 22/22, all categories behave
- Browser end-to-end: Today page renders all cards correctly, daily check-in persists, weekly reflection saves and updates chart via `router.refresh()`, step-away banner replaces check-in/reflection while keeping chart + chat, motivation Q4 visible in onboarding, Clav + Mister P background + homepage + creator pages all render publicly
- `/api/cron/weekly-email` dry-run → `{ dry_run: 2, errors: 0, dry_run_mode: true }`
- `/api/cron/onboarding-emails` dry-run → day-3 user dry-run on first hit, dedupes with `already_sent` on second
- `/from/clav`, `/from/hamza`, `/from/tren-twins` → 200; `/from/nobody` → 404
- `/mister-p` now public (no longer redirects to /login — middleware fix)

### Not verified (no natural surface in current state)

- **Circuit breaker firing** — still requires 5 semantically similar questions in 7 days. Not tested manually.
- **Proactive suggestion firing** — still requires a user with 2+ priors asking a brand new topic. Code path reached but actual one-liner hasn't been eyeballed.
- **Monthly checkpoint card live rendering** — unblocked by the dev force-eligible flag but not actually eyeballed in-browser this session. Set `CHECKPOINT_FORCE_ELIGIBLE=1` in `.env.local` and restart dev to see it.
- **Weekly + onboarding email actual sends** — require `RESEND_API_KEY` + verified `cleanmaxxing.com` domain. Dry-run is the furthest local validation can go.
- **Motivation-segment ranking differences** — still needs a user per segment to A/B the top-3 output. Onboarding flow can be exercised via dev reset button.
- **Stripe Checkout full path** — needs `STRIPE_SECRET_KEY` + `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_ANNUAL`. Route returns 503 cleanly in dev.
- **Rewardful referral cookie → Stripe** — needs `NEXT_PUBLIC_REWARDFUL_API_KEY` + Rewardful↔Stripe integration configured on Rewardful's side.

### Outstanding — what the next session should start with

Week 4 and Week 5 are substantially shipped. The remaining MVP-scope pieces are:

1. **Stripe webhook handler** — `app/api/stripe/webhook/route.ts`. Handles `checkout.session.completed` and `customer.subscription.updated/deleted` to keep `users.subscription_status` in sync. Intentionally deferred this session because webhook handling is load-bearing and should be tested against a real Stripe test account, not written blind. The metadata thread is already in place (`metadata.user_id` on session + subscription) so the webhook just needs to read it and update.
2. **Stripe customer portal link** — `stripe.billingPortal.sessions.create` call, button on `/settings/billing` when `status === 'active'`. Copy already references it ("coming soon"). Straightforward once Stripe is live.
3. **User testing on stickiness loop** — spec §9 Week 5 item. Task, not code. Invite 3–5 testers and watch PostHog session recordings.
4. **Thread B polish** (small remaining pieces, all non-blocking):
   - Conditional follow-up detail field for `something-specific-bothering-me` motivation segment (writes to `users.motivation_specific_detail`, column exists). Requires conditional question rendering in the survey flow — medium change.
   - Tier badge one-tap explainers on goal cards. Badges already render; just needs a disclosure.
5. **Pre-launch corpus audit** — half-day manual sweep of the POV corpus for alpha/beta, "high-value male," PSL/decile/tier-list, and worth-ranking language. Non-negotiable before public launch per §13, not blocking development.
6. **Beta invites + watch sessions** — spec §9 Week 6. Invite 10–30 beta testers from a creator partner, watch PostHog daily, fix top 5 UX issues.

**Recommendation for next session**: build the Stripe webhook against a real Stripe test account (requires creating one + getting test keys), then stand up the customer portal link. After that, the product is legitimately ready for beta invites modulo the corpus audit. Mister P Background page content is already shipped from this session's transcript so the §9 "write in own voice, do not generate" commitment is honored — Phil authored, Claude transcribed and structured.

### Known issues / limitations carried forward

- **Title-based duplicate detection in `/api/goals/add`** — still pending, should migrate to `source_slug` matching. One-line change, not blocking.
- **In-memory topic similarity** scales to ~500 queries per user. Migrate to Postgres RPC when needed.
- **Eye-area retrieval gap** (Q9 smoke test) — still deferred. Chunk-size tuning in docs 44/47.
- **Mister P refusal regex** pattern-matches rather than LLM-classifies. Good enough for MVP. Expanded this session to cover lab-interpretation and hierarchy-framing phrasings.
- **Circuit breaker not manually verified end-to-end** — still needs a user with real query volume.
- **`.env.local` secrets** still not rotated. User decision.
- **`RESEND_API_KEY` empty** — email code in place but gated. Needs key + domain verification before going live. Both weekly-email and onboarding-emails crons depend on this, plus the welcome route.
- **`CRON_SECRET` not set** — cron endpoints are open in dev (correct) and fail-closed in production (also correct). Set alongside Resend keys when deploying.
- **`NEXT_PUBLIC_APP_URL`** — not set locally, defaults to `https://cleanmaxxing.com` in email templates. Set per environment.
- **`NEXT_PUBLIC_REWARDFUL_API_KEY` empty** — Rewardful loader renders nothing, `getRewardfulReferral()` returns null, Stripe checkout gets null `client_reference_id`. Everything degrades cleanly.
- **`STRIPE_SECRET_KEY` / `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_ANNUAL` empty** — checkout route returns 503 with clear error. Billing page shows the error inline if user clicks a plan button.
- **Supabase SQL Editor, not Migrations panel.** Always.
- **Build EPERM on Windows** — `.next/static/*` file locks when dev server is running and build is invoked against the same directory. Kill dev server before running `npm run build` for a clean production build locally.

### Spec amendments landed this session

Every bullet from the 2026-04-15 morning notes batch (see the amendments block below) now has corresponding code **except**:
- (a) the conditional follow-up detail field for the motivation question (column exists, UI not wired)
- (b) tier badge tap-explainers (badges render, explainers not wired)
- (c) the pre-launch corpus audit (manual task)

The Mister P Background page is shipped and fulfills §2 Feature 6 ("write in own voice, do not generate with Claude") — Phil authored the content via transcript, Claude transcribed and structured.

### How to resume next session

```bash
# Dev server may still be running. If not:
npm run dev

# Sanity checks:
npm run typecheck
npm run smoke-test   # should still be 22/22, 8 refusals detected

# Quick eyeball pass:
# - http://localhost:3000/ (homepage with four-path grid)
# - http://localhost:3000/is-clav-right
# - http://localhost:3000/mister-p
# - http://localhost:3000/from/clav (or hamza, tren-twins)
# - http://localhost:3000/today (logged in)
# - http://localhost:3000/settings (logged in)
# - http://localhost:3000/settings/billing (logged in, will 503 the plan buttons until Stripe env set)
#
# To see the monthly checkpoint card without 30 days of real usage:
#   add CHECKPOINT_FORCE_ELIGIBLE=1 to .env.local and restart dev server
#
# Next session recommended order:
# 1. Get Stripe test account, add STRIPE_SECRET_KEY + test price IDs to .env.local
# 2. Build /api/stripe/webhook handler (checkout.session.completed → flip users.subscription_status to 'active')
# 3. Add Stripe customer portal link to /settings/billing when status === 'active'
# 4. (Optional) Thread B polish: conditional follow-up detail, tier badge explainers
# 5. Corpus audit pre-beta
# 6. Beta invites from first creator partner
```

### Commits this session

Four commits, all on `master`:

1. **`8210b44`** — Add Mister P lab + hierarchy refusals and v2 backlog spec
2. **`4887b25`** — Ship Week 4 Today screen with check-in, chat, reflection, and motivation routing
3. **`80e97a2`** — Add monthly checkpoint, weekly email cron, and onboarding email sequence
4. **`2243a5a`** — Ship Week 5 marketing surface, settings, billing, and step-away

Not pushed to remote. Working tree clean except for `cleanmaxxing-app/tests/mister_p_smoke_results.md` (local test output, skipped intentionally — should probably be added to `.gitignore` next session since the handoff has repeatedly claimed it's ignored).

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
