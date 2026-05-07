// Shared content shapes for the Pattern D shell. Per-topic content
// modules (e.g. lib/pattern-d/topics/glp1/considering-content.ts)
// export values matching these types; the generic section components
// in app/(app)/plan/<topic>/ render them.
//
// The shapes intentionally mirror the way hair's
// pattern-d-considering-content.ts is structured (heading + body
// arrays). Hair's existing pattern-d-considering-card stays
// untouched — generalization will be lifted out of the second example
// (GLP-1) once a third Pattern D topic ships and the patterns are
// proven across two cases.

import type { InterventionType, PrescriberStatus } from '@/lib/interventions/types';

// A short authored block — heading + paragraph(s) of body. Used for
// every authored-content section across all three Pattern D phases.
export type ContentSection = {
  heading: string;
  body: string[];
};

// Considering — pre-protocol decision support.
//
// `intro` is a short opening paragraph below the section heading.
// `sections` is the meat of the educational content: mechanism,
//   realistic outcomes, side-effect honesty, doctor conversation prep,
//   and any topic-specific framing (e.g. GLP-1's "what happens when
//   you stop" preview, or hair's "panic timeline").
// `startProtocolPrompt` is the copy above the "I've started" CTA.
// `allowedStartTypes` is the InterventionType list the start form
//   should let the user pick from. For GLP-1 it's just ['glp1'];
//   for the future hair-meds Pattern D it'd be ['finasteride',
//   'minoxidil'] like the existing hair card uses today.
export type ConsideringContent = {
  intro: string;
  sections: ContentSection[];
  startProtocolPrompt: string;
  allowedStartTypes: InterventionType[];
  startProtocolButtonLabel: string;
};

// On Protocol — guidance the user reads alongside their tracked
// intervention(s). Not the tracking primitives themselves (those live
// on the intervention rows + intervention_events) — this is the
// reading material that frames what to track and when to act.
//
// `intro` opens the surface.
// `sections` carries titration phases, what-to-track, when-to-call,
//   paired-behavior asks, all in topic-specific framing.
export type OnProtocolContent = {
  intro: string;
  sections: ContentSection[];
};

// Off-ramp — exit planning.
//
// `intro` opens the surface.
// `sections` carries the rebound-risk briefing, habits-to-harden,
//   regain-protocol-if-it-happens, and topic-specific exit signals.
// `endProtocolButtonLabel` is the copy on the "I've stopped" CTA
//   (which flips intervention.status to 'off').
export type OffRampContent = {
  intro: string;
  sections: ContentSection[];
  endProtocolButtonLabel: string;
};

// Wraps everything a topic provides in one config the page consumes.
// Adding a Pattern D topic means writing the three content modules
// and exporting one PatternDTopicConfig from a topics/<topic>/index.ts.
export type PatternDTopicConfig = {
  // Slug used in URL and in routes. Kebab-case.
  topic: 'glp1' | 'trt' | 'peptides' | 'fat_burner' | 'hair_meds';

  // The display title rendered on the page (and on /today tile copy).
  // Examples: "GLP-1 protocol", "Testosterone Replacement protocol".
  title: string;

  // Short subtitle for /today tile and for the page header.
  shortName: string;

  // POV slug for the grounding content. The shell does not render the
  // POV directly — it's an authoritative source for the authored
  // content modules and a destination for "read the full POV" links.
  povSlug: string;

  // Which user_profile.focus_areas value gates this Pattern D surface
  // on /today. If null, the surface is visible only when the user has
  // an active intervention of one of the allowed types.
  focusAreaGate: string | null;

  considering: ConsideringContent;
  onProtocol: OnProtocolContent;
  offRamp: OffRampContent;

  // Default prescriber-status options shown in the start-protocol form.
  // OTC-eligible types may include 'over_the_counter'; prescription-only
  // types should omit it from the form.
  startFormPrescriberStatuses: PrescriberStatus[];
};
