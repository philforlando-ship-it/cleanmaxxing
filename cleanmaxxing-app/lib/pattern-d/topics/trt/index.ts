// TRT Pattern D topic config. The /plan/trt page reads this and hands
// content to the generic Pattern D shell components in
// components/pattern-d/.

import type { PatternDTopicConfig } from '@/lib/pattern-d/shell-types';
import { TRT_CONSIDERING } from './considering-content';
import { TRT_ON_PROTOCOL } from './on-protocol-content';
import { TRT_OFF_RAMP } from './off-ramp-content';

export const TRT_TOPIC: PatternDTopicConfig = {
  topic: 'trt',
  title: 'TRT protocol',
  shortName: 'TRT',
  povSlug: '03-testosterone-steroids',
  // No /today auto-surface gate. TRT is high-stakes medical territory
  // and "Considering TRT?" is the wrong nudge to push at someone who
  // simply picked a fitness focus — too easily misread as recommendation.
  // The /plan/trt page is reachable via direct URL and via Mister P
  // chat referral. /today only surfaces TRT once an active intervention
  // exists (concerning side effect / prescriber check-in cases).
  focusAreaGate: null,
  considering: TRT_CONSIDERING,
  onProtocol: TRT_ON_PROTOCOL,
  offRamp: TRT_OFF_RAMP,
  // TRT is prescription-only via legitimate routes. The form omits
  // 'over_the_counter' since it doesn't apply; 'no_prescription'
  // remains as the user's honest option if they're using a non-medical
  // route — Cleanmaxxing's posture is to record what the user reports
  // without endorsing the route.
  startFormPrescriberStatuses: ['prescribed', 'no_prescription', 'unknown'],
};
