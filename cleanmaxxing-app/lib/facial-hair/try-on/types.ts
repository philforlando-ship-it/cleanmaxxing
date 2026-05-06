// Facial hair try-on types. Mirrors the check constraint in
// 0050_facial_hair_try_ons.sql.

import type { FacialHairStyleSlug } from '../types';

export type FacialHairTryOn = {
  id: string;
  user_id: string;
  target_style: FacialHairStyleSlug;
  storage_path: string;
  model: string;
  source_photo_path: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
};

export type FacialHairTryOnWithSignedUrl = FacialHairTryOn & {
  signed_url: string | null;
};
