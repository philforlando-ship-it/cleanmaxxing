-- ==========================================
-- Cleanmaxxing — style_assessments stage 1/2/3 columns
-- ==========================================
-- Layers stage state onto style_assessments. Same convention as
-- hair_assessments stages 1–6 (one column-set per stage on the parent
-- row, no separate stages table). v0 was assessment + report only;
-- stages 1–3 ship together in this migration since they share schema
-- shape and content modules.
--
-- Stage 1 — Closet audit.
--   stage_1_chip_selections is the user's keep/cut/replace marks against
--   the archetype-specific chip sets defined in
--   lib/style/closet-audit-content.ts. JSONB shaped as:
--     { "<chip_slug>": "keep" | "cut" | "replace" }
--   Absent keys mean the user did not mark that chip — distinct from
--   "keep" (an explicit decision). Saves us 8–10 nullable text columns
--   that would mostly be null.
--   stage_1_audit_text is the LLM-generated recommendation Mister P
--   writes after the chips submit. Markdown.
--   stage_1_completed_at gates stage 2.
--
-- Stage 2 — Foundation pieces.
--   stage_2_pieces_acquired is a slug array. Slugs come from
--   lib/style/foundation-pieces-content.ts and are archetype-scoped.
--   The five pieces a user sees depend on (target_archetype,
--   frame_estimate, budget_tier); the array stores whichever subset of
--   those slugs the user has marked acquired. Auto-completes when all
--   five are present, but stage_2_completed_at can also be set
--   manually if the user wants to skip ahead.
--
-- Stage 3 — Fit calibration.
--   No content stored; the principles are authored, modifier-conditional
--   at render time. stage_3_acknowledged_at is the only state — the
--   user reads the principles and acknowledges they've internalized
--   them. Same pattern as hair stage 4 / 5 acknowledgements.
--
-- Run in Supabase SQL Editor.

alter table public.style_assessments
  -- Stage 1: closet audit
  add column if not exists stage_1_chip_selections jsonb,
  add column if not exists stage_1_audit_text text,
  add column if not exists stage_1_generated_at timestamptz,
  add column if not exists stage_1_completed_at timestamptz,

  -- Stage 2: foundation pieces
  add column if not exists stage_2_pieces_acquired text[]
    not null default '{}'::text[],
  add column if not exists stage_2_completed_at timestamptz,

  -- Stage 3: fit calibration
  add column if not exists stage_3_acknowledged_at timestamptz;
