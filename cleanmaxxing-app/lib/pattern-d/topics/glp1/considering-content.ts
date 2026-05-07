// GLP-1 Considering content. Authored Mister P-voice copy grounded in
// POV 02 (02-glp1s.md). Static, not LLM-generated — Pattern D content
// is medically sensitive and the framing needs tight control.
//
// Hard constraints honored in the copy (per project_journey_redesign_framework.md
// §Pattern D medical/legal posture):
// - No prescribing or specific dose recommendations
// - No telehealth steering or vendor endorsement
// - Brand names used for context only (the way the POV uses them),
//   never as recommendations
// - "Between you and your prescriber" as the hard line
// - No path that implies sourcing guidance for non-prescription routes

import type { ConsideringContent } from '@/lib/pattern-d/shell-types';

export const GLP1_CONSIDERING: ConsideringContent = {
  intro:
    'GLP-1 medications (semaglutide, tirzepatide — Ozempic, Wegovy, Mounjaro, Zepbound) are currently the most effective non-surgical weight loss tool available. They are also a multi-month commitment that comes with a documented rebound risk most discussions skip. Read this whole surface before booking the appointment. None of what follows replaces a conversation with a prescriber.',

  sections: [
    {
      heading: 'What they actually do',
      body: [
        'GLP-1 receptor agonists mimic a natural hormone that affects multiple systems at once. The headline effect is neurological: they reduce "food noise" — the constant background preoccupation with food — and decrease the dopamine reward response to high-calorie foods. Users frequently describe it as "I just don\'t care about food anymore."',
        'They also slow gastric emptying (food sits in the stomach longer, producing early fullness) and improve insulin sensitivity (fewer blood-sugar spikes, fewer hunger cycles). In responders, average daily intake drops by 500–1,000 calories without effort. That is the entire weight-loss mechanism — a sustained, effortless deficit. There is no metabolic magic.',
        'Semaglutide activates GLP-1 receptors only. Tirzepatide activates both GLP-1 and GIP — the dual mechanism is meaningfully stronger. When someone says they are "on Ozempic," they are frequently actually on a tirzepatide product or a compounded version of either.',
      ],
    },
    {
      heading: 'Realistic outcomes',
      body: [
        'Average weight loss in clinical trials is roughly 10–15% of body weight at Ozempic dosing ranges, 15–22% at Wegovy (higher-dose semaglutide), and 20–25% or more at Mounjaro/Zepbound (tirzepatide) doses. Top responders go above that. Non-responders exist — perhaps 10–15% of users see modest results regardless of dose.',
        'These numbers come from people who took the medication consistently for around a year. Stopping early gives less of the result; stopping at any point starts the rebound clock.',
      ],
    },
    {
      heading: 'The part most discussions skip — what happens when you stop',
      body: [
        'From the STEP 1 trial extension (one of the most cited): after stopping semaglutide, approximately two-thirds of lost weight returned within a year. Roughly 66% of the loss came back. Lose thirty pounds, expect twenty back unless behavioral infrastructure was built during the medication window.',
        'This is not a discipline failure. The biology is powerful. Ghrelin (hunger hormone) rebounds hard, satiety signals fall back to baseline, and metabolism is now lower than before because a lighter body burns fewer calories at rest. More hunger than before, fewer calories burned. That is the rebound recipe.',
        'The honest framing of the decision: GLP-1s rent appetite control. If you do not use the rented window to install habits, you give the body back — with interest — when you stop.',
      ],
    },
    {
      heading: 'The two aesthetic risks',
      body: [
        '"Ozempic body": without structured resistance training and adequate protein, up to 25–40% of the weight lost on GLP-1s can be lean mass rather than fat. Smaller overall, but softer, with worse proportions. The medication suppresses appetite indiscriminately, so protein intake usually drops below what is needed to preserve muscle unless actively managed. Lifting and protein targets are non-negotiable for anyone using these with appearance goals.',
        '"Ozempic face": rapid fat loss in the face produces a hollow or aged appearance because skin elasticity lags volume loss. Worse for users who were already lean before starting, older users with less collagen, and anyone losing fast rather than steady. The fix is the same as for any fat loss — controlled pace, adequate protein, resistance training.',
      ],
    },
    {
      heading: 'Side effects, honestly',
      body: [
        'Common (10–30% of users): nausea (especially in the first weeks of dose escalation), vomiting, constipation, fatigue. These usually improve with time and titration adjustment.',
        'Less common but real: gallstones (rapid fat loss raises gallstone risk regardless of method; GLP-1s accelerate this), pancreatitis (rare but serious — any persistent abdominal pain warrants medical evaluation), possible thyroid tumor risk flagged in animal studies (human data still debated but on warning labels).',
        'Severe or persistent abdominal pain, persistent vomiting that prevents hydration, or any new or worsening depressive symptoms are reasons to call the prescriber, not wait it out.',
      ],
    },
    {
      heading: 'The three strategies — pick one going in',
      body: [
        'Long-term use: treat the medication like a chronic-condition prescription, the way blood pressure meds are maintained indefinitely. Weight is held as long as the medication continues. Significant ongoing cost; no native dietary control built; medically legitimate for some people.',
        'Temporary use with habit installation: use the appetite-control window to install protein targets, training consistency, and hunger-tolerance, then taper off with the infrastructure in place. This is the high-quality outcome and the one Cleanmaxxing builds around.',
        'Use, stop, rebound: no meaningful habit change during treatment, weight loss happens, medication stops, two-thirds returns within a year. This is the most common real-world outcome — what the regain numbers reflect. It is the path you avoid by reading this section twice.',
      ],
    },
    {
      heading: 'Prepare for the prescriber conversation',
      body: [
        'Be specific about why now and what you have tried. Hunger-driven failure to maintain a deficit is a different conversation than "I want to lose 10 pounds for an event."',
        'Ask which medication they prescribe and why. Semaglutide and tirzepatide produce different result sizes. Some prescribers default to one; some pick based on insurance coverage. Either is fine — knowing which is on the table matters.',
        'Ask about side-effect monitoring. At what point should you call? What would be a stop signal? What labs (if any) do they want at baseline and during treatment?',
        'Ask about the exit. What does the taper look like in their practice? When you stop, what monitoring continues?',
        'Cleanmaxxing does not prescribe and does not steer toward any sourcing route. The prescriber relationship is yours to own — the legitimacy of that route is part of what you are paying for.',
      ],
    },
    {
      heading: 'Strong candidate vs. poor candidate',
      body: [
        'Strong: clearly overweight (around 20% body fat or higher, not just slightly soft); documented history of failed fat-loss attempts driven by hunger-control failure; committed to lifting and protein during the treatment period; has a realistic plan for post-medication maintenance.',
        'Poor: already lean or close to goal body composition (risk of looking worse, not better); using it for speed without a plan for sustainability; not training and not managing protein (will produce the Ozempic body); no plan for what happens when the medication stops.',
        'If you are reading this and you are in the "poor candidate" column on more than one line, the answer is not no — it is "not yet, and not without changing the column you are in." Lifting consistency and protein habits installed before starting do not waste any time; they make the medication window meaningfully more productive.',
      ],
    },
  ],

  startProtocolPrompt:
    'Once you’ve actually started — prescription filled, on the dosing schedule — mark it here. Tracking starts from there.',

  startProtocolButtonLabel: 'I’ve started a GLP-1',

  // Only one type for this surface — start form is single-select.
  allowedStartTypes: ['glp1'],
};
