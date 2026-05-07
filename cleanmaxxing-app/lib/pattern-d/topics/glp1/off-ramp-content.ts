// GLP-1 Off-ramp content. Authored Mister P-voice copy. The most
// load-bearing surface in the GLP-1 journey — this is where the 66%
// rebound risk gets handled head-on rather than discovered the hard
// way. Read before stopping, not after.

import type { OffRampContent } from '@/lib/pattern-d/shell-types';

export const GLP1_OFF_RAMP: OffRampContent = {
  intro:
    'Stopping a GLP-1 is not a passive event. The biology is set up to regain weight unless the behavioral infrastructure was built during the medication window. This surface is the pre-flight checklist — read it before you stop, work the items, then use the "I\'ve stopped" button when the protocol actually ends. None of this replaces a conversation with your prescriber about the right exit for you.',

  sections: [
    {
      heading: 'The rebound briefing — read this first',
      body: [
        'From the STEP 1 trial extension and corroborated across multiple follow-up studies: roughly two-thirds of lost weight returns within a year of stopping. Lose forty pounds, expect twenty-five to twenty-eight back unless behavior holds the line.',
        'Why: ghrelin (hunger hormone) rebounds hard, satiety signals fall back to baseline, and resting metabolism is now lower because a lighter body burns fewer calories at rest. More hunger than before, fewer calories burned. This is the biological default.',
        'The rebound is not a willpower test you failed. It is the biology doing what biology does. The job of this surface is to give you the things that beat the default — and to be honest about what those are.',
      ],
    },
    {
      heading: 'The three habits that actually have to harden',
      body: [
        'Protein autopilot — hitting the floor (1.0g per pound or higher, the same target you held on protocol) every day without thinking about it, including on low-hunger days, on travel days, on days you don\'t feel like eating. If hitting protein still requires conscious effort and a checklist, the autopilot is not yet built. More time on the medication, with deliberate protein focus, is the answer — not stopping.',
        'Training cadence — 2–4 resistance sessions per week as a settled routine, not a goal. The workouts are not optional. They are the thing that holds muscle (and resting metabolism) when the appetite-control window closes.',
        'Hunger tolerance — the willingness to feel hunger and not immediately resolve it. The medication has been doing this work for you. Without it, hunger comes back loud, fast, and persistent. The skill of "feeling hungry, eating later, eating the planned meal" has to be re-learned (or learned for the first time) before stopping. If you have not deliberately practiced this on the medication, you have not built it.',
      ],
    },
    {
      heading: 'How to know you\'re actually ready',
      body: [
        'You\'ve been at goal weight (or close to it) for at least 8–12 weeks. Stopping while still actively losing is stopping mid-trajectory; the system never had a chance to find a steady state.',
        'Protein and training have been on autopilot for at least 8 weeks — meaning you hit them on bad days, not just good ones.',
        'You have a realistic plan for what the first three post-medication months look like. Vague intent ("I\'ll keep doing what I\'m doing") is not a plan; specific commitments (the same training schedule, the same protein floor, weekly weigh-ins, monthly check on this surface) are.',
        'You\'ve had the exit conversation with your prescriber and you know what their taper looks like — sudden cliff, gradual step-down, or maintenance-dose-then-stop.',
      ],
    },
    {
      heading: 'Taper vs. cliff',
      body: [
        'Some prescribers taper the dose over weeks; others stop at the last scheduled dose. The pharmacokinetic difference is not as load-bearing as the framing — the appetite control fades on either path within 3–6 weeks of the last dose, regardless of taper schedule.',
        'What matters more is the rate of behavior consolidation. The taper window (or the immediate post-stop weeks) is when hunger is rising and the habits get stress-tested. Treating those weeks as the most important training months of the whole year — high vigilance on the autopilots — is the right posture.',
        'Either path, the prescriber\'s call is the call. Don\'t taper yourself off based on internet read.',
      ],
    },
    {
      heading: 'The first three months off — what to expect',
      body: [
        'Weeks 1–3: appetite still suppressed by residual drug effect. Most users feel like nothing changed. This is the most dangerous window because the false-confidence read ("I don\'t even need this") sets up a blindside.',
        'Weeks 3–8: appetite returns. Food noise comes back. Old reward responses to high-calorie food re-emerge. This is when the autopilots are tested. If you find yourself eating reactively and skipping training, the autopilots were not built — re-engage with your prescriber about a maintenance dose or a structured re-start.',
        'Weeks 8–16: equilibrium. You are now operating without the medication and the trajectory of the next year is being set. Weight may drift up modestly even with good habits — that is normal; the body is finding its new natural set point. A 3–5 lb drift is fine. A 10+ lb drift is a signal that the habits are not holding.',
      ],
    },
    {
      heading: 'If the rebound starts',
      body: [
        'Catching it early matters more than anything else. A 5 lb rebound caught at month 2 with a re-tightened protein and training response is recoverable. A 20 lb rebound at month 9 reads as a return to baseline and is much harder to reverse.',
        'Re-starting the medication is a legitimate option — and is not a failure. Many users cycle on and off across years. The decision is between you and your prescriber. The data on cycling is thinner than the data on continuous use, but the rebound after a re-stop is similar to the first rebound — meaning the same habit work applies.',
        'The non-medication response to a real rebound: re-tighten protein and training first, give it 4 weeks, see if the trajectory changes. If it doesn\'t, re-engage with your prescriber. Do not white-knuckle a sustained rebound for six months on principle.',
      ],
    },
    {
      heading: 'What "off" means in this app',
      body: [
        'When you press the button below, your intervention status flips to off. The Off-ramp surface stays available — you can come back to read these sections any time. Your nutrition and strength plans return to their non-GLP-1 framing (different protein guidance, different caloric framing, no GLP-1 modifier on the report).',
        'The intervention row stays on file as history. Restarting later is a fresh row, not a re-activation — there is value in the history of "first cycle, ran X months, paused, second cycle, etc."',
      ],
    },
  ],

  endProtocolButtonLabel: 'I\'ve stopped the medication',
};
