// Hair product-match quiz catalog — interactive engagement surface
// for /plan/hair. The user reads a hair-and-situation scenario, then
// picks the right product from 4 options. Teaches the framework in
// POV 61 (Hair Styling Products) by walking through the most common
// mismatches: gel on thinning hair, cream on oily fine hair, slick
// products on a guy with strong greys but dense top, etc.
//
// Voice rules (carry from POV 61 and the Style ROI quiz):
//   - Direct, dry, never lectures
//   - No "great choice!" — even on a right answer
//   - Names the underlying lever (control / shape / texture / finish)
//     in the explanation, not just the product
//
// Unlike the Style ROI quiz (3 fixed tiers across all items), each
// scenario here has its own 4-option product set. That's because the
// product space is broad and pre-filtering to 4 reasonable-looking
// options per scenario is itself part of the teach — the wrong
// options are wrong for a learnable reason, not random distractors.

export type HairProductQuizOption = {
  // Stable id for keying the option button.
  id: string;
  // The product label shown on the button.
  label: string;
};

export type HairProductQuizItem = {
  // Stable id for keying React lists.
  id: string;
  // Scenario headline — the hair-and-situation in one short line.
  scenario: string;
  // 1-line detail under the headline (texture, density, weather,
  // intent). Sets up the call.
  context: string;
  // The 4 options to choose from. Order is presentation order — the
  // correct answer's position varies across items so it isn't
  // pattern-matchable by ordinal position.
  options: ReadonlyArray<HairProductQuizOption>;
  // The id of the correct option.
  correct_option_id: string;
  // Mister P's reasoning. 2-4 sentences. Names the underlying lever
  // (shine vs matte / weight vs lift / control vs flow) and what
  // makes the other options wrong.
  explanation: string;
};

export const HAIR_PRODUCT_QUIZ_ITEMS: ReadonlyArray<HairProductQuizItem> = [
  {
    id: 'fine-thinning-humid',
    scenario: 'Fine, thinning hair on a humid summer day, casual outfit.',
    context:
      'Density visibly down on top. Walking around outside, sweating moderately. Want to look pulled-together but not stiff.',
    options: [
      { id: 'wet-gel', label: 'Wet-look gel' },
      { id: 'matte-clay', label: 'Matte clay' },
      { id: 'heavy-cream', label: 'Heavy cream' },
      { id: 'hairspray', label: 'Hairspray as primary' },
    ],
    correct_option_id: 'matte-clay',
    explanation:
      'Matte clay adds grit, reduces shine, creates lift, and makes thin hair look denser by lifting roots off the scalp. Wet gel does the opposite — shine + clumping makes scalp visibility worse, which is the failure mode for thinning hair. Heavy cream weights fine hair flat and reads greasy in humidity. Hairspray is a finisher, not a primary — it can\'t add the texture this hair needs.',
  },
  {
    id: 'thick-straight-formal',
    scenario: 'Thick straight hair, dense hairline, formal evening event.',
    context:
      'Wedding or work dinner. Want polish without looking like a 1950s costume. Hair behaves well, holds shape easily.',
    options: [
      { id: 'matte-clay', label: 'Matte clay' },
      { id: 'low-shine-pomade', label: 'Low-shine pomade' },
      { id: 'sea-salt-spray', label: 'Sea salt spray' },
      { id: 'cream', label: 'Styling cream' },
    ],
    correct_option_id: 'low-shine-pomade',
    explanation:
      'Thick straight hair handles polish; the question is just how much shine. Low-shine pomade reads adult and intentional — gives control and a soft polished finish without crossing into shellacked or wet. Matte clay is correct casual but reads too rugged for a formal context. Sea salt spray and cream both give movement, which is the opposite of what formal asks for.',
  },
  {
    id: 'wavy-natural-day',
    scenario: 'Wavy hair, casual Saturday, want the wave to read naturally.',
    context:
      'Medium-length, healthy wave pattern. Want the "good hair day" look — moving, soft, not fighting the texture.',
    options: [
      { id: 'heavy-pomade', label: 'Heavy water-based pomade' },
      { id: 'cream', label: 'Styling cream' },
      { id: 'mousse', label: 'Mousse' },
      { id: 'fiber', label: 'Fiber' },
    ],
    correct_option_id: 'cream',
    explanation:
      'Cream is the natural-flow product — light hold, moisture, soft finish, enhances wave instead of overriding it. Heavy pomade flattens the wave shape into a uniform direction (wrong for "natural"). Mousse is a fine-hair / thinning-hair lift product, overkill here. Fiber is for short structured styles — gives the wrong texture for medium wavy hair.',
  },
  {
    id: 'curly-frizz-winter',
    scenario: 'Tight curls fighting frizz in dry winter air.',
    context:
      'Cold + low humidity is stripping moisture. Curls reading dusty and undefined by the end of the day.',
    options: [
      { id: 'matte-clay', label: 'Matte clay' },
      { id: 'curl-cream-leave-in', label: 'Curl cream + leave-in conditioner' },
      { id: 'light-gel', label: 'Light gel for definition' },
      { id: 'sea-salt-spray', label: 'Sea salt spray' },
    ],
    correct_option_id: 'curl-cream-leave-in',
    explanation:
      'Curly hair needs moisture and shape, not control. Curl cream + leave-in is the load-bearing combo — restores moisture the dry air strips, defines the curl pattern, fights frizz. Matte clay actively dries curls out and makes them look dusty. Light gel can work for definition but doesn\'t solve the moisture problem underneath. Sea salt spray accelerates frizz — sodium pulls moisture.',
  },
  {
    id: 'greys-dense-top',
    scenario:
      'Short greys coming in, density on top still strong, want to lean into the look rather than hide it.',
    context:
      'Mid-late 30s. Hair is dense up top with visible greys throughout. Wants the greys to read as deliberate, not as something being fought.',
    options: [
      { id: 'texture-powder', label: 'Texture powder' },
      { id: 'matte-clay', label: 'Matte clay' },
      { id: 'slick-pomade-gel', label: 'Low-shine pomade or gel (slicked look)' },
      { id: 'cream', label: 'Styling cream' },
    ],
    correct_option_id: 'slick-pomade-gel',
    explanation:
      'This is the inverse of the usual gel-avoids-thin-hair rule. With density still strong, a slicked or wet-look finish integrates greys as a deliberate aesthetic choice — the polished look frames the grey as intentional rather than as something the user is dodging. Matte products fight the move; texture powder and cream don\'t commit hard enough to the aesthetic to make it land. Only works because the density supports the shine — same product on a thinning scalp would read very differently.',
  },
  {
    id: 'diffuse-thinning-lift',
    scenario:
      'Diffuse thinning on top. Want lift and volume before blow-drying.',
    context:
      'Hair has thinned evenly across the crown over the last few years. Looking for the move that adds visible density without obvious product.',
    options: [
      { id: 'heavy-pomade', label: 'Heavy water-based pomade' },
      { id: 'mousse', label: 'Mousse, then blow-dry' },
      { id: 'heavy-cream', label: 'Heavy cream' },
      { id: 'hair-oil', label: 'Hair oil for shine' },
    ],
    correct_option_id: 'mousse',
    explanation:
      'Mousse + blow-dryer is the underrated thinning-hair move — adds visible lift at the root without the obvious "I used product" look, and finishes matte. Heavy pomade and heavy cream both weight thin hair flat, accelerating the visible-scalp problem they\'re trying to solve. Hair oil is the worst call here — shine on a thinning scalp doubles down on the exact thing to avoid.',
  },
  {
    id: 'long-wavy-dry-winter',
    scenario: 'Long wavy hair, dry winter climate, ends getting brittle.',
    context:
      'Shoulder-length or longer wavy hair. Cold air + indoor heat is making the ends stringy and dry. Want the hair to look healthy.',
    options: [
      { id: 'matte-clay', label: 'Matte clay' },
      { id: 'sea-salt-spray', label: 'Sea salt spray' },
      { id: 'leave-in-conditioner', label: 'Leave-in conditioner' },
      { id: 'hairspray', label: 'Hairspray' },
    ],
    correct_option_id: 'leave-in-conditioner',
    explanation:
      'Long hair only works if it looks healthy. Leave-in conditioner restores moisture to the ends, reduces frizz, and adds the soft touchable finish long hair needs to read good rather than neglected. Matte clay and sea salt spray are both drying — they\'ll accelerate the brittleness. Hairspray adds hold but ignores the underlying moisture problem.',
  },
  {
    id: 'buzz-advanced-balding',
    scenario:
      'Buzz cut, advanced balding. Heading into a full day outdoors.',
    context:
      'Scalp is visible. The hair conversation is mostly over — the question is what supports the look from here.',
    options: [
      { id: 'heavy-clay', label: 'Heavy clay' },
      { id: 'scalp-moisturizer-spf', label: 'Scalp moisturizer + SPF' },
      { id: 'gel', label: 'Gel for the remaining hair' },
      { id: 'hairspray', label: 'Hairspray' },
    ],
    correct_option_id: 'scalp-moisturizer-spf',
    explanation:
      'At this stage, hair product is misallocated effort. Scalp moisturizer + SPF prevents sun damage, keeps the scalp from reading shiny or flaky, and is the only product that actively improves the look. Heavy clay, gel, and hairspray all draw attention to the diminishing hair — the move is to redirect attention to head shape, skin, beard if present, glasses, and physique.',
  },
  {
    id: 'fine-slicked-look',
    scenario: 'Fine hair, want a slicked-back look for a night out.',
    context:
      'Hair is fine and tends to collapse under product weight. Wants the polished slicked aesthetic without the wet-on-thin look.',
    options: [
      { id: 'heavy-gel', label: 'Heavy water-based gel' },
      { id: 'mousse-pomade', label: 'Mousse base, then low-shine pomade' },
      { id: 'matte-clay', label: 'Matte clay' },
      { id: 'cream', label: 'Styling cream' },
    ],
    correct_option_id: 'mousse-pomade',
    explanation:
      'The two-product move solves the fine-hair-meets-slicked-look problem. Mousse on damp hair creates the structural base that lets the slick hold without collapsing flat; low-shine pomade on top gives the polished direction without the wet-look shine that exposes scalp on fine hair. Heavy gel weights fine hair down even further and screams scalp. Matte clay is wrong texture for slicked. Cream is too soft to hold the shape.',
  },
];

// Closing summary — surfaces after the user finishes the quiz.
// Distilled principles from POV 61. Stays under ~100 words.
export const HAIR_PRODUCT_QUIZ_CLOSING_PRINCIPLES = `Three principles that drove every call above:

1. **Matte beats shine, almost always.** Shine increases scalp visibility — the failure mode for thinning hair — and reads costume in casual contexts. The strategic exceptions (slicked-back over strong density, formal events) are the cases where the user can articulate why the shine is doing work.
2. **Product matches the hair, not the desired look.** Trying to slick fine hair with heavy gel, or texturize curly hair with dry clay, fights the material instead of using it. The look has to be reachable from the texture you actually have.
3. **The front hairline gets the least product, not the most.** Overloading the front creates separation and exposes scalp — the opposite of what most men intend. Apply back-to-front, use the leftover for the front, add more only if needed.`;
