# Session Handoff

Per `cleanmaxxing_mvp_spec.md` §10: write this at the end of every build session,
read it at the start of the next one.

---

## Last session: 2026-04-13 — Week 3 session 3 Slice A (library browse)

### Current repo state

- **Prior commit:** `f777e19` — "Add goal suggestion, accept flow, and /goals list view"
- **This commit:** see below — slice A of session 3
- **Dev server:** still running from prior sessions on http://localhost:3000
- **Supabase project:** `zmdijizkxcconyisjcht`. Migration 0003 applied. No new migrations this slice.

### What landed this slice

**Slice A — Goal library browse (done, committed).**

- **`/goals/library`** — new page, reachable from `/goals` header ("Browse library" button) or the `/goals` empty state link. Server component + client `LibraryBrowser`.
- **Category filter chips** — All / Biological Foundation / Structural & Framing / Grooming & Refinement / Behavioral / Perception & Identity. Counts shown next to each.
- **`/api/goals/templates`** — GET. Joins `content/goal-templates.ts` with `pov_docs` metadata, filters by the user's `age_segment`, flags templates that match an active goal as `already_active`, and **sorts by personalized score** using the same `focus_areas` → slug mapping that the onboarding picker uses. User sees their most-relevant goals first but can still browse the full catalog.
- **`/api/goals/add`** — POST. Adds one goal to an already-onboarded user (requires `onboarding_completed_at` to be set). Refuses duplicates by title with 409. Does NOT touch `onboarding_completed_at`.
- **`lib/onboarding/goal-suggest.ts`** — refactored to export two new helpers:
  - `focusSlugsFor(focusAreas)` — builds the relevant-slug set from Q6 keys
  - `scoreDoc(slug, tier, focusSlugs, goalType)` — pure scoring function, no filter logic. Used by both `rankCandidates` (onboarding) and the templates endpoint (library).
- **Known limitation carried forward:** Duplicate detection uses title matching, not a `source_slug` column on `goals`. Fine for MVP; if you edit a template title, a user could re-add from the library. Proper fix is a future migration 0004 adding `source_slug text` to goals — also enables template popularity analytics.

**Slice A verified in browser** — user walked `/goals` → "Browse library" → filter chips → add a goal → card flips to "Already active" without page reload → back to `/goals` shows the new entry.

### Outstanding — what the next session should start with

**Slice B — Instrumentation (not started).** This is the main remaining session 3 work.

1. **Smoke test refusal regex fix** (5 min — do first, trivial win).
   - In `app/api/mister-p/ask/route.ts` and `scripts/smoke-test.ts`, the refusal regex only catches `/That's not something I cover yet|Not something I'll help with/`. It misses `/I can't help|hard line|off-limits|off the table/i` which is how Mister P actually phrases the under-18 refusal (see smoke test Q13).
   - Fix: broaden the regex to include those patterns. Update both files. Re-run `npm run smoke-test` and confirm all 6 expected refusals are detected.

2. **Mister P topic detection (spec §13 circuit-breakers + stickiness 5c).**
   - **Migration 0004** — add `topic_embedding vector(1536)` to `mister_p_queries` + HNSW index on that column. Apply via Supabase **SQL Editor** (NOT Migrations panel — the Migrations panel threw "Unexpected identifier 'table'" errors last time, see 0003 notes below).
   - **Ask route changes** (`app/api/mister-p/ask/route.ts`): before streaming, embed the user's question with OpenAI `text-embedding-3-small`. Persist the embedding to `mister_p_queries.topic_embedding` alongside the existing row write. Also: query the user's prior questions, compute cosine similarity against each, and if max similarity is below a threshold (start with **0.82**), tag this as a new topic. If above threshold, look up the matching prior question and count how many similar questions the user has asked in the last 7 days — if ≥5, inject a circuit-breaker advisory into the system prompt for this turn ("Note: the user has asked 5+ similar questions this week. §13 circuit-breaker active — gently name the pattern, suggest taking a week off from this topic.").
   - **Inline detection is the plan** — no background job needed. Runs once per query, negligible cost. Confirmed in pre-session decision.
   - **Stickiness 5c (proactive suggestions):** if max similarity is below 0.82 AND fewer than 2 prior questions exist in any cluster, append a one-liner to the response pointing to a deeper POV doc on that topic. Deferred — the basic topic logging is the prerequisite. Can come in a later slice.

**Slice C — Weekly reflection email (not started).**
- Resend template + day-of-week pattern heuristic on check-in data + Sunday trigger.
- Spec §9 has this launching in Week 4, so it's legitimately deferrable. Only tackle if Slice B wraps with time to spare.

**Optional cleanup — Library modal in onboarding picker.**
- Current onboarding `goals-picker.tsx` uses a 7-alternative inline swap cycle. The library modal (reusing `/goals/library`'s `LibraryBrowser` in pick-mode) would give users full catalog access during onboarding too. Not a real user complaint, just closes the loop on the library story. Small — maybe 30 min.

### Pre-session decisions already made for Slice B

These were confirmed before the session paused, so you don't need to re-decide:

- **Topic similarity threshold:** 0.82 cosine similarity for "same topic" on text-embedding-3-small. Tunable later once there's real query data.
- **Circuit-breaker detection:** inline, per-query. No background job. Simpler, cheaper, and the cost is one extra `SELECT count(*)` per question.

### Known gotchas carried forward

- **Supabase SQL Editor, not Migrations panel.** The Migrations panel throws "Unexpected identifier 'table'" on ad-hoc DDL. Always use SQL Editor for applying migrations manually.
- **`/today` is still the Week 2 stub.** Week 4 scope. Don't touch until then.
- **Refusal regex gap** (see Slice B item 1). Production refusal logging has the same blind spot until it's fixed.
- **`.env.local` secrets** transmitted through Claude Code conversation transcripts. User chose not to rotate for the build phase.
- **No Google OAuth, Stripe Checkout, PostHog** — deferred from earlier weeks.
- **Eye-area retrieval gap** (Q9 smoke test) — not urgent, deferred.
- **Title-based duplicate detection** in `/api/goals/add` — MVP-acceptable. Proper fix = `source_slug` column, future migration.

### How to resume

```bash
# Dev server probably still running. If not:
npm run dev

# Sanity check:
npm run typecheck

# Slice B starting point — do in this order:
# 1. Fix refusal regex in both files (5 min, verify with `npm run smoke-test`)
# 2. Write supabase/migrations/0004_topic_embedding.sql, apply via SQL Editor
# 3. Wire topic embedding into app/api/mister-p/ask/route.ts
# 4. Add circuit-breaker advisory injection for >=5 similar questions in 7 days
```
