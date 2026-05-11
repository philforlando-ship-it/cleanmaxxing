# POV Maintenance & Retention Audit

*Audit of `content/povs/*.md` for maintenance / upkeep / continuous-improvement / staying-on-track / fall-off-recovery content. Strategic question: app retention post-initial-journey. Most POVs frame "get to the goal" — the gap is what happens after.*

*Audited 2026-05-10 by direct read of POV headers + targeted body inspection across all 58 POVs.*

---

## TL;DR

Of 58 POVs, roughly **a quarter have meaningful maintenance content already**, **a third have a structural gap that's high-leverage to fill**, and **the rest are one-time decisions, refusals, clinical territory, or meta** where this content does not belong.

The single most surprising structural finding: **Cleanmaxxing already has a flagship "maintenance is a complete outcome" POV (54-when-to-stop)** that explicitly establishes the philosophical frame — "the work shifts from improvement to maintenance," "maintenance is a complete outcome," "the system has a destination." But that frame is **not propagated into the journey-anchor POVs**. POVs 08, 12, 13, 19, 20, 23 do "get to the goal" work and then end; none of them point at POV 54 or use its vocabulary to declare a graduation point + ongoing-mode protocol. The cheapest retention move is propagating POV 54's frame INTO each journey POV at the place where the journey's initial implementation completes.

---

## Bucket A — POVs that already have meaningful continuous-improvement content

### Strong

- **POV 09 facial-hair** — Trim cadence by target length (stubble = 3–4d, heavy stubble = 5–7d, short beard = 7–10d cleanup + monthly reshape, etc), beard line geometry that's revisited at every cleanup, age-cohort framing (greying past 45). Cleanup-vs-reshape is named as a distinct cadence pair. **This is the model for the whole corpus.**
- **POV 19 strength-training** — Deload every 4–8 weeks, "Scheduled Time Off — Recovery Is Part of Progress" section, week-to-week variation framework, 40+ Nine Non-Negotiables (deload every 4–6 weeks, prehab, recovery extension), warning signs you've exceeded MRV. The strength POV is built around recurring cycles, not a finished outcome.
- **POV 54 when-to-stop** — The cross-cutting maintenance philosophy POV. Establishes the vocabulary: "improvement vs. maintenance — fundamentally different modes," "the work shifts," "maintenance is a complete outcome," "the system has a destination." Not consumed by other POVs but should be.
- **POV 53 tracking** — Explicit weekly / monthly / quarterly review cadence, "decision rules — when to act," what NOT to track. The cadence-and-action structure is the meta-rhythm the app's reflection surfaces should run on.

### Decent

- **POV 07 skincare-antiaging** — Morning/night routine sequencing implies daily cadence; age-segmented strategy (20s prevention, 30s active management, 40+ correction-and-maintenance) implies durable habit. Missing: "what if you fell off SPF for 2 months — how do you re-enter without restarting from scratch."
- **POV 25 acne** — "Consistency over intensity" is the load-bearing principle; purging timeline names what to expect during the slog. Age-segmented (18-19 hormonal, 20-29 lifestyle/residual, 30-39 adult, 40+ texture) carries it forward. Missing: explicit re-entry protocol after lapses, and a "the routine is settled — now what" graduation framing.
- **POV 11 teeth-smile** — "Retainers — finished does not mean done" is exactly the right frame; "Veneers — the permanence is the point" addresses post-decision life. Age-segmented through 50+. Missing: between-cleaning maintenance ritual, cosmetic-touch-up cadence (whitening, retainer replacement), "if you've drifted on flossing, here's the climb back."
- **POV 02 glp1s** — "Three Phases — Considering, On Protocol, Off-Ramp" with explicit "what happens when you stop" section (rebound biology, psychological trap). The off-ramp framing IS maintenance content. Strong for the on-protocol cohort.
- **POV 03 testosterone-steroids** — Same Three Phases shell as GLP-1; covers the "what after the cycle ends" question (PCT realities, recovery spectrum, off-protocol cohort framing). Solid.
- **POV 27 hair-loss-treatments** — "How Treatment Urgency Maps to the Hair Journey Path" provides treat / monitor / transition framing. Implies cadence (re-evaluate after 6 months on minoxidil, 12 months on finasteride). Missing: "if you skipped finasteride for 2 weeks during travel — does the protection reset" and "annual photo-comparison protocol."
- **POV 50 posture** — Four Phase progression (Workstation correction → Daily resets → Gym support → Automaticity) with Phase 4 explicitly being the durable-habit graduation. Missing: regression protocol — what if you drifted into rounded shoulders during a stressful 3-month period.
- **POV 17 environment-lifestyle-design** — "The One-Weekend Setup" implies durable infrastructure. Missing: annual environment recheck, what to do when life-stage changes (move, kid, new job) invalidate the setup.

### Thin

- **POV 18 tanning** — Three-phase protocol (Build → Maintain → Optional event boost) is the right shape but Phase 2 "Maintain" is briefly described; no fall-off recovery, no annual seasonal-cadence framing.
- **POV 12 style-clothing** — "Style Past 45" discusses recalibration with age, "ROI Tiering" implies durable investments. The BF-drift staleness mechanic is implemented at code level but the POV doesn't ground the recalibration cadence in prose. Missing: quarterly closet edit, fit-check ritual, "what changed since last year" prompt structure.
- **POV 23 cardio** — Per-cohort templates ARE maintenance specs (cut/bulk/recomp/longevity-focused) but framed as initial prescription, not ongoing-state. NEAT step floor is durable. Missing: "the work shifts to maintenance once you've got the engine built — here's what that looks like" graduation framing; seasonal recalibration.
- **POV 38 aging-appearance** — Describes what changes after 35 / 45 but doesn't prescribe a cadence (annual reassessment, what shifts at 40 / 45 / 50). Reads more as "what to expect" than "what to do."

---

## Bucket B — POVs where the gap is biggest AND highest-leverage to fill

### POV 13 body-physical-foundation — **highest leverage**

The foundation POV that every other journey sits on. Currently structured as "do this to get to baseline." Once a user has hit baseline body comp + sleep + posture, the POV ends. The gap: there's no "ongoing-state Foundation protocol" — what does maintenance look like when you've already gotten to 15% body fat with consistent sleep and trained posture? The retention problem is that without an ongoing-state frame, the foundation feels "done" and engagement drops, even though foundation maintenance IS the load-bearing daily work.

**What it should adopt:** a graduation-point section ("Once the foundation is established") that names the maintenance-mode protocol (training as automaticity, sleep as a defended floor, weekly weigh-in cadence, monthly "drift check" against baseline) and the regression-recovery protocol ("If you fell off training for [N] weeks, here's how to re-enter"). The Coupled-Variables section already establishes the cross-journey dependency — that's the right scaffold to layer maintenance onto.

**Retention mechanism unlocked:** monthly "Foundation drift check" surface. Quarterly recalibration prompt. The hooks already exist in the weekly reflection.

### POV 20 diet-macros — **second-highest leverage; highest documented failure mode**

The /plan/nutrition code already has a 12-week re-evaluation gate (`last_evaluated_at`) specifically for the cut→maintenance transition because it's "the most common failure mode here" (per service comments). But the POV doesn't have a "post-cut maintenance protocol" or "if you regained, here's how to re-enter without re-doing the whole cut" section. The deficit→maintenance handoff is where most users invisibly fall off.

**What it should adopt:** a "Cut-to-Maintenance Transition Protocol" section (specific calorie ramp, what changes about training, why the first 6 weeks of maintenance is the most fragile period). A "Re-entry After Regain" section ("if you've drifted up 5+ lbs over 6+ weeks — diagnostic checklist before reflexively cutting again"). An annual-TDEE-recheck framing.

**Retention mechanism unlocked:** quarterly maintenance check-in distinct from the cut/bulk decision; explicit pause-then-resume affordance.

### POV 12 style-clothing — **third-highest, most users complete this journey**

The BF-drift staleness mechanic exists in the code but the POV doesn't ground the recalibration cadence in prose. Users complete the closet audit + foundation pieces + fit calibration and the journey ends with no "now what" frame.

**What it should adopt:** "The Quarterly Closet Edit" (10-min ritual: pull pieces that haven't been worn in 90 days, are off-fit since last body-comp shift, are dated since last archetype evaluation). "Body-comp-drift recalibration" section grounding the existing app behavior. "Annual archetype reassessment" prompt. "What to do when life-stage shifts your context" (new job, moved, partnered) — your archetype context might have moved.

**Retention mechanism unlocked:** quarterly recalibration cadence on a topic that today gets exactly one report and then nothing.

### POV 50 posture — **silent-regression risk is highest here**

Has a four-phase progression with Phase 4 = automaticity (good), but no regression-recovery protocol. Posture is the most common Tier 1-leverage habit users silently regress on during stressful periods (desk weeks, travel weeks, baby weeks). The gap: there's no framing for "you've drifted back into rounded shoulders during a stressful period — here's the 2-week climb back."

**What it should adopt:** "Drift Recovery — Falling Off and Climbing Back" section. "Quarterly posture recheck" against the original assessment patterns (forward head, rounded shoulders, anterior pelvic tilt, rib flare). "Travel / desk-heavy week protocol" — the maintenance work that fits 5 minutes a day during disrupted weeks.

**Retention mechanism unlocked:** life-event-aware re-engagement (travel, illness, baby, work crunch).

### POV 16 facial-definition-jawline — **most aspirational, no maintenance**

Body-comp-driven (the primary lever is leanness). Users hit lean, the POV ends, no protocol for sustaining facial definition through life events that cause puffing (vacation, alcohol weekend, stress month, illness recovery). The "Why your face can look puffier when you start training — and why it resolves" section addresses one specific case but the broader "maintenance once defined" framework is absent.

**What it should adopt:** "Maintaining Facial Definition Across Life Events" section (puff causes, recovery timeline, what the inflammation-and-water section already implies). "If your face has been reading puffier for 4+ weeks — diagnostic checklist." "Annual definition reassessment."

**Retention mechanism unlocked:** event-driven re-engagement (post-vacation, post-illness, post-stressful-block).

### Honorable mentions — Bucket B but lower leverage

- **POV 42 sleep** — has setup; missing "fell off for a month — climb back" protocol and quarterly recalibration. High-leverage if sleep journey grows.
- **POV 14 presence-intangibles** — daily voice training protocol exists; missing skill-decay framing and "voice slipping after social withdrawal" recovery.
- **POV 21 protein-creatine** — daily target framing; missing "post-training-block deload of protein" or "fell out of habit" re-entry.
- **POV 31 calorie-macro-framework** — Step 6 visual feedback loop exists; missing annual TDEE recheck, weight-stall diagnostic.
- **POV 25 acne** — has consistency framing but missing explicit re-entry-after-lapse protocol.
- **POV 17 environment-lifestyle-design** — one-weekend-setup is right framing; missing annual environment recheck and life-stage triggered re-eval.
- **POV 27 hair-loss-treatments** — implies cadence; missing "annual photo-comparison protocol" + "if you skipped a week of finasteride during travel" framing.
- **POV 11 teeth-smile** — has retainers-are-forever; missing between-cleaning maintenance ritual and "drifted on flossing — re-entry."
- **POV 38 aging-appearance** — describes what changes; doesn't prescribe annual reassessment cadence.

---

## Bucket C — POVs where this content does NOT belong

- **POV 01 amphetamines** — substance refusal framing; one-time decision territory.
- **POV 04 peptides** — pharma framework; the on-protocol guidance lives in the Three Phases shell already.
- **POV 06 bone-smashing** — pure refusal POV.
- **POV 15 looksmaxxing-system** — meta / framework POV; the maintenance frame should live in 54-when-to-stop, not here.
- **POV 22 carbohydrates-fasting** — sub-topic of nutrition; the maintenance content sits on POV 20.
- **POV 26 training-while-enhanced** — pharma-adjacent technical POV; one-time decision context.
- **POV 28 cosmetic-procedures** — one-time decisions (rhinoplasty, jaw surgery) and the recurring cases (Botox) already get cadence by their own clinical timeline; the POV is about decision-making.
- **POV 30 appetite-control** — sub-topic to nutrition.
- **POV 32 skin-texture-scarring** — treatment hierarchy with finite course; not ongoing.
- **POV 33 niche-enhancements** — pharma exploration; one-time decisions.
- **POV 35 gut-health-fiber** — the "cadence" is just the daily routine, which is already implied.
- **POV 36 fat-burners** — refusal POV.
- **POV 37 cleanmaxxing-blueprint** — meta / orientation; the ongoing-state frame lives in 54.
- **POV 39 testosterone-real-experiences** — community-context POV; not an action surface.
- **POV 40 peptide-deep-dive** — technical reference.
- **POV 41 medical-conditions** — clinical territory; physician-led cadence.
- **POV 43 mental-health** — clinical / therapeutic.
- **POV 44 water-retention** — sub-topic.
- **POV 45 meal-plans** — implementation menu, not a journey.
- **POV 47 eye-health** — clinical.
- **POV 48 skin-tone-guidance** — one-time read.
- **POV 49 nicotine-vaping** — refusal-style.
- **POV 51 dating-apps** — recurring photo-and-bio iteration is its own domain; the iteration cadence already implied.
- **POV 52 budget-tiers** — orientation table.
- **POV 55 limits-self-improvement** — meta / philosophical.
- **POV 56 identity-beyond-appearance** — meta / philosophical (retention-relevant but not via "maintenance").
- **POV 57 skin-conditions** — clinical.
- **POV 58 hair-systems-prosthetics** — niche decision.
- **POV 29 body-hair-methods** — recurring grooming, but the cadence is intuitive once chosen.
- **POV 34 recovery-tools-polish** — supplementary / situational.
- **POV 46 mobility** — has modular protocols already; durable habit implied.

---

## Cross-Cutting Framing Recommendation

The vocabulary already exists in POV 54-when-to-stop. Other POVs should adopt it consistently. **Don't invent new framings — propagate the existing one.**

### Vocabulary to standardize across maintenance sections

- **"the work shifts from improvement to maintenance"** — the verb. Use this exact phrasing to mark the graduation point.
- **"maintenance is a complete outcome, not a consolation prize"** — counter the cultural bias that maintenance means "lower priority."
- **"defended floor"** — for the minimum daily/weekly work that holds the gain.
- **"drift check"** — for the periodic rechecks (vs. "audit" which sounds heavier).
- **"climb back"** — for the re-entry protocol after a lapse. NOT "restart" (carries shame); NOT "reset" (carries reset-everything implication).
- **"cadence"** — for the recurring rhythm (already used elsewhere; reinforce).

### The standard maintenance section structure

For every Bucket B POV, append (or insert mid-document) a section with this shape:

1. **Graduation point** — name the specific signal that the initial journey is complete. ("Once you've reached X / once Y is consistent / once Z no longer requires active attention.") This is the load-bearing sentence; without it the maintenance frame is abstract.
2. **The defended floor** — the minimum daily/weekly work that holds the gain. Concrete, time-bounded ("5 min daily," "weekly check," "monthly recalibration").
3. **Drift signals** — what to watch for. The 2-3 markers that say "you're slipping." Describes WHAT you'd observe, not how the user should feel.
4. **The climb back** — re-entry protocol after a lapse, framed without shame. "If you've fallen off for [N weeks], here's how to re-enter — you don't restart from zero." This is the retention-defining piece for users who feel guilty about lapses.
5. **The recalibration cadence** — annual / quarterly / monthly recheck, with what each prompts ("annual archetype reassessment," "quarterly closet edit," "monthly drift check").

### What to differentiate from "one-time recommendations"

One-time recommendations sound like "do X." Maintenance content sounds like "X is now the daily/weekly work; here's what to watch for; here's how to climb back if you fall off." The verb shifts from imperative to descriptive-of-ongoing-state. **If the section reads like it could be inserted into the assessment-form flow, it's still in setup mode.**

### What NOT to do

- Don't make maintenance content sound like "advanced stage 2." It's a different mode, not a higher tier.
- Don't add streak language ("X days in a row") — explicitly retired by Cleanmaxxing's existing voice posture.
- Don't moralize on lapses. The climb-back framing should read as logistics, not penance.
- Don't recommend re-running the original assessment as the default re-entry path. That's heavy. The default should be a smaller re-entry surface (drift-check prompt, minimal recheck) with the full re-eval as the rarer recalibration.

---

## Top 5 POVs to Add This to NEXT — Ranked by Retention Leverage

1. **POV 13 body-physical-foundation** — The foundation POV every journey sits on. Once a user has baseline (~15% BF + consistent sleep + trained posture), the POV ends and engagement drops. The Coupled-Variables section already names the cross-journey dependency; layering "Once the foundation is established" + defended-floor + drift-signals + climb-back on top reaches every active user. Highest-leverage single fill in the corpus.

2. **POV 20 diet-macros** — The cut→maintenance transition is the documented failure mode (the assessment row already has a `last_evaluated_at` field for it specifically). Adding a "Cut-to-Maintenance Transition Protocol" + "Re-entry After Regain" + annual TDEE recheck content directly addresses the lifecycle moment users most often invisibly fall off. Second-highest because the failure mode is already known and instrumented; the POV just hasn't caught up.

3. **POV 12 style-clothing** — Most journeys in the system are completed once and forgotten; style is one. The BF-drift staleness mechanic exists in code but the POV doesn't ground the recalibration cadence. Adding "The Quarterly Closet Edit" + "Annual archetype reassessment" + life-stage triggers makes the existing app behavior feel like a designed loop rather than an ad-hoc nag. Third because completion rate is high and post-completion silence is the norm today.

4. **POV 50 posture** — Posture is the daily Tier 1-leverage habit users silently regress on during stressful periods (desk weeks, travel, illness, family stress). Phase 4 "automaticity" is a clean graduation point but no fall-off recovery. Adding "Drift Recovery" + quarterly posture recheck + travel/desk-week protocol catches the most common silent-regression failure mode and provides a clear life-event-driven re-engagement hook.

5. **POV 16 facial-definition-jawline** — The most aspirational POV; users hit lean and the POV ends. Life events (vacation, alcohol weekend, stress month, illness recovery) routinely cause facial puffing that users don't have a frame for. Adding "Maintaining Facial Definition Across Life Events" + 4-week-puff diagnostic + annual definition reassessment provides event-driven re-engagement on the topic that drove engagement in the first place.

### Why this ordering

POV 13 first because it's foundational AND universal. POV 20 second because the failure mode is already documented in the codebase (the gap is just POV-level prose to match). POV 12 third because completion rate is high and the recalibration mechanic exists in code but not in content. POV 50 fourth because silent regression is the modal failure pattern for posture specifically. POV 16 fifth because event-driven re-engagement on the most aspirational topic is high-impact retention.

After these five, the next tier (42 sleep, 14 presence, 21 protein-creatine, 31 calorie-macro-framework, 25 acne) all have similar gap shapes but lower journey-completion volume.

### A meta-recommendation that surprised me

POV 54-when-to-stop is the right philosophical anchor and is already in the corpus, but **it's not consumed by the journey-anchor POVs**. The cheapest content move is not authoring new sections from scratch — it's **propagating POV 54's existing vocabulary into the journey POVs at their graduation points** with a one-paragraph "see also" cross-link. That alone would surface the maintenance frame inside every active journey. The five-POV deeper authoring effort listed above is the next layer on top of that propagation, not a substitute for it.
