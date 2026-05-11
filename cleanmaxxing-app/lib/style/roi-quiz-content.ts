// ROI quiz catalog — interactive engagement surface for /plan/style.
// Each item is a real-world purchase the user might be weighing, with
// the ROI tier Mister P would call AND the reasoning. The teaching is
// in the EXPLANATION, not the score — score is just a hook to make
// the content land.
//
// Tier definitions:
//   high   = cost-effective + durable + frequent-use foundation
//   medium = good value but situational, OR premium where the spend
//            pays off in noticeable ways short of "requires reasoning"
//   low    = high cost relative to use, status > function, or fast
//            fashion priced as foundation
//
// Voice rules same as everywhere else: direct, dry, never lectures,
// never moralizes about money. The point isn't to shame premium
// purchases — it's to make the spend deliberate. A $20K watch can be
// the right call; it just requires articulating why.

export type RoiTier = 'high' | 'medium' | 'low';

export type RoiQuizItem = {
  // Stable id for keying React lists.
  id: string;
  // Short headline that fits in a card title.
  label: string;
  // Price band + 1-line description that sets up the call.
  spec: string;
  tier: RoiTier;
  // Mister P's reasoning. 2-3 sentences. Never starts with "Great" or
  // "Awesome". Cites cost-per-wear, foundation logic, or signal/cost
  // tradeoff explicitly.
  explanation: string;
};

// Ordered intentionally — high tier first to set the foundation
// principle, then medium tier to introduce the diminishing-returns
// curve, then low tier (status/logo tax + the "requires reasoning"
// case) to land the harder lesson.
export const ROI_QUIZ_ITEMS: ReadonlyArray<RoiQuizItem> = [
  {
    id: 'white-tee',
    label: 'Plain white t-shirt',
    spec: '$25–50, heavy-cotton Supima or loopwheel — foundation tier, no logo.',
    tier: 'high',
    explanation:
      'Worn under almost everything. $25–50 hits the quality-cotton zone (heavy Supima, loopwheel mills) where fit and shoulder seam matter more than brand. Past $50 you\'re paying for the logo, not better cotton. Cost-per-wear lands near zero within a month.',
  },
  {
    id: 'leather-belt',
    label: 'Plain leather belt',
    spec: '$30–60, full-grain leather, no visible logo, classic 1.5" width.',
    tier: 'high',
    explanation:
      'Worn every day, lasts a decade if the leather is full-grain. The cost-per-wear gets absurd in your favor. Don\'t buy a logo belt — the belt is a foundation piece, foundations don\'t announce themselves.',
  },
  {
    id: 'classic-sunglasses',
    label: 'Classic-shape sunglasses',
    spec: '$150–250, acetate frames in a shape that fits your face — Persol, Ray-Ban classics, or equivalent.',
    tier: 'high',
    explanation:
      'Daily wear half the year, framing the upper face directly. The silhouette difference between $30 plastic and $200 acetate is visible from across a parking lot. Buy the shape that fits your face, not the shape that\'s trending.',
  },
  {
    id: 'mid-mechanical-watch',
    label: 'Quality mechanical watch',
    spec: '$300–800, Seiko / Hamilton / Tissot field-watch tier with a sapphire crystal.',
    tier: 'medium',
    explanation:
      'A $400 mechanical carries roughly 90% of the visual signal of a $5K watch. Past that price you\'re paying for movement complications, brand history, and resale liquidity — all real, but only worth it if you can articulate which one you\'re buying.',
  },
  {
    id: 'leather-sneakers',
    label: 'Minimal leather sneakers',
    spec: '$200–400, clean white or off-white leather — Common Projects, Stan Smith Premium, or equivalent.',
    tier: 'medium',
    explanation:
      'Pair with chinos, denim, shorts, casual suiting. $200–400 covers the minimal-leather sweet spot — clean silhouette, decent leather grade. Past $500 you\'re paying for logo placement and a marginally nicer leather upper. Solid medium-ROI when you wear them constantly.',
  },
  {
    id: 'wool-overcoat',
    label: 'Wool overcoat',
    spec: '$300–700, mid-weight wool or wool-cashmere blend, single-breasted, knee-length.',
    tier: 'medium',
    explanation:
      'Seasonal but transforms every winter outfit you wear it over. $300–700 is the real-wool sweet spot — the jump from $150 polyester-blend to $300+ real wool is dramatic and visible. Past $1,000 you\'re paying for drape and provenance — pay for the first jump, think hard about the second.',
  },
  {
    id: 'designer-hoodie',
    label: 'Logo-heavy designer hoodie',
    spec: '$400+, Balenciaga / Off-White / similar — large brand logo across the chest.',
    tier: 'low',
    explanation:
      'The hoodie underneath is the same cotton blend as a $40 Carhartt. The price is the logo and the brand statement, both of which age out in a season or two. Foundation pieces shouldn\'t be loud — and a hoodie at this price is foundation by frequency.',
  },
  {
    id: 'trendy-graphic-tee',
    label: 'Trendy graphic / logo tee',
    spec: '$50–100, branded streetwear tee with a graphic or large logo.',
    tier: 'low',
    explanation:
      'Trend-tied, dates fast, fast-fashion-quality fabric at premium-fashion prices. The lifecycle is roughly one year before it reads dated. The price is the brand name doing 80% of the work — and you\'ll replace it before it wears out.',
  },
  {
    id: 'luxury-watch',
    label: '$20K+ luxury watch',
    spec: '$20,000–50,000, Rolex Submariner / Royal Oak / Patek tier.',
    tier: 'low',
    explanation:
      'Highest-stakes "requires reasoning" purchase in style. A piece this expensive can be load-bearing if you can articulate why — genuine watch interest, a thirty-year wearer, dress-watch-as-heirloom. Without that reasoning it reads costume, regardless of how real the watch is. Default tier is low; promote it deliberately, not by impulse.',
  },
];

export const ROI_TIER_LABEL: Record<RoiTier, string> = {
  high: 'High ROI',
  medium: 'Medium ROI',
  low: 'Low ROI',
};

// Closing summary — surfaces after the user finishes the quiz.
// Distilled principles, not a rehash of items. Stays under ~80 words.
export const ROI_QUIZ_CLOSING_PRINCIPLES = `Three principles that drove every call above:

1. **Cost-per-wear beats price tag.** A $40 belt worn daily for ten years is cheaper than a $200 hoodie worn twice a month for one season.
2. **Diminishing returns past the quality threshold.** Most categories have a price point where you stop paying for product and start paying for brand. Find it; stop there unless you can articulate why you're going further.
3. **Status purchases require reasoning.** A $20K watch isn't automatically wrong — but if you can't explain in one sentence why you're buying it, it's wrong for you.`;
