// TRT Considering content. Authored Mister P-voice copy grounded in
// POV 03 (03-testosterone-steroids.md). Static, not LLM-generated —
// the medical sensitivity here is higher than GLP-1 (lifelong
// commitment, fertility implications, age-segmented advice) and the
// framing needs tight control.
//
// Hard constraints (per project_journey_redesign_framework.md
// §Pattern D medical/legal posture, plus POV 03's age-tiered framing):
// - No prescribing or specific dose recommendations
// - No telehealth / TRT-clinic steering
// - No underground sourcing language at all (TRT is the medical
//   surface; steroid-cycle territory is named only to draw the
//   distinction, never to enable)
// - Hard "no" framing for under-25 — POV 03 is unambiguous
// - "Between you and your prescriber" as the hard line
// - The lifestyle-first asks are not throwaway — they're the primary
//   recommendation for 30-39 and the prerequisite for 40+

import type { ConsideringContent } from '@/lib/pattern-d/shell-types';

export const TRT_CONSIDERING: ConsideringContent = {
  intro:
    'Testosterone replacement therapy (TRT) is the most widely-misunderstood lever in this whole space. People reach for it expecting a transformation; what it actually delivers is restoration — bringing levels back to where they should already be, not pushing past natural limits. It is also a long-term commitment that shuts down your own production from the day you start. Read this whole surface before booking the bloodwork. None of what follows replaces a conversation with a physician.',

  sections: [
    {
      heading: 'TRT vs. steroid cycles — get the distinction right first',
      body: [
        'TRT and steroid cycles get collapsed into "doing test" in casual conversation. They are completely different commitments with different goals, different risk profiles, and different exit paths.',
        'TRT restores normal physiological function in men with clinically low testosterone. Goal: bring levels into the upper-normal range. Aesthetic effect: real but modest — better recovery, easier muscle retention, easier fat-loss maintenance. Think optimized natural potential, not bodybuilder transformation. Lifelong commitment by design.',
        'Steroid cycles push hormones into supra-physiological territory for short-window enhancement. Goal: muscle gain rates not achievable naturally. Aesthetic effect: significant. Risk profile: substantially higher. Recovery is uncertain and may not happen completely. This is a different conversation that Cleanmaxxing does not stage-direct — if that is what you are weighing, the surface you need is your own physician and your own honest read on what you are willing to commit to.',
        'TRT is the only one of these two that has a legitimate medical surface. It is also the one this Considering module is about. If your interest is performance enhancement beyond natural limits, you are reading the wrong surface.',
      ],
    },
    {
      heading: 'The hard age line: under 25, the answer is no',
      body: [
        'Testosterone is naturally near its lifetime peak through the early-to-mid twenties. Introducing exogenous hormones during this window interferes with a system that is still stabilizing, creates dependence years before it would otherwise occur, and does not produce the structural improvements most people expect from it.',
        'Symptoms in this age range — low energy, low libido, poor recovery — are almost always lifestyle-driven (poor sleep, high body fat, chronic stress, alcohol overuse) and respond meaningfully when those variables get addressed. Bloodwork is fine to do as a baseline. TRT before sustained, honest lifestyle work is the wrong tool, full stop.',
        'There are narrow medical exceptions for diagnosed hypogonadism — that is a physician\'s call, not Cleanmaxxing\'s. The default for under-25 is: lifestyle first, no exceptions, do not negotiate with yourself on this.',
      ],
    },
    {
      heading: 'Ages 25–39 — the evaluation window',
      body: [
        'Testosterone is still near peak through the late twenties and may begin a mild decline in the thirties. Most "low T" symptoms in this band are still lifestyle-suppressed, not age-related. The order of operations stays the same: sleep 7–9 hours, lift heavy with compound movements, get body fat into a healthy range, manage stress, address alcohol if it is a meaningful weekly load.',
        'Bloodwork is worth doing as a baseline reference. Total testosterone, free testosterone, SHBG, estradiol — and a symptom inventory alongside the numbers, because symptoms and numbers do not always agree.',
        'If lifestyle has been genuinely optimized for 6+ months and bloodwork still shows low levels with persistent symptoms, that is when the TRT conversation becomes legitimate. Not as a default — as a structured medical evaluation with a physician who treats this routinely.',
      ],
    },
    {
      heading: 'Ages 40+ — the legitimate intervention window',
      body: [
        'Natural testosterone decline becomes more pronounced and symptomatic for a meaningful percentage of men after 40. The case for clinical evaluation and potential TRT is substantially stronger here than at any earlier stage. The goal stays the same: restoration to the upper-normal range, not super-physiological.',
        'The lifestyle baseline still matters — TRT does not solve a sleep problem, a body composition problem, or a chronic stress problem. It fits on top of those, not in place of them. Men who go on TRT without the foundations get a smaller benefit and end up disappointed.',
        'The permanence question still applies. Once you start, your body stops producing its own testosterone. Coming off — when prescribers ever recommend it — produces months of hypogonadal symptoms while the system tries to restart, and full recovery is not guaranteed. The 40+ TRT decision is functionally a "I am going to do this for the rest of my life" decision in most cases.',
      ],
    },
    {
      heading: 'What TRT actually delivers — realistic outcomes',
      body: [
        'Better recovery between training sessions. More efficient muscle retention and modest gains for users who lift consistently. Easier maintenance of lower body fat. Improved energy, mood stability, and libido. Improved drive and motivation in some users — though this is more variable than the marketing suggests.',
        'What it does NOT deliver: a bodybuilder physique, dramatic facial structure changes, or a level of muscle gain that would not be achievable naturally. The visual transformation people associate with "going on test" is almost always a steroid cycle, not TRT.',
        'The men who get the most out of TRT are the ones who already have the foundations dialed in — they are running an optimized system that gets a measurable bump from restoring levels. Men hoping TRT will compensate for poor sleep, no training, and bad nutrition consistently report disappointment.',
      ],
    },
    {
      heading: 'The non-negotiables — bloodwork and supervision',
      body: [
        'Comprehensive baseline labs before starting: total testosterone, free testosterone, SHBG, estradiol, LH and FSH, complete blood count (especially hematocrit), comprehensive metabolic panel, lipid panel, PSA if 40+. This is the floor. A prescriber who would skip these is the wrong prescriber.',
        'Follow-up labs at 6–8 weeks after starting, then at 3 months, then quarterly to biannually depending on response. Hematocrit is the headline thing to watch — TRT thickens blood, and untreated elevated hematocrit increases cardiovascular risk. Lipid changes and PSA shifts are the other monitoring priorities.',
        'A physician who treats this routinely matters more than the convenience of the platform. Men\'s health clinics that prescribe TRT exist on a wide spectrum — some are excellent, some are a vending machine with a credit card swipe and minimal monitoring. The latter pattern produces the worst outcomes. If your prescriber is not asking for follow-up labs and adjusting based on what they see, find a different prescriber.',
      ],
    },
    {
      heading: 'Estrogen — manage it, do not crash it',
      body: [
        'Testosterone converts to estrogen via aromatization. This is normal, necessary, and good for you in functional ranges. Estrogen does load-bearing work in men: libido, joint health, bone density, cardiovascular function, mood, cognition.',
        'High estrogen on a TRT protocol can show up as water retention, mood instability, breast tissue tenderness. The fix is not to crash estrogen with aggressive aromatase inhibitor (AI) use — that is one of the most common ways men feel and look worse on TRT. Crashed estrogen produces joint pain, low libido despite high testosterone, brain fog, and a flat dry-looking physique.',
        'The right move is bloodwork-driven estradiol monitoring with conservative AI dosing only when needed — and the prescriber\'s call, not your call. Anyone running an AI without estradiol bloodwork is doing it wrong.',
      ],
    },
    {
      heading: 'The other costs that get downplayed',
      body: [
        'Fertility: TRT suppresses LH and FSH, which suppresses sperm production. Most men on TRT become functionally infertile while on protocol. If you might want children, talk to your prescriber BEFORE starting about fertility-preserving protocols (HCG concurrent with TRT) or banking sperm. This is not optional planning.',
        'Body acne: elevated androgens drive sebaceous gland activity. Mild to moderate body acne — chest, back, shoulders — is common at TRT doses for some men. Manage it proactively (salicylic acid wash, benzoyl peroxide, dermatologist if cystic) rather than waiting for scarring.',
        'Hair loss: TRT can accelerate male-pattern baldness in genetically predisposed men because testosterone converts to DHT. If hair is something you care about (and the hair journey on this app exists for a reason), this matters. The hair journey\'s monitor / treat / transition decision becomes more pressing once TRT is on the table.',
        'Cost: legitimate TRT costs $100–300+ per month indefinitely depending on the clinic, including labs and visits. Direct-to-consumer clinics can be cheaper but the monitoring quality varies. Budget for "I am paying this every month for the rest of my life," not "for a year."',
      ],
    },
    {
      heading: 'Strong candidate vs. poor candidate',
      body: [
        'Strong: 35+, multiple symptoms (energy, libido, recovery, mood) that have not responded to sustained lifestyle improvement, bloodwork showing testosterone genuinely below physiological range with low or normal LH (suggesting primary or mixed hypogonadism, not just transient suppression), planning to lift consistently, accepting that this is likely a lifelong protocol.',
        'Poor: under 30, expecting a dramatic visual transformation, looking for a shortcut around poor sleep / training / nutrition, not interested in ongoing bloodwork, treating "low normal" testosterone as a problem when symptoms are absent, hoping to use TRT as a launchpad for higher-dose steroid use later.',
        'If you are reading this and you are in the "poor candidate" column on more than one line, the answer is not no — it is "address the underlying things first." Sustained lifestyle improvement before bloodwork-driven evaluation does not waste your time. It frequently produces enough improvement that the TRT question stops being interesting.',
      ],
    },
    {
      heading: 'Prepare for the prescriber conversation',
      body: [
        'Specifics on symptoms — what changed, when, how persistent. "I feel a bit tired" is a different conversation than "energy and libido have been declining for two years and lifestyle changes haven\'t moved them."',
        'Lifestyle context — what your sleep / training / body comp / stress / alcohol baseline actually is. The honest version. A good prescriber will ask; a great one will not start TRT until they\'ve seen sustained lifestyle work.',
        'Ask about their monitoring cadence and what they do when hematocrit or lipids drift. Ask about estradiol management and how they decide on AI use. Ask whether they include HCG in protocols when fertility preservation matters. Ask what coming off looks like in their practice.',
        'Cleanmaxxing does not prescribe and does not steer to specific clinics. The prescriber relationship is yours to own — the legitimacy of that route is part of what you are paying for, and the difference between a thoughtful prescriber and a vending-machine prescriber is the difference between TRT working and TRT producing problems you did not anticipate.',
      ],
    },
  ],

  startProtocolPrompt:
    'Once you\'ve actually started — bloodwork done, prescription filled, on the dosing schedule — mark it here. Tracking starts from there.',

  startProtocolButtonLabel: 'I\'ve started TRT',

  allowedStartTypes: ['trt'],
};
