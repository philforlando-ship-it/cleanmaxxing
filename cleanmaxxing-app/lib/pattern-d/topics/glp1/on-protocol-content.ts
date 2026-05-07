// GLP-1 On Protocol content. Authored Mister P-voice copy. Reads as
// the framing material that sits alongside the user's tracked
// intervention — it is NOT the tracking primitive itself (that lives
// on the intervention row + intervention_events).

import type { OnProtocolContent } from '@/lib/pattern-d/shell-types';

export const GLP1_ON_PROTOCOL: OnProtocolContent = {
  intro:
    'You\'re on it. The next twelve months are about doing the medication justice — building the habits that make the loss stick, watching the side-effect signals that matter, and not making the most common mistakes (skipping protein, skipping training, weighing daily, treating this as a quick fix). Below is what actually matters week to week.',

  sections: [
    {
      heading: 'Titration phases — what to expect',
      body: [
        'Most prescribers start low and escalate every 4 weeks. The first dose is sub-therapeutic on purpose — the goal is to acclimate your gut to slowed emptying without producing the worst of the GI side effects. You will not see meaningful weight loss yet. That is by design.',
        'Escalation phase (typically weeks 4–16): each dose step usually triggers another wave of nausea, fullness, or food-aversion for a few days, then settles. Side effects that flare on a dose change usually mean the new dose is working as intended. Persistent or severe symptoms past two weeks at the new dose are worth a check-in with your prescriber.',
        'Plateau dose (typically beyond month 4): you and your prescriber settle on a maintenance dose. This is the dose you sit at for the bulk of the treatment window. Weight loss continues but at a slower, steadier rate than the initial drop.',
      ],
    },
    {
      heading: 'The non-negotiables — lift and protein',
      body: [
        'Resistance training 2–4× per week is not optional on this medication. Without it, you are losing 25–40% of the dropped weight as lean mass — building the Ozempic body, not the body you started this for. Cleanmaxxing\'s strength plan is the right substrate; if you don\'t have one, get one before the dose starts driving real loss.',
        'Protein floor: 1.0–1.2 g per pound of bodyweight, every day, even on low-appetite days. This is higher than the non-GLP-1 default specifically because the medication suppresses appetite — without intentional emphasis, you will end up under-eating protein and losing the lean mass the medication isn\'t selectively sparing. This is the hardest single behavior on a GLP-1 for the same reason. Front-load breakfast — protein early when appetite is highest. Liquid protein (shakes, Greek yogurt) when solid food is hard.',
        'Both of these become 10× harder once the appetite suppression is in full effect. Build the habit before that point if you haven\'t already.',
      ],
    },
    {
      heading: 'What to actually track',
      body: [
        'Weight: weekly, same day, same conditions (morning, after bathroom, before food). Not daily. Daily weighing during a GLP-1 cycle is a recipe for over-fixation on noise; the loss trajectory is steady but not linear.',
        'Protein hit rate: are you actually clearing the floor? Honest yes/no per day. Trend over weeks matters more than any single day.',
        'Training compliance: number of sessions completed per week, not how hard they felt. Showing up under appetite suppression is the win.',
        'Energy and mood, weekly: persistent low energy or low mood that doesn\'t lift after a dose stabilization week is worth flagging.',
        'Side-effect log on this surface — every flare logged with severity. Patterns matter more than individual days.',
      ],
    },
    {
      heading: 'When to call your prescriber, not wait it out',
      body: [
        'Severe or persistent abdominal pain (especially upper-right or radiating to the back) — possible gallstone or pancreatitis signal. Do not wait.',
        'Persistent vomiting that prevents hydration for more than 24 hours. Dehydration on a GLP-1 escalates fast.',
        'Any new or worsening depressive symptoms. The post-marketing data on mood effects is mixed but real; if you are noticing it, name it to the prescriber.',
        'Side effects that don\'t resolve two weeks past a dose change — escalation should produce a transient flare, not a permanent state.',
        'Any concerning event logged on the side-effect log gets a prescriber message that day. The "concerning" severity bucket exists specifically to stop you from rationalizing.',
      ],
    },
    {
      heading: 'Things people miss',
      body: [
        'Hydration: slowed gastric emptying makes it easy to drink less. Aim for steady fluid intake throughout the day, not loading at meals.',
        'Constipation: very common. Fiber + water + walking handle most of it; persistent constipation past the first month is a prescriber check-in.',
        'Alcohol: many users find their tolerance drops sharply on a GLP-1 and the reward response weakens — drinking just doesn\'t hit the same. This is a feature, not a bug, but the reduced intake counts as a behavior change worth keeping when you stop.',
        'The "I forgot to eat" trap: appetite suppression doesn\'t mean food doesn\'t matter. You still need fuel for training and protein for muscle preservation. Forgetting is one of the things you are tracking against.',
      ],
    },
    {
      heading: 'Where this is going',
      body: [
        'You will not stay on this forever — or you will, and that is a separate decision (the long-term-use strategy from the Considering surface). Either way, the months you are on now are the window where you build the behavioral infrastructure that holds when the medication isn\'t doing the work for you.',
        'When you do stop, the Off-ramp surface opens. Don\'t skip it — that is where the rebound risk gets handled head-on rather than discovered the hard way.',
      ],
    },
  ],
};
