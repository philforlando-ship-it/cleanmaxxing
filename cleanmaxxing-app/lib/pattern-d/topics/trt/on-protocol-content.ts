// TRT On Protocol content. Authored Mister P-voice copy. Reads as the
// framing material that sits alongside the user's tracked TRT row —
// not the tracking primitive itself.
//
// Voice posture: TRT is a long-term medical protocol, not a project
// with an end date. The framing emphasizes monitoring discipline,
// estrogen balance, and the fact that the lifestyle foundations
// (sleep / training / body comp) still do most of the work.

import type { OnProtocolContent } from '@/lib/pattern-d/shell-types';

export const TRT_ON_PROTOCOL: OnProtocolContent = {
  intro:
    'You\'re on it. The next year is about doing the protocol justice — making sure the labs stay in range, the foundations are pulling their weight, and the side-effect signals that matter get caught early. Below is what actually matters week to week, month to month. None of this replaces your prescriber\'s call.',

  sections: [
    {
      heading: 'The first three months — what to expect',
      body: [
        'Weeks 1–4: most users report nothing dramatic. Energy may bump up subtly. Libido may shift. Some users feel worse before they feel better — sleep can fragment as the body adapts to a new hormonal baseline.',
        'Weeks 4–8: this is your first follow-up bloodwork window. The labs tell you whether the protocol is delivering levels in the target range and whether anything (hematocrit, estradiol, lipids) is moving in a direction that needs attention. Do not skip this. The protocol is not "set and forget."',
        'Weeks 8–12: most users settle into a steady-state — improved recovery, more even mood, easier maintenance of training and body composition. This is what optimized natural function feels like. Expect the modest version of this, not a dramatic transformation. The men who get the biggest "wow" effect usually had the worst lifestyle baseline; men who already had it dialed get a smaller but real bump.',
      ],
    },
    {
      heading: 'The non-negotiables — labs, lift, sleep',
      body: [
        'Bloodwork is the load-bearing variable. Without it, you are guessing. Hematocrit (the percentage of blood that is red cells) is the headline thing — TRT thickens blood, and elevated hematocrit increases cardiovascular risk. The standard interventions when it climbs are blood donation, dose reduction, or both. Your prescriber drives this; your job is to make sure the labs actually get done.',
        'Lifting consistently is what makes TRT visible. The protocol restores the system; the system is wasted without the stimulus that uses it. 2–4 resistance training sessions per week is the floor. Cleanmaxxing\'s strength plan is the right substrate; if you don\'t have one, get one.',
        'Sleep is the other input. Sleep debt suppresses every benefit TRT delivers — energy, recovery, mood, libido. The TRT does not compensate for chronic sleep deprivation. If sleep is poor, fix that first; the protocol will work harder when it stops fighting upstream chaos.',
      ],
    },
    {
      heading: 'What to actually track',
      body: [
        'Lab cadence: at minimum total testosterone, free testosterone, estradiol, hematocrit, lipid panel, comprehensive metabolic panel — quarterly to biannually depending on your prescriber\'s protocol. Log lab dates and key values on this surface so you can see the trend over time.',
        'Energy and mood, weekly: subjective but useful. Persistent low energy or mood that doesn\'t track with lab improvements is worth flagging.',
        'Libido and erectile function: blunt indicators of whether the protocol is hitting the right physiological range. A noticeable improvement is expected; a persistent absence of improvement (or a regression) is worth raising with your prescriber — it can signal estradiol drift in either direction.',
        'Body composition: monthly weigh-in plus one body-comp data point (caliper / DEXA / honest mirror read). TRT should make easier the body composition you\'re already working toward, not produce one in isolation.',
        'Side effects on this surface: every flare logged with severity. Patterns over weeks matter more than individual days.',
      ],
    },
    {
      heading: 'When to call your prescriber, not wait it out',
      body: [
        'Hematocrit elevation that doesn\'t correct: persistent reading above your prescriber\'s threshold (commonly 52–54%) is a "now" call, not a "next visit" call. Untreated polycythemia is the most concrete cardiovascular risk on TRT.',
        'Persistent or worsening sleep apnea symptoms: TRT can worsen apnea in predisposed users. Loud snoring, witnessed pauses, daytime sleepiness despite adequate time in bed, neck circumference >17 inches, BMI >30 — any of these emerging or worsening on protocol is worth a sleep study conversation.',
        'Persistent breast tissue tenderness or swelling — possible high estradiol. Don\'t self-diagnose with an over-the-counter aromatase inhibitor; this is a labs + prescriber call.',
        'Joint pain and brain fog that emerge after starting: classic crashed-estrogen symptoms. If your prescriber is using an AI, this is the signal it may be over-dosed.',
        'Significant mood changes (irritability, depression, mania-adjacent agitation): worth raising. TRT effects on mood are mostly stabilizing but the variance is real.',
        'Any concerning event logged on the side-effect log gets a prescriber message that day. The "concerning" severity bucket exists specifically to stop you from rationalizing.',
      ],
    },
    {
      heading: 'Estrogen and AIs — the most common avoidable problem',
      body: [
        'The cleanest-physique-on-Instagram look is often produced by aggressive estrogen suppression. It is also the look of a guy with chronic joint pain, a flatlined libido, declining bone density, and degrading lipids. Crashed estrogen is one of the worst-feeling states on TRT and one of the most common.',
        'Symptoms of high and low estrogen overlap enough that you cannot guess. Bloodwork-driven estradiol monitoring is the only way to manage AI use correctly. If your prescriber wants you on an AI without estradiol labs to back it up, that is a flag.',
        'The right move when estradiol is elevated is usually a small AI dose, retest, and adjust — not a "let\'s blast it down to nothing." The goal is functional range, not minimum.',
      ],
    },
    {
      heading: 'Other things people miss',
      body: [
        'Body acne management: chest / back / shoulder breakouts are common at TRT doses for some men. Salicylic-acid or benzoyl-peroxide body wash, daily, is a simple intervention. If breakouts are cystic, see a dermatologist before scarring sets in.',
        'Fertility planning: if you might want children, talk to your prescriber about HCG concurrent with TRT, or about banking sperm now. TRT suppresses sperm production for most men on protocol; this is reversible in some users on coming off, not in others. Plan ahead.',
        'Hair loss acceleration: TRT raises DHT, which drives male-pattern baldness in genetically predisposed men. If hair matters, the hair journey on this app exists for the monitor / treat / transition decision. TRT does not cause hair loss in men who would not have lost it anyway, but it can accelerate the timeline.',
        'Travel and supply: keep a small buffer on hand. Running out mid-cycle and skipping a dose is the easiest unforced error on TRT. Some users keep a few weeks of inventory; some line up the prescription cadence to never cut it close.',
      ],
    },
    {
      heading: 'Where this is going',
      body: [
        'TRT is not a 12-week project. The default is "this is your protocol from now until you and your prescriber decide otherwise." Plan in years, not weeks.',
        'The men who get the most out of TRT over the long arc are the ones who treat the protocol as the thing that makes the rest of their work compound — sleep, training, body comp, stress management. The men who get the least out of it are the ones who treat TRT as the work itself.',
        'The Off-ramp surface exists if you and your prescriber ever decide to come off. Don\'t skip it — the post-TRT period is a real hormonal challenge that benefits from preparation rather than discovery.',
      ],
    },
  ],
};
