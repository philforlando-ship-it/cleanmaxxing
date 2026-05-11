// Types for /today's primary-action card (Phase A of the /today
// redesign). One PrimaryAction surfaces at a time; the picker in
// lib/today/primary-action-picker.ts decides which one.
//
// Discriminated union by `kind` so the renderer can pick voice /
// emphasis per category if it ever needs to (e.g., bucket 2 medical
// signals could get an amber tint; bucket 0 stepped-away gets a
// muted tone). v1 just uses the title/body/cta verbatim.

export type PrimaryActionKind =
  | 'stepped_away'             // bucket 0 — tracking_paused_at set
  | 'first_run_assessment'     // bucket 1 — has focus areas, no assessments yet
  | 'pattern_d_concerning'     // bucket 2 — concerning side effect unresolved
  | 'pattern_a_overdue'        // bucket 3 — daily/weekly action overdue
  | 'weekly_reflection_due'    // bucket 3b — Sunday + reflection not saved
  | 'pattern_a_current_stage'  // bucket 4 — current stage incomplete (in flow)
  | 'pattern_d_check_in'       // bucket 5 — prescriber check-in approaching
  | 'plan_stale_refresh'       // bucket 6 — assessment stale, refresh CTA
  | 'pattern_d_considering'    // bucket 7 — relevant focus area, no protocol row
  | 'circuit_breaker'          // bucket 8 — too-many-active-journeys
  | 'journey_maintenance'      // bucket 8b — at least one journey is in maintaining phase
  | 'all_quiet';               // bucket 9 — default

export type PrimaryAction = {
  kind: PrimaryActionKind;
  // Which journey this action belongs to. Null when it's not a
  // single-journey action (stepped_away, first_run with no journey
  // yet, all_quiet).
  journey_topic:
    | 'hair'
    | 'style'
    | 'facial_hair'
    | 'facial_structure'
    | 'nutrition'
    | 'strength'
    | 'cardio'
    | 'sleep'
    | 'skincare'
    | 'glp1'
    | 'trt'
    | null;
  title: string;
  body: string;
  cta_label: string;
  cta_href: string;
};
