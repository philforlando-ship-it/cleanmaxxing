// Types for the interventions table. Mirrors the check constraints in
// supabase/migrations/0046_interventions.sql — keep in lockstep.
//
// InterventionType is intentionally identical to the legacy
// `Intervention` type in lib/profile/service.ts. The two enums diverge
// when (and only when) we extend Pattern D to topics that aren't in
// the legacy array (peptide, fat_burner, sarm, other). Until then,
// keep them mirror images so the sync helper has a 1:1 mapping.

export type InterventionType =
  | 'trt'
  | 'glp1'
  | 'peptide'
  | 'finasteride'
  | 'minoxidil'
  | 'retinoid'
  | 'accutane'
  | 'creatine'
  | 'ssri'
  | 'adhd_stimulant';

export const INTERVENTION_TYPES: ReadonlyArray<InterventionType> = [
  'trt',
  'glp1',
  'peptide',
  'finasteride',
  'minoxidil',
  'retinoid',
  'accutane',
  'creatine',
  'ssri',
  'adhd_stimulant',
] as const;

export const INTERVENTION_TYPE_LABEL: Record<InterventionType, string> = {
  trt: 'TRT (Testosterone Replacement Therapy)',
  glp1: 'GLP-1 (semaglutide / tirzepatide)',
  // Single 'peptide' type covers the GH secretagogue family
  // (sermorelin, CJC-1295, ipamorelin, tesamorelin) — the specific
  // compound, dose, and frequency get captured on the intervention
  // row's free-text fields. Future ships may split this into multiple
  // types if additional peptide categories warrant distinct tracking.
  peptide: 'Peptide (GH secretagogue)',
  finasteride: 'Finasteride',
  minoxidil: 'Minoxidil',
  retinoid: 'Retinoid (tretinoin / retinol)',
  accutane: 'Accutane (isotretinoin)',
  creatine: 'Creatine',
  ssri: 'SSRI (antidepressant)',
  adhd_stimulant: 'ADHD stimulant',
};

export type InterventionStatus =
  | 'considering'
  | 'on_protocol'
  | 'paused'
  | 'off';

export const INTERVENTION_STATUSES: ReadonlyArray<InterventionStatus> = [
  'considering',
  'on_protocol',
  'paused',
  'off',
] as const;

export const INTERVENTION_STATUS_LABEL: Record<InterventionStatus, string> = {
  considering: 'Considering',
  on_protocol: 'On protocol',
  paused: 'Paused',
  off: 'Off',
};

export type PrescriberStatus =
  | 'no_prescription'
  | 'prescribed'
  | 'over_the_counter'
  | 'unknown';

export const PRESCRIBER_STATUSES: ReadonlyArray<PrescriberStatus> = [
  'no_prescription',
  'prescribed',
  'over_the_counter',
  'unknown',
] as const;

export const PRESCRIBER_STATUS_LABEL: Record<PrescriberStatus, string> = {
  no_prescription: 'No prescription',
  prescribed: 'Prescribed by a doctor',
  over_the_counter: 'Over the counter',
  unknown: 'Not sure',
};

export type Intervention = {
  id: string;
  user_id: string;
  type: InterventionType;
  status: InterventionStatus;
  prescriber_status: PrescriberStatus | null;
  dose: string | null;
  frequency: string | null;
  titration_schedule: string | null;
  notes: string | null;
  started_at: string | null;
  ended_at: string | null;
  next_check_in_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InterventionInsert = {
  type: InterventionType;
  status?: InterventionStatus;
  prescriber_status?: PrescriberStatus | null;
  dose?: string | null;
  frequency?: string | null;
  titration_schedule?: string | null;
  notes?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  next_check_in_at?: string | null;
};

export type InterventionUpdate = Partial<InterventionInsert>;

// =====================
// intervention_events
// =====================

export type EventType =
  | 'side_effect'
  | 'lab_result'
  | 'note'
  | 'dose_change'
  | 'check_in';

export const EVENT_TYPES: ReadonlyArray<EventType> = [
  'side_effect',
  'lab_result',
  'note',
  'dose_change',
  'check_in',
] as const;

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  side_effect: 'Side effect',
  lab_result: 'Lab result',
  note: 'Note',
  dose_change: 'Dose change',
  check_in: 'Check-in',
};

export type EventSeverity = 'mild' | 'moderate' | 'concerning';

export const EVENT_SEVERITIES: ReadonlyArray<EventSeverity> = [
  'mild',
  'moderate',
  'concerning',
] as const;

export const EVENT_SEVERITY_LABEL: Record<EventSeverity, string> = {
  mild: 'Mild',
  moderate: 'Moderate',
  concerning: 'Concerning',
};

export type InterventionEvent = {
  id: string;
  intervention_id: string;
  user_id: string;
  event_type: EventType;
  noted_at: string;
  event_at: string;
  severity: EventSeverity | null;
  title: string;
  body: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InterventionEventInsert = {
  event_type: EventType;
  title: string;
  body?: string | null;
  event_at?: string | null;
  severity?: EventSeverity | null;
};
