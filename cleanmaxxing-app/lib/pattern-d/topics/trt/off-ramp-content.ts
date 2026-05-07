// TRT Off-ramp content. Authored Mister P-voice copy. Most TRT users
// don't come off — the protocol is designed as continuous external
// support — but coming off is a real possibility (life situation
// change, fertility goal, side-effect intolerance, prescriber call).
// The off-ramp here is the structured handoff back to natural
// production, with honest framing about how uncertain that recovery
// is.
//
// Key difference from GLP-1 off-ramp: there is no "rebound weight"
// equivalent. The risk on coming off TRT is hypogonadal symptoms +
// uncertainty about whether natural production will resume.

import type { OffRampContent } from '@/lib/pattern-d/shell-types';

export const TRT_OFF_RAMP: OffRampContent = {
  intro:
    'Coming off TRT is not a passive event. Your body has not been making its own testosterone since the day you started, and restarting that production — when it restarts at all — takes months. This surface is the pre-stop checklist. Read it before you stop, work the items, then use the "I\'ve stopped" button when the protocol actually ends. None of this replaces a conversation with your prescriber about the right exit for you.',

  sections: [
    {
      heading: 'The honest framing — what coming off TRT actually means',
      body: [
        'When you started TRT, your hypothalamus stopped sending the LH and FSH signals that tell your testes to produce testosterone. The longer and higher-dose the exposure, the deeper that suppression. After stopping, recovery of natural production is a months-to-years process — and is not guaranteed to be complete.',
        'Best case: function returns to or near pre-TRT baseline within 6–12 months with structured prescriber support. Moderate case: partial recovery with a lower baseline than before — often enough that the user functions but doesn\'t feel optimal. Worst case: long-term or permanent hypogonadism that ultimately means going back on TRT (or living with low levels).',
        'Probability of clean recovery decreases with: longer time on protocol, higher dosing, older age at stop, no fertility-preservation protocol concurrent with TRT (HCG keeps the testes signaled). The 50-year-old who ran TRT for 8 years has a different recovery picture than the 32-year-old who ran it for 18 months with HCG. Both should plan for the moderate-to-worst case, not the best case.',
      ],
    },
    {
      heading: 'Why someone comes off — the legitimate reasons',
      body: [
        'Fertility timing — you and a partner are trying to conceive, and HCG concurrent with TRT didn\'t work or wasn\'t in place. The fertility window often demands coming off entirely.',
        'Side-effect intolerance — persistent issues that haven\'t resolved with dose adjustment, AI calibration, or other interventions.',
        'Lifestyle change — leaving a healthcare system or geography where TRT access is reliable, financial constraint, or a long-term life change that means the monitoring won\'t happen.',
        'Prescriber call — they recommend a structured stop based on your labs and overall picture.',
        'Reasons that are NOT good reasons to come off: a friend told you to, you read a podcast saying TRT is "natural disempowerment," you want to "give your body a break" (this is not how endocrine physiology works), you want to try a steroid cycle (different territory and the wrong way to think about it).',
      ],
    },
    {
      heading: 'Before you stop — what should be in place',
      body: [
        'A prescriber who is on board with the stop and has a recovery protocol. This is usually a structured PCT-style approach using clomiphene or similar to nudge the HPG axis to restart, sometimes layered with HCG. It is not "stop the injections, see what happens."',
        'Baseline labs at the stop point so you have a reference for tracking recovery — total testosterone, free testosterone, LH, FSH, estradiol, hematocrit, lipids.',
        'A realistic plan for the first 6 months. Hypogonadal symptoms (fatigue, low libido, mood dip, reduced muscle retention, easier fat gain) are expected during the recovery window. Knowing this is coming, planning training and life around it, and having support — partner, friends, prescriber — beats discovering it the hard way.',
        'Honesty about whether the lifestyle foundations are in place. If sleep, body comp, and training were on the upper-natural side BEFORE TRT, recovery to a livable baseline is more likely. If TRT was compensating for a poor lifestyle baseline, coming off without fixing the upstream variables is going to produce a much rougher landing.',
      ],
    },
    {
      heading: 'The first six months off — what to expect',
      body: [
        'Weeks 1–4: residual exogenous testosterone fades depending on what you were on. Long esters (cypionate, enanthate) stay active in the body for weeks. PCT-style restart medications, if your prescriber is using them, typically start once the exogenous load has dropped enough.',
        'Weeks 4–12: the hypogonadal window. Energy drops, libido drops, recovery worsens, mood often dips. This is the hardest part. The temptation to bail and restart TRT is highest here. The data on whether restart medications help most users restart faster is meaningful but not definitive — your prescriber\'s call.',
        'Weeks 12–24: lab recheck window. Where is testosterone trending? Is LH responding? If recovery is happening, this is where it shows. If the labs show no movement, that is information — it doesn\'t mean recovery won\'t happen, but it shifts the conversation toward "what does the next 6 months look like" rather than "wait it out."',
        'Beyond 6 months: if you\'re not at a livable baseline, the conversation with your prescriber is whether to go back on TRT (often the right call), continue the recovery protocol, or accept the current baseline. There is no medal for white-knuckling sustained low testosterone; if recovery is incomplete and life is suffering for it, restarting TRT is a legitimate decision.',
      ],
    },
    {
      heading: 'The habits that have to harden',
      body: [
        'Lifting consistency — 2–4 sessions per week as a settled routine, not a goal. The recovery window is when muscle mass is most at risk; training is what holds it.',
        'Sleep discipline — 7–9 hours, consistent schedule. Sleep is the single highest-leverage natural testosterone input. The men who recover fastest tend to be the ones whose sleep is genuinely solid.',
        'Body fat management — keeping body fat in a healthy range (roughly 15–20% for most men) reduces aromatization (testosterone-to-estrogen conversion) and supports natural production. Carrying excess body fat suppresses testosterone independently.',
        'Stress management and alcohol — chronic stress and high alcohol load both suppress testosterone. The recovery window is the wrong time to be carrying either.',
        'These are the same lifestyle variables that drive natural testosterone for men who never used TRT. The recovery window is where they matter most acutely; the long arc is where they hold whatever recovery you achieve.',
      ],
    },
    {
      heading: 'If recovery doesn\'t happen the way you wanted',
      body: [
        'Restarting TRT after a failed recovery is a legitimate medical decision and not a failure. Many men cycle on and off TRT across decades; others end up on it lifelong from the first start. The decision is between you and your prescriber, anchored to labs and how you actually feel — not to ideology about whether TRT is "natural."',
        'The next-best framing if recovery is partial: you have a lower natural baseline now than before, but the lifestyle foundations (sleep / training / body comp / stress) still meaningfully move that baseline. Optimizing those, even at a lower set point, is the long arc. The men who do this work the hardest get the most out of whatever level they\'re at.',
        'A note on second cycles: this is not a "I came off, give it a year, run another cycle" situation — TRT is not a steroid cycle. Coming off is the rare event, not the cycle norm. If you come off and then go back on, you are starting a new lifelong commitment; that\'s fine if it\'s what you and your prescriber decide, but the framing should be honest.',
      ],
    },
    {
      heading: 'What "off" means in this app',
      body: [
        'When you press the button below, your TRT intervention status flips to off. The Off-ramp surface stays available — you can come back to read these sections any time. Mister P\'s prompt context returns to the non-TRT framing for nutrition, strength, and other journeys (different recovery assumptions, no TRT modifier on the report).',
        'The intervention row stays on file as history. If you ever restart, that\'s a fresh row, not a re-activation — there is value in the history of "first run, X months, off, second run starting."',
      ],
    },
  ],

  endProtocolButtonLabel: 'I\'ve stopped TRT',
};
