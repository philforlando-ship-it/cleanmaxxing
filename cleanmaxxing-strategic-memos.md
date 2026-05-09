---
title: "Cleanmaxxing — Strategic Memos"
subtitle: "Journey Redesign Framework, Beta Feedback, Competitive Positioning"
date: "Compiled 2026-05-04"
---

These three memos were captured as project memory during a May 2026 strategy session triggered by beta-user feedback. They cover (1) a planned redesign of every focus-area in the app from a POV-as-library shape to a staged-journey shape, (2) the discrete bugs and gaps the same beta user flagged, and (3) the competitive positioning analysis that came out of the same conversation. Read together, they form a connected case for what to build next and why.

\newpage

# 1. Journey Redesign — Four-Pattern Framework + Cross-Journey Modifier Architecture

**Type:** Project memory
**Description:** Planned shift from POV-as-library to staged journeys per topic. Four patterns (A habit ladder, B program execution, C reflective practice, D intervention protocol) plus a cross-journey modifier system that lets interventions, medical conditions, and mental-health states adjust other journeys' reports and stage content. Includes surface-impact map (onboarding, /today, goals library, Mister P, POV pages, profile, emails) and ceiling/strategic case (journey redesign alone is 7 → 7.5; stacked with Pattern D + Mister P upgrade + facial analysis is 7 → 8.5–9). Drives scope, sequencing, and go/no-go decisions for any focus-area redesign work.

---

Beta feedback (Chris MacRae review, 2026-05-03) flagged that the app reads as a reference library — POV docs dump on users instead of guiding them through assessment → recommendation → one-habit-at-a-time. Planned response: stage every focus area as assessment → personal report → event-gated stages → POV slicing → maintenance. Four distinct journey templates, intentionally kept separate (don't try to abstract into one engine):

## Pattern A — Habit ladder (event-gated)

Topics: hair, style, sleep, skincare, nutrition, grooming (face), grooming (body hair), teeth, posture, cardio, mobility, supplements, environment.

Plus subtraction-flavored variants: alcohol-cannabis, nicotine-vaping (same scaffolding, daily action is "abstained today" rather than "did the habit").

All share: assessment → report → stage progression gated by user readiness → POV slicing → one behavior or decision per stage.

Edge cases inside Pattern A:

- *Teeth* uses appointments instead of daily habits (same framework, action verb is "book/attend").
- *Supplements* is a short ladder (3–4 stages) that goes dormant after setup.
- *Cardio* is calendar-paced for base-building but doesn't need Pattern B's program model.
- *Subtraction journeys* need one new measurement type (`abstinence_streak`); otherwise reuse Pattern A.

## Pattern B — Program execution (calendar-gated, 12-week blocks)

Topics: strength only.

Needs program/session/exercise primitives, deload cycles, auto-progression on load. Cardio could be promoted here at advanced tier but base-building lives in Pattern A.

## Pattern C — Reflective practice (perpetual, no end state)

Topics: self-acceptance.

Already wired via weekly-reflection-card, weekly letter, and circuit-breaker risk detector. No journey redesign needed — leave as is.

## Pattern D — Intervention protocol (medical-flavored, three phases)

Topics: GLP-1s, peptides, testosterone/TRT, hair-loss medical stack (fin + min — `hair-loss-start-plan` already exists as a goal template), fat burners, possibly future SARMs / clinical-grade interventions.

Companion POVs (testosterone-real-experiences, peptide-deep-dive, training-while-enhanced) are slices that parent intervention stages pull from, not standalone journeys.

Three phases (not the standard stage ladder):

1. **Considering** — decision support: candidacy, prescriber-conversation prep, lab demands, realistic-outcomes vs. internet hype.
2. **On protocol** — titration + monitoring: dosing calendar, side-effect log, paired behavior adjustments, lab cadence, "when to call your prescriber" triggers.
3. **Off-ramp / maintenance** — exit planning: rebound risk (especially GLP-1s), regain protocols, what habits need to harden before stopping.

Pattern D requires a real `interventions` table (replacing the flat `current_interventions[]` on user_profile): type, start_date, dose, frequency, titration schedule, prescriber_status, side_effect log, next check-in date.

**Medical/legal posture:** the app does not prescribe. "Considering" is decision support and prescriber-conversation prep, not sourcing guidance. "On protocol" assumes a prescriber relationship; if user indicates self-sourcing, escalate via existing circuit-breaker / Pattern C surface.

## Cross-journey modifier architecture (the bigger architectural commitment)

Pattern D isn't just its own journey type — it's also a **modifier on Pattern A and B journeys the user has active**. Same pattern applies to several non-intervention topics that don't deserve standalone journeys but DO need to adjust other journeys:

**Modifier sources (no standalone journey, but adjust other journeys' reports and stage content):**

- Active interventions (any Pattern D protocol)
- 22-carbohydrates-fasting *(nutrition variant — keto/IF/refeed)*
- 41-medical-conditions *(diagnosed conditions affecting any journey)*
- 43-mental-health *(adjusts pacing, motivation language, escalation thresholds)*
- 44-water-retention *(acute lookup, surfaces in nutrition/strength check-ins)*
- 57-skin-conditions *(eczema/rosacea — modifies skincare journey)*

Example: a user on a GLP-1 with an active nutrition goal shouldn't get the generic nutrition report. The journey's report and stages should know there's a GLP-1 in play and adjust — protein language ("front-load breakfast, you won't want it later"), hydration becomes a daily tile, calorie deficit framing changes ("mostly automatic, track to avoid undereating"). Strength journey adjusts too: extra leucine emphasis, slower recovery expectations.

**Architectural implication:** Pattern A's report generator must take a list of active modifiers from day one. Retrofitting modifier-awareness later, after multiple Pattern A topics have shipped with topic-only reports, is painful. This is a build-it-once-up-front decision, not a "we'll add it later" item.

## Reusable Pattern A primitives (build once)

- `goal_stage` / `goal_progress` field on goals (one schema change)
- Generic stage card component with content slots
- LLM-driven personal report generator that accepts (topic, user_state, **active_modifiers**) — modifier-aware from v1
- Assessment tile pattern (reuses daily check-in card styling)
- POV slicer — chunked markdown rendering instead of full-doc dump at /povs/[slug]

## POVs deliberately excluded (correctly absent from any journey)

13-body-physical-foundation, 14-presence-intangibles, 15-looksmaxxing-system, 37-cleanmaxxing-blueprint, 38-aging-appearance, 52-budget-tiers, 53-tracking, clavicular-framework-evaluation. These are reference / philosophy / cross-cutting — referenced from inside other journeys but not journeys themselves. Keep as is.

## POVs deferred — plausible future Pattern A journeys, low priority

28-cosmetic-procedures, 33-niche-enhancements, 34-recovery-tools-polish, 58-hair-systems-prosthetics, 06-bone-smashing. Not blocked, just lower volume. Defer until core Pattern A topics ship.

**Surprise candidate worth a separate conversation:** 51-dating-apps. It's the natural endpoint of the entire app — every other journey is upstream of "use this in real life." Currently a reference doc; could be the most natural Pattern A journey of the deferred set (profile audit → archetype → photo selection → message practice). Worth elevating before backfilling lower-volume topics.

## Per-topic work (each topic)

- 3–5 assessment questions (in-app tiles, NOT bloating initial onboarding)
- 1 personal report template
- 5–8 stage definitions
- 1–3 domain tables/columns specific to that topic
- POV chunking pass (slice the existing markdown into stage-bound sections)

## Scope estimate

| Pattern | Topics | Framework cost | Per-topic content |
|---|---|---|---|
| A — Habit ladder | 13 + 2 subtraction | 1–2 wks | 2–3 wks each |
| B — Program execution | strength | 3–4 wks | 3–4 wks |
| C — Reflective | self-acceptance | 0 (exists) | 0 |
| D — Intervention protocol | 5 (GLP-1, peptides, TRT, hair meds, fat burners) | 3–4 wks (interventions table + modifier-on-other-journeys wiring) | 2–4 wks each |

Full ladder including Pattern D: ~7–9 months focused product work.

## Surface-impact map (what else changes when journeys ship)

The redesign is horizontal — it touches multiple surfaces, not just focus-area pages. By surface:

**Onboarding (medium change):**

- Reframe upfront — "Pick 1–3 focus areas. Each is a 6–12 week guided journey."
- Add intervention status block: "Currently using GLP-1 / TRT / hair-loss meds / peptides?" → seeds modifier list from day one
- Add "considering in next 90 days?" check → opt-in entry to Pattern D Considering-stage
- Drop or rework vague open-ends (`specific_thing`; possibly `motivation_segment`) — per-journey assessment captures motivation in context with visible payoff
- Per-topic assessment questions stay OUT of onboarding by design — they live as Stage 1 in-app tiles

**/today (large change):**

- Every tile becomes anchored to a journey — solves Chris's orphan-tile feedback structurally
- Stage tiles: today's action for each active journey (1–3 visible)
- Telemetry-driven tiles (sleep variance, intensity minutes, etc.) only appear when their parent journey is active
- Modifier tiles surface when interventions active (hydration on GLP-1, side-effect log)
- Pattern C surfaces (weekly reflection, circuit-breaker) stay as is

**Goals library `/goals/library` (large change):**

- Collapses from flat template list into journey selector (≈1 per focus area)
- Outcome goals (lose 10%, body fat 15%, jawline) move INSIDE the relevant journey rather than being peer items in a library

**Mister P (medium change):**

- Becomes context-aware translator between structured journey state and free-form Q&A
- Needs: photo access (the prerequisite bug), journey/stage state, active modifier list, personal report contents per active journey
- "I'm at Stage 3 of hair, my crown looks weird in the new cut" works because Mister P knows the cut family from Stage 2's report

**POV pages `/povs/[slug]` (medium change):**

- Renders shift from full markdown dump to stage-bound slice; full POV behind "see everything" link
- Requires tagging markdown sections with stage labels in source files (content work, not engine work)

**Profile (medium change):**

- Becomes a derived view of journey assessment outputs — Stage 1 tiles populate it, no profile form
- `interventions` table replaces flat `current_interventions[]` array on user_profile
- New columns added per journey as they ship (`face_shape`, `body_frame`, etc.)

**Weekly letter + weekly reflection email (small–medium change):**

- Letter narrates journey progress ("wrapped Stage 2 of hair this week, Stage 3 starts Monday")
- Reflection prompts become journey-stage-aware
- Mostly copy/template work, plumbing already exists

**Email sequences (`onboarding-sequence.ts`, etc.) (medium change):**

- Branch on which journey the user picked and current stage instead of flat funnel

**Health webhook / Junction integration (small change):**

- Pipeline unchanged; consumption changes (telemetry feeds specific journeys' reports)
- Net new ingestion: weight (for Pattern D GLP-1 protocols + nutrition outcomes)

**Self-acceptance / circuit-breaker (Pattern C) (small change):**

- "Too many goals" threshold reinterprets — unit becomes "active journeys" not flat goal rows
- Probably 3 Pattern A + 1 Pattern D as the new "doing too much" threshold

**Unchanged:** auth, billing, sign-up flow (except CC-timing copy fix), POV markdown source files, telemetry pipeline, spec docs structure, RAG/embeddings infra.

## Recommended sequencing

1. Fix Mister P photo access bug (days, hard prerequisite for Pattern A — see beta feedback memo)
2. Pattern A framework, **modifier-aware from v1**, + hair as the shakeout (4–5 wks combined, slightly longer than original estimate because of modifier-awareness)
3. Decide whether to build Pattern D before or in parallel with the next Pattern A topics. Building Pattern D early lets later Pattern A topics ship intervention-aware. Building it late means retrofitting modifier content into already-shipped journeys.
4. Style → sleep → skincare on Pattern A back-to-back (2–3 wks each)
5. Decide whether Pattern B for strength is worth the build vs. keeping the existing logging tile
6. Backfill remaining Pattern A topics opportunistically (nutrition, grooming, teeth, posture, cardio, mobility, supplements, environment, alcohol/cannabis, nicotine)
7. Elevate dating apps from reference to Pattern A journey (separate decision)

## Ceiling impact (strategic case for the redesign)

Journey redesign alone is delivery quality, not new capability. Modest ceiling lift on its own, large lift only when stacked with the next layer of features.

**Estimated ceiling deltas (current app rated ~7/10):**

- Journey redesign alone (solves library/coach gap): **7 → 7.5**
- + Pattern D + intervention modifiers (GLP-1, peptides, TRT) shipped: **+0.5**
- + Mister P upgrade with photo + journey + modifier context: **+0.5**
- + Facial analysis / photo-driven personalization (on premium tier roadmap) bolted onto journey reports: **+0.5–1.0**

Stacked ceiling if all four ship: **8.5–9 / 10**. Journey redesign is the prerequisite substrate, not the payoff.

**Without the redesign:** ceiling caps around 7. Library shape limits per-user value extraction. Premium-tier features bolt onto an overwhelming surface and Chris-style overwhelm becomes the modal user complaint. App stays "useful for the rare disciplined self-improver who likes reference material" — a real but small audience.

**What the redesign does NOT fix:** audience / distribution, differentiation moat (parity with Hims / Roman / Whoop / Levels / MacroFactor on journey scaffolding, not ahead), long-term motivation drift inherent to any habit app, content-depth fatigue from 60+ POVs.

**Opportunity cost:** ~6 months focused work (likely 9 with overrun), during which net-new capabilities don't ship. The alternative (keep adding to library shape) has diminishing returns — adding a 61st POV makes overload worse, not better.

**The real go/no-go question is not "does the redesign raise the ceiling?" but "are you committed to the next layer of features (Pattern D, premium tier facial analysis, Mister P upgrade) that make the redesign worth doing?"** If yes → redesign is the substrate those features need to land coherently; do it first. If unsure about the next layer → redesign is over-investment for the standalone value it returns.

## Why

Beta user reported overwhelm with the library approach — wanted assessment-first, one-thing-at-a-time guidance. Pattern split prevents forcing strength's structured program onto habit topics, watering Pattern A down to fit strength's calendar-and-load progression, or treating GLP-1s/peptides as either a goal or a flat tag when they're actually a protocol-with-modifier-effects. The cross-journey modifier architecture is the unification point — interventions, medical conditions, mental health, skin conditions, and nutrition variants all flow through one modifier-list mechanism into other journeys' content.

## How to apply

Use when sketching new focus-area features, scoping product work, or evaluating proposals to add or change a POV-driven feature. Default new topics to Pattern A unless they genuinely need a structured program (Pattern B), are perpetual reflective work (Pattern C), or are medical-protocol-with-cross-effects (Pattern D). Don't abstract patterns into one engine. The architectural lift is small per pattern; the content authoring per topic is what eats time. The modifier-awareness in Pattern A's report generator is a v1 must-have, not a v2 add-on — retrofitting hurts. When scoping any single journey's ship, also scope the surface-impact ripple — at minimum onboarding copy update, /today tile re-homing, POV slicing pass, Mister P context update, weekly letter copy. Nothing has to ship all at once: once Pattern A framework + first journey is live, other surfaces evolve journey-by-journey rather than big-bang. For go/no-go decisions, use the ceiling impact section: the redesign is worth committing to only if the next layer of features (Pattern D, Mister P upgrade, facial analysis) is also committed — without that next layer, the standalone ceiling lift (7 → 7.5) doesn't justify 6–9 months of opportunity cost.

\newpage

# 2. Beta Feedback — Chris MacRae Review (2026-05-03)

**Type:** Project memory
**Description:** Discrete bugs/gaps from beta user review independent of the larger journey redesign — fix opportunistically. Item #1 (Mister P photo access) is a hard prerequisite for the Pattern A framework rollout.

---

Beta user Chris MacRae reviewed the app on 2026-05-03 (delivered via email after Phil offered to swap from FB Messenger). Core thesis was the library-vs-coach gap that drove the journey redesign framework (see separate memo). Beyond that, Chris flagged discrete items that can be fixed independently of the larger redesign:

1. **Mister P doesn't have access to user-uploaded headshots.** Photos exist in `progress_photos` table (slots: baseline, progress_30d, progress_90d, progress_180d) but Mister P chat context doesn't include them. Chris uploaded a headshot during onboarding and was confused that Mister P couldn't reference it.

2. **Orphan tiles on /today.** Sleep, protein, and workout tiles appear without ever being introduced or motivated. Chris had no idea if they were mandatory, optional, or what purpose they served. Either explain on first appearance or gate them behind explicit goal selection.

3. **Vague open-ended onboarding questions.** Open-ended questions (e.g. `specific_thing`) felt directionless because Chris couldn't predict how his answer would be used. He defaulted to skipping them. Either remove, or show what the answer powers downstream so users have context for how to respond.

4. **Sign-up unclear about credit card timing.** Chris didn't know when in the flow a credit card would be requested. Worth clarifying upfront in pricing/sign-up copy.

## Why

Worth keeping these discrete from the journey redesign so they don't get blocked behind a months-long Pattern A rollout. Item #1 specifically blocks any personalized assessment in the journey redesign — without photo access, hair/skin/style assessments are decorative.

## How to apply

Surface when scoping near-term polish, /today refactors, onboarding edits, or sign-up flow work. Item #1 is a hard prerequisite for Pattern A framework — fix it whenever Pattern A work begins, ideally before. Items #2 and #3 are good standalone polish that doesn't need to wait on the redesign.

\newpage

# 3. Competitive Positioning vs. Hims, Roman, Whoop, Levels, MacroFactor

**Type:** Project memory
**Description:** Cleanmaxxing's differentiation is being horizontal (integrated coach across appearance + health + identity) where every named competitor is a vertical specialist. Real defensibility comes from content depth (60+ POVs), audience clarity, cross-domain modifier awareness, and the self-acceptance layer. The journey redesign + Pattern D + Mister P upgrade are what make the differentiation visible — without them, comparison favors the verticals.

---

Strategic positioning context against the five named competitors as of 2026-05-03. All five are **vertical specialists serving overlapping but distinct audiences**:

## Per-competitor reads

**Hims / Roman**

- Lane: telehealth → prescription → ship product (ED, hair loss, weight loss, mental health)
- Where they win: prescriber access at scale, actual medication delivered, clinical legitimacy
- Where Cleanmaxxing wins: cross-stack coach (Hims doesn't tell you how the finasteride fits with your sleep, lifting, skincare, cut)
- **Live threat: Ro Body (GLP-1 + coaching) is moving up into Pattern D territory.** Closest direct competitor.
- Lose if: user just needs the prescription and no coaching

**Whoop**

- Lane: wearable + recovery / strain / sleep + AI coach (athletic recovery)
- Where they win: continuous biometrics, scientific positioning, sticky daily strap, sport-coded credibility
- Where Cleanmaxxing wins: no hardware required (read THEIR data via Junction), coverage is appearance + lifestyle, Whoop has zero opinion on hair/style/grooming/skincare
- Lose if: user is purely recovery/training-driven and treats appearance as secondary

**Levels**

- Lane: continuous glucose monitor + metabolic coaching
- Where they win: depth on metabolic health via CGM, premium positioning, biohacker mindshare
- Where Cleanmaxxing wins: metabolism is one tile in nutrition journey, not the whole product; integrator vs. single-modality
- Lose if: user is metabolic-optimization serious enough to wear a 24/7 sensor

**MacroFactor**

- Lane: adaptive macro tracking math
- Where they win: best-in-class macro math, devoted users, focused execution
- Where Cleanmaxxing wins: MacroFactor is a *tool*, not a coach — they tell you TDEE drift, not what to do about hair/sleep/style/life. You're the layer above.
- Lose if: user is in dedicated cut/bulk and just wants the math right

## The horizontal positioning play

Don't compete with verticals on their core competence. **Sit above them and ingest their output:**

- MacroFactor / Cronometer / Lose It → nutrition journey reads the data
- Whoop / Apple Watch / Garmin → recovery + cardio journey reads via Junction (already wired)
- Hims / Ro / GoodRx → Pattern D Considering preps the user, Pattern D On-Protocol tracks adherence
- Levels CGM → nutrition journey ingests if user has it

Cleanmaxxing's job is to be the **only product that knows the whole picture**. Verticals structurally can't do this — they only see their slice. The cross-journey modifier architecture (see journey redesign framework memo) is the technical realization of this position.

## What's actually defensible

1. **Content depth** — 60+ POVs with real editorial substance for this audience. None of the competitors have this. Hims/Ro have marketing copy, Whoop has science blog posts, Levels has metabolic explainers, MacroFactor has math docs. Hard to replicate in under 18 months.
2. **Audience clarity** — "young-to-middle-aged men taking appearance seriously without being weird about it" is a distinct psychographic. Hims is broad demographic, Whoop is athletes, Levels is biohackers, MacroFactor is bodybuilders. Targeting nobody else's center of gravity.
3. **Cross-domain modifier awareness** — Pattern D + modifiers makes "on GLP-1 + lifting + treating hair + has rosacea" coherent. Vertical specialists structurally can't do this.
4. **Identity / self-acceptance layer (Pattern C)** — none of the competitors touch this. They all assume the user wants more, faster, indefinitely. "When to stop" / "limits of self-improvement" is a real position that adults respond to and that self-improvement-app burnout demands.

## Real risks

- **Ro Body is the live threat** — has prescriber relationship + payment infra + brand trust. If they bolt a real coaching layer onto GLP-1 protocols, they own the medical-coaching wedge of Pattern D.
- **A well-funded "AI coach for men" startup with no vertical baggage** could claim the same position. Defense is shipping journey redesign + Pattern D + content depth before someone else does.
- **Apple / Google** have all the data and default-app distribution. Less likely culturally for appearance, but possible.
- **Distribution is the unsolved problem.** Verticals have either (a) prescription-fulfillment moat or (b) hardware lock-in. Cleanmaxxing has neither — needs a content / community / SEO play.

## The "moat sentence"

The differentiation made functionally true: nobody else can tell a user *"you're on a GLP-1, your hair just got cut into a square crown to suit your face, your sleep variance is up because of late-week stim cycles, and your wardrobe needs a smaller size in three weeks — here's the one thing to do today."* That cross-domain integrated coaching is the moat.

## Dependency on the journey redesign

The differentiation is real but currently **invisible** because of the library-vs-coach UX problem (see journey redesign framework memo). Users today see the same overwhelming library that verticals don't have, but verticals have sharper single-purpose execution — that's a losing comparison.

With the journey redesign + Pattern D + Mister P upgrade shipped, the differentiation becomes visible and felt: the moat sentence above is achievable. Without those three, content depth alone doesn't carry the comparison.

## Why

Founder asked how Cleanmaxxing differs from named competitors during May 2026 strategic discussion. Honest answer is that differentiation is positioning + content depth + integration, not a single technical moat — and that the journey redesign is the unlock that makes the differentiation visible to users.

## How to apply

Use when evaluating partnership vs. compete decisions (default to partner/ingest with verticals, not compete on their core competence), pricing/positioning conversations, fundraising narrative, or competitor moves (especially Ro Body expansions). Cross-reference with journey redesign framework memo for execution dependency. Don't try to win on prescriber-fulfillment or hardware — those are the verticals' moats. Win on integrated cross-domain coaching that none of them can structurally do.
