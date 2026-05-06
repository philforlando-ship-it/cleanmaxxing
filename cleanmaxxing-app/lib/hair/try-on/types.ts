// Hair try-on types. Mirrors the check constraint in
// 0044_hair_try_ons.sql.

import type { CutFamily } from '../types';

export type HairTryOn = {
  id: string;
  user_id: string;
  cut_family: CutFamily;
  storage_path: string;
  model: string;
  source_photo_path: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
};

export type HairTryOnWithSignedUrl = HairTryOn & {
  signed_url: string | null;
};
