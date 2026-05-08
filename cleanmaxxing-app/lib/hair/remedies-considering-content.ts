// Authored content for the "Considering remedies" surface on /plan/hair.
//
// Distinct from Pattern D for hair MEDICATIONS (fin/min) — that surface
// owns drug-protocol intake, side-effect logging, and off-ramp.
// Remedies = surgical (transplant, SMP) and external (hair system).
// State tracking lives in a follow-up; v0 is content-only so a balding
// user looking at remedies has the same posture-consistent reference
// the rest of the app provides for drug protocols.
//
// Wording posture mirrors GLP-1 / TRT considering content: pros, cons,
// cost band, timeline, "who this fits / doesn't fit" calls. No vendor
// links, no procedure-specific recommendations, no clinic referrals.

export type Remedy = {
  slug: 'hair_transplant' | 'smp' | 'hair_system';
  title: string;
  oneLine: string;
  pros: ReadonlyArray<string>;
  cons: ReadonlyArray<string>;
  costBand: string;
  timeline: string;
  fitsWho: string;
  doesntFitWho: string;
};

export const REMEDIES_CONSIDERING_INTRO =
  'These are the remedies people reach for when medication isn’t enough or isn’t the right fit. The information here is the unfiltered version — pros, cons, cost band, recovery, and the kind of person each one tends to fit. None of it is a recommendation. Bring what’s relevant to a board-certified specialist and decide there.';

export const REMEDIES: ReadonlyArray<Remedy> = [
  {
    slug: 'hair_transplant',
    title: 'Hair transplant (FUE / FUT)',
    oneLine:
      'Surgical relocation of follicles from a donor area (typically the back of the scalp) to thinning regions.',
    pros: [
      'Permanent — once a graft takes, it’s yours indefinitely.',
      'Real density gain, not a visual illusion. The hair grows like the rest of yours.',
      'Mature procedure with decades of outcome data when done by an experienced surgeon.',
      'FUE leaves dot-scarring rather than a strip line — short hair / shaved looks stay accessible.',
    ],
    cons: [
      'Significant cost. The total bill is graft count × price-per-graft, often the largest single appearance investment most men make.',
      'Requires healthy donor density. Diffuse thinners and very advanced patterns may not be candidates.',
      'A bad surgeon produces visible, lifelong damage. The vendor selection matters more than the technique.',
      'Final result takes 9–12+ months. The shock-loss phase before regrowth can be psychologically rough.',
      'Often requires staged sessions for advanced patterns; one procedure rarely covers everything.',
    ],
    costBand:
      '$3,000–$15,000 USD typical range, dependent on graft count, surgeon, and geography. Turkey / Mexico run notably lower; outcome variance there is much wider.',
    timeline:
      'Procedure day, then 10–14 days of post-op constraints. Shock loss starts ~3 weeks. Visible regrowth months 4–6. Final density assessable at 12 months.',
    fitsWho:
      'Stable, non-progressive recession with good donor density. Comfortable with significant upfront cost. Willing to research surgeons rigorously rather than chase the lowest price.',
    doesntFitWho:
      'Active diffuse thinning without stabilization on medication first — transplanting into an actively-thinning crown means you’ll be back in two years. Insufficient donor density. Anyone chasing a hairline they had at 19 rather than an age-appropriate one.',
  },
  {
    slug: 'smp',
    title: 'Scalp micropigmentation (SMP)',
    oneLine:
      'Tattooed dots on the scalp that simulate the appearance of follicles. Visual density without adding hair.',
    pros: [
      'Cheaper and lower-risk than a transplant.',
      'Works for advanced patterns where transplant donor density isn’t sufficient.',
      'Reads well at conversational distance, especially on shaved or very short cuts.',
      'No medical recovery — minimal post-procedure constraints.',
    ],
    cons: [
      'You commit to a buzz / shave forever. Growing it out exposes the simulated dots.',
      'Pigment fades over years — touch-ups are required to maintain color match.',
      'Skin tone, surgeon skill, and pigment selection all affect outcome quality dramatically.',
      'A bad SMP looks unmistakably wrong up close; the margin for error is narrower than it looks online.',
    ],
    costBand:
      '$1,500–$5,000 USD typical range across 2–4 sessions.',
    timeline:
      '3–4 sessions over 4–8 weeks, then a touch-up at 12–18 months. Long-term: maintenance every 3–5 years.',
    fitsWho:
      'Has accepted the bald / very-short look. Wants the visual density of a recently-shaved full head of hair. Comfortable with the haircut commitment.',
    doesntFitWho:
      'Wants the option to grow hair out at any point. Considering this as a "test the look" — it’s much harder to reverse than people expect.',
  },
  {
    slug: 'hair_system',
    title: 'Hair system / topper',
    oneLine:
      'A non-surgical hair piece bonded or clipped to the scalp. Modern systems are unrecognizable when fitted and styled correctly.',
    pros: [
      'Immediate, fully reversible. You can take it off.',
      'No surgical risk, no recovery period, no medical contraindications.',
      'Massive density change — works for the full pattern range, including advanced patterns where transplants and SMP fall short.',
      'Modern systems with breathable bases and properly-matched hair are convincing in person.',
    ],
    cons: [
      'Ongoing cost and maintenance — bonding adhesive, monthly cleaning service, system replacement every 3–6 months.',
      'A daily / weekly attention burden. You’re managing a piece, not just having hair.',
      'Quality varies widely; bad systems look bad in ways that are obvious to others before they’re obvious to you.',
      'Stigma — many men feel performative wearing one even when no one notices it. That’s a real cost.',
      'The transition from "wearing one" back to "not wearing one" is awkward; people will notice.',
    ],
    costBand:
      '$200–$3,000 per system depending on hair type and base construction. Annual total with maintenance often $2,000–$6,000.',
    timeline:
      'First fitting can be same-week. Adjustment / habit period 1–3 months. Steady-state maintenance is ongoing.',
    fitsWho:
      'Wants full density now without surgery. Comfortable with maintenance overhead. Has a specific goal (event, dating window, professional reset) where the immediate change is worth the management cost.',
    doesntFitWho:
      'Wants a one-and-done solution. Won’t commit to the maintenance cadence. High-stakes physical environments (heavy sweat, contact sports, frequent open-water swimming) where adhesive failures are visible.',
  },
];

export const REMEDIES_CONSIDERING_OUTRO =
  'Two more honest framings before you book anything. First: stabilization comes before reconstruction. If recession is still progressing, fix that before committing to a surgical or external solution — otherwise you’ll be doing this again in two years. Second: an age-appropriate hairline reads as deliberate; a teenage hairline at 45 reads as something else entirely.';
