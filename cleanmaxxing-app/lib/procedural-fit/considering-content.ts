// Educational content for /plan/procedures Considering view.
// Condensed POV 28 read calibrated for the page surface — framework,
// the procedures covered, foundations-first posture, surgeon-quality
// emphasis, cost framing. Users who want the full unfiltered version
// follow the POV link.
//
// This is static authored copy, not LLM-generated. The personalized
// read happens via the /api/plan/procedures/fit-check route; this
// surface is the standing context that frames why the analysis
// exists and what it covers.

export type ContentSection = {
  heading: string;
  body: string[];
};

export type ConsideringContent = {
  intro: string;
  sections: ContentSection[];
};

export const PROCEDURES_CONSIDERING: ConsideringContent = {
  intro:
    'Cosmetic procedures sit in the advanced tier of looksmaxxing. They belong after body composition, grooming, training, and lifestyle are already producing strong results — not before. When used strategically and conservatively, several procedures offer genuinely high return with manageable risk. When chased impulsively, they produce outcomes that are difficult or impossible to reverse. The personalized read below tells you which (if any) would meaningfully help YOUR face given everything Cleanmaxxing knows about where you are; the standing rules below tell you how to think about the category at all.',

  sections: [
    {
      heading: 'The framework — subtle, structural, long-term',
      body: [
        'Start conservative. Fix structure before chasing contour. Avoid anything that removes natural facial volume. Let surgeon quality determine outcome more than any other variable.',
        'Bad work is visible forever. Good work is invisible — the result reads as "he looks better," not "he had work done." That standard is the floor, not the ceiling.',
        'The cleanmaxxing posture: most men asking about procedures should fix the foundations first. Body composition, skin baseline (retinoid + SPF), hair plan, grooming, sleep, training. These move the face more than people expect, cost a fraction of what procedures cost, and don\'t carry the regret tail.',
      ],
    },
    {
      heading: 'Botox — the safest entry point',
      body: [
        'Lowest-risk, highest-ROI entry into cosmetic intervention. Temporary, reversible, fast, and effective when applied with restraint. Where men benefit most: forehead lines (kept subtle), crow\'s feet, frown lines, masseter slimming (underrated for lower-face proportions), and a controlled brow lift.',
        'The failure mode is overuse — frozen, expressionless, or uncanny results that read as altered. Conservative dosing matters more than which areas are treated. Men generally need more units than women to get equivalent effect, which raises cost per session.',
        'Cost: roughly $300-800 per session, recurring every 3-6 months. The recurring nature is part of the commitment — plan annual budget, not session budget.',
      ],
    },
    {
      heading: 'Buccal fat removal — right candidate, conservative surgeon',
      body: [
        'Surgically excises lower-cheek fat for a more angular look. Aggregate satisfaction rates are high but the regret pattern is specific: too young, too lean, no persistent fullness, or aggressive removal. The procedure ages poorly — natural facial fat decreases with age regardless, and removed buccal fat compounds that effect over decades.',
        'Strong candidate: persistent lower-cheek fullness despite leanness, strong cheekbone and jaw support, stable weight, older enough that baby fat would not have resolved naturally. Weak candidate: under 25, already lean, chasing a trend, trying to fix general facial softness rather than true buccal fullness.',
        'Reversal is not a reset button. Restoration via fat transfer, filler, or Sculptra is expensive, multi-session, and may not recreate original anatomy. The candidate assessment before surgery is the only meaningful risk management.',
      ],
    },
    {
      heading: 'Rhinoplasty — high impact, high requirement',
      body: [
        'The nose is judged relative to the chin, jaw, cheekbones, and overall facial proportions — not in isolation. Some men do not need a smaller nose so much as they need better overall facial balance. Try framing interventions first: chin projection (implant or filler), body composition revealing jaw definition, hair volume on top, beard density. These often resolve nose complaints without surgery.',
        'When rhinoplasty is genuinely indicated — large dorsal hump, drooping tip, major asymmetry, post-traumatic deformity, breathing problem — the goal is refinement, not a different identity. Best outcomes produce "he looks better," not "he had his nose done." Conservative, masculine bridge and tip preservation matter; trend-chasing produces regret.',
        'Surgeon selection matters more here than in almost any other cosmetic procedure. Revision rates run 5-15% in published literature. Cost: $8,000-20,000 in the U.S.',
      ],
    },
    {
      heading: 'Chin and jaw — high-leverage when the structure asks for it',
      body: [
        'A recessed chin makes every other facial feature read worse — the nose looks bigger, the jawline looks weaker, the lower face loses balance. Chin projection (implant for permanence, filler for a temporary alternative) is one of the highest-leverage structural moves available. Unlike buccal fat removal, this adds rather than subtracts — the regret tail is meaningfully shorter.',
        'Jaw filler and other contour fillers can sharpen mandibular definition. Effects are temporary (6-18 months depending on product) and additive, so the reversibility profile is better than surgical implants. Surgeon quality still matters — over-filled jaws read as caricature.',
        'Chin implant cost: $3,000-7,000 one-time. Filler: $800-2,500 per session, repeated.',
      ],
    },
    {
      heading: 'Filler — volume and contour, used carefully',
      body: [
        'Hyaluronic-acid fillers add volume to specific areas — cheeks (midface restoration), jaw, chin, lips. Effects are temporary (6-18 months) and reversible (hyaluronidase dissolves them). The reversibility makes filler a lower-stakes way to test whether structural addition would help before committing to surgery.',
        'Lip filler on men reads poorly more often than not — the proportional change is harder to make subtle. Cheek and chin filler can be excellent in the right candidate; midface volume restoration in the late thirties and beyond addresses the gauntness that comes from natural fat loss with age.',
        'Sculptra is a biostimulator that triggers gradual collagen synthesis over months. Different mechanism from HA filler; longer-lasting (1-2+ years); not reversible the same way. Used for broader volume restoration.',
      ],
    },
    {
      heading: 'How the personalized read uses your data',
      body: [
        'The procedural-fit check below reads your baseline face photo against your structured state — age, age-feel, budget tier, hair journey status, skincare baseline. It produces a primary recommendation (often "no procedure yet," which is a strong answer), zero to two secondary recommendations, an explicit list of procedures it\'s down-weighting and why, and a foundations check if anything upstream should be addressed first.',
        'It does not score you. It does not rank you against anyone. It tells you, given your face and your state, where the highest-leverage procedural lever is — and where there isn\'t one yet. Most reads will name fewer levers than you might expect; that\'s the design.',
        'Re-runs are useful when something foundational has changed — body composition, hair journey progress, skincare baseline established. The recommendation you got at month one may not be the recommendation at month twelve.',
      ],
    },
  ],
};
