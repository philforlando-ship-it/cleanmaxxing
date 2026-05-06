// Types for the hair photo system. Mirrors the check constraints in
// 0042_hair_photos.sql — keep in lockstep.

export type HairPhotoAngle =
  | 'front'
  | 'hairline'
  | 'side_left'
  | 'side_right'
  | 'crown'
  | 'styled'
  | 'top_down';

// Angle sets per track. The capture UI walks the user through these
// in order; "front" is the only required angle in either track.
export const HAIR_TRACK_ANGLES: ReadonlyArray<HairPhotoAngle> = [
  'front',
  'hairline',
  'crown',
  'side_left',
  'styled',
] as const;

export const BALD_TRACK_ANGLES: ReadonlyArray<HairPhotoAngle> = [
  'top_down',
  'side_left',
  'front',
] as const;

export const HAIR_PHOTO_ANGLE_LABEL: Record<HairPhotoAngle, string> = {
  front: 'Front',
  hairline: 'Hairline close-up',
  side_left: 'Side profile',
  side_right: 'Side profile (other side)',
  crown: 'Crown / top-down',
  styled: 'Styled result',
  top_down: 'Top-down (full crown)',
};

export const HAIR_PHOTO_ANGLE_HINT: Record<HairPhotoAngle, string> = {
  front: 'Eye level, neutral expression. Hair as it normally sits.',
  hairline: 'Hair lightly pulled back if needed. Capture the hairline edge.',
  side_left: 'Same side every session. Camera at eye level, profile clear.',
  side_right: 'Other side, only if your hairline recedes asymmetrically.',
  crown: 'Camera above your head, lens pointing down. Crown centered.',
  styled: 'Normal distance, how you actually look after styling.',
  top_down: 'Camera above your head, full crown in frame.',
};

export type HairPhoto = {
  id: string;
  session_id: string;
  user_id: string;
  angle: HairPhotoAngle;
  storage_path: string;
  captured_at: string;
};

export type HairPhotoSession = {
  id: string;
  user_id: string;
  captured_at: string;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
};

export type HairPhotoSessionWithPhotos = HairPhotoSession & {
  photos: HairPhoto[];
};

export type HairPhotoAnalysisObservation = {
  dimension:
    | 'hairline'
    | 'crown_density'
    | 'overall_density'
    | 'scalp_visibility'
    | 'texture'
    | 'styling';
  change_direction: 'improved' | 'neutral' | 'regressed';
  evidence: string;
};

export type HairPhotoAnalysisOutput = {
  observations: HairPhotoAnalysisObservation[];
  summary: string | null;
  refused: boolean;
  refusal_reason: string | null;
};

export type HairPhotoAnalysis = {
  id: string;
  user_id: string;
  before_session_id: string;
  after_session_id: string;
  before_captured_at: string;
  after_captured_at: string;
  angles_used: HairPhotoAngle[];
  observations: HairPhotoAnalysisOutput;
  refused: boolean;
  refusal_reason: string | null;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
};
