// Pattern D Considering content. Authored Mister P-voice copy drawn
// from POV 27 (hair-loss-treatments) and POV 08 §"Hair Loss Prevention"
// + §"Community Reality Check". Static, not LLM-generated — Pattern D
// content is medically sensitive and the framing needs tight control.
// (See `project_journey_redesign_framework.md` §Pattern D for the
// medical/legal posture this honors.)
//
// Hard constraints honored in the copy:
// - No prescribing
// - No specific dosing recommendations
// - No source guidance (no vendor names, no telehealth steering beyond
//   the "legitimate medical routes" framing the POV already uses)
// - Side-effect framing matches POV 08's clinical-data-first stance
//   without dismissing the real-world experiences

export type ConsideringSection = {
  heading: string;
  body: string[];
};

export const PATTERN_D_CONSIDERING_INTRO = `You picked Treat in Stage 2. Before anything else: this is a multi-month commitment to a daily medication routine, and the experience in months 5–10 often gets visibly worse before it gets better. Read this whole surface before booking the appointment. None of what's below replaces a conversation with a physician.`;

export const PATTERN_D_CONSIDERING_SECTIONS: ConsideringSection[] = [
  {
    heading: 'The two tools and what they actually do',
    body: [
      'Finasteride blocks DHT — the hormone that miniaturizes follicles over time. It addresses the root cause. Best at stopping further loss; some regrowth at the crown and mid-scalp.',
      'Minoxidil is topical. It increases blood flow to follicles and extends the hair-growth phase. Best at thickening what you have and adding visible density. Doesn\'t fix the underlying process.',
      'Together they are synergistic — finasteride preserves, minoxidil enhances. Most clinical guidance treats them as a stack, not as competitors.',
    ],
  },
  {
    heading: 'Realistic outcomes',
    body: [
      'Finasteride: roughly 80–90% of users see stopped loss or some improvement in clinical studies. Around 65% see measurable regrowth, mostly at the crown and mid-scalp. Less effective at the hairline.',
      'Minoxidil: 60–70% see visible improvement or slowed loss. The wins are density, not new coverage on bald scalp.',
      'Combined effectiveness is meaningfully higher than either alone. The most reliable outcome of the stack is preservation, not regrowth — go in expecting to keep what you have.',
    ],
  },
  {
    heading: 'Side effects, honestly',
    body: [
      'Finasteride: clinical studies report sexual side effects (reduced libido, erectile dysfunction, decreased semen volume) in roughly 1–3% of users. Many cases are reversible upon stopping. The majority experience nothing. Mood changes are reported anecdotally but not consistently in controlled studies.',
      'Reddit and forum discourse over-represents negative experiences. That doesn\'t make the experiences fake — it makes the prevalence estimate unreliable. The honest posture: side effects are possible, uncommon, monitorable, and worth a conversation with your doctor before starting and again at any sign of trouble.',
      'Minoxidil: scalp irritation, dryness, and an initial shedding phase in the first few weeks. The shedding is part of how it works (weak hairs cycle out before stronger ones grow in) and is the most common reason people quit prematurely.',
    ],
  },
  {
    heading: 'Prepare for the doctor conversation',
    body: [
      'Bring photos. Top-down, hairline, side profile, all under consistent lighting. Date them. The doctor needs to see what you\'re working with, not what you say you see.',
      'Be specific about the timeline: when did you first notice, how fast has it changed, what does your family history look like.',
      'Ask about telehealth options if cost or access is a barrier. Several legitimate prescription routes exist; the doctor or a dermatologist can name the ones that fit your situation.',
      'Ask what you should do if side effects show up — at what point to call, what to monitor, what would be a stop signal.',
      'Ask about labs. Most fin prescriptions don\'t require ongoing labs but some doctors prefer a baseline. Better to know their stance up front.',
    ],
  },
  {
    heading: 'The panic timeline (read this twice)',
    body: [
      'Months 1–2: possible initial shedding phase. This is normal and expected, not a sign of failure.',
      'Months 3–6: early improvement begins, slowing of visible loss.',
      'Months 6–12: noticeable results in most responders.',
      'Around months 5–10 is when the largest number of people quit — the shedding hasn\'t fully resolved, the regrowth hasn\'t fully shown up, and the daily mirror reads as failure. The 12-to-24-month photo comparison is the only reliable measure of whether it\'s working.',
      'If you\'re going to do this, commit to a year minimum before judging the result. Anything shorter is judging an incomplete experiment.',
    ],
  },
];

export const PATTERN_D_ON_PROTOCOL_PLACEHOLDER_INTRO = `You\'re on protocol — either you marked treatment as started, or fin/min is on your profile already. The full On Protocol surface (titration tracking, side-effect log, labs cadence, prescriber check-in reminders) is on the roadmap. For now, this is between you and your prescriber.`;

export const PATTERN_D_ON_PROTOCOL_PLACEHOLDER_NOTES = [
  'Photo every quarter, same angles, same lighting.',
  'If side effects show up, the answer is "talk to your prescriber," not "tough it out" and not "quit immediately."',
  'The 12-to-24-month comparison is the only reliable measure. Don\'t judge the experiment from month 4.',
];
