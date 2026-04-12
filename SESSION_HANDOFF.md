# Session Handoff

Per `cleanmaxxing_mvp_spec.md` §10: write this at the end of every build session,
read it at the start of the next one.

---

## Last session: 2026-04-12 — Week 1 Foundation Kickoff

### What got done

- Git initialized at `Cleanmaxxing/` root with comprehensive `.gitignore`
- Next.js 16.2.3 scaffolded into `cleanmaxxing-app/` (TypeScript, Tailwind 4, App Router, Turbopack)
- Core deps installed: `@supabase/ssr`, `@supabase/supabase-js`, `ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `openai`, `stripe`, `@stripe/stripe-js`, `zod`, `recharts`, `lucide-react`, `mammoth`, `tsx`, `dotenv`
- **Important discovery**: this is Next.js **16**, not 15. Key breaking changes addressed:
  - `middleware.ts` → `proxy.ts` (and `middleware` function → `proxy`). Already renamed.
  - Async request APIs fully required (cookies, params, etc.). Already awaited correctly.
- Full directory structure created:
  ```
  cleanmaxxing-app/
    app/
      (auth)/login, signup
      (app)/today, goals, mister-p, settings
      (marketing)/
      api/mister-p/ask, api/stripe/webhook, api/check-in
    lib/
      supabase/ (client.ts, server.ts, proxy.ts)
      mister-p/ (prompt.ts, chunking.ts, retrieve.ts)
      stripe/
    components/ui/
    content/povs/  (populated by `npm run sync-povs`)
    scripts/ (sync-povs.ts, embed-povs.ts)
    supabase/migrations/0001_initial_schema.sql
    tests/mister_p_smoke.md
    .env.example
  ```
- Supabase schema written (`supabase/migrations/0001_initial_schema.sql`):
  - All tables from spec §5
  - **Psychological safety modifications**: `check_ins` has no `confidence_score` column (daily is habit-only); added `weekly_reflections` table for the weekly confidence loop with 4 contextual dimensions; `goals` has `goal_type` (process/outcome); `users` has `tracking_paused_at` for step-away mode and `clinical_screen_flagged` for ED/BDD/OCD screening
  - RLS enabled on all user-scoped tables
  - `match_pov_chunks` RPC function for vector search
  - `handle_new_user()` trigger to auto-create `public.users` row on signup
- Mister P system prompt (`lib/mister-p/prompt.ts`) — full harm-reduction stance from spec §6 including advanced/pharmacological guidance
- POV sync script (`scripts/sync-povs.ts`): reads `../Cleanmaxxing POV/*.docx` + `../Other Cleanmaxxing Docs/*.docx`, converts via mammoth, writes to `content/povs/*.md` with frontmatter
- Embed script (`scripts/embed-povs.ts`): chunks, embeds via OpenAI `text-embedding-3-small`, upserts `pov_docs` + `pov_chunks`
- RAG retrieval (`lib/mister-p/retrieve.ts`) + API route (`app/api/mister-p/ask/route.ts`) streaming via Vercel AI SDK + Claude
- Auth skeleton pages: `login`, `signup` (with 18+ confirmation), `today` (protected)
- Landing page rewritten with Cleanmaxxing copy
- 20-question smoke test suite (`tests/mister_p_smoke.md`)

### What's working

- `npm run dev` should boot the app (not yet verified in this session — see next)
- Landing page, login, signup, today-placeholder routes exist
- All files type-check at write time (not yet verified with `npm run typecheck`)

### What's not verified yet

- `npm run dev` boot
- `npm run typecheck`
- `npm run build`
- POV sync conversion quality (mammoth output format)
- `.env.local` doesn't exist yet — nothing requiring secrets can run

### What the next session should start with

1. **Run `npm run typecheck` and `npm run build`** to catch any Next 16 API mismatches I missed
2. **Provision external accounts** (nothing else unblocks until these exist):
   - Supabase project → paste URL/anon/service into `.env.local`
   - Anthropic API key
   - OpenAI API key
   - Stripe test-mode keys + create two prices ($9.99/mo, $79/yr)
3. **Run the Supabase migration**: paste `supabase/migrations/0001_initial_schema.sql` into the Supabase SQL editor
4. **Run `npm run sync-povs`** to generate `content/povs/*.md`
5. **Run `npm run embed-povs`** (requires `.env.local` with Supabase service key + OpenAI key) to populate `pov_docs` and `pov_chunks`
6. **Smoke test Mister P** using the suite in `tests/mister_p_smoke.md`
7. Wire up Stripe Checkout (test mode) — `app/api/stripe/checkout` + `app/api/stripe/webhook`

### Decisions made this session that affect the spec

- Confirmed Next.js **16** (not 15) via the AGENTS.md note and node_modules docs
- Split daily check-ins (habit-only, `check_ins` table) from weekly reflections (confidence, `weekly_reflections` table) at the schema level — this hardens the psychological safety commitment from spec §13 into the data model, not just the UI
- Added `goal_type` column to `goals` to make process-vs-outcome a first-class field rather than a frontend concern
- Hard-refused `api/stripe/webhook` from the proxy matcher since Stripe needs the raw request body

### Open questions

- Do we want Google OAuth now or just email/password for MVP? (Spec says "Google OAuth", not yet wired)
- What's the `NEXT_PUBLIC_APP_URL` for production? (Spec has `cleanmaxxing.com` as an open question)
- Is Resend ready, or will we skip transactional email until week 5?
