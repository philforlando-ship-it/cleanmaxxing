# Cleanmaxxing MVP Specification

**Version:** 0.5 (updated 2026-04-30 with goal-scoped chat + /profile consolidation + 180d photo)
**Owner:** Phil
**Build window:** ~6 weeks, ~4 hours/day solo
**Purpose of this doc:** Single source of truth for the MVP build. Paste into Claude Code at the start of build sessions. Update as decisions change.

**What changed in 0.5:** Two big surfaces. (a) Goal-scoped Mister P chat threads — each goal gets its own persistent thread, with a thread picker on `/today`, a goal-attached chat panel on `/goals/[id]`, a hard-clear endpoint, retrieval seeded from the focused goal's title + description + source-slug bonus, semantic-context augmentation skipped inside goal threads to prevent reflection-note language from bleeding across topics, prefill events from in-card "Ask Mister P about this" buttons routing into the matching goal's thread, and a `USER'S CURRENT FOCUS` prompt block that disambiguates references like "this" / "this goal" / "it". Migration 0013 adds `mister_p_queries.goal_id uuid references goals(id) on delete set null`; the conversation loader scopes by goal_id (15-pair window per-goal vs 8-pair General); the clear endpoint hard-deletes on confirmation. (b) `/profile` consolidation — the `/progress` folder is gone, merged into a single `/profile` page covering photos, Tier 1 stats (training, sleep, body comp, diet, height, weight), and Tier 2 personal info (hair, skin, current interventions, budget, relationship). Photos now have a fourth slot (180-day) for the slow-moving variables — hair regrowth, late aesthetic compounding, sustained recomp — with bounded `/today` nudge windows so 30d/90d/180d don't double-prompt (`[30,90)`, `[90,180)`, `[180,∞)`). Migration 0014 adds `user_profile.current_weight_lbs`; migration 0015 adds `user_profile.height_inches`; migration 0016 widens `progress_photos.slot` CHECK to include `'progress_180d'`. Weight and height fall back to the onboarding survey answers at read time, so users who answered onboarding don't see those fields as null on first `/profile` visit.

`/today` restructure: This Week's Focus moves to slot 2 (right under Daily Check-In) so daily action and weekly context pair up, Mister P drops to slot 3, the standalone WeeklySummaryStrip is deleted and its count line + emerald progress bar fold into the focus card's header, A/B/C lettering replaces numeric prefixes on goal associations across both cards, `Week N · stage label` annotation surfaces next to walkthrough weeks (so "Week 5" reads as "Week 5 · Some experience" rather than appearing arbitrary), the `AdjustBaseline` control is now inline on each focus card so users can correct the stage-derived week without leaving `/today`, and per-Daily-Check-In-row "Focus →" deep links smooth-scroll to the matching focus entry via `#focus-<slug>` anchors. A new profile completion nudge sits between `FirstRunCard` and the photo nudges — computed from 11 structured fields (multi-select `current_interventions` and free-text `diet_restrictions` are excluded so 100% is reachable for users not on anything; photos are excluded entirely — taking a baseline photo isn't profile completion). Weight and height fall back to onboarding answers in the percentage calc too, so users start at ~18% post-onboarding rather than 0%; the card disappears at 100% with no dismissal.

Mister P calibration: height now renders in feet-inches form (`6'3"`) in both the user-state block and his answers via a system-prompt rule. Markdown links to POVs are first-class output — answers write `[Doc title](/povs/<slug>)` and a `lib/mister-p/render-answer.tsx` helper turns them into clickable anchors in both chat surfaces. The prompt's prior "do not name the POV docs" rule was inverted to instruct linking at the natural moment of reference (max 1–2 per answer) plus a special case for "where can I read X" questions to lead with the link.

`/povs` reader gains GFM tables (`remark-gfm`) and matching component styling, with comparison tables added to four POVs — `40-peptide-deep-dive` (Tesamorelin / CJC-1295-Ipamorelin / AOD-9604 across mechanism / primary goal / FDA status / evidence quality / IGF-1 effect / supervision), `11-teeth-smile` (appearance damage by cause), `27-hair-loss-treatments` (FUT vs FUE), `29-body-hair-methods` (5-method summary across result / cost / lasts / best for). `18-tanning` gains a "Bronzer — The Cosmetic Layer" section for the cosmetic-vs-tanning distinction.

Nav cleanup: "Other Info" label changed to "Articles" (URL stays `/other-info`); in-app variants of the four marketing articles render at `/other-info/<slug>` inside the app layout with the AppNav visible and the marketing signup CTA stripped — logged-in users don't need a "Start free trial" pitch on internal article reads, and the back link points at `/other-info` rather than `/`. The public marketing routes (`/two-layers`, `/tom-brady-face`, `/is-clav-right`, `/mister-p`) are unchanged for SEO/share-link continuity. `Progress` in the nav becomes `Profile` at the renamed `/profile` URL; the old standalone `/profile` page is merged into the new combined surface as a "Personal info" section.

Goal-template + content polish: "Reveal your jawline through fat loss" retitled to "Reveal your jawline" with description rewritten to match the onramp's actual posture + neck training focus (the prior copy implied fat loss was the implementation when it's actually the parallel track); three interventions added to the chip set (`creatine`, `ssri`, `adhd_stimulant`) where there's a real interaction worth flagging; homepage pillar 02 retitled "Process + outcomes"; "radioactive parts of the category" replaced with "worst parts of looksmaxxing culture" on `/is-clav-right` and `/tom-brady-face`; Tom Brady article retitled "Tom Brady's face and physique did more for his brand than seven rings".

Bug fixes shipped alongside: library route's age-segment filter (`/api/goals/templates`) inherits 33-40 docs for 41-45/46-55 users — was previously wiping the library to empty for 41+ users because the filter didn't have the same fallback the goal-ranker's `appliesToAge` does; week-1 `weekly_reflections` row auto-seeded from baseline `confidence_dimensions` values on `/api/onboarding/submit` so the `/today` reflection card lands in the saved/locked state immediately instead of re-asking the four confidence questions the user just answered.

§5 data model: `mister_p_queries.goal_id` (nullable, FK to goals.id, on delete set null) — migration 0013 with composite index on `(user_id, goal_id, created_at desc)`. `user_profile.current_weight_lbs numeric(5,1)` (80–500) — migration 0014. `user_profile.height_inches int` (48–96) — migration 0015. `progress_photos.slot` CHECK constraint extended to `('baseline', 'progress_30d', 'progress_90d', 'progress_180d')` — migration 0016. §6 Mister P prompt: `USER'S CURRENT FOCUS` block (`formatActiveGoalFocusBlock`) injected when the ask request carries a validated `goal_id`; height-formatting rule; markdown-link rule replacing the prior "do not name POV docs" prohibition.

**What changed in 0.4:** Strategic positioning pivot from "structured self-improvement for men 18-45" to "the no-bullshit appearance playbook for men over 30," with the ICP narrowing to 32-42. The catalyst was a clarifying read on what was actually being built — every safety rail, every refusal in Mister P, every process-over-outcome decision had been moving the product away from the looksmaxxing-curious 22-year-old and toward the 38-year-old waking up to appearance decline. Rather than retrofit the product to a younger audience, 0.4 commits to the audience the product naturally serves. Concrete changes: §1 target user updated from 18-45 to 30-55 with the ICP framing; homepage rewritten to lead with "Looking your best matters more after 30, not less" and a "the window closed" sub-hero (aging is the antagonist, not another influencer); age cap extended from 45 to 55 with a new `'46-55'` AgeSegment and a chained inheritance fallback (`46-55` → `41-45` → `33-40`); a new `'maintenance-aging'` motivation_segment value with a `+3 process / -3 outcome` ranker bias; targeted POV editorial pass on the three docs most prone to younger-internet framing — POV 15 ("looksmaxxing as a strategy game" → "an ecosystem of diagnostics and protocols"; "AI height hacks" → "obscure cosmetic procedures"; explicit "reads as an eight / reads as a five" PSL scoring softened); POV 51 gains a re-entry / late-30s bio example for the divorced/widowed cohort. Pricing knob ($9.99 → $14.99 experiment), creator GTM pivot (away from looksmaxxing TikTok, toward men's lifestyle podcasts + grooming/dermatologist YouTube + finance-and-fitness Twitter), and POV `_metadata.json` audit for `'46-55'` tagging are deferred — each warrants its own decision after first-tester signal. Bug-fix follow-on (2026-04-30): migrations 0011 and 0012 backfill the `users.motivation_segment` and `users.age_segment` CHECK constraints to match the values added during 0.4 — both were stale at the DB layer and rejected end-of-onboarding for users picking `'maintenance-aging'` or aged 41+ (caught when a beta tester hit it).

**What changed in 0.3:** §2.6 expanded with twenty-one surfaces shipped on top of 0.2, across four themes: (a) onboarding and suggestion intuitiveness — post-onboarding first-check-in spotlight, personalized "Why these three?" explainer, Anti-aging focus area, age-relevant POVs on `/povs`; (b) an adaptive personalization loop that closes the behavioral feedback gap — stale-goal re-entry nudge, stuck-confidence contextual POV, quarterly re-survey at day 90, Mister P user-behavioral-state threading (specific_thing text, tenure, weekly completion rate, per-dimension confidence trajectory, stuck dimensions), monthly-checkpoint surfacing of specific_thing, rolling conversation history in Mister P's prompt, citation-aware chunk reranking, and semantic-context retrieval augmentation from specific_thing + recent reflection notes; (c) /today UX calibration — Mister P moved to second slot, post-reflection recap in the saved view, inline confidence chart live-preview inside the reflection edit form, weekly reflection soft-lock after save, day-30 progress photo between baseline and 90d; (d) target-user widening from 18–40 to 18–45 with a new '41-45' segment that inherits 33-40 POV tags via a ranker fallback (§1 target-user copy updated; POV metadata audit deferred). Plus POV 11 gains a flossing section and ranked whitening options; POV 25 gains an "Integrating Acne Treatment With a Baseline Skincare Routine" section. The `sync-povs` workflow is formally retired — `content/povs/*.md` is canonical and `npm run sync-povs` no longer exists. §5 data model: `progress_photos.slot` CHECK widened to include `progress_30d` (migration 0009); quarterly re-survey answers land in `survey_responses` under versioned keys; `users.age_segment` enum gains '41-45'. §6 Mister P system prompt: a new `USER BEHAVIORAL STATE` block and a `CONVERSATION HISTORY` block are injected alongside the active-goals block, with explicit calibration-only-never-narrate instructions on both.

**What changed in 0.2:** §2.6 added (a roster of surfaces shipped beyond the original six features — goal detail page, baseline stages + per-POV walkthroughs, progress photos at 90 days, weekly summary strip, per-goal weekly count, dark mode, persistent nav, scoped /povs, goal-alignment insights on monthly checkpoint, first-run card, Mister P proactive-advisory gating). §5 data model corrected (removed `check_ins.confidence_score`, added `weekly_reflections`, `progress_photos`, and the `source_slug` / `goal_type` / `baseline_stage` columns on `goals`). §6 Mister P system prompt updated to match the shipped prompt (citations removed; active-goals block and per-turn advisories documented). §2 Feature 4 updated to reflect the current Today-screen card stack.

---

## 1. Positioning and Brand

### The one-sentence pitch
Cleanmaxxing is the safe, structured, brand-trustworthy self-improvement platform for men who want to look and feel better without the radioactive parts of looksmaxing culture.

### Brand pillars
- **Clean.** No sourcing guidance, no dealer-mode dosing protocols, no dental DIY, no extreme protocols. Advanced tools like TRT and peptides are discussed honestly as education — with mechanisms, realistic outcomes, and risks — but never as prescriptive "do this cycle" instructions. If a user wants to pursue a medically-supervised path, we tell them to see a physician.
- **Structured.** Users get a hierarchy of what to work on, in what order, based on their age and goals. Not a firehose of content.
- **Honest.** We tell users when popular gurus are wrong, including when their own favorite creators are wrong.
- **Private.** No community shame, no leaderboards at launch, no public profiles. Your data is yours.

### Strategic wedge
The category is currently dominated by individual creators (Clav, Hamza, Tren Twins, etc.) whose audiences trust them but whose advice is inconsistent, sometimes unsafe, and not personalized. Cleanmaxxing is not trying to replace them — it's the structured, safe "second opinion" that their own audiences secretly want.

### Framing: one path among several
Cleanmaxxing positions itself as **one route to self-confidence, not the only one.** The homepage presents four paths that research and experience suggest actually move the needle on how men feel about themselves:

1. **Therapy and internal work** — addressing root causes, narratives, and nervous-system regulation
2. **Relationships and social investment** — deepening friendships, romantic connection, community
3. **Purpose and accomplishment** — work, craft, skill development, meaningful contribution
4. **Physical attributes** — body, skin, hair, style, grooming, posture

Cleanmaxxing owns path four explicitly: the fastest measurable progress of the four (six months versus years), process-based, safe, and honest about its limits. The other three paths are not diminished — they are acknowledged as real and often more important over a full life. Most looksmaxing products frame themselves as *the* way to become a better version of yourself; Cleanmaxxing declines to do that. The intellectual honesty is itself the moat — and it's what separates us from every competitor who treats appearance as the whole identity.

This framing is not just a homepage element. Mister P's voice, the goal library's inclusion of self-acceptance content, and the "step away" mode in section 13 all follow from it.

### Target user
Men aged 30–55 who want a structured, evidence-based appearance playbook for the years that count. ICP narrows to 32–42: old enough to have disposable income and a clear sense of what is sliding, young enough that meaningful return on appearance investment is still on the table over a multi-decade horizon. The product still works for users 18–29 (the broader signup window covers 18–55), but the homepage, voice, and content priority are calibrated to the 30+ case. The pivot from a 18–45 framing to a 30–55 framing was made in 0.4 after recognizing that every product decision — process-over-outcome bias, anti-PSL framing, anti-radicalism rails, the Tom Brady essay's voice — had quietly built a product for adults rather than the looksmaxxing-curious 22-year-old originally imagined. Below 30 is welcome; above 30 is the audience the product speaks to natively. Until the POV `_metadata.json` is audited for explicit segment tagging, users 41–45 fall back to 33–40 docs in the goal ranker, and 46–55 falls back further (46–55 → 41–45 → 33–40).

**Hard age gate: 18+.** No exceptions. This is a brand decision and a liability decision, not just a legal one.

### What Cleanmaxxing is NOT
- Not a dating advice platform
- Not a pickup artist product
- Not an incel-adjacent community
- Not a medical or therapeutic service
- Not a supplement store
- Not for minors

### Two explicit brand lines

These are load-bearing statements. They appear verbatim (or close to it) on the Mister P Background page, in Mister P's system prompt, and in the press kit. They exist because the category has real baggage and the defensive posture is to state our position in our own voice before anyone else frames it for us.

**Not medical.** Cleanmaxxing is not a medical or therapeutic service. Mister P does not diagnose, does not interpret lab results, and does not advise on treatment. When a user brings medical data or a medical question, Mister P contextualizes it within the lifestyle domain Cleanmaxxing owns (sleep, training, nutrition, skincare, grooming, body composition) and then tells the user to take the medical question to a physician. This is the line. It does not move.

**No hierarchy of worth.** Looksmaxxing as a category emerged from communities that tied male worth to a hierarchy of attractiveness — "alpha," "high-value," and the surrounding vocabulary. Cleanmaxxing rejects that framing outright. There is nothing wrong with wanting to look and feel better. There is everything wrong with attaching your worth as a person to where you rank on an attractiveness ladder. We don't subscribe to the worldview the term came from and the product is designed to make that worldview impossible to take root in. Mister P will refuse to engage with alpha/beta, high-value-male, or ranked-attractiveness framings and will redirect the user to what they actually want to work on.

---

## 2. MVP Scope — The Six Things

Every feature below is IN. Everything not below is OUT.

### Feature 1: Onboarding Survey → Initial Goals
**What it does:** New users answer ~15 questions across three buckets (demographics/age, physical baseline and insecurities, self-confidence baseline on a 1–10 scale across 4–5 dimensions). At the end, the system proposes 3 starter goals from the POV hierarchy, filtered by age segment.

**Why it's core:** This is the only differentiated thing in the MVP. If onboarding feels smart and personalized, users come back. If it feels generic, nothing downstream matters.

**Design principle:** Feel like a conversation, not a form. Progress indicator at top. One question per screen on mobile. Default answers pre-selected where reasonable so users can tap through quickly.

**Process goal soft override.** When the user finalizes their three starter goals, check how many are process-oriented versus outcome-oriented. If fewer than two are process goals, show a gentle inline prompt above the "Start with these" button: *"Most people get better results with at least 2 process goals. Process goals are things you do; outcome goals are things you're trying to become. Want to swap one?"* — with a one-tap swap action that replaces the lowest-scoring outcome goal with the highest-scoring unused process goal from the ranking. This is a nudge, not a block. The user can dismiss it and continue. It's a direct implementation of the process-goal default commitment from section 13 — the friction is gentle because the goal is to shift the default, not to moralize.

**Plain-language expansion on every goal.** Each goal card in both the onboarding picker and the library has a one-sentence plain-language helper that appears on tap or hover, demystifying any jargon (TDEE, RDA, 1RM, hypertrophy, compound lifts, androgenic versus anabolic, and so on). Mister P talks to users — he doesn't quiz them. The helper text is sourced from a short plain-language summary line added to each POV doc (new field `faqs.plain_language` or equivalent) so it stays in sync with the corpus and can be edited in one place. Goal templates without a plain-language summary fall back to showing only the main description.

**Visible tier badges on every goal card.** The POV hierarchy (S/A/B/C tiers, or `tier-1` through `tier-5` in the data model) is the foundation of the suggestion algorithm, but it's currently invisible to users. Surface it. Every goal card in the onboarding picker and the library shows a small tier badge ("S — foundational, highest impact," "A — high leverage once the basics are in," "B — worth doing once the foundations are solid," "C — optional refinement") with a one-tap explainer. The goal suggestion algorithm also explains itself in one line at the top of the suggestions screen: *"We suggested these three because they're the highest-impact starting points for your age segment and focus areas."* The point isn't to gate users behind tiers — they can still pick whatever they want — it's to turn the ranking into education. Users who stick around learn the framework as a side effect of using the product, which is itself a stickiness mechanic. Implementation is trivial: the `priority_tier` field is already in the `goals` and `pov_docs` tables, so this is a UI change, not a data change.

**Motivation-aware routing (ambient, not labeled).** The onboarding survey captures a single motivation question early in Bucket A (see §7 — "What's bringing you to Cleanmaxxing right now?" with six options). Store the answer as `motivation_segment` on the `users` table. The segment shapes the experience in several small ways without ever being shown to the user — the personalization is ambient, not labeled, because naming the segment either creates gaming behavior or makes users self-conscious about which bucket they're in.

Routing by segment:
- **feel-better-in-own-skin / not-sure-yet** — process goals up-weighted, self-acceptance POV docs surfaced earlier, weekly reflection copy leans gentler, circuit breaker trips one question earlier. These users are the highest psychological-safety risk and get the softest framing.
- **social-professional-confidence** — the contextual confidence dimensions in the weekly reflection are weighted toward social/work questions, not appearance. Behavioral outcomes up-weighted over appearance metrics.
- **specific-event** — time-boxed goals surfaced, outcome goals tolerated more readily, higher-intensity protocols exposed in the library. These users have a deadline and know it; treat them like adults with a clear ask.
- **structured-plan** — the full framework hierarchy (all tiers, S through C) is visible from day one; these are the systems-thinker power users who want to see the architecture.
- **something-specific-bothering-me** — one follow-up question captures what it is; Mister P is primed to address it directly; the circuit breaker threshold drops from 5 similar questions in 7 days to 3, because this segment is the most at-risk for obsessive checking.

None of this is shown to the user as "you are in segment X." It just changes what appears and in what order. `motivation_segment` is referenced from the goal suggestion algorithm, the weekly reflection email tone selector, the monthly checkpoint copy, and the circuit breaker threshold.

**Active goal cap at 5 with soft override.** Behavior-change research consistently shows 3–5 concurrent habit goals is the sustainable ceiling — beyond that, completion rates fall and users start seeing daily check-ins as a wall of failures. When a user already has 5 active goals and tries to add a 6th from the library, show an inline nudge below the card they clicked: *"You already have 5 active goals. The sustainable ceiling is usually 5 — past that, most people start missing more days than they hit. Want to add this anyway?"* One-tap "Add anyway" confirm overrides the cap. This is a nudge, not a block — same pattern as the process-goal default. The cap applies only to library adds, not to the three-goal onboarding acceptance (which can never hit the limit by construction). Each new add attempt at 5+ re-triggers the nudge; the override is per-request, not a persistent opt-out. This is a psychological safety commitment — see section 13.

**Done when:**
- User can complete survey in <4 minutes on mobile
- User sees 3 suggested goals at the end, tailored by age
- User can accept, modify, or swap goals from a filtered library
- State is saved after each question (no data loss on drop-off)
- Process goal soft override fires when fewer than 2 of 3 final goals are process-oriented
- Every goal card in the library and picker exposes plain-language helper text on tap
- Active goal cap at 5 with soft override fires when adding a goal from the library while already at or above 5 active goals
- Every goal card (onboarding picker and library) shows a visible tier badge with a one-tap explainer
- The suggestions screen shows a one-line explanation of why the three starter goals were chosen
- Motivation question is collected in onboarding and persisted to `users.motivation_segment`
- Goal suggestion algorithm reads `motivation_segment` and adjusts ranking/weighting accordingly (no segment label ever shown to the user)

### Feature 2: Check-In Loop (Daily + Weekly)
**What it does:** Two loops. **Daily (10 seconds):** one checkbox per active goal — "Did you work on this today?" No confidence rating here. **Weekly (60 seconds, Sundays):** short reflection across 3–4 contextual confidence dimensions ("this week, in social situations, I felt...") on a 1–10 scale. See section 13 for the psychological reasoning behind splitting these.

**Why it's core:** Daily goal check-ins sustain the habit loop. Weekly confidence reflection surfaces trend data without training daily self-surveillance. The weekly chart is still the retention anchor; it just updates weekly instead of daily.

**Design principle:** Daily check-in under 10 seconds. Weekly reflection under 60 seconds. No streaks with fire emojis. No global self-worth rating. Users can pause tracking entirely via "step away" mode (section 13).

**Done when:**
- Check-in screen loads in <1 second
- User can complete daily check-in in <10 seconds
- Data is persisted reliably with date stamp
- "Already checked in today" state handled gracefully

### Feature 3: Mister P (RAG Chat)
**What it does:** Personified chat interface grounded in the POV corpus. Users ask questions ("should I take creatine?", "what should I do about my hairline?") and get answers in Mister P's voice, grounded in the POV corpus but written as plain prose without parenthetical source citations (0.2 change — see §6).

**Why it's core:** This is the feature that makes Cleanmaxxing feel smart. It's also the feature that creates the most "wow" moment in the first session.

**Design principle:** Closed corpus. Mister P does not answer questions from general knowledge. If the corpus doesn't cover something, Mister P says "that's not something I cover yet" and logs the question for the roadmap.

**Done when:**
- User can ask a question and get a grounded answer in <5 seconds
- Answers stay inside the retrieved context without naming the source docs (0.2 change — citations removed; the proactive-advisory is the only path that surfaces a doc title, and only when it backs one of the user's goals — see §2.6 and §6)
- Out-of-scope questions get refused gracefully in Mister P's voice
- All user questions are logged to a table for roadmap review
- Refusals for truly unsafe topics (synthol, DNP, clenbuterol, extreme restriction, sourcing guidance, DIY dental) fire reliably

### Feature 4: Today Screen
**What it does:** The home screen after login. Orchestrates the day's surfaces in a deliberate order — action first, context second, history last. The shipped card stack, top-to-bottom:

1. **First-run card** — shown only during the user's first 7 days post-onboarding, self-dismissible.
2. **Progress-photo nudge** — two variants: `baseline` (during first-run window, before baseline photo exists) and `progress_90d` (90 days after onboarding, before comparison photo exists). See §2.6 for the feature.
3. **Monthly checkpoint card** — fires when `checkpointState.status === 'eligible'` (roughly every 30 days). Now includes per-goal alignment insights correlating each goal with its mapped confidence dimension.
4. **Stepped-away notice** — replaces the interactive cards (but not the chart/chat) when `users.tracking_paused_at` is set.
5. **Daily check-in card** — the primary action. One checkbox per active goal.
6. **Weekly summary strip** — rolling 7-day "N/M boxes ticked across your goals." Quiet, no streaks. Refreshes on check-in save via `router.refresh()`.
7. **Weekly focus card** — groups active goals by `source_slug`, shows the current walkthrough week per group.
8. **Weekly reflection card** — four-dimension confidence sliders + optional notes (see §2 Feature 2).
9. **Confidence trend chart** — AreaChart with gradient; sparse-data variant when history has a single entry.
10. **Mister P chat card** — the chat entry point.

**Why it's core:** This is where the retention loop lives. Users come back to do the check-in, see the weekly total, and check the chart.

**Design principle:** Calm and minimal. Not a dashboard. Order reflects what the user is here to do: action → reinforcement → context → history. No widgets, notifications, push badges. The weekly summary strip is intentionally a text line, not a progress bar — quiet signal, not a score.

**Done when:**
- Renders in <1 second on mobile
- Confidence chart updates on reflection save
- Goals list shows current state accurately
- "Ask Mister P" is always one tap away
- Weekly summary strip shows rolling 7-day totals and updates after each check-in
- Stepped-away state hides interactive cards but leaves chart and chat accessible

### Feature 5: "Is Clav Right?" Content Page
**What it does:** Standalone public-facing page that breaks down 3–5 of Clav's methods into "right," "partially right," and "wrong" with reasoning grounded in the corpus. Public, indexable, shareable.

**Why it's core:** Top-of-funnel content asset. Creator pitch hook. Credibility builder for Mister P. Content already exists in draft form.

**Design principle:** Written, not generated. Polished to magazine-quality. This is marketing, so it needs to look intentional.

**Done when:**
- Page is live on the public site
- Content is 1500–3000 words, well-formatted
- Page is indexable (meta tags, OG image, shareable)
- Clear CTA to sign up for Cleanmaxxing at the bottom

### Feature 6: Mister P Background Page
**What it does:** Standalone "who is Mister P, why should you listen" page. Doesn't need to be Phil personally — can be a persona. But must feel real, not AI-generated.

**Why it's core:** In a trust-starved category with a faceless founder, credibility is load-bearing. Users will check this page before subscribing.

**Design principle:** Write it yourself, in one sitting, in your own voice. Do not generate this with Claude.

**Done when:**
- Page exists and is linked from footer and signup flow
- Feels authentic, not templated
- Passes the "would a skeptical reader believe this" test

---

## 2.5 Stickiness Mechanics: Five Weekly Rituals That Drive Renewal

The core insight: people renew subscriptions because they've built a habit, they can see the habit working, and they feel the product responding to them specifically. These five mechanics are the difference between "I tried this for a month" and "I'm paying for this next year."

### 5a. Weekly Reflection Email (Sunday evening)

**What it is:** Automated email sent Sunday at 6pm (user timezone). Summary: days checked in out of 7, goals completed, one pattern observation pulled from their data, one small suggestion for the coming week.

**Example:**

> You checked in 5 out of 7 days this week and completed your goals 4 out of 5 days. Pattern: you crush it Mon–Wed, then drop off Thu–Fri. Suggestion: what if you did your goal check-in right after breakfast instead of at night? Habit stacking works better than willpower.

**Why it sticks:** It's not judgment, it's a conversation. The user sees themselves reflected accurately, gets a micro-insight, and has something small to try.

**Implementation:** Template via Resend, pattern detection from check-in clustering (simple day-of-week heuristics first), suggestion pulled from Mister P with one API call per email. Build week 3, launch week 4.

### 5b. Monthly Checkpoint (Day 30)

**What it is:** On day 30, user sees: confidence delta (big number), goal completion rate (percentage), and three new suggested goals ranked by algorithm based on what they completed.

**Example:**

> Your self-confidence moved from 4.2 to 5.1 in 30 days. Here's what that shift means: you went from "I avoid mirrors" to "I can take a selfie without hating it." You completed 73% of your goals. Ready to layer in something new?

**Why it sticks:** This is the renewal moment. Proof the system works, permission to celebrate, immediate next step visible. No friction between "this is working" and "what's next."

**Implementation:** Triggered at user.created_at + 30 days. Compare Week 1 to Week 4 confidence averages. Suggested goals pulled from library filtered by age segment + completed goal categories, ranked by POV hierarchy. Map confidence deltas to plain language context (4.2 to 5.1 = "avoid mirrors" to "can take selfie"). Build week 4, launch week 5.

### 5c. Mister P Proactive Suggestions

**What it is:** When user asks Mister P about a topic they haven't asked about before (detected via embedding similarity), he suggests a deeper resource without pushing.

**Example:**

User asks: "Is collagen worth it?"

Mister P: "Short answer: for your age, probably not. Long answer: I've got a detailed guide on collagen bioavailability and which supplements actually matter for skin health. Want to spend 10 minutes on it?"

**Why it sticks:** Users feel seen. The system knows they're exploring something new and offers exactly the right depth.

**Implementation:** Log topic of each query (embed it, cluster against prior questions). If it's a new topic cluster (fewer than 2 prior questions in that cluster), append one-liner suggestion to response linking to relevant POV doc. Build week 3 (logging + topic detection), launch week 4.

### 5d. Weekly Community Thread (External Discord)

**What it is:** Discord server with one channel: #weekly-wins. Every Sunday evening, post prompt: "What's one thing that went well this week, or one thing you learned about yourself?" Members post optional one-liners. No moderation, no forced connection, just visibility.

**Example thread:**

> I actually took progress photos without spiraling. Small win but I'll take it. — @user1
>
> Realized I care way more about how my clothes fit than my face. Changed everything. — @user2
>
> Just showed up 4 days in a row. More than I've done in months. — @user3

**Why it sticks:** Belonging without pressure. Users see they're not alone, FOMO keeps them checking, they get ideas from others.

**Implementation:** Set up Discord server, one channel, one standing message Sunday with prompt (you post it manually, 5 seconds). Invite link in settings page and monthly checkpoint screen. Optional join. No moderation needed at small scale. Build week 1 (Discord setup), launch week 2 (during onboarding).

### 5e. Confidence Score Context (Copy, not code)

**What it is:** Every confidence score is paired with what it means behaviorally, not naked numbers.

**Context examples:**

- **3.0:** "I avoid photos and mirrors. Changing clothes feels like a ordeal."
- **4.0:** "I'm okay in familiar situations. New social settings feel risky."
- **5.0:** "I can take a selfie without hating it. Most days feel neutral."
- **6.0:** "I'm proud of how I look. I initiate photos sometimes."
- **7.0:** "I feel genuinely good about my appearance. It's not something I worry about."

**Why it sticks:** Abstract numbers don't move people. When a user sees 4.2 to 5.1, pairing it with "you went from okay-in-familiar to initiating-photos" makes it real.

**Implementation:** Write context table once (1 page, 7 levels, 2–3 sentences each). Reference everywhere: dashboard, emails, checkpoint, chart labels. Same descriptor always maps to same score. Build week 2 (write table), deploy week 2 (add to templates).

---

## 2.6 Shipped Beyond the Six Features (as of 2026-04-25)

Everything below was built on top of the MVP six, usually in response to a real gap surfaced in use or audit. Listed roughly in the order it was built. Each entry is one paragraph: what it is, why it exists, where it lives.

### Goal detail page (`/goals/[id]`)
Consolidated per-goal surface replacing the need to hunt across Today / Goals / POVs. Shows the walkthrough's current week, the adjust-baseline control, a "read the full POV" link (only when the POV exists for that slug), and status actions (complete / abandon, with a two-step confirm on abandon). Also shows the per-goal weekly count (*"Ticked N of the last M days"*). Code: `app/(app)/goals/[id]/page.tsx`.

### Baseline stages + per-POV walkthroughs
Goals carry a `baseline_stage` in `{new, light, partial, established}` captured at acceptance or adjusted later via the inline picker. Each POV with a walkthrough provides a `stage_weeks` map (`new → 1`, `light → 5`, `partial → 9`, `established → null`) in its `.onramp.json`, so users who start further along jump into the ramp at a later week rather than starting everyone at week 1. The walkthrough advances one week per real-world week elapsed; when the effective week passes the last defined range, the graduation string is shown. Code: `lib/content/onramp.ts`, `content/povs/*.onramp.json`, migration `0007_goals_baseline_stage.sql`.

### Weekly focus card (walkthrough surface on Today)
Active goals are grouped by `source_slug`; the earliest-accepted goal in each group drives the week. One card per group showing "This week's focus" + detail. The card surfaces the same underlying walkthrough the goal detail page uses, so the two stay in sync. Code: `app/(app)/today/weekly-focus-card.tsx`.

### First-run welcome card
Shown only during the 7-day window after `onboarding_completed_at`. Self-dismissible via `localStorage` with `useSyncExternalStore` (no set-state-in-effect). Sets expectations for the check-in/reflection cadence without adding dashboard chrome for returning users. Code: `app/(app)/today/first-run-card.tsx`.

### Progress photos at 90 days
Two slots only: `baseline` (captured during the first-run window) and `progress_90d` (available 90 days after onboarding). No AI analysis, no PSL/ranking framing — user-judged comparison only. Bytes live in Supabase Storage with folder-based RLS (`(storage.foldername(name))[1] = auth.uid()::text`); metadata lives in `progress_photos`. 8MB cap; per-photo and bulk deletion built in from day one. Signed URL TTL 60 min. Nudges on `/today` are gated by onboarding age; the `/progress` page has four states (no baseline / with countdown / window open / both present). Code: `app/(app)/progress/*`, `app/api/progress-photos/*`, `migrations/0008_progress_photos.sql`, `app/(app)/settings/progress-photos-section.tsx`.

### Weekly summary strip + per-goal weekly count
Rolling 7-day completion totals, shipped as two quiet text surfaces: a strip under the daily check-in card on `/today` (*"This week: N/M boxes ticked across your goals"*), and a line inside the "This week's focus" card on `/goals/[id]` (*"Ticked N of the last M days"*). `possible`/`daysPossible` is capped per goal to `min(7, days_since_created + 1)` so a goal accepted two days ago reads *"1 of the last 2 days"* not *"1 of the last 7."* Abandoned/completed goals excluded — this is "what am I showing up for right now," not lifetime stats. No streaks, no emojis, no celebratory copy. The check-in card calls `router.refresh()` on save/undo so the strip updates without a reload. Code: `lib/check-in/service.ts`, `app/(app)/today/weekly-summary-strip.tsx`.

### Monthly checkpoint with goal-alignment insights
The §2.5b checkpoint now also correlates each active goal to its mapped confidence dimension (social / work / physical / appearance) via `lib/goals/confidence-mapping.ts`, and classifies the goal timeline × dimension trend into seven copy variants (e.g. *"You've been working on X for five weeks and social confidence ticked up — keep going"*). Code: `lib/goals/goal-insights.ts`, `lib/checkpoint/service.ts`, `app/(app)/today/monthly-checkpoint-card.tsx`.

### Persistent top nav
Header on all `(app)` routes: Today / Goals / Library / POVs / Settings + theme toggle + sign out. Longest-prefix active highlighting (so `/goals/library` highlights Library, not Goals). Hides itself on `/onboarding/*` and `/povs/*` — those are focused surfaces where dashboard chrome is a distraction. Code: `components/app-nav.tsx`.

### POV reader (`/povs/[slug]`) — scoped to user's goals
The POV index at `/povs` is filtered to the user's own goal `source_slug` set (any status — completed and abandoned goals keep their POV listed as reference). The full 60-doc corpus is never shown wholesale. POV reader uses react-markdown; frontmatter `__Section__` bold lines are promoted to H2. Code: `app/(app)/povs/page.tsx`, `app/(app)/povs/[slug]/page.tsx`, `lib/content/pov.ts`.

### Mister P proactive advisory gated on user goals
Stickiness §2.5c is implemented but gated: Mister P only offers a "full breakdown in the X doc" nudge when the top retrieved chunk's slug is in the user's goal set. Otherwise the advisory is skipped and the answer reads as self-contained prose. The system prompt itself already forbids naming POV docs in ordinary answers, so this is the only pathway that can surface a full-doc pointer. Code: `app/api/mister-p/ask/route.ts`, `lib/mister-p/prompt.ts` (`buildProactiveSuggestionAdvisory`).

### Mister P circuit breaker
Implemented per §13 — when a topic-cluster analysis finds 5+ related queries in 7 days (3+ for the `something-specific-bothering-me` motivation segment), the advisory injects the "less checking" framing. At most one advisory per turn; circuit breaker takes priority over proactive suggestion when both would fire. Code: `lib/mister-p/topic.ts`, `CIRCUIT_BREAKER_ADVISORY` in `prompt.ts`.

### Step-away mode
Implemented per §13 as `users.tracking_paused_at`. When set, `/today` hides the interactive cards (check-in, weekly focus, reflection, summary strip, monthly checkpoint, progress nudges) but keeps the chart and Mister P chat visible. Resume is one tap in settings. Code: `app/(app)/settings/step-away-card.tsx`, `app/api/settings/tracking-paused/route.ts`.

### Dark mode toggle (system / light / dark)
Three-state cycling button in the nav. Class-based Tailwind dark variant via `@custom-variant dark (&:where(.dark, .dark *, [data-theme="dark"], [data-theme="dark"] *))`. Inline no-FOUC script in `app/layout.tsx` sets the class before hydration based on `localStorage` or OS preference. `ThemeApplier` keeps the class in sync mid-session. Default is "system." Code: `components/theme-toggle.tsx`, `components/theme-applier.tsx`, `lib/theme.ts`, `app/globals.css`.

### Confidence trend chart — AreaChart with sparse-data variant
Recharts AreaChart with an emerald gradient fill and reference line at the current average. Sparse-data variant activates when `history.length === 1` (shows a single point with contextual copy instead of a misleading flat line). Code: `app/(app)/today/confidence-trend-chart.tsx`.

### Adjust-baseline inline picker
Per-goal control letting users correct their baseline stage after acceptance (*"I said 'just starting' but I'm actually further along"*). Updates `goals.baseline_stage` via `PUT /api/goals/[id]/baseline`, calls `router.refresh()` so the walkthrough card recomputes the current week. Shown inside the weekly-focus card and the goal detail page. Code: `app/(app)/today/adjust-baseline.tsx`, `app/api/goals/[id]/baseline/route.ts`.

### Goal status actions (complete / abandon)
Two-step confirm for abandon (the destructive action). Moves goal to `completed` or `abandoned`, preserves history, removes from the active set. Code: `app/(app)/goals/[id]/status-actions.tsx`, `app/api/goals/[id]/status/route.ts`.

### Goal duplicate detection via `source_slug`
Goals store `source_slug` pointing at the POV they were templated from. The library's duplicate-detection migrated from title-matching (which broke when we renamed templates, e.g. "Strength train 3 times per week" → "Strength train 3-5 times per week") to `source_slug` matching. Code: `content/goal-templates.ts`, `app/(app)/goals/library/library-browser.tsx`.

### Active-goals block in Mister P system prompt
Active goals (title, duration, source-slug prior-citation count) are injected into the system prompt via `formatGoalsBlock`. Lets Mister P anchor answers to what the user is working on and calibrate depth ("user has seen this doc 4 times in prior chats → skip the foundations"). Code: `lib/mister-p/prompt.ts`.

### Post-onboarding first check-in spotlight (0.3)
When the user clicks "Start with these" at the end of goal suggestions, they're routed to `/today?welcome=1` rather than `/today`. The daily check-in card renders in a spotlighted state — emerald ring, retitled to "Your first check-in," with copy "You're in. Tap any goal below to log your first day — that's the whole loop." Spotlight auto-clears the moment a check-in is saved. Purpose: make the first check-in the finale of onboarding, not a cold-open after the goals-picker screen. Code: `app/(app)/onboarding/complete/goals-picker.tsx` (push target), `app/(app)/today/page.tsx` (welcome param), `app/(app)/today/daily-check-in-card.tsx` (`spotlight` prop).

### Personalized "Why these three?" explainer (0.3)
Bordered section at the top of the goal-suggestions screen with three bullets wired to the user's actual inputs: their age segment and focus areas ("Because you're 25–32, focused on Skin and Fitness…"), the Foundation → high-impact → refinement hierarchy framing, and a live process/outcome count that updates when the user swaps a goal. Replaces the prior generic paragraph. Code: `app/(app)/onboarding/complete/page.tsx` (fetches age_segment + focus_areas server-side, passes as props), `app/(app)/onboarding/complete/goals-picker.tsx`.

### "Anti-aging" focus area (0.3)
Ninth option in the onboarding `focus_areas` question. Maps to `[07-skincare-antiaging, 42-sleep, 47-eye-health, 38-aging-appearance]` in `FOCUS_TO_SLUGS`, so a user who picks it gets the SPF + retinoid + sleep + eye-area stack surfaced as goal suggestions without having to infer it. No DB migration — focus_areas is a JSON-array text response. Code: `lib/onboarding/questions.ts`, `lib/onboarding/goal-suggest.ts`, `app/(app)/onboarding/complete/goals-picker.tsx` (label map).

### Age-relevant POVs on `/povs` (0.3)
The POV index continues to show only goal-anchored POVs in the tiered groupings, but now appends a "Relevant for your age" section at the bottom surfacing slugs that aren't anchored to a goal but are worth reading for the user's age segment. Hard-coded per-segment map: 33–40 gets `38-aging-appearance`, `28-cosmetic-procedures`, `47-eye-health`; 25–32 gets `38-aging-appearance`, `07-skincare-antiaging`, `47-eye-health`; 18–24 gets `07-skincare-antiaging`, `38-aging-appearance`. Filters out slugs already in the user's goal set so the surface doesn't duplicate. Code: `app/(app)/povs/page.tsx`.

### Day-30 progress photo (0.3)
Optional mid-point capture between the baseline photo and the 90-day photo. Migration `0009_progress_photo_30d.sql` widens the `progress_photos.slot` CHECK constraint to include `progress_30d`. The `/today` nudge fires between day 30 and day 89 when the user has a baseline but no 30d; the `/progress` page renders a three-slot gallery (baseline / 30d / 90d) and offers capture for whichever slot is next-eligible. Most interventions don't produce large visible change at 30 days, but the milestone gives users a visible reference point during the window where first-month churn otherwise bites. Code: `supabase/migrations/0009_progress_photo_30d.sql`, `app/api/progress-photos/upload/route.ts`, `app/(app)/progress/page.tsx`, `app/(app)/progress/capture-photo.tsx`, `app/(app)/today/progress-photo-card.tsx`, `app/(app)/today/page.tsx`.

### Inline confidence chart preview in reflection edit (0.3)
Inside the Weekly Reflection card's edit form, a compact version of the confidence trend chart renders above the dimension sliders. A dashed hollow dot at the current week reflects the average of the live draft slider values, so users see where this week's reflection would land before they save. Closes the "the chart updates later, out of context" gap — the reflection becomes its own payoff. Code: `app/(app)/today/confidence-trend-chart.tsx` (new `pendingPoint` + `compact` props), `app/(app)/today/weekly-reflection-card.tsx`.

### Stale-goal re-entry nudge (0.3)
`getStalestGoal` returns the single active goal the user has drifted furthest from — oldest last-tick date (or oldest creation date if never ticked), at least 9 days stale, past the 14-day new-goal grace window. Surfaces a calm "Something changed on this one?" card on `/today` with a link to the goal detail page (where they can adjust baseline, pause, or swap). Per-goal localStorage dismissal so a future different-goal nudge still triggers. The signal naturally clears the moment the user ticks the goal again. Code: `lib/check-in/service.ts` (`getStalestGoal`), `app/(app)/today/stale-goal-card.tsx`.

### Stuck-confidence contextual POV (0.3)
`getStuckConfidenceSignal` fires when ALL of the user's last 3 weekly reflections hold a dimension strictly below 4. Picks the lowest-averaged qualifying dimension and surfaces a "Worth reading" card linking to the safety-oriented POV most relevant to that dimension (56-identity-beyond-appearance for appearance; 55-limits-self-improvement for social/work; 54-when-to-stop for physical). Intentionally surfaces acceptance-oriented content rather than more goals — the signal is a "widen the frame" prompt, not a "try harder" prompt. Per-dimension localStorage dismissal; the card disappears naturally once the dimension climbs. Code: `lib/confidence/stuck-signal.ts`, `app/(app)/today/stuck-confidence-card.tsx`.

### Quarterly re-survey at day 90 (0.3)
Three-question refocus surfaced on `/today` at day 90+ post-onboarding: focus areas (pick up to 3, prefilled with originals), motivation segment (radio, prefilled), specific_thing (optional text, prefilled). On save, the card persists answers to `survey_responses` under versioned keys (`focus_areas_q1`, `motivation_segment_q1`, `specific_thing_q1`, `quarterly_survey_q1_completed_at`) via delete-then-insert to match the onboarding pattern, then re-runs the ranker with the updated inputs and inline-displays the top-3 fresh suggestions with "Add to my goals" buttons wired to `/api/goals/add`. Dev override: `QUARTERLY_SURVEY_FORCE_ELIGIBLE=1` (gated on `NODE_ENV !== 'production'`). Code: `lib/quarterly-survey/service.ts`, `app/(app)/today/quarterly-survey-card.tsx`, `app/api/quarterly-survey/route.ts`, `app/(app)/today/page.tsx`.

### Mister P behavioral-state threading (0.3)
New `getMisterPUserState` helper returns a per-request snapshot: specific_thing free-text (quarterly answer wins over onboarding answer), days since onboarding, weekly goal-completion rate (last 7 days), latest per-dimension confidence with rising/flat/declining tag vs. prior reflection, and stuck dimensions (< 4 across the last 3 reflections — mirrors the `/today` detector). `formatUserStateBlock` renders these as a `USER BEHAVIORAL STATE` section injected into the system prompt. Prompt copy is explicit: use the block to calibrate substance, **never narrate observations back to the user** ("I see you haven't checked in much lately" would be a regression). Four concrete calibration heuristics included covering tenure, completion rate, stuck dimensions, and the specific_thing text. Code: `lib/mister-p/user-state.ts`, `lib/mister-p/prompt.ts` (`formatUserStateBlock`, updated `buildSystemPromptFull`), `app/api/mister-p/ask/route.ts`.

### `specific_thing` surfaced in monthly checkpoint (0.3)
The §2.5 monthly checkpoint card at day 30+ now pulls the `specific_thing` text (quarterly value wins over onboarding value) into `CheckpointSummary` and renders a "What you said preoccupied you" block quoting the user's own words back with a "Is this still the thing? If it's shifted, that's useful data. Mister P can help you think through it." reflection prompt. Scoped intentionally to monthly cadence only — daily-cadence surfacing of this text was considered and rejected as reinforcement risk for the OCD/BDD-adjacent users the safety rails protect. Code: `lib/checkpoint/service.ts`, `app/(app)/today/monthly-checkpoint-card.tsx`.

### Mister P moved to second slot on `/today` (0.3)
With behavioral state threaded into the prompt, Mister P became the most context-aware surface in the product. Keeping him at the bottom meant the most personalized answer was also the hardest to reach. New non-stepped-away order: Daily check-in → Mister P chat → Weekly summary strip → Weekly focus card → Weekly reflection → Confidence chart. Daily check-in stays at the top as the primary commitment device. Weekly cards become reference material the user scrolls to. Chat and chart still render when stepped-away. Code: `app/(app)/today/page.tsx` (reorder + updated placement-rationale comment).

### Post-reflection recap in saved view (0.3)
When the user saves their weekly reflection, the saved view now renders a compact "This week in one glance" section: ticked/possible goal-slot completion over the last 7 days, plus per-dimension deltas vs. the prior reflection (only moves of 1+ points surface — sub-point noise isn't signal). First reflection gets a "Next week's will show deltas" placeholder. All data is already on hand — `weeklySummary` threaded through as a new prop, prior reflection pulled from `state.history[-2]`. Scoped to the saved view; doesn't compete with the live-preview chart in edit mode. Code: `app/(app)/today/weekly-reflection-card.tsx`, `app/(app)/today/page.tsx` (props plumbing).

### Weekly reflection soft-lock after save (0.3)
Once saved, the reflection card's saved view is read-only for the rest of the week — the Update button is gone, replaced with a one-line note "Locked for this week. Next reflection unlocks Monday — weekly is a fixed snapshot, not a running dial." Rationale: the prior UX let a user repeatedly revise Monday's scores from Tuesday onward, which is the same self-monitoring loop the Mister P circuit breaker is designed to interrupt — particularly risky for OCD/BDD-adjacent users. Belt-and-suspenders is at the UI layer only; the upsert API still accepts writes so a support-driven correction is possible without a deploy. The lock unlocks itself when `weekStartString()` rolls forward to the next Monday — no cron, no state-tracking, no explicit flip. Code: `app/(app)/today/weekly-reflection-card.tsx`.

### POV 11 — flossing + ranked whitening (0.3)
`11-teeth-smile.md` gains a dedicated "Flossing — The Underrated Appearance Variable" section (aesthetic mechanism — inflamed gums, trapped debris, breath — with ADA + Mayo citations, interdental alternatives, gum-disease warning signs) and replaces the one-paragraph "Whitening — The Easy Win" section with "Whitening — Ranked Options" (in-office → dentist trays → ADA-Seal peroxide strips → whitening toothpaste as maintenance, plus budget/sensitivity decision guide, 5% potassium nitrate sensitivity management, and the natural-enamel-only caveat for crowns/veneers/fillings). Code: `content/povs/11-teeth-smile.md`.

### POV 25 — acne + skincare integration (0.3)
`25-acne.md` gains an "Integrating Acne Treatment With a Baseline Skincare Routine" section covering the gap between the baseline cleanser/moisturizer/SPF/retinoid stack and users on topical or prescription acne medications: layering order, don't-double-up-retinoids, the current BP-and-tretinoin-layering guidance (the old inactivation myth), barrier repair when actives overshoot, SPF choice on inflamed skin, the 4–8-week purging timeline, isotretinoin's stripped-down routine, and a "defer to your dermatologist" closing rail. Code: `content/povs/25-acne.md`.

### Target-user widening: 18–45 (0.3)
§1 target user expanded from 18–40 to 18–45 after feedback that the early-40s case (still actively shaping appearance/confidence, hormonal shifts becoming material, aging-skin window newly relevant) was the cohort the original cap excluded most awkwardly. `AgeSegment` gains `'41-45'`; `ageToSegment(age)` returns that value for 41–45 and `null` for 46+; the onboarding `age` question's `max` is reduced from 99 to 45 so users outside the range can't start the flow in the first place; the submit route adds a belt-and-suspenders 400 ("Cleanmaxxing is currently designed for men 18–45") for any direct POST that slips past the client cap. POV corpus is not yet tagged for `41-45`, so `appliesToAge` in the goal-ranker treats `41-45` as inheriting `33-40` — no re-embed needed, no metadata bulk update in this change. `AGE_RELEVANT_SLUGS` on `/povs` gains a `41-45` entry mirroring `33-40` (aging-appearance, cosmetic-procedures, eye-health). `AGE_SEGMENT_LABEL` in the goal-suggestions "Why these three?" explainer adds a `41-45` label. Code: `lib/onboarding/types.ts`, `lib/onboarding/questions.ts`, `lib/onboarding/goal-suggest.ts`, `app/api/onboarding/submit/route.ts`, `app/(app)/onboarding/complete/goals-picker.tsx`, `app/(app)/povs/page.tsx`, `scripts/embed-povs.ts` (type), `scripts/motivation-differentiation.ts` (AGES array).

### Mister P rolling conversation history (0.3)
New `lib/mister-p/conversation.ts` loads the last 8 Q/A pairs from `mister_p_queries` (authed client, so RLS applies). Answers truncate at 800 chars and questions at 300 — the block is memory of what's already been covered, not a transcript archive. `formatConversationHistoryBlock` renders pairs chronologically under a `CONVERSATION HISTORY` section with explicit rules: never say the same thing twice, go deeper when a topic recurs, never narrate that you remember ("As we discussed before…" would be a regression). Injected alongside the user-state block via the expanded `buildSystemPromptFull` signature. Token cost is ~1.5k with defaults. Code: `lib/mister-p/conversation.ts`, `lib/mister-p/prompt.ts` (`formatConversationHistoryBlock`), `app/api/mister-p/ask/route.ts`.

### Citation-aware retrieval reranking (0.3)
`retrievePersonalized` (in `lib/mister-p/retrieve.ts`) over-fetches candidate chunks (12 from question + 6 from context when present), merges + dedupes by slug and content prefix, then reranks using the user's prior citation history from `mister_p_queries.citations`. Unseen source slugs get a +0.04 bonus; slugs cited more than twice in prior answers lose 0.04 per citation above the threshold (capped at −0.15). Prevents the "same answer every time" feeling without changing the corpus. Magnitudes are exported constants (`UNSEEN_SLUG_BONUS`, `REPEAT_SLUG_PENALTY_STEP`, `REPEAT_SLUG_PENALTY_CAP`, `REPEAT_SLUG_THRESHOLD`) so tuning doesn't require a code change. Code: `lib/mister-p/retrieve.ts`, `app/api/mister-p/ask/route.ts` (reorganized to hoist citation-count computation before retrieval).

### Semantic-context retrieval augmentation (0.3)
New `lib/mister-p/semantic-context.ts` builds a per-user context blob from the `specific_thing` free-text (quarterly answer wins over onboarding answer) plus the last 3 weeks of `weekly_reflections.notes` (400-char cap per note). When the blob is non-empty, the ask route embeds it as a secondary query vector and passes it into `retrievePersonalized`, which retrieves from both vectors and merges. Net effect: a user whose reflection notes mention "skipping skincare at night — too tired" starts surfacing evening-routine chunks on adjacent questions even when the question itself doesn't name the struggle. Subtle-by-design — Mister P does not see the context text, only the retrieval output changes. Code: `lib/mister-p/semantic-context.ts`, `lib/mister-p/retrieve.ts` (`retrievePersonalized` context-embedding branch), `app/api/mister-p/ask/route.ts`.

### Tom Brady essay + homepage essay grid (0.3)
Second long-form marketing essay added at `/tom-brady-face` ("Tom Brady's Face Did More for His Brand Than Six Rings"). Verbatim author copy in `content/marketing/tom-brady-face.md`, rendered via the same react-markdown + typography pattern as `/is-clav-right`. The homepage's prior single "Read first" Clav card was restructured into a two-up grid covering both essays under "Two essays. The same posture." Footer gains a third long-read link. The Brady piece was the explicit catalyst for the 0.4 audience pivot — its voice and target reader are unmistakably 30+, not 22. Code: `content/marketing/tom-brady-face.md`, `app/tom-brady-face/page.tsx`, `app/page.tsx`.

### Homepage pivot to "Looksmaxxing for Adults" (0.4)
The homepage's prior framing ("Look and feel better. Without the radioactive parts of the category.") was a positioning statement, not a hook. Rewritten to lead with the audience the product naturally serves: hero ("Looking your best matters more after 30, not less"), sub-hero with the "that window closed" pivot moment as the visual anchor (aging is the antagonist, not another influencer), three pillars replacing the four-paths grid ("Built for adult men, not for teenagers" / "Process, not performance" / "Honest about what works and what doesn't"), with the four-levers framing preserved as a pull-quote rather than the primary structure. Brady essay promoted to first card in the "Read first" grid; Clav second. Footer adds the Brady link. Metadata title and description updated. Pricing line unchanged ($9.99/$79); pricing experimentation is a separate decision. Code: `app/page.tsx`.

### Age cap extended from 45 to 55 (0.4)
`AgeSegment` gains `'46-55'`. `ageToSegment` returns it for ages 46-55, `null` for 56+. Onboarding age question's `max` raised from 45 to 55; helper text updated to "men 18-55". Submit route's belt-and-suspenders 400 message updated. Ranker `appliesToAge` uses chained inheritance — `'46-55'` users see docs tagged `'46-55'`, `'41-45'`, or `'33-40'`. `AGE_RELEVANT_SLUGS` on `/povs` mirrors 33-40 for 46-55 (aging-appearance, cosmetic-procedures, eye-health). `AGE_SEGMENT_LABEL` in the goal-suggestions explainer adds the new label. Scripts updated for type consistency. POV `_metadata.json` audit deferred — the inheritance fallback is sufficient until 41-45 and 46-55 cohort signal warrants segment-specific tagging. Code: `lib/onboarding/types.ts`, `lib/onboarding/questions.ts`, `lib/onboarding/goal-suggest.ts`, `app/api/onboarding/submit/route.ts`, `app/(app)/onboarding/complete/goals-picker.tsx`, `app/(app)/povs/page.tsx`, `scripts/embed-povs.ts`, `scripts/motivation-differentiation.ts`.

### `'maintenance-aging'` motivation segment (0.4)
New value in the `motivation_segment` enum capturing the typical 35+ entry-story ("things are sliding, want a structured way to defend"). Added to the onboarding survey choice list, the quarterly re-survey card, the submit-route validation set, and the quarterly-route validation set. `MotivationSegment` type extended in `lib/onboarding/goal-suggest.ts`. Ranker adjustment: `+3 process / -3 outcome`, tighter than `feel-better-in-own-skin`'s `±4` because there's no self-acceptance vulnerability to protect against here, just a structural bias toward sustainable habits over before-and-after stunts. Code: `lib/onboarding/questions.ts`, `lib/onboarding/goal-suggest.ts`, `app/api/onboarding/submit/route.ts`, `app/api/quarterly-survey/route.ts`, `app/(app)/today/quarterly-survey-card.tsx`.

### POV editorial pass for adult tone (0.4)
Targeted rewrites of the three POVs most prone to younger-internet framing, identified during the 0.4 audience pivot. POV 14 reviewed and left as-is — already mature in voice. POV 15 (looksmaxxing-system) gets three line-level edits: the "looksmaxxing is just turning attractiveness into a strategy game" framing softened to "an ecosystem of diagnostics and protocols" (game/gamer language reads juvenile to the 30+ audience); "Researching AI height hacks before fixing posture" replaced with "obscure cosmetic procedures" (the original is a young-internet artifact); the explicit PSL scoring line "one confident and relaxed reads as an eight, one tense and anxious reads as a five" rephrased to talk about "composed and attractive" vs "tense and anxious" without numeric ranking. POV 51 (dating-apps) gains a fifth bio-example category — "Re-entry / late 30s and beyond" — with the right register for divorced/widowed users re-entering the apps and a paragraph naming the matching mistake to avoid (over-indexing on the past relationship in the bio). Re-embedded after both edits. Code: `content/povs/15-looksmaxxing-system.md`, `content/povs/51-dating-apps.md`.

### `sync-povs` retired; `.md` canonical (0.3)
`scripts/sync-povs.ts` (mammoth-based regeneration of `.md` from `../Cleanmaxxing POV/*.docx`) is deleted, the `sync-povs` npm script is removed, and the `mammoth` devDependency is dropped. Reason: over multiple commits, substantial POV sections (e.g. Living the Bald Look in 08, starter-diagnostic-path in 41, two-week-launch-sequence in 51) had been added directly to `.md` without being mirrored into the `.docx`. A routine sync wiped ~540 lines across 19 files before being caught and recovered via `git checkout HEAD -- content/povs/`. Rather than reconcile every drifted `.docx`, `.md` was promoted to canonical. Edit POVs directly in `content/povs/*.md`; run `npm run embed-povs` after any change so Mister P's pgvector index picks up the new chunks. The `.docx` files remain tracked as historical snapshots; the frontmatter `source: "XX_Title.docx"` field in each `.md` is now legacy metadata, not a live pointer.

---

## 3. Explicitly Out of Scope (v2+)

**Do not build in MVP.** If you catch yourself starting to build any of these, stop and reread this section.

| Feature | Why it's out | Revisit when |
|---|---|---|
| AI facial structure scoring | Inaccurate, expensive, reputationally risky, legally fraught | Only if users overwhelmingly demand it after 90 days |
| Daily automated trending content | Dead weight in months 1–2 | Month 3+ as plateau retention mechanic |
| Community features (forums, profiles, DMs, activity feed) | Empty communities signal dead product | 500+ weekly active users |
| Community leaderboards | Requires 50+ users minimum | Post-community launch |
| Native mobile app | Responsive web + PWA is enough | Post-product-market-fit |
| Multi-endpoint sync | Web app handles this automatically | Never as a feature; it just works |
| Progress photo uploads | Storage, privacy, liability complexity | v2 with explicit consent flow |
| Affiliate product links in Mister P answers | Erodes trust before it's established | Month 6+, after subscription revenue is proven |
| Mobile push notifications | Requires native app or PWA permissions dance | Post-launch retention experiment |
| Social sharing of progress | Privacy-sensitive, brand risk | Never as a default, maybe opt-in v3 |
| Age segments <18 | Hard brand and liability line | Never |
| Scoring the top looksmaxing influencers across the "Is Clav Right" methodology | Requires publicly criticizing named creators bigger than us before we have standing. Content production cost is ~10× the single Clav piece. Legal and reputational blast radius is larger when scoring specific people. | Month 4–6, after subscribers and creator partners exist and can absorb some of the reputational weight |

---

## 4. Tech Stack

All choices optimize for: (a) boring and well-documented, (b) Claude Code support is actually good, (c) minimal configuration, (d) single deploy target.

### Core stack
- **Framework:** Next.js 15 (App Router)
- **Hosting:** Vercel (Hobby → Pro as needed)
- **Database + Auth:** Supabase (Postgres + pgvector + Supabase Auth)
- **Payments:** Stripe Checkout (hosted, not embedded)
- **Affiliate tracking:** Rewardful (integrates with Stripe natively)
- **LLM for Mister P:** Claude Sonnet 4.6 via Anthropic API
- **Embeddings:** OpenAI text-embedding-3-small (cheap, abundant, stable pricing)
- **Transactional email:** Resend
- **Analytics:** Vercel Analytics + PostHog (free tier) for session recordings
- **Styling:** Tailwind CSS + shadcn/ui components

### Architectural rules
- **LLM provider abstraction:** Route all LLM calls through a single wrapper function so swapping providers is a config change. Use Vercel AI SDK.
- **Embedded corpus is version-controlled:** POV markdown files live in `/content/povs/` in the repo. Re-embed on deploy via a build step.
- **No custom auth:** Supabase Auth, email + password and Google OAuth. Nothing fancy.
- **No custom admin panel:** Use Supabase dashboard directly for data management.
- **Server components by default, client components only where needed.**

### Monthly fixed cost at 0–500 users
- Supabase Pro: $25
- Vercel Pro: $20
- Rewardful: ~$49
- Resend: $0 (free tier)
- PostHog: $0 (free tier)
- Domain: ~$1
- **Variable:** Claude API (~$10/month at 500 users @ 20 queries each), OpenAI embeddings (~$0 at this scale)
- **Total fixed: ~$95/month. Total all-in at 500 users: ~$110/month.**

---

## 5. Data Model

Minimal schema. Expand as needed but start here.

```
users
  id (uuid, from Supabase Auth)
  created_at
  age
  age_segment (enum: '18-24', '25-32', '33-40', '41-45', '46-55' — 0.3 added '41-45'; 0.4 added '46-55' as part of the 30-55 audience pivot)
  motivation_segment (enum: 'feel-better-in-own-skin', 'social-professional-confidence', 'specific-event', 'structured-plan', 'something-specific-bothering-me', 'not-sure-yet', nullable until onboarding complete)
  motivation_specific_detail (text, nullable — only populated when motivation_segment = 'something-specific-bothering-me')
  onboarding_completed_at
  subscription_status (trial, active, canceled, past_due)
  stripe_customer_id
  rewardful_referral_id (nullable)

goals
  id
  user_id
  title
  description
  category (one of the 5 Layers from doc 15: 'biological-foundation', 'structural-framing', 'grooming-refinement', 'behavioral-aesthetics', 'perception-identity', or meta categories 'system', 'safety', 'context')
  priority_tier (one of: 'tier-1', 'tier-2', 'tier-3', 'tier-4', 'tier-5', 'conditional-tier-1', 'advanced', 'monitor', 'avoid', 'meta' — from doc 15 looksmaxxing system; 'monitor' = manageable-cost substances like alcohol/nicotine)
  goal_type (enum: 'process' | 'outcome', default 'process' — per §13)
  status (active, completed, abandoned)
  source_slug (nullable text — POV slug this goal was templated from; used for duplicate detection and walkthrough lookup, see §2.6)
  baseline_stage (nullable text, one of: 'new' | 'light' | 'partial' | 'established' — captured at acceptance, drives the walkthrough starting week per §2.6; migration 0007)
  created_at
  completed_at (nullable)
  source (user_created, system_suggested)

check_ins
  id
  user_id
  date (unique per user per day)
  created_at

(Note: no confidence_score column — removed per §13. Confidence lives on weekly_reflections.)

goal_check_ins
  id
  check_in_id
  goal_id
  completed (bool)

weekly_reflections
  id
  user_id
  week_start (date — Monday of the reflection week; unique per (user_id, week_start))
  social_confidence (int 1–10)
  work_confidence (int 1–10)
  physical_confidence (int 1–10)
  appearance_confidence (int 1–10)
  notes (nullable text)
  created_at

progress_photos (§2.6)
  id
  user_id
  slot (enum: 'baseline' | 'progress_30d' | 'progress_90d' | 'progress_180d'
        — migration 0009 widened 0008's original two-slot CHECK to add 'progress_30d';
        migration 0016 widened it again in 0.5 to add 'progress_180d' for the
        six-month checkpoint covering hair regrowth, late aesthetic compounding,
        and sustained recomp)
  storage_path (text — folder-based RLS: (storage.foldername(name))[1] = auth.uid()::text)
  captured_at
  -- bytes live in Supabase Storage bucket; metadata is here
  -- migrations 0008 (initial) + 0009 (30d slot) + 0016 (180d slot)

survey_responses
  id
  user_id
  question_key  -- onboarding answer keys plus KV markers: monthly_checkpoint_dismissed_at,
                -- and versioned quarterly re-survey keys (focus_areas_q1, motivation_segment_q1,
                -- specific_thing_q1, quarterly_survey_q1_completed_at). No unique constraint on
                -- (user_id, question_key) in the 0001 schema, so writes are delete-then-insert.
  response_value
  created_at

pov_docs
  id
  slug
  title
  category
  age_segments (array)
  priority_tier
  content (markdown)
  faqs (jsonb)
  updated_at

pov_chunks
  id
  pov_doc_id
  chunk_index
  content (text)
  embedding (vector(1536))

mister_p_queries
  id
  user_id
  goal_id (nullable uuid, FK goals.id ON DELETE SET NULL — added in 0.5
           via migration 0013 to support per-goal Mister P chat threads.
           NULL rows belong to the global /today thread; non-null rows
           belong to the goal-scoped thread visible on /goals/[id] and
           selectable in the /today thread picker. Composite index on
           (user_id, goal_id, created_at desc) for per-thread loads.)
  question
  answer
  citations (jsonb — list of pov_doc slugs)
  was_refused (bool)
  refusal_reason (nullable text)
  created_at

confidence_dimensions (for baseline survey)
  id
  user_id
  dimension (enum: appearance, social, career, physical, overall)
  baseline_score (int 1–10)
  captured_at

user_profile (added 0.3 via migration 0010; expanded 0.5)
  user_id (PK, FK auth.users ON DELETE CASCADE)
  -- Tier 1: body-comp / training / lifestyle grounding. Read by
  -- Mister P every turn; written via /profile (Current stats form).
  activity_level (enum: sedentary, lightly_active, moderately_active, very_active)
  training_experience (enum: none, under_1y, 1_to_3y, 3_to_10y, over_10y)
  daily_training_minutes (int 0–240)
  avg_sleep_hours (numeric(3,1) 0–14)
  diet_restrictions (text)
  bf_pct_self_estimate (enum: under_12, 12_to_15, 15_to_20, 20_to_25, over_25)
  current_weight_lbs (numeric(5,1) 80–500 — added 0.5 via migration 0014;
                      auto-populated at read time from survey_responses
                      'weight_lbs' when null so users with an onboarding
                      answer don't see this as blank on first /profile load)
  height_inches (int 48–96 — added 0.5 via migration 0015; same
                 read-time fallback to survey_responses 'height_inches')
  -- Tier 2: surfaced via /profile (Personal info form).
  hair_status (enum: full, thinning, receding, treating, shaved)
  skin_type (smallint 1–6, Fitzpatrick)
  current_interventions (text[] — controlled set: trt, glp1, finasteride,
                         minoxidil, retinoid, accutane, plus 0.5 additions
                         creatine, ssri, adhd_stimulant)
  budget_tier (enum: under_50, 50_to_150, 150_to_500, no_limit)
  relationship_status (enum: single, dating, partnered, married)
  updated_at
```

Keep it this simple. Resist the urge to add tables for features that aren't in MVP scope.

---

## 6. Mister P — System Prompt and Behavior

### Voice
- Direct, a little dry, non-judgmental
- Willing to say "that's not worth your time"
- Never hedges into "it depends" territory — Mister P has opinions
- Never moralizes, never lectures
- Never uses the word "journey"
- Never starts a response with "Great question"
- Refers to himself as "Mister P" or "I" — never "the assistant" or "an AI"

### System prompt (draft — iterate before shipping)

```
You are Mister P, the voice of Cleanmaxxing. Cleanmaxxing is a structured, safe
self-improvement platform for men who want to look and feel better.

Your job is to answer the user's question using ONLY the context provided below.
If the context does not contain information to answer the question, say:

"That's not something I cover yet. I've logged it and I'll add it to my list."

Do not draw on general knowledge. Do not speculate. Do not improvise beyond
what the context supports. Do not name the POV docs the context came from —
answer as if the information is yours, in plain prose, without parenthetical
source citations. (Updated 0.2: earlier drafts told Mister P to cite docs;
that produced pedagogical-sounding answers and made ordinary questions feel
like footnoted essays. The only pathway that now surfaces a POV doc by name
is the proactive-suggestion advisory, and that is gated on the user's own
active goals — see §2.6.)

(Updated 0.3: a `USER BEHAVIORAL STATE` block is now injected alongside the
active-goals block on every turn, containing the user's specific_thing
free-text, tenure, weekly goal-completion rate, latest per-dimension
confidence with rising/flat/declining tags, and stuck dimensions. The
block's prompt copy is explicit that Mister P must use the state to
calibrate depth and substance but must NOT narrate observations back to
the user. "I see you haven't checked in much" reads as surveillance;
letting the state quietly change what gets emphasized does not. See
`formatUserStateBlock` in `lib/mister-p/prompt.ts` for the four concrete
calibration heuristics.)

Your voice:
- Direct and a little dry
- Never hedges, never lectures
- Willing to tell the user something isn't worth their time
- Never moralizes
- Never uses the word "journey"
- Never starts with "Great question"

How to handle advanced/pharmacological topics:
Mister P discusses testosterone, steroids, peptides, GLP-1s, and other advanced
tools as EDUCATION — mechanisms, realistic outcomes, risks, post-cycle realities,
when natural optimization still has headroom, and what a user should ask a physician.
Mister P does NOT act as a dealer or a coach. Specifically:

- Will discuss: what compounds do, why people use them, the real risks and
  tradeoffs, why natural optimization comes first, the difference between TRT
  under physician care and unsupervised use, harm reduction principles,
  FDA-approved compounds (tesamorelin, prescribed TRT) at a clinical level.
- Will NOT provide: sourcing guidance (where to buy, which vendors, how to
  evaluate underground suppliers), prescriptive cycle protocols for non-medical
  users ("run 500mg test e for 12 weeks"), specific injection schedules framed
  as recommendations, or any guidance that functions as a how-to-use manual for
  unregulated compounds.

Hard refusals — these topics are off-limits regardless of context:
- Synthol, site enhancement oil, any injection for cosmetic muscle appearance
- DNP, clenbuterol, thyroid hormones for weight loss (no legitimate use case)
- Sourcing guidance for any unregulated compound (steroids, SARMs, peptides,
  research chemicals) — vendors, quality evaluation, ordering methods
- Prescriptive dosing protocols for non-medical steroid/SARM use
- Extreme caloric restriction (sub-1000 calories sustained)
- DIY dental work, DIY orthodontics, bone-smashing, mewing-as-orthodontics
- Hairline tattoos or procedures abroad from unvetted providers
- Any advice for users under 18
- Interpretation of lab results, diagnosis, or treatment recommendations. Mister P does
  NOT interpret blood work, hormone panels, lipid panels, or any other clinical data.
  If a user shares a lab value, Mister P may discuss the lifestyle domain Cleanmaxxing
  owns (sleep, training, body comp, nutrition, skincare) in general terms and MUST
  tell the user to take the medical question to their physician. Mister P never says
  "this value suggests X condition" or "you should consider X treatment."

Hard refusal for attractiveness hierarchies and "alpha" framings:
Mister P refuses to engage with framings built on "alpha males," "high-value men,"
attractiveness rankings, looks-tier scores (PSL, decile ranking, etc.), or any
premise that a person's worth as a human maps to where they sit on a hierarchy of
attractiveness or masculinity. If a user brings this language into a question,
Mister P does not play along. He redirects in voice:

"I don't think about it that way, and Cleanmaxxing doesn't either. Your worth
isn't a ranking. Tell me what you actually want to work on and I'll help with
that."

This is not a content filter added on top — it's the brand's position. The history
of looksmaxxing as a category includes communities that tied male worth to these
hierarchies and the defensive posture is to refuse the premise rather than argue
with it.

When refusing, stay in voice. Example:
"Not something I'll help with — that's the kind of shortcut that ends careers
and sometimes lives. If you're frustrated with arm size, ask me about the
boring stuff that actually works."

Context provided:
{retrieved_chunks}

User question:
{user_question}
```

### Additional blocks injected per request (shipped in 0.2)

Three optional blocks may be appended to the system prompt on each turn, driven by the ask handler in `app/api/mister-p/ask/route.ts`:

- **Active-goals block** (`formatGoalsBlock` in `lib/mister-p/prompt.ts`) — always injected when the user has any active goals. Lists each goal with its duration and how many prior Mister P answers cited its source doc (so Mister P can skip foundations for a user who has already seen them). Includes instructions: anchor answers to what the user is working on when the question overlaps, calibrate depth by goal age and prior-chat coverage, do not force a connection when the question is unrelated.
- **Proactive-suggestion advisory** (§2.5c) — injected when `shouldTriggerProactiveSuggestion(topicAnalysis)` is true, `chunks.length > 0`, **and** the top retrieved chunk's `doc_slug` is in the user's active goal `source_slug` set. Tells Mister P to offer one optional "full breakdown in the X doc" line after the main answer. Gated on the user-goal set because a doc that isn't backing one of their goals wouldn't be on `/povs` — the nudge would dead-end.
- **Circuit-breaker advisory** (§13) — injected when `shouldTriggerCircuitBreaker(topicAnalysis)` is true (5+ similar-topic queries in 7 days; 3+ for the `something-specific-bothering-me` motivation segment). Takes priority over the proactive-suggestion advisory when both would fire — at most one advisory per turn.

### Iteration plan
- Write 20 test questions before shipping (10 in-scope, 5 edge cases, 5 hard refusals)
- Run them against the prompt + corpus
- Iterate on the prompt until all 20 pass
- Keep the test suite in `/tests/mister_p_smoke.md` and run it before each deploy

### Out-of-scope logging
Every refused or "not in corpus" question writes a row to `mister_p_queries` with `was_refused = true`. Review weekly. The top 10 most-asked missing questions become the next 10 POV docs to write.

---

## 7. Onboarding Survey — Actual Questions

Keep to ~15 questions. One per screen on mobile. Progress bar at top.

### Bucket A: Demographics and Baseline (5 questions)
1. How old are you? (number, must be 18+)
2. What's your height and weight? (optional, two number fields)
3. How would you describe your current level of self-improvement effort? (none / occasional / consistent / obsessive)
4. **What's bringing you to Cleanmaxxing right now?** (single select — routes experience but never shown back as a label; persisted to `users.motivation_segment`)
   - I want to feel better in my own skin
   - I want to feel more confident in social or professional situations
   - I'm preparing for a specific event or life change (wedding, new job, dating, etc.)
   - I want a structured plan for self-improvement
   - Something specific is bothering me and I want to address it
   - Honestly, I'm not sure yet

   If the user picks "Something specific is bothering me," one follow-up free-text field appears: *"What is it? (one sentence is fine)"* — persisted to `users.motivation_specific_detail`. Skippable. This is the one case where we capture the detail because it changes what Mister P addresses first.
5. How did you hear about Cleanmaxxing? (dropdown: creator name / Google / friend / other)

### Bucket B: Physical Focus Areas (6 questions)
6. Which of these do you most want to improve? (multi-select, max 3: fitness / body composition / skin / hair / facial aesthetics / style / posture / grooming)
7. Do you avoid photos of yourself? (never / sometimes / often / always)
8. Have you tried structured self-improvement routines before? (never / yes, stuck with them / yes, stopped / currently active)
9. Is there one specific thing you think about more than you'd like to? (free text, optional)
10. On a 1–10 scale, how happy are you with your current appearance?
11. What's your biggest obstacle right now? (time / money / knowledge / motivation / something else)

### Bucket C: Confidence Baseline (5 questions — 1–10 sliders)
12. How confident do you feel about your appearance?
13. How confident do you feel in social situations?
14. How confident do you feel at work or school?
15. How confident do you feel about your physical health?
16. Overall, how confident do you feel about yourself?

Total: 16 questions. Still well under the "feels like a conversation, not a form" threshold at one-per-screen.

### After submit
- Store all responses
- Compute age segment
- Persist `motivation_segment` (and `motivation_specific_detail` if applicable) to the `users` table
- Run goal suggestion algorithm:
  - Filter POV corpus by age segment
  - Filter by selected focus areas (question 6)
  - Rank by priority tier from POV hierarchy (S → A → B → C)
  - Apply motivation-segment weighting per Feature 1 (process-goal up-weight for feel-better/not-sure, self-acceptance docs up-weight for same, time-boxed goals for specific-event, etc.)
  - Return top 3 as suggested goals, with visible tier badges and a one-line explanation of why they were chosen
- Show the 3 suggestions with option to accept, swap, or browse library

---

## 8. Pricing and Trial Structure

- **14-day free trial, no credit card required**
- **$9.99/month** or **$79/year** (save 34%)
- Trial converts to paid only with explicit opt-in at end of trial
- No free tier forever
- Affiliate-referred users get first month for $1 (creator economics handled by Rewardful)

### Rationale
- No-CC trial = higher trial signup, higher trial-to-paid on users who got value
- $9.99 is the psychological sweet spot; $20 is a leap for this demographic
- Annual pricing captures the committed early adopters and stabilizes cash flow
- $1 first month for affiliate users lowers friction and gives creators a compelling "try it for a buck" hook

---

## 9. Build Plan — Week by Week

Each week assumes ~28 hours of build time (4 hours × 7 days, with some days short and some long).

### Week 1: Foundation
- Scaffold Next.js 15 project with Tailwind and shadcn/ui
- Set up Supabase project, schema, Auth
- Wire up Stripe Checkout (test mode)
- Deploy skeleton to Vercel
- Create `/content/povs/` directory structure
- Restructure POV docs with FAQ sections (this work continues through week 2)
- Write `SESSION_HANDOFF.md` pattern into the repo from day 1
- Discord server setup for #weekly-wins

**End of week:** Can sign up, log in, see an empty authenticated home page. Payments work in test mode.

### Week 2: Corpus and RAG
- Chunk POV docs (~500 tokens per chunk with 50-token overlap)
- Embed with OpenAI text-embedding-3-small
- Store in Supabase pgvector
- Build retrieval function (cosine similarity, top 5)
- Write Mister P system prompt v1
- Build `/api/mister-p/ask` endpoint
- Write smoke test suite (20 questions)
- Iterate prompt until smoke tests pass
- Write confidence score context table
- Deploy Discord invite link

**End of week:** You can ask Mister P a question from a terminal or Postman and get a grounded answer with citations.

### Week 3: Onboarding and Goals
- Build onboarding survey flow (15 questions, one per screen)
- Persist survey responses
- Build goal suggestion algorithm
- Build goal library browse/filter/swap UI
- Build goals list view
- Weekly reflection email templates + pattern detection logic
- Mister P topic detection logging

**End of week:** Full flow from signup → survey → 3 goals in your library works end-to-end.

### Week 4: Today Screen and Check-In Loop
- Build Today screen layout
- Build daily check-in component (confidence slider + goal checkboxes)
- Build confidence trend chart (use Recharts)
- Wire Mister P chat UI into Today screen
- Handle "already checked in" states
- Monthly checkpoint screen + goal suggestions algorithm
- Launch weekly emails

**End of week:** Core daily loop works. You can use the product yourself and see the chart update.

### Week 5: Content Pages, Polish, Affiliate
- Write "Is Clav Right?" page (polish the existing draft)
- Write Mister P Background page (in your own voice)
- Integrate Rewardful with Stripe
- Build creator landing page template (parameterized by creator slug)
- Onboarding email sequence (Resend): welcome, day 3, day 7, day 14 (trial ending)
- Public homepage with signup CTA
- **"Ways to build self-confidence" framework section on the public homepage** — four-path framing per section 1. Cleanmaxxing owns the physical-attributes path explicitly, acknowledges the other three as real. This is the positioning section that separates us from every competitor who treats appearance as the whole identity.
- Launch monthly checkpoint
- User testing on stickiness loop

**End of week:** Marketing surface is live. Affiliate tracking works.

### Week 6: Beta and Fixes
- Invite 10–30 beta testers from your first creator partner
- Watch PostHog session recordings daily
- Fix top 5 bugs/UX issues
- Monitor Mister P query log for refusal issues and corpus gaps
- Prepare for public launch (or closed-beta-extension — see next section)

**End of week:** Either ready for public launch, or you have a clear list of what blocks it.

---

## 10. Reality Check on the Timeline

This plan assumes 28 hours per week. Real life will interfere. Here's the honest version:

- **Weeks 1–4 are the critical path.** If Mister P, onboarding, goals, and check-in aren't working by end of week 4, the launch slips. These cannot be cut further.
- **Weeks 5–6 are the flexible buffer.** Content pages, affiliate integration, and beta testing can compress, extend, or slip into weeks 7–8 without killing the project.
- **If life explodes in weeks 1–4**, the right move is to extend the timeline, not to cut scope below the six features. Below this floor, the product is not coherent.
- **Baby arrives ~week 6.** Realistic paid public launch is probably weeks 10–12, with closed beta running through the newborn window on creator-referred users only.

### Handoff protocol (non-negotiable)
At the end of every build session, write `SESSION_HANDOFF.md` in the repo root with:
- What you did today
- What's working
- What's broken
- What the next session should start with
- Any decisions made that affect this spec doc

At the start of every build session, read it first.

---

## 11. Open Decisions

These are not blocking MVP but need to be resolved before public launch:

- **Creator partner #1:** Who is it? Target by end of week 2.
- **Mister P persona details:** Age? Background? How much detail is on the Background page? Write in week 5.
- **Brand visual identity:** Logo, color palette, typography. Placeholder shadcn defaults are fine for MVP; hire this out in week 5 or week 7.
- **Terms of service and privacy policy:** Use Termly or similar generator for MVP. Review with a lawyer before paid public launch.
- **Refund policy:** Default to "cancel anytime, no refunds on partial months." Revisit if support load suggests otherwise.
- **Domain:** Is cleanmaxxing.com available? Backup options?

---

## 12. Success Criteria

### End of MVP (week 6)
- Product works end-to-end for one beta user without errors
- At least one creator affiliate link is live and tracking
- 10+ beta testers have completed onboarding
- Mister P smoke tests pass at 95%+ on the 20-question suite

### End of month 3 post-launch
- 100+ paying subscribers
- Month-2 retention ≥40% (honest: this category will churn hard; 40% is a reach goal)
- Mister P corpus has grown by 10+ new POV docs based on query logs
- At least 3 active creator affiliate partners

### Kill criteria
If by end of month 3 you have fewer than 30 paying subscribers *and* retention is below 25%, seriously reassess. Don't pour more time in without a hard look at whether the thesis is holding. Be willing to call it. The baby matters more.

---

## 13. Psychological Safety (Non-Negotiable)

This section exists because the category Cleanmaxxing operates in has known failure modes, and the product's core retention loops — daily tracking, confidence measurement, appearance-focused goals — overlap with design patterns that have been shown to worsen body image and self-monitoring behaviors in vulnerable users. The goal of this section is not to avoid the category. It is to build in it responsibly.

**Guiding principle:** Every design decision runs through the filter of "does this leave the average user better off or worse off, and am I confident about which?" When in doubt, choose the design that's slightly worse for retention and meaningfully safer for users.

### Design commitments

**Confidence tracking is weekly, not daily.** The original spec called for a daily confidence slider. Change this. Users log a weekly confidence reflection, not a global self-worth rating. Frame it around specific contexts ("this week, in social situations, I felt...") across 3–4 dimensions rather than one global number. This reduces the self-surveillance loop meaningfully without killing the retention mechanic — the weekly chart still shows a trend over time.

**Goal defaults are process goals, not outcome goals.** When the suggestion algorithm runs after onboarding, it prioritizes process goals (actions the user can take) over outcome goals (results tied to appearance). Outcome goals are available but require an extra tap and show a brief explainer: "Process goals work better for most people. Here's why." The POV hierarchy should be re-sorted with this in mind before MVP ships.

**Mister P has circuit-breakers on obsessive patterns.** When a user asks 5+ questions in a 7-day window about the same insecurity or topic, Mister P notices and responds with something like: "You're circling this one hard. Sometimes the work isn't more fixing, it's less checking. Take a week off from this topic and come back to it." This requires tracking query topic clustering — a lightweight version (tag questions by category on ingestion, count by category per user per week) is sufficient for MVP.

**"Step away" mode is a first-class feature.** Settings includes a one-tap option to pause daily check-ins and tracking without losing goals or progress. The copy explicitly frames this as a legitimate and sometimes correct choice: "Taking a break from tracking is healthy. Your goals will be here when you come back." Most tracking products hide this or don't offer it. Cleanmaxxing offers it prominently.

**Active goal cap at 5 with soft override.** Behavior-change research shows 3–5 concurrent habit goals is the sustainable ceiling — past that, completion rates drop and users start seeing their daily check-ins as a wall of failures. When a user already has 5 active goals and tries to add a 6th, show an inline nudge with one-tap override. See Feature 1 for the implementation detail. The point of the cap is not to block users who genuinely want more — it's to interrupt the "more is better" reflex with a moment of honest friction, and to prevent the retention anchor (the check-in screen) from turning into a demoralization surface.

**Onboarding includes a clinical screening question.** Add to the survey: "Have you ever been diagnosed with or treated for an eating disorder, body dysmorphic disorder, or OCD?" If yes, show a screen recommending they speak with a clinician before using the product, with resources (NEDA alternative: National Alliance for Eating Disorders helpline) and a soft option to continue. Some users will drop off. Those are users the product should not be serving.

**Mister P never moralizes, but Mister P also never pretends that every problem has a product-shaped solution.** The system prompt should be updated to include: "Sometimes the right answer is that the user doesn't need to fix this. If the question is about an insecurity that isn't worth fixing, say so. 'Honestly, this one isn't worth your attention. Focus on [X] instead.' Refusing to help isn't always a content policy — sometimes it's the actual advice."

**Explicit anti-hierarchy commitment.** Cleanmaxxing rejects the framing that a person's worth maps to a hierarchy of attractiveness or masculinity — "alpha," "high-value male," PSL ranking, decile scoring, looks tier lists. This is stated in §1 as a brand line, enforced in §6 as a Mister P hard refusal, and carried through the corpus as an audit commitment: before launch, read all 90k words of the POV corpus with this lens on and rewrite any framing that ranks men against each other, implies worth is contingent on attractiveness, or references "alpha/beta" or "high-value" language. This is a half-day of work pre-launch and it is dramatically harder to do retroactively once the product is live. The category has a known history and the defensive posture is to make the underlying worldview impossible to take root in the product rather than to name or engage with it in marketing.

**Explicit self-acceptance content lives in the corpus.** At least 3 POV docs in the initial release cover self-acceptance, the limits of self-improvement, and when to stop. These aren't hidden or optional — they're surfaced in Mister P's responses when relevant and appear in the goal library under their own category. This is the "second leg of the stool" the original spec was missing.

### Pre-launch review

Before public paid launch (not beta, but the actual launch), engage a clinician who works with body image issues in men for a 2–3 hour consulting review of:
- Onboarding flow and screening
- Goal suggestion logic and defaults
- Mister P system prompt, refusal rules, and circuit-breaker behavior
- The weekly confidence tracking mechanic and its surfacing
- At least 20 sample Mister P responses to typical user questions

Budget: $500–1500. Source: psychology today directory, referrals, or a university clinic with a men's health specialization. This is a non-negotiable line item. If the timeline pressure makes this feel optional, slip the launch, not the review.

### What this costs the product

These commitments reduce the product's raw retention numbers vs. the original spec. Weekly check-ins are less sticky than daily ones. Step-away mode creates a pause path that some users will take and not return from. Circuit-breakers will occasionally frustrate power users. Process-goal defaults are less viscerally satisfying than outcome-goal defaults.

That's the cost. It is worth paying. The version of Cleanmaxxing that ignores these considerations might make more money in year one but it will generate exactly the kind of user harm that ends products in this category. The version that builds them in from day one is the version that compounds over time because its users actually get better and tell their friends.

### The self-check

When a new feature is proposed, including in v2, ask three questions:
1. Does this increase or decrease the user's time spent monitoring themselves?
2. Does this strengthen or weaken the implicit message that the user's worth depends on the metric?
3. Would I be comfortable if my own child, at their most vulnerable moment, used this feature?

If the answer to any of these is "the harmful direction," change the feature or cut it.

---

## 14. v2 Backlog

Not MVP. Captured here so they aren't lost and so the spec has one place to point when a tempting "we should build this" impulse strikes mid-build. Each entry includes the scope constraint that makes it safe to build when the time comes — the constraints matter as much as the features.

### Blood labs input with LLM analysis (v2+, 2–3 months of work)

**What it is:** Users upload a PDF or manually enter values from doctor-ordered blood work. The system parses, normalizes units (US vs SI), tracks markers longitudinally, and feeds the data into Mister P so he can contextualize lab values within the lifestyle domain Cleanmaxxing already owns.

**Why it's attractive:** It's the cleanest version of the "medical-adjacent" pull because the user is bringing objective, doctor-ordered data into the conversation. Testosterone trending low → Mister P surfaces the sleep, training, and body-comp POV content. LDL elevated → Mister P surfaces the dietary content. Vitamin D low → supplementation discussion. It stays in lane while becoming genuinely differentiated, because the regulated medical-AI players (Hippocratic, etc.) won't touch lifestyle integration and the lifestyle players won't touch lab data. Real moat in 18 months.

**The hard scope constraint — non-negotiable:** Mister P contextualizes, he does NOT interpret. He never says "your TSH suggests subclinical hypothyroidism" or "this lipid panel warrants a statin discussion." He links lab markers to the lifestyle levers in the corpus and then tells the user to take the medical question to their physician. This line is the entire reason the feature is safe to build. If the implementation drifts across it, the feature becomes a regulatory and liability problem rather than a moat. See §1 brand line and §6 Mister P refusal for the primary-source constraints.

**Why it's not MVP:** Lab parsing is harder than it looks. PDFs from ~50 different labs in ~50 different formats, unit normalization, reference range handling, longitudinal tracking, and the UX of reliably getting users to upload. Realistically 2–3 months of focused work to do it well, and it's a feature that breaks badly when it breaks (wrong unit → wrong contextualization → user takes wrong action).

**When to revisit:** After 500+ paying users, when the retention loop is stable and the corpus is mature enough that the contextualization layer has real depth. Do not build this before the core loop is proven.

### In-app frictionless tracking utilities for goals (v2+, ~6 weeks)

**What it is:** Tracking widgets built into the product, one per goal category — weight tracking, lifting log, sleep log, skincare adherence, supplement adherence. The New Wave / MacroFactor / Strong observation: tracking in-app has dramatically higher adherence than "user maintains their own spreadsheet."

**Why it's not MVP:** Each goal category needs a different tracker UI. Building them well is a feature-per-category exercise and could eat 6 weeks on its own. In MVP, the daily check-in stays binary — *did you work on this today, yes/no* — and for users who want richer tracking, Mister P suggests an off-platform tool (MacroFactor or Lose It for weight, Strong or Hevy for lifting, etc.). We lose some stickiness but we avoid building a half-dozen mediocre trackers.

**Scope constraint for v2:** Don't build a generic tracking framework. Pick the 3–4 highest-leverage categories (weight, lifting volume, sleep, supplement adherence are the obvious candidates) and build one opinionated, really good tracker per category. Opinionated beats generic here.

**Integrations are the longer-term play.** MacroFactor and Strong have APIs. Pulling data in is better than asking users to double-log. Year-2 conversation but worth keeping in mind when scoping v2.

### Scoring named looksmaxxing influencers across the "Is Clav Right" methodology (month 4–6)

Already captured in §3 out-of-scope table. Kept here as a pointer. Revisit when subscribers and creator partners exist and can absorb some of the reputational weight of publicly criticizing named creators.

### Image upload for skin observations (v2+, paired with blood labs)

**What it is:** Users upload a photo of their face. Mister P makes observational comments within the lifestyle domain — oily T-zone, redness around the nose, uneven texture, visible acne scarring — and routes the user to the relevant POV docs (skincare, acne, skin texture, etc.). Not a diagnosis. Not a dermatology substitute. The same contextualize-don't-interpret line as blood labs applies.

**Why it's attractive:** It's visually obvious what the product could do with this, and the observation-to-POV-doc pipeline is a stronger "wow moment" than text-only chat. It also surfaces the skincare troubleshooting content (Doc 07) and the acne pivot content (Doc 25) in a way that feels personalized rather than generic.

**The hard scope constraint:** Mister P observes, he does not diagnose. He never says "this looks like rosacea" or "you should see a derm about this mole." He says "there's some redness and visible capillaries around the nose and cheeks — here's what the skincare doc says about calming that down, and here's when it's worth seeing a dermatologist." Same line as labs: contextualize within the lifestyle domain, redirect clinical questions to a physician.

**Implementation cost:** Multimodal LLM call (Claude already supports vision), image upload + storage (Supabase Storage or S3), a prompt wrapper that constrains observation to the lifestyle domain, and UX for getting users to upload reliably. Lighter than blood labs (no PDF parsing, no unit normalization) but still needs careful prompt engineering to stay on the right side of the medical line.

**When to revisit:** After the blood-labs infrastructure is scoped (they share the same medical-boundary constraint), or standalone once the core loop is proven. Potentially earlier than labs because the implementation cost is lower.

### Age-segment-specific tier overrides for goal templates (v2+, ~1 week)

**What it is:** Right now `content/povs/_metadata.json` assigns one `priority_tier` per POV doc, applied uniformly across every age segment. The hierarchy a 22-year-old should work through is meaningfully different from a 38-year-old — most visibly with cardio, which is a tier-2 "high impact" item aesthetically but becomes genuinely foundational (tier-1) after ~35 for longevity and metabolic health. Other likely candidates: sleep (already tier-1 but the 35+ weighting should be even stronger), mobility (probably bumps up for 33-40), supplements (longevity case changes with age).

**Proposed shape:** Add an optional `priority_tier_overrides: { "33-40": "tier-1" }` field on `_metadata.json` entries. Thread through the ingest script into a new `pov_doc_tier_overrides` column or sidecar table. Ranking, suggestions, library grouping, and badges all resolve the effective tier for the current user before rendering.

**Why it's not MVP:** Adds a schema dimension, touches the ingest script + `/api/goals/templates` + `/api/onboarding/suggestions` + `/lib/checkpoint/service.ts` + the library browser grouping. Global uniform tier is a defensible approximation for v1 — cardio at tier-2 ("high impact") is honest for 35+ even if it underweights the longevity case.

**When to revisit:** After the first cohort of 33-40 users report on whether the current hierarchy feels right for them. If the 35+ feedback consistently says "cardio / recovery / mobility should have been pushed harder earlier," that's the signal to build this. Until then, the global tier is fine.

**Scope constraint:** Per-age-segment overrides only — don't generalize this into per-motivation-segment or per-focus-area tier overrides. Those route through the ranking algorithm's scoring weights, which is the right abstraction for fuzzy preferences. Age segment is a hard demographic boundary and deserves first-class tier treatment; motivation is softer and belongs in the scorer.

### Medical-adjacent restraint (standing constraint, not a feature)

This is not a v2 feature — it's a standing discipline that applies to every v2 decision. The temptation in this category is to drift toward "better WebMD," because users will ask medical-flavored questions and the product feels smarter when it answers them. Do not drift. Every v2 feature that touches medical data, symptoms, or treatment gets held against the §1 "Not medical" brand line and the §6 Mister P refusal rules. Mister P contextualizes within the lifestyle domain and redirects clinical questions to a physician. Full stop. The blood labs feature above is the one place this gets tested hardest; its scope constraint exists precisely to keep the discipline intact.

---

## 15. What This Doc Is Not

This is not a product roadmap past MVP. It is not a brand bible. It is not a marketing plan. It is a **shippable build spec for the next 6 weeks**. Anything outside that scope belongs in a different document.

When something on this list changes, update this file and commit it. This file is the contract between past-Phil and future-Phil, with Claude as witness.

---

*End of spec. Go build.*
