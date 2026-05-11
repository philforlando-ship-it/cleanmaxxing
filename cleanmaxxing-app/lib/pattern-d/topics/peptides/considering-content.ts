// Peptides (GH secretagogues) Considering content. Authored Mister P-voice
// copy grounded in POV 04 (04-peptides) and POV 40 (40-peptide-deep-dive).
// Scope: sermorelin / CJC-1295 + ipamorelin / tesamorelin. Other peptide
// categories (healing, nootropic, 5-amino-1MQ, melanotan, GHK-Cu) are not
// covered here — they may ship as separate Pattern D topics later.
//
// Hard constraints (mirror TRT):
// - No prescribing or specific dose recommendations
// - No telehealth / longevity-clinic steering
// - No underground sourcing language
// - Honest about the marginal-gains framing — these are not transformation tools
// - Foundations-first floor is the through-line
// - "Between you and your prescriber" is the medical line

import type { ConsideringContent } from '@/lib/pattern-d/shell-types';

export const PEPTIDES_CONSIDERING: ConsideringContent = {
  intro:
    'GH secretagogues — sermorelin, the CJC-1295/ipamorelin stack, and tesamorelin — are the corner of the peptide world with the most legitimate clinical surface. They are also the corner with the widest gap between hype and reality. Most people who get interested in them shouldn\'t bother yet; the foundations they\'re hoping to skip past are doing 90% of the work. Read this whole surface before you start. None of what follows replaces a conversation with a physician who treats this routinely.',

  sections: [
    {
      heading: 'What these actually are',
      body: [
        'All three are GH secretagogues — they tell your pituitary to release more of your own growth hormone rather than introducing exogenous GH directly. The body produces the hormone through its normal feedback system, so the risk profile is meaningfully different from running actual GH (which is in different legal and physiological territory entirely).',
        'This is upstream stimulation. The hypothalamic-pituitary axis stays intact; you do not shut down endogenous production the way TRT shuts down endogenous testosterone. That is the cleanest argument for this category — the exit path is straightforward, the side-effect tail is shorter, and the body\'s feedback systems are doing most of the work.',
        'It is also the reason the effect size is modest. You are nudging a system that already exists, not bypassing it. Anyone selling these as a transformation lever is over-promising. The honest effect signal across thousands of users is improved sleep within the first two weeks, mild recovery improvement, and subtle body-composition shifts over months — not a visible change in the mirror that other people notice.',
      ],
    },
    {
      heading: 'The four compounds — what each is for',
      body: [
        'Tesamorelin is the only GHRH analog with FDA approval, originally for HIV-associated visceral lipodystrophy. The Falutz et al. NEJM trial (2007, PMID 18057338) showed 18% reduction in visceral adipose tissue at 26 weeks on imaging — a harder endpoint than scale weight. It is now prescribed off-label in body-composition and longevity contexts. Of the four, this is the compound with the strongest evidence base for a specific physical outcome (visceral fat reduction). Visceral fat is the metabolically dangerous kind; if midsection fat persists despite reasonable diet and training, this is the one with clinical backing.',
        'CJC-1295 (no DAC) combined with ipamorelin is the most commonly prescribed clinical stack today. CJC-1295 binds the GHRH receptor; ipamorelin binds the ghrelin receptor; together they produce a stronger, longer GH pulse than either alone, and ipamorelin\'s selectivity means it doesn\'t raise cortisol or prolactin the way older secretagogues did. The benefit profile spans sleep, recovery, body composition, and collagen — modest on each axis, more reliable on sleep than on visible body changes. This is the default stack in longevity-clinic practice.',
        'Sermorelin is the original GHRH analog — older, weaker, shorter half-life, can stimulate cortisol and prolactin in some users (which is why the field moved toward CJC-1295/ipamorelin). It remains in clinical practice through compounding pharmacies, usually because it is cheaper or because a specific patient has not tolerated the modern stack. Users who switch from sermorelin to the CJC/ipa stack consistently describe the latter as a clearer improvement than they expected. Sermorelin is not a first-line choice for the modern body-composition or recovery goals that drive most current adult interest.',
        'Each compound is mechanistically distinct enough that "I tried peptides and they didn\'t work" usually means "I tried one specific compound, often poorly dosed, often from an uncertain source." Single-compound discipline matters here — see the protocol section below.',
      ],
    },
    {
      heading: 'What these actually deliver — realistic outcomes',
      body: [
        'Improved sleep, often noticeable within the first two weeks on CJC-1295/ipamorelin. The largest natural GH pulse happens in early deep sleep; secretagogue-timed dosing amplifies that pulse and users frequently report deeper, more restorative sleep before they notice anything else. This is the most reliable effect across the category.',
        'Mild recovery improvement. Soreness clears a day faster. Joints that were nagging may settle. The lift is real but small enough that it disappears under the noise if other variables (sleep, training load, nutrition) aren\'t already stable.',
        'Subtle body-composition shifts over months. Tesamorelin moves visceral fat in a way that scale weight may not capture — waist circumference declines without a big drop in total weight. The CJC/ipa stack tends to produce slow, modest leaning out alongside diet and training rather than instead of them. Neither produces the kind of transformation people associate with "running GH" — which is a different intervention with a different risk profile and isn\'t what this category is about.',
        'Skin and collagen improvements — softer, slightly firmer over months. Real but slow. Not a substitute for the skincare journey.',
        'What these do NOT deliver: a bodybuilder physique, a dramatic facial change, fat loss without nutrition discipline, or a shortcut around training. If your hope sits in any of those columns, you are reading the wrong document.',
      ],
    },
    {
      heading: 'The foundations test — when this is the wrong tool',
      body: [
        'Lean already (under 18% body fat for most men), training is genuinely consistent (3+ sessions per week as a settled routine, not a goal), sleeping 7+ hours regularly, skin and grooming dialed in. These are the people who get the marginal additional edge these compounds provide. The improvement is real and measurable but small relative to the variables that got them this far.',
        'Carrying meaningful body fat, training inconsistently, sleeping poorly, foundations not in place — peptides will be wasted on you. The compound mechanism does not override calorie balance, training stimulus, or sleep debt. You will pay $200-600 a month for an effect that will not show up. The men who get the most out of this category have the foundations dialed; the men who get the least are trying to use peptides to compensate for missing foundations.',
        'The honest test: if you took peptides off the table for the next six months and locked in sleep, training, and nutrition with the same energy you\'re putting into peptide research, would you reach roughly the body you\'re hoping the peptides will produce? For most people the answer is yes. The peptides are then a question worth revisiting from that improved baseline — or, more often, no longer interesting because the foundations did the work.',
      ],
    },
    {
      heading: 'Supervised versus DIY — the sourcing reality',
      body: [
        'The supervised path means a physician — usually at a longevity, hormone-optimization, or men\'s-health clinic — prescribing tesamorelin or a compounded CJC-1295/ipamorelin protocol with structured monitoring. Cost is higher. Sourcing risk drops to roughly zero. Lab and side-effect monitoring is part of what you\'re paying for. This is the path that produces the most predictable outcomes and the path Cleanmaxxing\'s posture defaults to recommending for anyone serious enough to actually start.',
        'The DIY path means buying research-chemical peptides online and self-administering. The supply chain in this space is genuinely uncontrolled. Purity varies between vendors, between batches from the same vendor, and between what the label claims and what is in the vial. Third-party testing exists but is patchy. There is no practical way for a consumer to independently verify what they are injecting. This is not a theoretical risk — contaminated, underdosed, or misidentified research chemicals are a real and recurring problem.',
        'If the uncertainty about what is in the vial is unacceptable to you, this category is not appropriate to experiment with via the DIY route. If it is acceptable, accept it explicitly rather than assuming a confident-looking website means a clean product. Cleanmaxxing does not steer to specific vendors and does not endorse research-chemical sourcing.',
        'Sterile injection technique, correct reconstitution, and rotation of subcutaneous injection sites are real skills, not formalities. The supervised path is the cleanest place to learn them; the DIY path requires treating the learning curve as part of the commitment rather than something to figure out during the first dose.',
      ],
    },
    {
      heading: 'The behavioral risk — the most underrated problem',
      body: [
        'The biggest risk of deep engagement with peptide protocols is not physical. It is the way protocol research, sourcing logistics, reconstitution math, and injection timing can become the project itself — replacing the boring variables (training consistency, calorie awareness, sleep discipline) that actually move the needle.',
        'Reading about CJC-1295 dosing windows is interesting. Tracking your protein intake honestly is tedious. Researching vendors feels like progress. Showing up to the gym on a tired Tuesday is what actually compounds. The pattern is consistent — people who get pulled into this category often spend more attention on the compound than on the foundations the compound is supposed to enhance, and end up with the same body composition six months later plus an injection routine they convinced themselves was load-bearing.',
        'If you notice yourself spending more time on peptide forums than on the variables in your strength plan, your nutrition plan, and your sleep plan, that is the signal to step back. The compounds amplify whatever system you already have. A good system gets a small boost. A weak system gets no meaningful change.',
      ],
    },
    {
      heading: 'Cost — be honest with yourself',
      body: [
        'Tesamorelin via the supervised path: $400-800+ per month depending on the clinic and whether insurance covers any portion (it usually does not outside of the FDA-approved indication). A typical six-month protocol with labs is $3,000-5,000.',
        'CJC-1295/ipamorelin via the supervised path: $200-500 per month at a longevity clinic, plus baseline and follow-up labs. Annual cost commonly $3,000-6,000.',
        'Sermorelin via the supervised path: cheaper, $150-300 per month, which is its main reason for staying in current practice.',
        'DIY sourcing reduces compound cost meaningfully but does not include monitoring, labs, or the supervision that prevents the most common errors. The implicit cost of running the protocol blind is high enough that the apparent savings are often illusory.',
        'These are not "try it for a month and see" budgets. Plan in six-month minimums to give the compound a fair window, plus the cost of baseline and follow-up labs. If the budget is going to compete with foundations spending (a gym membership, decent food, a sleep upgrade), the foundations win every time.',
      ],
    },
    {
      heading: 'If you still want to start — single-compound discipline',
      body: [
        'Run one compound at a time, not a stack. Running multiple peptides as a first protocol is the most common mistake. If something works, you cannot tell which compound did it. If a side effect appears, you cannot tell which one caused it. If nothing changes, you cannot tell whether the compound was ineffective or the dosing was wrong. Single-compound trials, long enough to give the compound a real test window, are the only way to build actual signal.',
        'Pick the compound with the strongest case for your specific goal. For persistent visceral fat despite reasonable diet and training: tesamorelin has the strongest evidence. For general recovery and modest body-composition improvement on top of dialed foundations: CJC-1295/ipamorelin is the category default. Sermorelin is rarely a first-line choice for current goals.',
        'Set a four-to-eight-week evaluation window before you start. Track specifically what you expect the compound to change — sleep depth, recovery time between sessions, waist circumference at a fixed measurement point, morning energy. Vague tracking guarantees a vague conclusion, and a vague conclusion is how people convince themselves a stack is working when it isn\'t.',
        'Write down your exit criteria in advance. What outcome would justify continuing past the trial window? What outcome would end it? Without this, every protocol drifts toward "keep running it just in case" because the sunk cost of sourcing and injection discipline is real. The most common failure mode at the end of a trial is an ambiguous result where the compound cannot be proven to be doing anything, and the user continues anyway. Pre-committed exit criteria break that loop.',
      ],
    },
    {
      heading: 'Prepare for the prescriber conversation',
      body: [
        'Lifestyle baseline first — what your sleep, training, body comp, and stress baseline actually looks like. The honest version. A good prescriber will ask; a great one will not start a peptide protocol until they\'ve seen sustained foundational work. If a clinic is willing to prescribe before any of this comes up, that is information about the clinic.',
        'Specific goal, specific timeline — "I want to be leaner" is a different conversation than "I have persistent visceral fat that hasn\'t responded to 12 months of consistent diet and training, and I\'d like to evaluate tesamorelin." Specificity earns you a more useful conversation.',
        'Ask about monitoring cadence. Baseline labs (IGF-1, fasting glucose, HbA1c, lipid panel, comprehensive metabolic panel) before starting. IGF-1 rechecked at 8-12 weeks to confirm the dose is producing a response in the upper-normal range. Glucose tolerance re-evaluated at the same point. Quarterly to biannual follow-up labs ongoing. A prescriber who skips this layer is the wrong prescriber.',
        'Ask about cycling. Most clinical CJC/ipa protocols use a 5-on / 2-off weekly pattern with 1-3 month on / 2-3 month off cycles to prevent receptor desensitization. A prescriber who has no cycling plan is running a less sophisticated protocol than the current standard.',
        'Cleanmaxxing does not prescribe and does not steer to specific clinics. The prescriber relationship is yours to own — the legitimacy of that route is part of what you are paying for, and the difference between a thoughtful prescriber and a vending-machine clinic is the difference between a useful experiment and an expensive non-result.',
      ],
    },
  ],

  startProtocolPrompt:
    'Once you\'ve actually started — the compound is in hand, the protocol is set, the first injection is done — mark it here. Tracking starts from there.',

  startProtocolButtonLabel: 'I\'ve started a peptide protocol',

  allowedStartTypes: ['peptide'],
};
