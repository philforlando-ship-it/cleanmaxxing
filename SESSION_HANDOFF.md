# Session Handoff

Per `cleanmaxxing_mvp_spec.md` §10: write this at the end of every build session,
read it at the start of the next one.

---

## Last session: 2026-04-13 — Spec stickiness additions + Week 3 session 1 (onboarding survey)

### Current repo state

- **Dev server:** still running on http://localhost:3000 from the prior session. Hot-reload picked up every file change this session; no restart needed.
- **Working tree before this commit:** included prior-session handoff update + all session-13 work. All bundled into this commit.
- **Supabase project:** `zmdijizkxcconyisjcht` — schema unchanged this session. Migration 0001 still active.
- **Prior commit:** `b191344` — "Initial commit: Cleanmaxxing MVP Weeks 1-2 complete"

### Spec updates (stickiness mechanics + tier system)

- **New spec section 2.5 — Stickiness Mechanics.** Five retention rituals added: weekly reflection email, monthly checkpoint, Mister P proactive suggestions, Discord weekly-wins thread, confidence score context copy. Each with build/launch weeks slotted into §9.
- **Spec §5 schema fixed.** `priority_tier` was `S|A|B|C` placeholder. Replaced with real doc-15 hierarchy: `tier-1..tier-5 | conditional-tier-1 | advanced | monitor | avoid | meta`. Same for `category` → 5 layers + `system|safety|context` for meta docs.
- **`monitor` tier added** for manageable-cost substances (alcohol, nicotine) — doc 15 frames them as "costs not neutral variables," which is neither tier-3 nor avoid.
- **⚠️ Mismatch to resolve in Week 3 session 2:** migration 0001 still has `goals.priority_tier check (priority_tier in ('S','A','B','C'))`. When the goal suggestion algorithm tries to insert a goal with a tier-N value, it will fail the check. Needs a migration 0003 to relax it (or map pov tiers → S/A/B/C when copying). **Flagged as the first blocker for session 2.**

### Week 2 additions (stickiness / content)

- **`lib/confidence/context.ts`** — confidence score context table. Full 1–10 scale with label (Hiding, Bracing, Avoiding, Guarded, Neutral, Steady, Comfortable, Confident, Anchored, Settled) and behavioral first-person description. Single source of truth for future email / checkpoint / chart-label surfaces. Exports `contextFor(score)` (snaps decimals to nearest level) and `deltaPhrase(from, to)` ("guarded to steady") for delta copy.
- **`content/povs/_metadata.json`** — all 58 POV docs pre-filled with `priority_tier`, `category`, `age_segments` derived from doc 15's explicit tier lists. Age-narrowed entries: `28-cosmetic-procedures` → `["33-40"]` only, `38-aging-appearance` → `["25-32","33-40"]`. Legend at top of file documents valid values.
- **`scripts/embed-povs.ts`** — rewired to read `_metadata.json`, added strict `PovTier` and `PovCategory` union types, now writes `age_segments` array (was being silently skipped before). Warns on missing/incomplete metadata but doesn't fail. Re-embedded successfully after the metadata rewrite — all 58 docs have full metadata, no warnings.
- **`scripts/smoke-test.ts`** (new) + `npm run smoke-test` — batch runner for all 20 smoke questions. Writes full answers + retrieved chunks + refusal flag to `tests/mister_p_smoke_results.md` (gitignored). Manual grading, not automated.

### Week 3 session 1 — onboarding survey flow

- **`lib/onboarding/types.ts`, `questions.ts`, `progress.ts`** — 16 questions (15 from spec §7 + clinical screen Q16 at the end). `ageToSegment(n)`, `questionAt(i)`, `questionByKey(k)`, `nextStepIndex(answeredSet)`.
- **Route structure**:
  - `/onboarding` — reads `survey_responses`, jumps to first unanswered question
  - `/onboarding/[step]` — server frame with progress bar + sign-out link, delegates to client `QuestionForm`
  - `/onboarding/finalize` — if clinical screen = yes, redirects to resources; else POSTs submit + routes to complete
  - `/onboarding/clinical-resources` — NEDA + IOCDF links, "Take a break" / "Continue anyway" soft gate
  - `/onboarding/complete` — success terminal, CTA to `/today`. Goal suggestion stub ("coming in the next build").
- **API routes**:
  - `POST /api/onboarding/answer` — server-side validates required + age 18+, delete-then-insert into `survey_responses` (no natural unique key for upsert, hence the delete-first pattern)
  - `POST /api/onboarding/submit` — verifies all required rows, computes age_segment, writes `confidence_dimensions` baseline rows for all 5 sliders, sets `users.age / age_segment / clinical_screen_flagged / onboarding_completed_at`
  - `POST /api/auth/signout` — 303 redirect to `/login`
- **Question form (`[step]/question-form.tsx`)** — single client component handling all 6 input types (number, text, choice, multi-choice, slider, yes-no), resume-aware (hydrates from `initialValue`), client-side validation before POST.
- **Proxy gate (`lib/supabase/proxy.ts`)** — authenticated users without `onboarding_completed_at` get bounced to `/onboarding`; completed users who try to re-enter `/onboarding/*` get bounced to `/today`. One extra DB query per protected request — acceptable at MVP scale.
- **Sign-out buttons** wired to `/today` (top-right) and every onboarding step (next to progress %).

### Fixes landed during testing

- **Slider default was unselectable.** `value` state started as empty string while UI displayed midpoint as fallback — hitting Next without interacting failed validation. Initialized slider state to midpoint in `useState` initializer.
- **Q10 / Q12 were redundant** (`appearance_happiness` vs `confidence_appearance` on the same 1–10 scale, measuring the same thing). Reframed Q10 as `appearance_preoccupation` — "How often do you think about your appearance on a typical day? 1 = rarely, 10 = almost constantly." Gives distinct data that feeds the psych-safety circuit-breaker later, instead of duplicating confidence_appearance.

### Smoke test results (20/20 functional pass)

Ran `npm run smoke-test` after re-embedding with new metadata. All 20 questions returned correct behavior:
- 10 in-scope answered with citations
- 5 edge cases handled correctly (under-18 refused, nofap logged as out-of-corpus, 500-cal diet refused, etc.)
- 5 hard refusals all refused in voice
- **Two issues flagged for later, neither blocking:**
  1. **Refusal-detection regex gap.** Q13 "I'm 17" refused correctly but the regex in `app/api/mister-p/ask/route.ts` and `scripts/smoke-test.ts` missed it — Mister P phrased it as "I can't help users under 18" instead of "Not something I'll help with." Production refusal logging has the same blind spot. Broaden regex to `/can't help|hard line|off-limits|off the table/i`.
  2. **Eye-area retrieval missed expected docs.** Q9 "my eye area looks tired even when I sleep" retrieved 10-grooming + 17-environment-lifestyle-design but not 47-eye-health or 44-water-retention. Answer was still correct (covered inflammation, skincare, expression tension via grooming doc) but the most topical docs didn't make top-5. Possibly a chunk-size or content-structure issue in 44/47. Investigate when retrieval tuning becomes a priority.

### Verified working this session

- `npm run typecheck` — clean after every file change
- `npm run build` — clean, all routes compiled
- `npm run embed-povs` — 58 docs, no metadata warnings
- `npm run smoke-test` — 20/20 functional pass
- Browser end-to-end walkthrough of onboarding: signup → all 16 questions on mobile width → finalize → complete → `/today`. Also verified: proxy gate (incomplete users bounced to onboarding, completed users blocked from re-entering), resume (drop off mid-survey and come back, lands on correct step), clinical flag flow (yes → resources page → continue anyway → complete, with `clinical_screen_flagged = true` in DB).

### Outstanding — what the next session should start with

**Week 3 session 2: Goal suggestion + goal library + /goals view**

1. **Migration 0003** — relax `goals.priority_tier` check constraint to match the new doc-15 tier enum, OR add a mapping layer from pov tiers → S/A/B/C when inserting suggested goals. Lean relax. **First thing to do in session 2, nothing else can persist a goal without this.**
2. **`lib/onboarding/goal-suggest.ts`** — read `pov_docs`, filter by user's `age_segment` and `focus_areas` selection from `survey_responses`, rank by tier (tier-1 > tier-2 > ...), bias toward process-flavored POV docs (psych-safety §13 — outcome goals require extra tap). Return top 3 as `{ title, description, category, priority_tier, goal_type }`.
3. **Suggested-goals screen at end of onboarding** — currently `/onboarding/complete` is a stub. Replace with: show 3 suggested goals, allow accept (writes `goals` rows with `source=system_suggested`), swap, or browse library.
4. **Goal library browse UI** — modal or separate page, filterable by category, allows swap into a suggestion slot.
5. **`/goals` list view** — simple active goals list with status.
6. **Week 3 stickiness items** (can slip to session 3):
   - Weekly reflection email template + day-of-week pattern detection
   - Mister P topic detection logging (needs migration: add `topic_embedding vector(1536)` to `mister_p_queries`)

### Known issues carried forward

- `goals.priority_tier` check constraint is stale (see above)
- Mister P refusal regex has a gap (see smoke test notes)
- Eye-area retrieval topical gap (see smoke test notes)
- No Google OAuth yet — email/password only
- Stripe Checkout still deferred from Week 1
- PostHog not wired

### How to resume next session

```bash
# From cleanmaxxing-app/
# Dev server probably still running. If not:
npm run dev

# Verify nothing regressed:
npm run typecheck
npm run smoke-test     # optional, 20-question batch

# Start Week 3 session 2:
# 1. Write migration 0003 for goals.priority_tier (FIRST — blocker for goal persistence)
# 2. supabase/migrations/0003_relax_goal_tier.sql → apply via Supabase SQL editor
# 3. Then build goal-suggest.ts, then suggested-goals screen, then /goals list, then library
```

### Security note (still outstanding from prior session)

`.env.local` secrets transmitted through Claude Code conversation transcripts. User chose not to rotate for the build phase. Rotation remains a 5-minute fix via each service's dashboard.
