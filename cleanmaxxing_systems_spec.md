# Cleanmaxxing Systems Specification

**Version:** 0.1 (initial draft, 2026-05-11)
**Owner:** Phil
**Purpose of this doc:** Single source of truth for four shipped subsystems that the MVP spec doesn't cover at depth: the Premium tier and its gates, the journey-state + maintenance-reflection system, the Facial Structure journey, and the Mister P chat architecture. Each section mirrors the level of detail in the MVP spec's §2 / §5 / §6 — schema, code paths, prompt blocks, surfaces. Update in place when behavior changes; bump the version and add a "What changed in 0.X" paragraph below.

**What changed in 0.1:** First cut. Captures everything shipped through 2026-05-11. Wide-and-deep rather than narrative — the MVP spec already carries the narrative arc. Sections are intentionally orthogonal so each one stands alone for in-context reads in Claude Code.

---

## 1. Premium Tier and Gates

### 1.1 Tier model

Two tiers — **Free** and **Pro** — plus a **trial** state that maps to Pro for billing-status purposes.

`subscription_status` on the `users` table is the source of truth. Values: `'trial' | 'active' | 'canceled' | 'past_due'`. New users default to `'trial'` with a 14-day window measured from `users.created_at`. `lib/billing/is-premium.ts::getPremiumStatus(userId)` returns `{ isPremium, status, trialDaysLeft }`:
- `'active'` → `isPremium: true`
- `'trial'` AND within 14d → `isPremium: true` with `trialDaysLeft` set
- `'trial'` AND past 14d → `isPremium: false`
- `'canceled'` / `'past_due'` → `isPremium: false`

Every gate in the app reads through `getPremiumStatus()` or the `requirePremium()` route guard (which returns a 401 for unauthenticated callers and a 402 with `error: 'premium_required'` for authenticated-but-free callers). No gate should branch on `subscription_status` directly — the trial-as-premium semantics live inside `getPremiumStatus`, and bypassing it produces incorrect behavior on day-15 of a trial.

### 1.2 Gate inventory (all live)

The full list of behaviors gated on Pro, with the enforcement file in each case:

| Gate | Free | Pro | Enforcement |
|---|---|---|---|
| Core journeys assessable | 3 (focus_areas pick) | All 10 | `lib/journeys/cap.ts`, `app/api/onboarding/answer/route.ts`, `app/api/quarterly-survey/route.ts` |
| Mister P queries / month | 10 substantive | Unlimited | `app/api/mister-p/ask/route.ts` (FREE_MONTHLY_LIMIT = 10, MIN_SUBSTANTIVE_CHARS = 150) |
| Mister P cross-journey awareness | Filtered to focus_areas | All 10 + advanced protocols | `lib/mister-p/prompt.ts::formatJourneyStateBlock` + `JourneyFilterKey` map in `app/api/mister-p/ask/route.ts` |
| Photo-aware Mister P | ✗ | ✓ (5 images: baseline / face progress / body / fit / hair) | `app/api/mister-p/ask/route.ts` (image attachment block wrapped in `if (premium.isPremium)`) |
| Wearable connect (Junction) | ✗ | ✓ | `app/api/health/connect/route.ts` (`requirePremium()`) — settings card swaps to upgrade CTA when free. Already-connected free users (downgrade case) keep their data flowing; webhook ingestion is not per-user gated. |
| Wearable-derived signal milestones (RHR trained-band, VO2max progression) | ✗ | ✓ | `lib/milestones/detect.ts` — `getRhrSignals` / `getVo2MaxSignal` return null fixtures for free users at fetch time |
| Protocol anniversary milestones (3-month) | ✗ | ✓ for GLP-1 + peptides; nutrition + strength plan-anniversary too | `lib/milestones/detect.ts` (per-intervention loop, `glp1ThreeMonthsKey` / `peptideThreeMonthsKey`) |
| AI facial analysis | ✗ | ✓ | `app/api/facial-analysis/analyze/route.ts` (`requirePremium()`) |
| Hair cut try-on | ✗ | ✓ | `app/api/plan/hair/try-on/route.ts` (`requirePremium()`) |
| Hair photo trend analysis | ✗ | ✓ | `app/api/plan/hair/photos/analyze/route.ts` (`requirePremium()`) |
| Beard try-on | ✗ | ✓ | `app/api/plan/facial-hair/try-on/route.ts` (`requirePremium()`) |
| Procedural-fit analysis | ✗ | ✓ | `app/api/plan/procedures/fit-check/route.ts` (`requirePremium()`) |

Free milestones (no Pro gate, no wearable dependency): protein-floor autopilot, strength consistency 8 weeks, hair Stage 4 completed, weight 5lb below start, sleep consistency 4 weeks, wardrobe re-eval due, body-fat brackets (25/20/15/12), and the eight per-journey graduation milestones. Self-report data + framework-derived; no per-firing AI cost; belong on the free side per the 2026-05-11 ungating decision.

### 1.3 Free monthly chat cap — fairness rule

The 10/month cap on Mister P chat for free users uses **substantive-only counting**. A query counts toward the 10 iff:
- `was_refused !== true` (the model didn't fire one of the refusal phrases — out-of-scope, hard refusals, off-limits compounds), AND
- `length(answer) >= MIN_SUBSTANTIVE_CHARS` (currently 150)

The substantive count is computed in JS at request time, only when the user is free. Premium users skip the read entirely. Errors that throw before `streamText`'s `onFinish` never insert a row, so they're naturally free. The 402 response carries `error: 'free_monthly_limit_reached'`, `upgrade_href: '/pricing'`, and an in-voice message explaining the rule.

The substantive-only rule is the brand-trust tradeoff: charging users for refusals would actively conflict with Mister P's "say stop when stop is the answer" posture. Principle: when in doubt, undercount; never overcount. If JS-side filtering becomes too expensive at scale, swap to a generated stored column (`was_substantive boolean GENERATED ALWAYS AS (...) STORED`) and convert the filter back to a HEAD aggregate.

The 30 requests/hour and 200 requests/day abuse-protection caps still apply to all users (premium and free) — those are infra-cost bounds, not pricing differentiation.

### 1.4 /pricing matrix

Public marketing surface at `/pricing` (`app/(marketing)/pricing/page.tsx`). Single comparison table across six groups: Journeys, Daily use, Mister P chat, Wearable integration, Cross-journey orchestration, AI vision features. Adapts the CTA section to auth + premium state (anonymous → sign up; logged-in free → plan picker; logged-in Pro → manage billing).

Every row in the matrix matches behavior the code actually enforces today. The page-header comment block is the audit log; it lists each gate's enforcement location so a future audit can verify rather than re-derive.

Header pitch: "Three core journeys free. All ten plus advanced protocols on Pro." Pricing is **$9.99/mo**.

### 1.5 Pricing copy doctrine

The /pricing page is a marketing surface, not a feature spec — but it is read carefully by users about to spend money, so two rules:

1. **No internal jargon.** "Pattern A" / "Pattern D" / "modifier-aware" / "stage-gated" are removed in favor of plain English. The exception: technical terms users will encounter in the product anyway (RHR, VO2max, journey, protocol, etc.).
2. **Roadmap framing for partial features.** "Apple Health support is on the iOS app roadmap" is honest and forward-looking; "needs a native iOS bridge that this web app doesn't have" reads defensive. Partial-protocol claims get specific: "3-month anniversary milestones for GLP-1 and peptides (TRT on the roadmap)" rather than implied parity.

### 1.6 Upgrade UX surfaces

Where a free user lands when they hit a gate:

- **Mister P chat cap (402 free_monthly_limit_reached)** — chat surface renders the in-voice message + an "Upgrade to Pro" link to `/pricing`.
- **Wearable connect (settings card)** — the connect button is replaced with a "Pro" badge + "Upgrade to connect a wearable →" link.
- **AI vision routes (try-on, facial analysis, photo trend, procedural-fit)** — each surface owns its own "Pro feature" framing in the UI; the API returns 402 if a free user tries anyway.
- **Cross-journey awareness (Mister P prompt)** — silently filtered. Free user asking about a journey they didn't pick gets a generic answer rather than a paywall — by design, no upsell prompt mid-conversation.

Trial users always see the full Pro experience; the trial-day countdown surfaces at `/settings/billing`.

---

## 2. Journey-State and Maintenance Reflection

### 2.1 Why this exists

The MVP shipped each journey as a Pattern A "stage-gated plan you work through over weeks and months" — but the assumption that every user is always in the *implementing* phase broke down once early users started hitting the end of their plans. The maintenance-reflection system makes the **journey lifecycle phase** a first-class signal: implementing → maintaining → drifted → recovering. /plan pages, /today picker, contextual prompts, and Mister P all read from the phase, so the same journey can carry different semantics depending on where the user is in it.

Shipped 2026-05-11 across four slices.

### 2.2 Schema — `journey_states` table (migration 0109)

```sql
CREATE TABLE journey_states (
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  slug text NOT NULL,            -- one of the 10 journey slugs
  phase text NOT NULL,           -- 'implementing' | 'maintaining' | 'drifted' | 'recovering'
  phase_entered_at timestamptz NOT NULL DEFAULT now(),
  drift_signal jsonb,            -- detector that fired (drift phase only)
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slug)
);
```

The phase is computed deterministically on every /today render via `lib/journey-state/compute.ts`. Compute reads each journey's assessment row + recent activity tables; writes back to `journey_states` only when the resolved phase differs from what's stored (avoid no-op writes). When a user transitions `implementing → maintaining`, `lib/journey-state/persist.ts` writes the corresponding **graduation milestone** row (one per journey: `hair_maintenance_reached`, `style_maintenance_reached`, etc. — 10 total).

### 2.3 Per-journey phase compute

Each journey defines its own implementing→maintaining gate inside `lib/journey-state/compute.ts`. Examples:

- **Hair**: maintaining when `stage_4_completed_at` is set AND ≥30 days have passed.
- **Style**: maintaining when `stage_3_acknowledged_at` is set AND ≥30 days have passed.
- **Body composition**: maintaining when the user has held within ±2 lb of their defended weight for 8 elapsed weeks.
- **Strength**: maintaining when the 12-week consistency cadence has held.
- **Cardio**: maintaining when 12 weeks of consistent cadence on prescribed modalities.
- **Sleep**: maintaining when 4 weeks of consistent timing (SD < 1h).
- **Skincare**: maintaining when ≥60 days on the same routine without a meaningful change.
- **Facial hair**: maintaining when target length reached AND upkeep cadence held.
- **Facial structure**: maintaining when `stage_3_acknowledged_at` + 4 weeks (the "framing check" gate).
- **Presentation**: no maintaining state (content hub; no assessment).

The compute is intentionally per-journey and pure — adding a new journey means adding one function, not extending a switch in three places.

### 2.4 /plan maintenance view (Slice 2)

When a journey's phase ≠ `implementing`, the /plan page renders a `MaintenanceView` component instead of the implementing-phase content. Component lives at `components/journey-state/MaintenanceView.tsx`; per-journey content config in `lib/journey-state/maintenance-content.ts` covers all 8 originally-shipped slugs × 4 sections each (the framing's "what's holding," "what drift looks like," "the climb back," "the deeper work"). Vocabulary anchored in POV 54.

Facial structure and presentation (the two journeys added after Slice 2 shipped) inherit the same shape; facial structure has a maintenance content entry, presentation does not (no assessment to graduate from).

### 2.5 Drift detection (Slice 3)

`lib/journey-state/drift.ts` runs alongside the phase compute. When a journey is in `maintaining` AND a drift signal fires, the phase flips to `drifted` and `drift_signal` records the trigger. Detectors:

- **Body composition** — current weight is 5+ lb above the defended anchor for 3 consecutive weekly samples.
- **Strength** — 21 days since the last logged strength workout.
- **Cardio** — 21 days since the last logged cardio session.

Other journeys don't have drift detectors yet; they'll either reach `maintaining` and stay there until the user actively edits the assessment, or get drift detectors added when the right signal becomes available.

When `drifted` fires, a new `journey_drift_detected` contextual prompt surfaces on /today (Phase E of the /today redesign — see lib/contextual-prompt). Per-slug copy lives in `lib/contextual-prompt/copy.ts`.

### 2.6 /today maintenance bucket (Slice 4)

The /today primary-action picker (`lib/today/primary-action-picker.ts`) gained a new `journey_maintenance` action kind, slotted as bucket 8b — between `circuit_breaker` (8a) and `all_quiet` (9). When all the user's journeys are in `maintaining` AND nothing higher-priority fires, the picker surfaces a calm, cadence-anchored card per the user's most-recently-graduated journey. Copy is per-slug; the voice posture is "the work shifts; defended floor; not a finish line" (POV 54).

### 2.7 Graduation milestones

Eight static trigger keys, one per originally-shipped journey, in `lib/milestones/types.ts::STATIC_TRIGGER_KEYS`:
- `hair_maintenance_reached`, `style_maintenance_reached`, `body_composition_maintenance_reached`, `strength_maintenance_reached`, `cardio_maintenance_reached`, `sleep_maintenance_reached`, `skincare_maintenance_reached`, `facial_hair_maintenance_reached`, `facial_structure_maintenance_reached`.

Free for all users — graduation is a celebratory floor; Pro-gating comes downstream on drift detection + climb-back protocols once those mature. Copy in `lib/milestones/copy.ts` (`*_maintenance_reached` keys); voice posture is POV 54: "the work shifts now; routine is built; drift is expected; not a finish line; no confetti."

---

## 3. Facial Structure Journey

### 3.1 Why this exists, and what it isn't

POV 16 (Facial definition / jawline) names five upstream levers that produce the look people are chasing when they ask about jawline / cheekbones / chin: body composition, facial puff, posture + neck, cosmetic procedures, and the framing layer (hair / beard / glasses). The Facial Structure journey is the user-facing surface that routes each user to the right lever for *their* state, rather than recommending the same lever (usually "lose more body fat" or "get filler") to everyone.

What it isn't: a procedure-recommendation engine. The cosmetic-procedure path deep-links into the existing /plan/procedures Pattern D shell; this journey doesn't own the procedure surface.

Shipped 2026-05-11 across three slices.

### 3.2 Schema

Three migrations, all applied:
- **0110** — `facial_structure_assessments` table; 6-question assessment + report storage; Pattern A 4-stage acknowledgement timestamps.
- **0111** — `facial_structure_assessments.last_facial_photo_logged_at` (monthly photo cadence on /today).
- **0112** — `facial_structure_assessments.primary_lever_override` (user override of the computed lever; nullable).

Subsequent migration **0113** widened `chin_jaw_concern` from single-select to multi-select (TEXT[] with check constraint enforcing the allowed enum).

### 3.3 Assessment (6 questions, ~3 min)

Captured fields:
- `body_fat_estimate` — `'under_12' | '12_to_15' | '15_to_20' | '20_to_25' | 'over_25'`
- `face_first_distribution` — `'face_sharper_than_body' | 'face_matches_body' | 'face_softer_than_body' | 'not_sure'`
- `postural_pattern` — multi-select array of `'forward_head' | 'rounded_shoulders' | 'anterior_pelvic_tilt' | 'none_apparent' | 'unsure'`
- `chin_jaw_concern` — multi-select array of `'chin_projection_side' | 'jaw_definition_front' | 'chin_neck_transition' | 'submental_fullness' | 'overall_softness' | 'no_specific_concern'`
- `facial_puff_baseline` — `'rarely' | 'few_days_per_month' | 'most_mornings' | 'persistent'`
- `cosmetic_procedure_openness` — `'not_open' | 'curious_about_options' | 'actively_considering' | 'already_done'`

Plus optional 280-char free text `notes`. Validated via `FacialStructureAssessmentInputSchema` (Zod) at the API boundary.

### 3.4 Primary-lever decision tree

`lib/facial-structure/primary-lever.ts::computePrimaryLever(assessment)` runs first-match-wins:

1. **Body comp** — `body_fat_estimate ∈ { '20_to_25', 'over_25' }`. Face is downstream of the cut; nothing else is the primary move until BF moves.
2. **Puff diagnostic** — lean BF + (`facial_puff_baseline === 'most_mornings'` OR `=== 'persistent'`). Issue is upstream variables (sleep / sodium / alcohol). POV 44 framework.
3. **Posture + neck** — lean BF + `postural_pattern.includes('forward_head')` + clean puff. Posture protocol (POV 50) + neck training 2x/week.
4. **Cosmetic Pattern D** — lean BF + clean posture + clean puff + `chin_jaw_concern` includes a structural deficit (`'chin_projection_side'` OR `'jaw_definition_front'`) + openness ≥ `'curious_about_options'`. Deep-links to /plan/procedures.
5. **Framing** — default. Coordinate hair length, beard cadence, tanning, and glasses with the face the user has.

`resolvePrimaryLever(assessment)` wraps this with the override: if `primary_lever_override` is set, return it; else return `computePrimaryLever`. Centralized so every read site goes through the same resolution.

### 3.5 Pattern A 4-stage progression

- **Stage 1 — Acknowledge the read.** User reads the assessment-derived report and explicitly acknowledges (timestamp on `stage_1_acknowledged_at`). Includes the lever-override picker.
- **Stage 2 — Lever-specific work.** Five variants of the Stage 2 card based on `resolvePrimaryLever()`. Each variant owns its own week-by-week protocol.
- **Stage 3 — Framing check.** Cross-journey verification that hair / beard / glasses are doing the framing work the face needs. Acknowledged.
- **Stage 4 — Cosmetic Pattern D deep-link.** Gated on Stage 3 + lever != cosmetic_patternd (if the user is already on the cosmetic lever, Stage 4 redirects to /plan/procedures directly). Carries the buccal-fat-under-30 hard warning.

Single `POST /api/plan/facial-structure/stage` route handles all four acknowledgements (`stage` body param: 1 | 2 | 3 | 4).

### 3.6 Photo cadence

Monthly same-conditions photo (from baseline face slot at /photos). The /today photo-due tile fires when `last_facial_photo_logged_at + 30d <= now()`. Logged via the tile's "I took this month's photo" button, which stamps the timestamp.

### 3.7 Cross-journey reads

The report-prompt and Stage 2 prompt read these other journeys' state at generation time:
- **Hair** — `density_state`, `balding_pattern`, `head_shape` (informs framing layer recommendations)
- **Facial hair** — `current_state`, per-area density (informs framing + jaw-line strategies)
- **Sleep** — average hours last 28 days (powers puff diagnostic routing)
- **Body composition** — `bf_pct_self_estimate` from user_profile

Snapshotted into `report_input_modifiers` at generation time so a stored report stays reproducible against the inputs it was actually written for.

### 3.8 Procedural-fit integration

The /plan/procedures (Pattern D shell for cosmetic procedures) reads facial-structure assessment fields when computing the procedural-fit input state. Six fields explicitly piped through with prompt guidance, plus the buccal-fat-under-30 hard warning when the user is under 30 AND has flagged `submental_fullness` or `overall_softness`.

### 3.9 Mister P chat awareness

`lib/mister-p/journey-state.ts::FacialStructureJourneySnapshot` carries: `has_report`, `body_fat_estimate`, `chin_jaw_concern[]`, `face_first_distribution`, `facial_puff_baseline`, `cosmetic_procedure_openness`, resolved `primary_lever`, `current_stage` (0-4), `days_since_facial_photo`. Surfaces in the journey-state block of the Mister P prompt so chat can answer "what should I be working on for my face?" without re-running the decision tree.

Free users see this state only when `facial_structure` is in their focus_areas pick; Pro sees it always.

---

## 4. Mister P Chat Architecture

### 4.1 Surface map

Mister P is the conversational surface, accessible from:
- **/today chat picker** — journey-scoped threads (mig 0104). 8 entries, sorted via `sortJourneys()`. Each thread is a separate conversation history; per-scope histories are kept disjoint so unrelated topic context doesn't bleed across journeys.
- **App nav Cmd+K launcher** — minimal Dialog primitive opens the same chat surface, defaulting to the General thread (no journey scope).
- **Per-journey "Ask Mister P" CTAs** — preroute into the matching journey-scoped thread.

Single API: `POST /api/mister-p/ask`. Single retrieval pipeline. Single prompt assembly. Threading is purely the `journey_slug` partition on `mister_p_queries`.

### 4.2 Request lifecycle

Per request:
1. **Auth + rate limits** — `supabase.auth.getUser()`; 30/hr + 200/day abuse caps for everyone; 10/month substantive cap for free users (see §1.3).
2. **Premium fetch + abuse counts** in parallel (single `Promise.all` block) so the substantive-cap branch can decide what to do.
3. **Substantive cap check** (free only) — read `was_refused, answer` for current-month rows; filter; 402 if at cap.
4. **Journey scope resolution** — validate `journey_slug` against the JOURNEYS catalog; unknown slugs fall back silently to the General thread.
5. **Question embedding** — single OpenAI embeddings call. Used twice: retrieval + topic clustering.
6. **Semantic-context augmentation** — `lib/mister-p/semantic-context.ts` derives a context query string from `specific_thing` + recent reflection notes; embedded as a secondary query vector for retrieval.
7. **Citation history fetch** — per-user prior citations counted by slug; feeds the reranker (de-rank 3+-cited docs, boost unseen).
8. **Personalized retrieval** — `retrievePersonalized(questionEmbedding, { contextEmbedding, citationCounts, returnCount: 5 })`; merges question + context vectors with dedupe, reranks by slug citation, returns top 5.
9. **Topic cluster analysis** — `analyzeTopicCluster()` detects when the user is asking about the same topic repeatedly. Drives the circuit-breaker advisory (5+ similar queries in 7 days → "less checking, not more advice" pivot).
10. **Advisory selection** — at most one per turn. Circuit breaker > proactive suggestion (deeper-dive POV link). The proactive-suggestion advisory previously gated on goal alignment; goals retired May 2026, so it now fires on any familiar-topic + relevant-chunk combination.
11. **State block assembly in parallel** — `getMisterPUserState`, `getMisterPJourneyState`, focus_areas survey row.
12. **Journey filter compute** — for free users, compute `journeyRestriction` from `focus_areas`. For Pro, null (no restriction).
13. **Conversation history fetch** — `getRecentConversation(supabase, user.id, { journeySlug })`. 8-pair General, 15-pair per journey.
14. **System prompt assembly** — `buildSystemPromptFull(contextBlock, advisory, userStateBlock, conversationHistoryBlock, journeyStateBlock)`.
15. **Photo download** (Pro only) — up to 5 images, ordered: baseline face / latest face progress / latest body / latest fit / latest hair anchor. Failure on any single image is non-fatal.
16. **`streamText()`** — Anthropic Claude Sonnet 4.6, temperature 0.3, with images attached as image content parts on the user message when present.
17. **`onFinish`** — write `mister_p_queries` row with citations + `was_refused` + topic embedding; log cost event to `cost_events`.

### 4.3 Prompt blocks

Assembled in this order inside `buildSystemPromptFull`:
1. **Base system prompt** (`MISTER_P_SYSTEM_PROMPT` constant) with `{retrieved_chunks}` substituted.
2. **User behavioral state** (`--- USER BEHAVIORAL STATE ---`) — specific_thing, age, height, weight, sleep recent, workouts last 7d, confidence trajectory, stuck dimensions, profile self-report. Hard rule: do NOT narrate this back to the user.
3. **User's active journeys** (`--- USER'S ACTIVE JOURNEYS ---`) — per-journey snapshots filtered by `journeyRestriction`. Always emits `active_protocols` and `photos`.
4. **Conversation history** (`--- CONVERSATION HISTORY ---`) — most-recent N pairs, oldest first, scoped to current thread. Tells the model not to restate, but not to announce continuity either.
5. **Advisory** (when set) — `CIRCUIT_BREAKER_ADVISORY` or proactive-suggestion advisory.

### 4.4 Voice + refusal posture

Voice from the system prompt: direct and a little dry, never hedges or lectures, willing to tell the user something isn't worth their time, never moralizes, never uses the word "journey" *in voice* (the journey vocabulary block tells the model to refer to features by their canonical names, but the conversational word "journey" is forbidden — same prohibition as the rest of the brand).

Hard refusals (regardless of context):
- Synthol, site enhancement oil, any injection for cosmetic muscle appearance
- DNP, clenbuterol, thyroid hormones for weight loss
- Sourcing guidance for any unregulated compound (steroids, SARMs, peptides, research chemicals)
- Prescriptive dosing protocols for non-medical steroid/SARM use
- Extreme caloric restriction (sub-1000 cal sustained)
- DIY dental work, DIY orthodontics, bone-smashing, mewing-as-orthodontics
- Hairline tattoos abroad from unvetted providers
- Lab interpretation, diagnosis, treatment recommendations (redirect to physician)
- Under-18 users (full step-out, not topic-by-topic)
- Attractiveness rankings, "alpha" framings, PSL / decile / tier-list scoring

Refusals get classified at `onFinish` time via the `was_refused` regex (catches "That's not something I cover yet" / "Not something I'll help with" / "can't help" / "hard line" / "off-limits" / "off the table"). Refusals don't tick the free-tier counter (§1.3).

### 4.5 Photo access (Pro only)

When attached, photos are passed as image content parts on the user message in this fixed order:
1. Baseline face photo (front, captured at onboarding or /photos)
2. Most-recent face progress photo (30/90/180d, newest)
3. Most-recent body progress photo (front angle preferred)
4. Most-recent fit photo (clothed full-body outfit shot, for fit/outfit feedback)
5. Anchor angle from most-recent COMPLETED hair photo session (front for hair track, top_down for bald track)

Prompt rule: reference photos by what they are ("your baseline" / "your most recent face shot"), never by index. Don't comment unprompted; reference visible features only when they're load-bearing for the answer. When the user asks about progress/change AND both a baseline and recent shot are present, do the comparison directly.

Free users skip the photo download entirely (the entire attachment block is wrapped in `if (premium.isPremium)`); the prompt's existing "If no photo is attached, behave exactly as before" rule handles the empty case.

### 4.6 Cross-journey awareness gate (Free vs Pro)

`formatJourneyStateBlock(state, restrictToJourneys)` accepts an optional set of `JourneyFilterKey` values. When set, only journeys in the set get emitted in the per-journey lines; `active_protocols` and `photos` always emit (universal context).

For free users, `restrictToJourneys` is computed from `survey_responses.focus_areas`:
```
hair → 'hair'
style → 'style'
body_composition → 'nutrition'   (the focus area is named body_composition; the journey-state key is nutrition)
strength → 'strength'
cardio → 'cardio'
skincare → 'skincare'
facial_hair → 'facial_hair'
facial_structure → 'facial_structure'
sleep → omitted (sleep state lives in user-state block, not journey-state)
presentation → omitted (content hub; no assessment state to surface)
```

For Pro users, `restrictToJourneys` is null and every journey with a report gets emitted.

This is the one Pro feature the user never sees a paywall for — silently downgraded for free; no upsell prompt mid-conversation.

### 4.7 Conversation history — per-thread scoping

`mister_p_queries.journey_slug` (mig 0104) discriminates threads. The General thread is `journey_slug IS NULL`; per-journey threads filter on the slug. `getRecentConversation(supabase, userId, { journeySlug })` reads within scope. The `/clear` endpoint hard-deletes within scope so users can reset a thread without nuking their other threads.

Per-scope history caps: 8 pairs for General, 15 pairs for per-journey (journey threads tend to be deeper, more topical).

### 4.8 Cost telemetry

`logCostEvent({ user_id, kind, tokens_input, tokens_output, feature })` writes to `cost_events` (mig 0084). Non-fatal; failures don't affect the chat response. The `kind` matches the pricing-table key in `lib/cost-events/log.ts`. Used for per-user inference cost reporting and aggregate telemetry on `/admin` surfaces.

### 4.9 Embedding + retrieval details

- Embeddings: OpenAI `text-embedding-3-small` (1536 dims).
- Retrieval store: pgvector `pov_embeddings` (37 chunks across 62 POV files; ~180K words total).
- Reranking: citation-history-aware. Unseen docs get +0.04; 3+-cited decay down to -0.15.
- Personalized retrieval merges the question vector with an optional context vector (specific_thing + reflection notes embedded separately). Dedupe by chunk id; rerank; return top 5.

### 4.10 Failure modes that shouldn't burn the user's quota

Three classes of failures explicitly designed not to count:
1. **API errors before `onFinish`** — no row inserted, no count.
2. **Refusals** — row inserted with `was_refused = true`, excluded from substantive count.
3. **Very-short responses** (clarifying-back, brief acknowledgment, partial-stream stub) — row inserted with `was_refused = false` but `length(answer) < 150`, excluded from substantive count.

This is the brand-trust posture: when in doubt, undercount; never overcount. Chat should feel free until the user has actually gotten 10 substantive answers in a calendar month.

---

## 5. Cross-references

- **MVP spec** (`cleanmaxxing_mvp_spec.md`) — §1 positioning, §2 features (original six + §2.6 shipped-beyond-MVP roster), §5 data model (migrations 0001–0034), §6 Mister P prompt at MVP-version.
- **Strategic memos** (`cleanmaxxing-strategic-memos.md`) — positioning + ICP decisions; predates most of what's in this doc.
- **Slice 3 kill log** (`spec_slice_3_kill_log.md`) — features cut from Slice 3.
- **POV onramps review** (`pov_onramps_review.md`) — POV-level review notes.
- **Journey redesign framework** (memory: `project_journey_redesign_framework.md`) — Pattern A/B/C/D templates, modifier system, surface-impact map. The framework predates the journey vocabulary shift; "Pattern A" / "Pattern D" are internal terms only.
- **Pattern A primitives recipe** (memory: `project_pattern_a_primitives_recipe.md`) — file-by-file order-of-operations for adding a new Pattern A topic.

---

## 6. Naming + vocabulary discipline

- **Journey** is the user-facing word for a Pattern-A-shaped plan. 10 journeys today: hair, body composition, strength, cardio, sleep, skincare, style, facial hair, facial structure, presentation. The internal focus_area key for body composition is `body_composition` but the user-facing journey is **Nutrition** (page is `/plan/nutrition`).
- **Advanced protocol** is the user-facing word for Pattern-D-shaped surfaces. 3 protocols today: GLP-1, TRT, peptides. Phases: deciding whether to start, running the protocol, coming off.
- **Pattern A / Pattern B / Pattern C / Pattern D** are internal-only architectural terms. Never use in user-facing copy.
- **Modifier-aware** is internal jargon. User-facing version: "the tiles you see — and what they ask you — adapt to where you are in each plan."
- **Free / Pro / trial** are user-facing tier names. `subscription_status` enum values (`'trial' | 'active' | 'canceled' | 'past_due'`) are internal.
- **POV** is acceptable as user-facing vocabulary — users see the `/povs` library and the "Doc title" linking pattern; the term is part of the surface area.
