# Cleanmaxxing MVP Specification

**Version:** 0.1 (drafted with Claude, April 2026)
**Owner:** Phil
**Build window:** ~6 weeks, ~4 hours/day solo
**Purpose of this doc:** Single source of truth for the MVP build. Paste into Claude Code at the start of build sessions. Update as decisions change.

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
Men aged 18–40 who are actively interested in self-improvement, appearance, and confidence. The ICP skews 22–32: old enough to have disposable income, young enough to still be actively shaping their appearance and identity.

**Hard age gate: 18+.** No exceptions. This is a brand decision and a liability decision, not just a legal one.

### What Cleanmaxxing is NOT
- Not a dating advice platform
- Not a pickup artist product
- Not an incel-adjacent community
- Not a medical or therapeutic service
- Not a supplement store
- Not for minors

---

## 2. MVP Scope — The Six Things

Every feature below is IN. Everything not below is OUT.

### Feature 1: Onboarding Survey → Initial Goals
**What it does:** New users answer ~15 questions across three buckets (demographics/age, physical baseline and insecurities, self-confidence baseline on a 1–10 scale across 4–5 dimensions). At the end, the system proposes 3 starter goals from the POV hierarchy, filtered by age segment.

**Why it's core:** This is the only differentiated thing in the MVP. If onboarding feels smart and personalized, users come back. If it feels generic, nothing downstream matters.

**Design principle:** Feel like a conversation, not a form. Progress indicator at top. One question per screen on mobile. Default answers pre-selected where reasonable so users can tap through quickly.

**Process goal soft override.** When the user finalizes their three starter goals, check how many are process-oriented versus outcome-oriented. If fewer than two are process goals, show a gentle inline prompt above the "Start with these" button: *"Most people get better results with at least 2 process goals. Process goals are things you do; outcome goals are things you're trying to become. Want to swap one?"* — with a one-tap swap action that replaces the lowest-scoring outcome goal with the highest-scoring unused process goal from the ranking. This is a nudge, not a block. The user can dismiss it and continue. It's a direct implementation of the process-goal default commitment from section 13 — the friction is gentle because the goal is to shift the default, not to moralize.

**Plain-language expansion on every goal.** Each goal card in both the onboarding picker and the library has a one-sentence plain-language helper that appears on tap or hover, demystifying any jargon (TDEE, RDA, 1RM, hypertrophy, compound lifts, androgenic versus anabolic, and so on). Mister P talks to users — he doesn't quiz them. The helper text is sourced from a short plain-language summary line added to each POV doc (new field `faqs.plain_language` or equivalent) so it stays in sync with the corpus and can be edited in one place. Goal templates without a plain-language summary fall back to showing only the main description.

**Done when:**
- User can complete survey in <4 minutes on mobile
- User sees 3 suggested goals at the end, tailored by age
- User can accept, modify, or swap goals from a filtered library
- State is saved after each question (no data loss on drop-off)
- Process goal soft override fires when fewer than 2 of 3 final goals are process-oriented
- Every goal card in the library and picker exposes plain-language helper text on tap

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
**What it does:** Personified chat interface grounded in the POV corpus. Users ask questions ("should I take creatine?", "what should I do about my hairline?") and get answers in Mister P's voice, citing the POV docs they came from.

**Why it's core:** This is the feature that makes Cleanmaxxing feel smart. It's also the feature that creates the most "wow" moment in the first session.

**Design principle:** Closed corpus. Mister P does not answer questions from general knowledge. If the corpus doesn't cover something, Mister P says "that's not something I cover yet" and logs the question for the roadmap.

**Done when:**
- User can ask a question and get a grounded answer in <5 seconds
- Answers cite the POV doc(s) used
- Out-of-scope questions get refused gracefully in Mister P's voice
- All user questions are logged to a table for roadmap review
- Refusals for truly unsafe topics (synthol, DNP, clenbuterol, extreme restriction, sourcing guidance, DIY dental) fire reliably

### Feature 4: Today Screen
**What it does:** The home screen after login. Shows, in order: today's check-in (or confirmation), confidence trend chart, active goals as a short list, and an "Ask Mister P" entry point.

**Why it's core:** This is where the retention loop lives. Users come back to do the check-in and see the chart.

**Design principle:** Calm and minimal. Not a dashboard. Four things, nothing else. No widgets, notifications, or cards. Apple Fitness rings energy, not Bloomberg terminal energy.

**Done when:**
- Renders in <1 second on mobile
- Confidence chart updates immediately after check-in
- Goals list shows current state accurately
- "Ask Mister P" is always one tap away

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
  age_segment (enum: '18-24', '25-32', '33-40')
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
  status (active, completed, abandoned)
  created_at
  completed_at (nullable)
  source (user_created, system_suggested)

check_ins
  id
  user_id
  date (unique per user per day)
  confidence_score (int 1–10)
  created_at

goal_check_ins
  id
  check_in_id
  goal_id
  completed (bool)

survey_responses
  id
  user_id
  question_key
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
what the context supports. When you cite something, name the POV doc it came
from in parentheses at the end of the relevant sentence.

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

When refusing, stay in voice. Example:
"Not something I'll help with — that's the kind of shortcut that ends careers
and sometimes lives. If you're frustrated with arm size, ask me about the
boring stuff that actually works."

Context provided:
{retrieved_chunks}

User question:
{user_question}
```

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

### Bucket A: Demographics and Baseline (4 questions)
1. How old are you? (number, must be 18+)
2. What's your height and weight? (optional, two number fields)
3. How would you describe your current level of self-improvement effort? (none / occasional / consistent / obsessive)
4. How did you hear about Cleanmaxxing? (dropdown: creator name / Google / friend / other)

### Bucket B: Physical Focus Areas (6 questions)
5. Which of these do you most want to improve? (multi-select, max 3: fitness / body composition / skin / hair / facial aesthetics / style / posture / grooming)
6. Do you avoid photos of yourself? (never / sometimes / often / always)
7. Have you tried structured self-improvement routines before? (never / yes, stuck with them / yes, stopped / currently active)
8. Is there one specific thing you think about more than you'd like to? (free text, optional)
9. On a 1–10 scale, how happy are you with your current appearance?
10. What's your biggest obstacle right now? (time / money / knowledge / motivation / something else)

### Bucket C: Confidence Baseline (5 questions — 1–10 sliders)
11. How confident do you feel about your appearance?
12. How confident do you feel in social situations?
13. How confident do you feel at work or school?
14. How confident do you feel about your physical health?
15. Overall, how confident do you feel about yourself?

### After submit
- Store all responses
- Compute age segment
- Run goal suggestion algorithm:
  - Filter POV corpus by age segment
  - Filter by selected focus areas (question 5)
  - Rank by priority tier from POV hierarchy (S → A → B → C)
  - Return top 3 as suggested goals
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

**Onboarding includes a clinical screening question.** Add to the survey: "Have you ever been diagnosed with or treated for an eating disorder, body dysmorphic disorder, or OCD?" If yes, show a screen recommending they speak with a clinician before using the product, with resources (NEDA alternative: National Alliance for Eating Disorders helpline) and a soft option to continue. Some users will drop off. Those are users the product should not be serving.

**Mister P never moralizes, but Mister P also never pretends that every problem has a product-shaped solution.** The system prompt should be updated to include: "Sometimes the right answer is that the user doesn't need to fix this. If the question is about an insecurity that isn't worth fixing, say so. 'Honestly, this one isn't worth your attention. Focus on [X] instead.' Refusing to help isn't always a content policy — sometimes it's the actual advice."

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

## 14. What This Doc Is Not

This is not a product roadmap past MVP. It is not a brand bible. It is not a marketing plan. It is a **shippable build spec for the next 6 weeks**. Anything outside that scope belongs in a different document.

When something on this list changes, update this file and commit it. This file is the contract between past-Phil and future-Phil, with Claude as witness.

---

*End of spec. Go build.*
