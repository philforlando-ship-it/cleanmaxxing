# Cleanmaxxing Maintenance Phase — App Spec

**Version:** 0.1 (2026-05-12)
**Owner:** Phil
**Source:** Phil's "Suggested app implications" framework + 2026-05-12 review against the seven maintenance POVs (54 unifying / 02 GLP-1s / 03 TRT / 04 peptides / 13 body composition / 07 skincare / 09 facial hair). Three additions folded in from that review, plus smaller alignment items.

**What changed in 0.1:** Original three sections (Pattern D Sustained / body-comp / skincare + facial-hair) extended with: (1) Performance maintenance as the third body-comp shape, (2) GLP-1 Sustained sub-split between *Sustained therapeutic* and *weight maintenance*, (3) peptide cycle-status capture. Phase 3 naming aligned with POVs ("Active Protocol", not "On Protocol"). Smaller alignment items folded into their relevant sections — TRT lab-cadence drift detector, peptide quarterly "still necessary" cadence, TRT cycle-user "always on something" triage, SPF as headline skincare adherence proxy, cleanup-vs-reshape distinction for facial hair.

---

## 1. Pattern D protocols: TRT / GLP-1 / peptides

### Add a true maintenance phase

Introduce a fourth protocol state: **Sustained Protocol**, sitting between Active Protocol and Off-ramp.

Recommended phase model (per POVs 02 / 03 / 04):

```
Considering → Initiating / Calibrating → Active Protocol → Sustained Protocol → Off-ramp
```

**Naming note:** the legacy "On Protocol" label is replaced by "Active Protocol" because the legacy term ambiguously covers any of phases 2–4. POV 02/03/04 now use Active Protocol; the app should match.

### App implications

Stop treating all active protocol users the same. A user who has been on TRT, GLP-1, or peptides for 12–18 months should not receive the same framing as someone who started 8 weeks ago.

For sustained users, the app should shift from:

> Are you starting? Is this working? Are you finding the right dose?

to:

> Are you stable? Are you monitoring appropriately? Are you defending the regimen?

### New triggers (generic across protocols)

```
protocol_status = active
AND protocol_duration >= 6 months
AND no major dose/regimen change in last 8–12 weeks
AND recent check-in confirms continued use
AND no unresolved major side-effect flag
```

### New app experiences

**Transition moment:**

> "You may be entering a sustained protocol phase. The work now is less about finding the right setup and more about keeping the regimen stable, monitored, and sustainable."

**Self-location prompt (generic):**

> Where are you right now?
>
> 1. Still dialing this in
> 2. Stable and maintaining
> 3. Considering a change
> 4. Thinking about off-ramping

### New maintenance content

For sustained protocol users, prioritize:

- lab / review cadence
- refill continuity
- symptom drift checks
- side-effect monitoring
- travel or schedule disruption planning
- long-term goal revalidation
- "is this still worth it?" reflection
- off-ramp readiness, where relevant

### Protocol-specific extensions

The generic Sustained framing is necessary but not sufficient. Each Pattern D topic carries category-specific Sustained behavior the journey should capture.

#### TRT — lab cadence as a near-hard gate

Per POV 03, lab cadence is the single strongest TRT-specific Sustained signal. A Sustained TRT user with no lab in 12+ months is not actually Sustained — they are *Drifting*. Silent degradation (slow estradiol drift, slow hematocrit drift, slow erosion of the symptoms TRT was supposed to fix) is the named failure mode.

**TRT-specific drift detector:**

```
phase = Sustained Protocol
AND last_lab_review > 12 months ago
→ flag as Maintenance Drift / lab cadence overdue
```

**TRT cycle-user "always on something" triage.** POV 03 names de facto blast-and-cruise as a Sustained-but-medically-unsupervised state. A user who self-describes as "always on something" without supervised cycle structure is not in legitimate Sustained TRT — the journey's job is to get them back into supervision, not refine the protocol. Triage question on entry to Sustained for any user with cycle-pattern history:

> Are you currently working with a prescriber who reviews your protocol and labs?
>
> 1. Yes, regular reviews scheduled
> 2. Yes, but reviews are inconsistent
> 3. No, I'm self-managing
> 4. Prefer not to say

Answers 2–3 surface a supervision-prompt rather than a refinement prompt.

#### GLP-1s — Sustained splits into two sub-realities

Per POV 02, Sustained GLP-1 splits into two distinct daily-emphasis modes that the app must distinguish:

- **Sustained therapeutic** — stable dose, still actively losing toward a target body composition or health marker. Daily emphasis: continued attention to muscle preservation and the muscle-loss bias of the medication. Same Sustained framing, plus active-loss modifiers.
- **Weight maintenance** — at-goal, defending the outcome rather than continuing to lose. Daily emphasis: preventing regain, holding protein and training, watching for appetite changes, watching for side-effect drift, beginning the conversation about whether the medication is still needed in the same dose or at all.

**GLP-1-specific second question after Sustained classification:**

> You're in the sustained phase. Which best describes where you are?
>
> 1. Stable dose, still losing toward a goal weight or body
> 2. At goal, using the medication to defend the outcome
> 3. Past goal but unsure whether to keep going
> 4. Not sure — would like to revisit my goal

Answer 1 routes to *Sustained therapeutic* content (muscle preservation emphasis). Answer 2 routes to *weight maintenance* content (regain prevention + dose-need reassessment). Answers 3 and 4 surface a goal-revalidation prompt before maintenance content.

#### Peptides — cycle status capture + quarterly "still necessary" cadence

Per POV 04, autopilot is the named failure mode for sustained peptides. Two peptide-specific additions:

**Cycle status capture.** POV 04 names "defined cycle status (continuous / on-cycle / between-cycles)" as a Sustained signal. Add a peptide-specific question on entry to Sustained:

> What's your current cycle status?
>
> 1. Continuous — running this compound without planned breaks
> 2. On cycle — currently in a defined cycle window
> 3. Between cycles — intentionally off, planning the next round
> 4. Unsure — running it because I started running it

Answer 4 should not progress to Sustained; it surfaces an intentionality prompt instead. Answers 1–3 confirm intentionality and let Sustained engage.

**Quarterly "still necessary" cadence.** POV 04 frames this as more aggressive than the generic "is this still worth it" reflection. Peptides should default to a periodic explicit *still necessary* decision because rolling one peptide into another and calling it "still optimizing" is the dominant drift pattern.

```
phase = Sustained Protocol AND protocol_type = peptide
→ surface "still necessary" reflection every 90 days
→ if user defers 2 cycles in a row, escalate to a forced Considering re-entry
```

Forced Considering re-entry isn't a punishment — it's an honest reset that asks the user to re-justify the compound against the same gates that approved the first protocol. POV 04 explicitly names rolling one peptide into another as Considering re-entry, not Off-ramp.

---

## 2. Body composition for recomp / gain_muscle users

The app should not require a goal weight to recognize maintenance for body-composition users. Per POV 13, body-composition maintenance comes in **three shapes**, all valid, all earning the same defended-floor status.

### Three shapes of body-composition maintenance

#### Shape 1 — Weight maintenance

For users who are trying to hold a specific weight.

**Trigger:**

```
goal_direction = maintain
OR user is within ±3 lb of explicit goal weight
AND weight stable inside defended range
```

This is the simplest shape and matches the legacy gate. No change required.

#### Shape 2 — Composition maintenance

For recomp and gain_muscle users specifically. The user has built a new body composition and is now defending it rather than continuing to push it further. This is the shape the legacy weight-only gate misses.

**Trigger:**

```
goal_direction IN ('recomp', 'gain_muscle')
AND time_in_goal >= 12–16 weeks
AND meaningful progress achieved
AND body metrics stable for 6–8 weeks
AND user indicates desire to hold current physique
```

**Progress signals (at least one required):**

- waist improved
- progress photos improved
- strength increased
- body-fat estimate improved
- clothing fit improved
- user-reported physique satisfaction improved

**Stability signals (at least one required):**

- weight stable within ±2–3% of current baseline
- waist stable
- training consistency stable
- protein adherence stable
- strength stable or not declining

#### Shape 3 — Performance maintenance (added 2026-05-12 from POV 13)

For users whose body goal is tied to strength, endurance, or training output rather than a specific look. The destination is "I lift this much, I can do this work, I am not regressing." Common in the 35+ cohort where the realistic goal is "do not lose what I built."

A user can be in more than one shape at once (composition + performance is common: hold the look, hold the lifts). Performance maintenance is its own gate because the user may not care about visual progress at all — strength preservation is the entire scoreboard.

**Trigger:**

```
user_focus_includes performance_preservation
AND time_in_goal >= 12–16 weeks
AND strength_numbers stable or increasing over rolling 8-week window
AND training consistency stable
AND body metrics not regressing
AND user indicates desire to preserve performance rather than pursue aggressive change
```

**Progress signals (at least one required):**

- recent PR or stable PRs across primary lifts
- training output sustained across rolling window
- recovery markers stable (sleep / RHR / felt readiness)
- user-reported satisfaction with current strength level

**Stability signals (at least one required):**

- 1RM or working-set load stable across primary lifts
- session adherence stable
- bodyweight stable (not regressing into deficit territory that would compromise lifts)
- no reported decline in working capacity

### App implications

The app should recognize body-composition maintenance even when:

- the user has no explicit goal weight
- the user's weight is higher than before (gain_muscle)
- the user's weight is unchanged but body shape improved (recomp)
- the user's goal was visual, performance-based, or routine-based
- the user is not actively cutting or bulking anymore

### State labels

- **Weight maintenance** — for Shape 1
- **Holding new baseline** or **Composition maintenance** — for Shape 2
- **Performance maintenance** — for Shape 3

Pick a vocabulary and apply consistently. Recommendation: lead with the user-facing labels (*Weight maintenance / Holding new baseline / Performance maintenance*) in UI copy, and use the internal slugs (`weight_maintenance / composition_maintenance / performance_maintenance`) in the data layer.

### New app experiences

**Body-composition check-in:**

> What is your current priority?
>
> 1. Keep changing my body
> 2. Hold my current physique
> 3. Hold my current strength / performance
> 4. Cut down further
> 5. Gain more muscle
> 6. Reassess my goal

Answer 2 graduates to Composition maintenance (Shape 2). Answer 3 graduates to Performance maintenance (Shape 3) — even if visual hasn't changed. Answer 4 returns to active cut. Answer 5 returns to active gain. Answer 6 surfaces a goal-revalidation prompt.

### New maintenance content

**Composition maintenance content:**

- maintaining training minimums
- protein consistency
- waist-drift monitoring
- small corrections instead of aggressive cuts
- preserving muscle
- avoiding routine drop-off

**Performance maintenance content:**

- holding the working-set / 1RM band
- session adherence over output (the cadence is the protection)
- protein floor scaled to bodyweight (preservation requires the floor)
- mobility + recovery as defense against age-driven decline
- knowing when to deload vs when to push

**Gain_muscle maintenance content (sub-case of Composition):**

- moving out of surplus
- holding strength
- controlling waist drift
- preserving new mass
- preventing "forever bulk" behavior

---

## 3. Skincare and facial hair — behavior-backed maintenance

The app should stop awarding maintenance based only on elapsed time since assessment. Per POV 07 + POV 09, maintenance has to be evidenced — by routine adherence, recent confirmation, and behavior — not by a calendar tick.

**Current logic (POV-misaligned):**

```
assessment_age >= 8 weeks
```

**Recommended logic:**

```
elapsed time threshold
AND recent user confirmation
AND evidence of routine or grooming behavior
```

The app should distinguish between "plan is old" and "user is maintaining the plan." Those are not the same thing.

### Skincare

#### Skincare maintenance trigger

```
8+ weeks since plan start
AND recent check-in within last 14–30 days
AND user confirms routine is active
AND skin is stable or improved
AND no unresolved irritation / worsening flag
```

**Higher-confidence version:**

```
8+ weeks since plan start
AND 3+ skincare check-ins completed
AND routine adherence above threshold
AND target concern stable or improved
AND user goal has shifted to maintain / prevent
```

#### SPF as the headline daily adherence proxy (added 2026-05-12 from POV 07)

POV 07 elevates SPF as the daily anchor — the highest-frequency lever, used or not used 365 times per year, with cumulative damage compounding visibly over decades. If the app supports only one daily skincare check-in, SPF logged today is the most informative single signal. Surface as the headline question on the daily check-in, not buried in a routine adherence list.

```
daily skincare check-in primary question:
"Did you put SPF on today?" (yes / no / no sun exposure today)
```

Other routine adherence (cleanser, moisturizer, retinoid frequency) can be secondary check-ins or weekly. SPF is the single highest-value daily signal and should be treated that way in the UI.

#### Skincare maintenance check-in

> How is your skin compared to when you started?
>
> 1. Better and stable
> 2. Better but inconsistent
> 3. About the same
> 4. Worse or irritated
> 5. I haven't followed the routine

Only "Better and stable" cleanly graduates to maintenance. The other answers route to repair / reassessment / re-engagement prompts.

#### Skincare maintenance content

- keeping the routine simple
- preventing relapse
- avoiding overuse of actives
- sunscreen consistency (the daily anchor)
- irritation monitoring
- seasonal or travel adjustments
- small corrections before full resets

### Facial hair

#### Facial-hair maintenance trigger

```
4–8+ weeks since recommendation
AND recent grooming check-in completed
AND user confirms current style is intentional
AND trim / upkeep cadence is known
```

**Higher-confidence version:**

```
style_selected = true
AND 2+ grooming check-ins completed
AND trim cadence logged or confirmed
AND user reports current length / shape is working
AND no active style-change request
```

#### Cleanup vs reshape distinction (added 2026-05-12 from POV 09)

POV 09 has two distinct facial-hair cadences that the maintenance check-in must capture separately. Cleanup is the frequent, shallow pass that keeps lines and length sharp. Reshape is the infrequent, deep pass that re-establishes boundaries. The user can be doing one but missing the other and look unintentional within weeks.

**Facial-hair check-in must ask both:**

> When was your last cleanup pass? (kept lines + length sharp)
>
> - Within the last 7 days
> - 1–2 weeks ago
> - 2+ weeks ago
> - Not sure

> When was your last reshape pass? (full neckline + cheekline reset)
>
> - Within the last 4 weeks
> - 4–8 weeks ago
> - 8+ weeks ago
> - Not sure

A user reporting on-cadence cleanup but overdue reshape is *Drifting on shape integrity* even if length is fine. Cleanup-only users will gradually lose definition without the reshape pass. The maintenance gate should require both cadences to be on track.

#### Facial-hair maintenance check-in

> Where are you with facial hair right now?
>
> 1. I found a style and want to maintain it
> 2. I'm still experimenting
> 3. I shaved or changed direction
> 4. I'm growing it out
> 5. I haven't been keeping up with it

Only answer 1 cleanly graduates to maintenance. Answer 5 routes to a re-engagement prompt; answers 2–4 keep the user in active discovery.

#### Facial-hair maintenance content

- trim cadence (cleanup pass on schedule)
- reshape cadence (full reset on schedule)
- neckline cleanup
- cheekline cleanup
- length control
- symmetry
- patch management
- style consistency

---

## Cross-cutting app implications

### 1. Split maintenance into verified and unverified states

Add an intermediate state when the app suspects maintenance but lacks evidence.

**Possible labels:**

- *Maintenance Check-in Needed*
- *Maintenance Unconfirmed*
- *Ready to Maintain*
- *Potential Maintenance*

This prevents the app from falsely claiming someone is maintaining when all it knows is that time has passed. Per POV 54, elapsed time alone is *weaker* evidence; without a strong signal (recent check-in, stability trend, user confirmation), the right state is "we think you might be maintaining — confirm?"

### 2. Require evidence before awarding maintenance

Maintenance should require at least one of (per POV 54's evidence hierarchy):

**Strong evidence:**
- recent check-in
- stable biometric trend
- repeated behavior logs
- user confirmation
- progress photo confirmation
- adherence signal
- provider / lab / review loop, where relevant

**Weaker evidence (cannot found a maintenance call alone):**
- elapsed time
- one-time assessment
- static goal setting

Elapsed time can support maintenance but should never be sufficient by itself. Where a journey today is awarding maintenance off elapsed time alone, the gate is doing the wrong work.

### 3. "Work has shifted" transition moments

When the app detects likely maintenance, create a lightweight graduation moment:

> "Your goal may be shifting from building a new baseline to defending it."

Then ask the user to confirm via the journey-specific check-in (body-comp / GLP-1 / peptide cycle / skincare / facial-hair / etc.). This makes maintenance feel earned, not automatic.

### 4. Change recommendation logic after maintenance

Once a user enters maintenance, the app should stop over-indexing on optimization. Maintenance recommendations should focus on:

- preserving results
- preventing drift
- monitoring early regression
- simplifying routines
- sustaining adherence
- reducing unnecessary changes
- making small corrections

Per POV 54, the cultural bias is to treat maintenance as a consolation prize. The app should explicitly reject that framing — maintenance is the complete outcome, and the recommendation tone should reflect that.

### 5. Drift detection

Maintenance should not be binary. The app should detect when a maintained baseline is at risk.

**Examples:**

- weight / waist drifting
- missed check-ins
- routine adherence dropping
- protocol follow-up overdue (esp. TRT lab cadence)
- skin concern worsening
- facial-hair upkeep skipped (cleanup OR reshape overdue)

**Possible state:**

- *Maintenance Drift*
- *Baseline at Risk*
- *Needs Recalibration*

This lets the app intervene before the user fully regresses. Already partially shipped: drift detection exists for body_composition (5lb above anchor), strength (21d gap), cardio (21d gap), style (bf_drift_silhouette), sleep (two-window comparison), and facial_structure (60d photo gap). Three remaining (hair, skincare, facial_hair) wait on richer behavioral logging.

### 6. Cross-references

- **POV 54** — unifying definition: maintenance is a defended baseline state, not a time state. Three requirements: baseline exists / work has changed / evidence.
- **POV 02** — GLP-1s 5-phase model with the Sustained sub-split.
- **POV 03** — TRT 5-phase model with lab cadence + cycle-user triage.
- **POV 04** — peptides 5-phase model with cycle status + quarterly necessary check.
- **POV 13** — body composition three shapes (Weight + Composition + Performance).
- **POV 07** — skincare behavior-backed maintenance, SPF as daily anchor.
- **POV 09** — facial-hair behavior-backed maintenance, cleanup-vs-reshape cadences.

### 7. Implementation dependencies

The data layer determines sequencing:

| Need | Status today | Affects |
|---|---|---|
| `interventions.started_at` | Exists | Generic Pattern D Sustained gate |
| Dose history / "no major change in 8-12 wks" | Missing | Tighter Sustained gate (lighter version: self-report at check-in) |
| Lab review cadence tracking | Missing | TRT-specific Sustained + drift detector |
| Peptide cycle status | Missing | Peptide Sustained sub-question (lighter: capture at check-in) |
| GLP-1 sub-mode (therapeutic vs maintenance) | Missing | GLP-1 Sustained sub-split (lighter: capture at check-in) |
| Strength rolling 8-week stability | `workout_logs` exists; rolling-window calc needed | Performance maintenance gate |
| Daily SPF logged | Per memory, exists | Skincare adherence proxy |
| Skincare check-in cadence | Verify | Behavior-backed skincare maintenance |
| Facial-hair upkeep cadence | Missing | Behavior-backed facial-hair maintenance |

**Sequencing recommendation:**

1. **Pattern D Sustained** (TRT first → GLP-1 with sub-split → peptides with cycle status). Intervention rows exist; Sustained gate uses self-report for the data we don't yet track.
2. **Body composition three shapes** (Weight + Composition + Performance). Weight + strength data exists; performance rolling-window calc is straightforward.
3. **Skincare + facial-hair behavior-backed**. Gated on logging infra; build the data layer first, then the gates.
