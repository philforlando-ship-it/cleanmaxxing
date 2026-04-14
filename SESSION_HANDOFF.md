# Session Handoff

Per `cleanmaxxing_mvp_spec.md` §10: write this at the end of every build session,
read it at the start of the next one.

---

## Last session: 2026-04-14 — Week 3 session 3 Slice B (instrumentation + goal-corpus linkage)

### Current repo state

- **Prior commit:** `f21ddd1` — "Add goal library browse with personalized ordering"
- **Dev server:** still running from prior sessions on http://localhost:3000
- **Supabase project:** `zmdijizkxcconyisjcht`. **Migration 0004 applied this session** via SQL Editor — added `goals.source_slug` + index and `mister_p_queries.topic_embedding vector(1536)` + HNSW index. Verified by running the smoke test and chatting through the browser.

### What landed this slice

**Refusal regex fix (trivial, 5-minute item — done first).** Broadened the regex in both `app/api/mister-p/ask/route.ts` and `scripts/smoke-test.ts` to catch `can't help`, `hard line`, `off-limits`, `off the table` in addition to the existing patterns. Production refusal logging now correctly tags Q13-style "I can't help users under 18" refusals instead of silently recording them as answers. Smoke test verified — Q13 now flips from "answered" to "refused", bringing total detected refusals from 6 to 7 (all correct).

**Migration 0004 — combined schema changes.**
- `goals.source_slug text` nullable + partial index where not null. Links every system-suggested goal back to its POV doc. Unblocks goal detail pages, Mister P goal awareness, retrieval boosts, "read the full guide" links, and template popularity analytics.
- `mister_p_queries.topic_embedding vector(1536)` + HNSW index. Feeds §13 circuit breakers and stickiness 5c proactive suggestions.
- Applied via Supabase SQL Editor. Migrations panel still doesn't handle ad-hoc DDL — always use SQL Editor.

**Goal → POV linkage.** `source_slug` now flows through the full pipeline:
- `/api/onboarding/suggestions` already returned it (it was on the `SuggestedGoal` type)
- `/api/goals/accept` accepts it in payload and persists to the new column
- `/api/goals/add` same
- `app/(app)/onboarding/complete/goals-picker.tsx` forwards it when calling accept
- `app/(app)/goals/library/library-browser.tsx` forwards it when calling add
- **Existing rows from prior sessions have NULL source_slug** — that's expected. Every goal created from this point forward carries the link.
- **Known limitation carried forward:** Duplicate detection in `/api/goals/add` still uses title matching, not source_slug. Should switch to `source_slug` matching in a future cleanup — one-line change but not load-bearing yet.

**Self-acceptance templates (§13 "second leg of the stool").** Added templates for docs 54/55/56 to `content/goal-templates.ts`:
- `54-when-to-stop` → "Practice noticing when to stop"
- `55-limits-self-improvement` → "Accept the limits of self-improvement"
- `56-identity-beyond-appearance` → "Build an identity beyond your appearance"
- All three phrased as process goals, in voice, non-moralizing.
- `'safety': 'Self-acceptance'` added to `CATEGORY_LABELS` in `library-browser.tsx`. New chip appears automatically because 54/55 have category='safety' in metadata.
- Docs 54/55 are tier `meta` so `rankCandidates` excludes them from onboarding auto-suggestion (correct — starter goals shouldn't be "practice stopping"). Doc 56 is tier-4 and eligible for auto-suggestion but has no focus-area mapping so it's effectively only reachable via library browse.

**Topic detection + circuit-breaker (spec §13).**
- `lib/mister-p/topic.ts` — new helper. `analyzeTopicCluster(supabase, userId, newEmbedding)` pulls up to 200 prior queries for the user (ordered desc, where `topic_embedding is not null`), computes cosine similarity in memory, returns `{ isNewTopic, maxSimilarity, recentSimilarCount }`. Constants: `TOPIC_SIMILARITY_THRESHOLD = 0.82`, `CIRCUIT_BREAKER_WINDOW_DAYS = 7`, `CIRCUIT_BREAKER_COUNT = 5`. `shouldTriggerCircuitBreaker` returns true when `recentSimilarCount >= COUNT - 1` (so the 5th similar question triggers).
- `lib/mister-p/retrieve.ts` — split into three exports: `embedQuestion(question)` (returns just the vector), `retrieveChunksWithEmbedding(embedding, n)` (RPC call), and the original `retrieveChunks(question, n)` (convenience wrapper that does both). Ask route uses the split so embedding happens once per question.
- `lib/mister-p/prompt.ts` — added `CIRCUIT_BREAKER_ADVISORY` string (injected appendix) and `buildSystemPromptWithAdvisory(chunks, advisory)` that conditionally appends the advisory to the base prompt.
- `app/api/mister-p/ask/route.ts` — rewired to embed the question once, retrieve chunks with the embedding, run topic analysis, conditionally build the system prompt with or without the advisory, stream, and in `onFinish` persist the row with `topic_embedding` populated.
- **In-memory similarity approach**: acceptable at MVP scale (< 50 queries per user per week). At ~1000 queries per user the 200-row fetch becomes ~1.2MB per ask request and the in-memory cosine becomes measurable. When that happens (v2+), migrate to a Postgres RPC that does the similarity join server-side.
- **Circuit-breaker has NOT been verified end-to-end** — it requires asking 5+ semantically similar questions within 7 days which is hard to trigger synthetically. Worth a manual test: sign up fresh, ask "should I take creatine?" five times in a row varying the wording slightly. On the 5th, Mister P should answer briefly then name the pattern.

### Verified working this session

- `npm run typecheck` — clean after every change
- `npm run build` — clean, all routes compiled
- `npm run smoke-test` — **20/20 functional pass, 7/7 refusals correctly detected** (up from 6/6 last session — Q13 now caught)
- Migration 0004 applied successfully via SQL Editor
- Browser chat with Mister P still works (topic_embedding persistence verified implicitly — no insert errors)

### Outstanding — what the next session should start with

**Spec amendments landed (2026-04-14).** Spec §1, §2 Feature 1, §3, and §9 Week 5 were updated with four decisions: process goal soft override, plain-language helper text on goals, "one path among several" homepage framing, and a v2 backlog entry for influencer scoring. These change the scope for this session and for Week 5.

**Slice B.5 — Spec amendment follow-through (pulled into session 3).**

1. **Plain-language summary authoring for POV docs.** Spec §2 Feature 1 now requires every goal card to expose a plain-language helper that demystifies jargon (TDEE, 1RM, hypertrophy, compound lifts, androgenic vs anabolic, etc.) on tap. Implementation path per spec: add a `plain_language` summary line to each POV doc, stored either as frontmatter in `content/povs/*.md` or as a new field on `pov_docs` via a light migration. Options:
   - **(a) Frontmatter in markdown** — easiest, no migration, `embed-povs.ts` picks it up at sync time. Add a `plain_language:` key to each of the 58 POV files. Tedious but mechanical.
   - **(b) Migration 0005 adds `plain_language text` to `pov_docs`** — slightly cleaner separation; edits can happen in the DB without re-embedding. Still needs the 58 summaries written somewhere.
   - **(c) Sidecar file** `content/povs/_plain_language.json` like `_metadata.json` — consistent with the metadata pattern, no migration, no per-file frontmatter edits.
   - Recommendation: **(c)**. It matches how metadata already works, and the authoring can happen incrementally (docs without a summary just fall back to description only).
   - Corpus authoring: ~58 single-sentence summaries, plain English, no jargon. Can be done in one sitting or incrementally as goals actually surface in testing.

2. **Process goal soft override** — client-side logic in `goals-picker.tsx`. When user clicks "Start with these," count process vs outcome goals from `current`. If process count < 2, render a modal (or inline banner above the button) with the exact copy from the spec and a "Swap one" button that finds the highest-scoring unused process goal from `alternatives` and replaces the lowest-scoring outcome goal in `current`. User can dismiss and continue. Small component — maybe 45 min.

3. **Plain-language helper text UI** — once #1 is authored, expose in `goals-picker.tsx` and `library-browser.tsx` as a tap-to-expand line below the main description. Maybe a small chevron or "What does this mean?" affordance. Small component — maybe 30 min.

**Slice C — Weekly reflection email (not started).**
- Resend email skeleton + day-of-week pattern heuristic on check-in data + Sunday trigger.
- Spec §9 has this launching in Week 4, so it's legitimately deferrable if Week 4 starts getting pressured.
- **Prereq consideration:** The weekly email wants "days checked in out of 7" data, but the daily check-in loop is a Week 4 deliverable and /today is still a stub. Hard to build a meaningful "how was your week" email without real check-in data to summarize. Probably makes sense to wait for Week 4's check-in loop, then circle back.

**Stickiness 5c — Mister P proactive suggestions (not started).**
- Now that topic embeddings are live, the data for this exists. The ask route could detect `isNewTopic` (maxSimilarity < 0.82 AND fewer than 2 prior questions in any cluster) and append a one-liner to the response linking to the most relevant POV doc.
- Natural next increment building on Slice B's groundwork.

**Mister P goal awareness (new — opportunity from Slice B).**
- Now that goals have `source_slug`, the ask route could load the user's active goals and inject them into the system prompt: "The user's current goals are X, Y, Z sourced from docs [slugs]. When relevant, anchor your answer to those."
- Also unlocks retrieval boosts: docs matching a user's active goals get a score bump when retrieving chunks.
- Not in the spec explicitly but aligned with the "Week 3 stickiness" framing.

**Optional cleanup from earlier sessions:**
- Library modal in the onboarding goals-picker (currently inline 7-alternative swap cycle — library would give full catalog)
- Eye-area retrieval investigation from smoke test Q9 (low priority)
- `/api/goals/add` duplicate detection should move from title-matching to source_slug-matching

### Known gotchas carried forward

- **Use Supabase SQL Editor, not Migrations panel.** Migrations panel chokes on ad-hoc DDL with "Unexpected identifier 'table'".
- **`/today` is still the Week 2 stub.** Week 4 scope.
- **`.env.local` secrets** transmitted through Claude Code conversation transcripts. User chose not to rotate for the build phase.
- **No Google OAuth, Stripe Checkout, PostHog** — deferred from earlier weeks.
- **Eye-area retrieval gap** (Q9 smoke test) — not urgent, deferred.
- **Title-based duplicate detection** in `/api/goals/add` — should migrate to source_slug-based now that the column exists.
- **In-memory topic similarity** scales to ~500 queries per user before becoming a latency concern. Migrate to Postgres RPC when needed.
- **Circuit-breaker not manually verified end-to-end** — the code path exists, the advisory injects, but no one has triggered 5-similar-in-7-days yet.

### How to resume

```bash
# Dev server probably still running. If not:
npm run dev

# Sanity check:
npm run typecheck
npm run smoke-test

# Natural next increments (in rough order of impact):
# 1. Stickiness 5c proactive suggestions — small extension to ask route
# 2. Mister P goal awareness — inject user's active goals + source_slugs into prompt
# 3. Slice C (weekly email) OR wait for Week 4 check-in loop first
# 4. Library modal in onboarding picker (polish)
```
