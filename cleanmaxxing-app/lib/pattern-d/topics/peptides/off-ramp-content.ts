// Peptides (GH secretagogues) Off-ramp content. Authored Mister P-voice
// copy. Unlike TRT, GH secretagogues do not suppress the hypothalamic-
// pituitary axis — they amplify an existing signaling system, and coming
// off doesn't produce a hormonal hole. Unlike GLP-1, there's no rebound
// weight pattern. The off-ramp here is shorter and lighter than the
// other two Pattern D off-ramps.
//
// Source posture: POV 04 makes the marginal-gains framing the through-
// line; the off-ramp is the moment to honor that. If the foundations
// held the result, the foundations will hold it after stopping. If
// the protocol was carrying the result, the result was thin to begin
// with.

import type { OffRampContent } from '@/lib/pattern-d/shell-types';

export const PEPTIDES_OFF_RAMP: OffRampContent = {
  intro:
    'Coming off a GH secretagogue protocol is straightforward. Your pituitary is not suppressed (these compounds stimulate, they do not replace), so there\'s no months-long hormonal recovery to plan around. This surface is the short version: when stopping makes sense, what to expect, and what to keep doing so any real gains the protocol produced stay with you. Read this once, then use the "I\'ve stopped" button when the protocol actually ends.',

  sections: [
    {
      heading: 'Why coming off makes sense',
      body: [
        'You completed the trial window and the result didn\'t meet your continuation criteria. This is the cleanest reason. The compound did not produce the outcome you set out to test. Continuing because "maybe more time will do it" is the failure mode the exit criteria existed to prevent.',
        'You got the result and you\'re at the end of a planned cycle. Most clinical protocols run 1-3 months on followed by 2-3 months off to prevent pituitary receptor desensitization. Coming off as scheduled is part of how this category is supposed to work, not a sign anything is wrong.',
        'Side effects you weren\'t willing to keep running. Side-effect intolerance — persistent water retention, glucose changes, mood shifts, injection-site issues — is a legitimate stop. If your prescriber wasn\'t able to dial them out with a dose adjustment, ending the protocol is the right call.',
        'Cost or logistics shifted — you\'re traveling, finances changed, the supervised path got harder to maintain. Coming off cleanly is preferable to running a half-monitored protocol.',
        'Reasons that are NOT good reasons to come off mid-cycle: you didn\'t feel anything in the first two weeks (peptides are slow; give them the full window), a forum told you a different stack is better (single-compound discipline is the whole point), or you want to "try something else" without ending the current trial cleanly (this is how stacks accidentally form).',
      ],
    },
    {
      heading: 'What to expect after stopping',
      body: [
        'For most users, very little dramatic happens. The improved sleep depth that was the most reliable on-protocol effect may settle back toward your pre-protocol baseline over a couple of weeks. Recovery time between training sessions may lengthen back slightly. Skin and collagen effects that took months to build will erode slowly over a similar timeline.',
        'Tesamorelin specifically: the Falutz NEJM trial showed visceral fat returning to baseline within 26 weeks of discontinuation. The effect requires continued use to maintain. If visceral fat reduction was your goal and you got it, expect it to creep back over six months unless the underlying lifestyle pattern (waist-affecting diet, training, alcohol load) has also changed.',
        'No hormonal crash. Your pituitary continues producing GH on its normal pulse pattern. There is no equivalent of the post-TRT hypogonadal window. The off-ramp here is comfortable.',
        'No rebound effect. Unlike GLP-1, you do not get a hyperphagic spike on stopping. Appetite stays roughly where it was during the protocol.',
      ],
    },
    {
      heading: 'The habits that have to hold',
      body: [
        'Whatever foundational pattern you built during the protocol is what holds the gains. Sleep discipline, training consistency, nutrition discipline. These are the variables that determined how much of an effect the peptide had in the first place; they are also the variables that determine whether any of that effect stays with you.',
        'If the protocol coincided with finally getting consistent at the gym, the gym is what holds the body-composition shift — keep going.',
        'If the protocol coincided with better sleep hygiene, the sleep hygiene is what carries forward — the deepened sleep on protocol was partly the compound and partly the habit; the habit is yours to keep.',
        'If the protocol carried the result without changes to the foundations, the result was thin to begin with. Use this off-ramp as the moment to put the energy into the foundational variables instead of the next compound.',
      ],
    },
    {
      heading: 'Honest read — what did this actually do',
      body: [
        'This is the most useful moment to ask yourself the question that pre-committed exit criteria are designed to surface. Looking at your tracking from the protocol — sleep depth, recovery, waist circumference, body weight, energy — was there a detectable signal that was distinct from the foundational improvements that were also happening?',
        'If the answer is yes, the protocol earned its place. A future cycle is justified at the prescriber\'s discretion. The cycling pattern (months on / months off) is built around this — most clinical protocols intentionally avoid running these compounds continuously.',
        'If the answer is "I think maybe a little," the answer is probably no. The compound did not produce a clear signal in a fair window. A second cycle is unlikely to produce a clearer signal than the first one did.',
        'If the answer is no, the protocol did not work for you. This is information — not a failure on your part and not a reason to chase the next compound in this category. The honest position is "this tool, at this dose, in this window, did not produce the outcome I was testing for." That conclusion can hold.',
      ],
    },
    {
      heading: 'When restarting is reasonable',
      body: [
        'After a planned off-cycle (2-3 months) if the first cycle produced a clear, defensible result and your prescriber is on board with continuing the cycling pattern. This is the standard rhythm — not a separate decision each time.',
        'Months or years later, with different goals or different foundational context — for example, you ended the protocol because your foundations weren\'t in place, then spent eight months locking them in, and now want to retry with a real test.',
        'A specific medical indication shifts (tesamorelin specifically for visceral fat that has returned to a meaningfully elevated level after sustained lifestyle work). This is a prescriber conversation.',
        'Reasons that are NOT good reasons to restart: you miss the routine of the injections (this is the behavioral pattern POV 04 warns about), a podcast made it sound interesting again, you saw a new vendor claiming better quality. The honest version of "why am I starting again" should be specific and ground in your previous trial\'s data.',
      ],
    },
    {
      heading: 'What "off" means in this app',
      body: [
        'When you press the button below, your peptide intervention status flips to off. The Off-ramp surface stays available — you can come back to read these sections any time. Mister P\'s prompt context returns to non-peptide framing for nutrition, strength, sleep, and other journeys; the protocol modifier is removed from reports.',
        'The intervention row stays on file as history. If you ever restart, that\'s a fresh row, not a re-activation — there is value in the history of "first run, X weeks, off, second run starting" both for you and for the prescriber reading your timeline.',
        'Any events you logged during the protocol stay attached to the intervention row. Side-effect history, lab results, and dose-change notes remain readable in case you or a future prescriber needs them.',
      ],
    },
  ],

  endProtocolButtonLabel: 'I\'ve stopped the peptide protocol',
};
