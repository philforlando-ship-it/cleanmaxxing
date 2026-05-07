// GLP-1 Pattern D topic config. The /plan/glp1 page reads this and
// hands content to the generic Pattern D shell components.

import type { PatternDTopicConfig } from '@/lib/pattern-d/shell-types';
import { GLP1_CONSIDERING } from './considering-content';
import { GLP1_ON_PROTOCOL } from './on-protocol-content';
import { GLP1_OFF_RAMP } from './off-ramp-content';

export const GLP1_TOPIC: PatternDTopicConfig = {
  topic: 'glp1',
  title: 'GLP-1 protocol',
  shortName: 'GLP-1',
  povSlug: '02-glp1s',
  // /today surfaces the GLP-1 tile when body_composition is in the
  // user's focus areas OR when an active intervention exists. The
  // page itself is reachable directly any time.
  focusAreaGate: 'body_composition',
  considering: GLP1_CONSIDERING,
  onProtocol: GLP1_ON_PROTOCOL,
  offRamp: GLP1_OFF_RAMP,
  // GLP-1s are prescription-only in legitimate routes. Compounded
  // versions exist but are not endorsed; the form omits
  // 'over_the_counter' since that doesn't apply, and 'no_prescription'
  // remains as the user's honest option if they're using one of those
  // grayer routes (the app's posture stays neutral, just records what
  // the user reports).
  startFormPrescriberStatuses: ['prescribed', 'no_prescription', 'unknown'],
};
