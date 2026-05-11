// Peptides (GH secretagogues) Pattern D topic config. The /plan/peptides
// page reads this and hands content to the generic Pattern D shell
// components in components/pattern-d/.
//
// Scope: sermorelin / CJC-1295 + ipamorelin / tesamorelin. Other peptide
// categories (BPC-157, TB-500, GHK-Cu, 5-amino-1MQ, melanotan, selank/
// semax) are not covered by this topic — they may ship as separate
// Pattern D topics later if user demand justifies the content authoring.

import type { PatternDTopicConfig } from '@/lib/pattern-d/shell-types';
import { PEPTIDES_CONSIDERING } from './considering-content';
import { PEPTIDES_ON_PROTOCOL } from './on-protocol-content';
import { PEPTIDES_OFF_RAMP } from './off-ramp-content';

export const PEPTIDES_TOPIC: PatternDTopicConfig = {
  topic: 'peptides',
  title: 'Peptide protocol (GH secretagogue)',
  shortName: 'Peptides',
  povSlug: '04-peptides',
  // No /today auto-surface gate. Peptides are advanced-tools territory
  // and "Considering peptides?" is the wrong nudge to push at someone
  // who picked a body-composition or strength focus — too easily misread
  // as recommendation when POV 04's posture is that most people should
  // not engage with this category yet. The /plan/peptides page is
  // reachable via direct URL and via Mister P chat referral. /today
  // surfaces peptides only once an active intervention exists (concerning
  // side-effect / lab-due cases via the standard Pattern D event surface).
  focusAreaGate: null,
  considering: PEPTIDES_CONSIDERING,
  onProtocol: PEPTIDES_ON_PROTOCOL,
  offRamp: PEPTIDES_OFF_RAMP,
  // Peptides in this category have a wider sourcing reality than TRT:
  // tesamorelin has an FDA-approved indication (HIV-associated visceral
  // lipodystrophy) and so 'prescribed' is the clean path. CJC-1295,
  // ipamorelin, and sermorelin are off-label / compounded / research-
  // chemical depending on route. All three prescriber-status options
  // apply; 'over_the_counter' is excluded because no compound in scope
  // is legitimately OTC.
  startFormPrescriberStatuses: ['prescribed', 'no_prescription', 'unknown'],
};
