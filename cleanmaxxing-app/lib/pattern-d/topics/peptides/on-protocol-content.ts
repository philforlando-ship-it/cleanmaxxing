// Peptides (GH secretagogues) On Protocol content. Authored Mister P-voice
// copy. Sits alongside the user's tracked peptide intervention row.
//
// Voice posture: GH secretagogues are not a project where you feel
// dramatic effects fast. The framing emphasizes single-compound
// discipline, honest tracking against a pre-committed window, and the
// reality that foundations are still doing most of the work.

import type { OnProtocolContent } from '@/lib/pattern-d/shell-types';

export const PEPTIDES_ON_PROTOCOL: OnProtocolContent = {
  intro:
    'You\'re running it. The next four to eight weeks are the trial window — give the compound a fair test, track honestly against the outcome you committed to before starting, and resist the urge to add anything else until you have a clear read on this one. The variables that determine whether you get a result from this protocol are mostly upstream of the compound itself.',

  sections: [
    {
      heading: 'The first four weeks — what to expect',
      body: [
        'Week 1-2: most users notice a sleep change first on the CJC-1295/ipamorelin stack — deeper, more restorative sleep within the first two weeks is the most reliable effect in this category. Body composition, recovery, and energy take longer to register. If you\'re on tesamorelin, the timeline is slower; nothing dramatic in the first month, with waist circumference shifts starting in the 8-12 week window.',
        'Mild side effects in the first two weeks are common and usually transient — slight injection-site reaction, occasional headache, mild water retention in hands or feet, mild tingling in extremities. These typically settle as the system adapts. Persistent or escalating versions of any of these are worth raising with your prescriber.',
        'Sleepiness at bedtime is a reported effect on the CJC/ipa stack, which most users consider a benefit when the protocol is timed before sleep. If your dosing window is earlier in the day, daytime drowsiness suggests the timing should shift.',
      ],
    },
    {
      heading: 'Hold the line on single-compound discipline',
      body: [
        'The most common failure mode in this window is adding a second compound before you have a clean read on the first one. A peptide forum will tell you about three compounds you could stack on top of what you\'re running. Resist this. Adding a second compound four weeks into the first compound\'s trial means you no longer know what either one is doing.',
        'Stacks are appropriate after each component has been individually evaluated, not as a starting position. The protocol you\'re running now is the test of one specific compound at one specific dose. Treat it as that.',
        'If the first compound is producing nothing detectable at the end of its trial window, the right move is to end this protocol and move on — not to add a second peptide hoping the combination will produce what the first one couldn\'t.',
      ],
    },
    {
      heading: 'What to actually track',
      body: [
        'Sleep depth and quality — daily, at least subjectively. This is the effect most likely to register first. If you\'re using a wearable, the HRV / deep-sleep / REM patterns are real signal here.',
        'Recovery between sessions — soreness duration, joint feel, perceived readiness on subsequent training days. Track against a pre-protocol baseline if you can.',
        'Body composition — waist circumference at a fixed measurement point (navel) weekly, body weight 2-3x per week, and one photo per month. Tesamorelin specifically targets visceral fat, so waist circumference will move before scale weight does.',
        'Energy and mood — weekly subjective rating. Persistent low energy or a clear regression versus pre-protocol is worth flagging.',
        'Side effects on this surface — log each event with severity. Patterns over weeks matter more than individual days.',
        'Lab cadence — IGF-1 at 8-12 weeks to confirm the dose is producing a response within the upper-normal range; fasting glucose and HbA1c at the same point; lipid panel and comprehensive metabolic panel per your prescriber\'s schedule. Log lab dates and key values on this surface so the trend is visible.',
      ],
    },
    {
      heading: 'The foundations are still doing the work',
      body: [
        'Lift consistently — 3+ sessions per week as a settled routine, the strength plan on this app is the right substrate. GH secretagogues amplify the recovery and body-composition effects of training; they do not produce those effects in the absence of training.',
        'Sleep 7+ hours — the peptide will improve the depth of the sleep you do get, but it will not compensate for sleeping five hours. If sleep is poor, fix that; the protocol will work harder when it stops fighting upstream chaos.',
        'Calorie discipline — the peptide does not override calorie balance. Tesamorelin moves visceral fat more efficiently per calorie of deficit, but it does not produce a deficit on its own. If body composition is part of your goal, the nutrition plan stays the primary driver.',
        'Protein floor — collagen synthesis and lean-mass retention benefit most from the GH pulse when adequate protein is present. The protein floor in the nutrition plan applies here as it does everywhere else.',
        'Honest test: if the foundations are not in place after four weeks on protocol, the protocol cannot succeed on its terms. Either fix the foundations or end the protocol — running it on a weak foundation is wasted money.',
      ],
    },
    {
      heading: 'When to call your prescriber, not wait it out',
      body: [
        'Persistent water retention or edema beyond the first two weeks — possible dose-too-high signal. The CJC-1295/ipamorelin escalation protocol is designed to avoid this; persistent edema suggests the titration was rushed or the maintenance dose is too high for you.',
        'Glucose changes — elevated GH affects insulin sensitivity. If fasting glucose has climbed meaningfully on labs or you\'re feeling hypoglycemic episodes (lightheadedness between meals, energy crashes), this is a prescriber call, not a wait-and-see.',
        'Joint pain or numbness that escalates rather than settles — possible high-dose signal or fluid shifts indicating the protocol needs adjustment.',
        'Mood changes that emerge after starting — agitation, anxiety, depression. The cleaner secretagogues (ipamorelin specifically) should not produce these, but individual response varies; persistent shifts are worth flagging.',
        'Injection-site reactions that escalate — local redness or warmth that doesn\'t resolve, or signs of infection (spreading redness, fever, pus). Don\'t wait on this.',
        'Any event logged at "concerning" severity gets a prescriber message that day. The concerning severity bucket exists specifically to stop you from rationalizing.',
      ],
    },
    {
      heading: 'Cycling and the off-week pattern',
      body: [
        'Most clinical CJC-1295/ipamorelin protocols use 5 days on / 2 days off weekly, plus 1-3 month on / 2-3 month off longer cycles. The purpose is to prevent pituitary receptor desensitization — running these compounds continuously for many months degrades their effectiveness.',
        'Tesamorelin is generally run daily without the weekly off pattern, with the longer cycling decision driven by visceral-fat outcomes and lab response rather than receptor concerns.',
        'Sermorelin\'s short half-life makes desensitization less of an issue, but the underlying long-cycle pattern still applies.',
        'Follow your prescriber\'s cycling plan. The 5-on/2-off rhythm is also a small built-in injection break that helps with adherence — fewer injection-fatigue dropouts.',
      ],
    },
    {
      heading: 'At the end of the trial window — make the decision',
      body: [
        'Pull up the exit criteria you wrote down before starting. Did the outcome meet your continuation threshold? Be honest. If the answer is "I think maybe a little but not really," the answer is no.',
        'If you got a clear positive result — measured against the specific outcome you set — continuing is justified. Plan the next cycle with your prescriber, including the off-cycle window.',
        'If the result was ambiguous, the default move is to end this protocol rather than continue indefinitely hoping the signal sharpens. Ambiguous after a fair window usually means "no detectable effect." Continuing into a second cycle without a clear first-cycle signal is the failure pattern.',
        'If the result was negative or you experienced persistent side effects, end the protocol. Discuss with your prescriber whether a different compound in this category is worth trying or whether this category isn\'t the right tool for you.',
        'The Off-ramp surface walks through ending the protocol cleanly — short timeline, no equivalent of the TRT or GLP-1 unwinding pattern, but worth reading before you press the end button.',
      ],
    },
    {
      heading: 'What this is not, even if it works',
      body: [
        'A reason to run higher doses. The pituitary response saturates at the prescribed maintenance dose; running higher does not produce a larger effect and increases the side-effect surface.',
        'A launchpad for more aggressive interventions. If GH secretagogues work for you, that is the protocol — not a stepping stone to actual GH or to stacking multiple peptides at once.',
        'A substitute for the foundations. The men who get the most out of this protocol over the long arc are the ones who treat the compound as the thing that makes the rest of their work compound — sleep, training, body comp. The men who get the least are the ones who treat the peptide as the work itself.',
      ],
    },
  ],
};
