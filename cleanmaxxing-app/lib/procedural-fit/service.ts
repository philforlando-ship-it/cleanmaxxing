/**
 * Service layer for procedural_fit_analyses.
 *
 * Read-only helpers consumed by /plan/procedures and any future
 * surface that wants to show a user's prior procedural-fit reads.
 * Writes happen via the route handler with a service-role client
 * (matching the facial_analyses pattern).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ProceduralFitOutput,
  ProceduralFitInputState,
} from './prompt';

export type ProceduralFitAnalysisRow = {
  id: string;
  user_id: string;
  baseline_photo_path: string;
  baseline_captured_at: string;
  input_state: ProceduralFitInputState;
  output: ProceduralFitOutput;
  refused: boolean;
  refusal_reason: string | null;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
};

export async function listProceduralFitAnalyses(
  supabase: SupabaseClient,
  userId: string,
  limit = 10,
): Promise<ProceduralFitAnalysisRow[]> {
  const { data, error } = await supabase
    .from('procedural_fit_analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as ProceduralFitAnalysisRow[];
}

export async function getLatestProceduralFitAnalysis(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProceduralFitAnalysisRow | null> {
  const rows = await listProceduralFitAnalyses(supabase, userId, 1);
  return rows[0] ?? null;
}
