// Color palette card — visual swatches keyed off skin_undertone from
// the V2 granular axes (mig 0093). The same rule that fires in
// lib/style/report-prompt.ts:74-76 inside the generated report,
// surfaced as a discoverable standalone panel above Stage 1 so users
// see the palette while shopping rather than buried in report prose.
//
// Pre-migration assessments (skin_undertone null) → renders nothing.
// Body-dimension principles (leg_length, arm_length) live in
// BodyAxesPanel; this card owns color only.

import { WhyThis } from '@/components/why-this';
import type { SkinUndertone } from '@/lib/style/types';

type Swatch = {
  hex: string;
  label: string;
  // White text vs zinc-900 text — overridden when the swatch is too
  // dark or too light for the default contrast.
  textOnSwatch?: 'light' | 'dark';
};

type PaletteContent = {
  title: string;
  description: string;
  anchorLabel: string;
  anchor: Swatch[];
  avoidLabel: string | null;
  avoid: Swatch[];
  jewelryNote: string;
  // "Why these colors?" expander content. 3-5 short bullets explaining
  // the undertone framework so users who want the rationale can read
  // it without it cluttering the default surface.
  rationale: string[];
};

const PALETTE_BY_UNDERTONE: Record<SkinUndertone, PaletteContent> = {
  cool: {
    title: 'Your palette — cool',
    description:
      "Anchor near the face in the cool family. Warm tones can still appear in shoes, belts, or accessories below the collarline — just keep them away from the face where they'd fight your undertone.",
    anchorLabel: 'Wear near the face',
    anchor: [
      { hex: '#1B2845', label: 'Navy', textOnSwatch: 'light' },
      { hex: '#36454F', label: 'Charcoal', textOnSwatch: 'light' },
      { hex: '#708090', label: 'Slate grey', textOnSwatch: 'light' },
      { hex: '#FFFFFF', label: 'True white', textOnSwatch: 'dark' },
      { hex: '#0F52BA', label: 'Sapphire', textOnSwatch: 'light' },
      { hex: '#046307', label: 'Emerald', textOnSwatch: 'light' },
    ],
    avoidLabel: 'Keep away from the face',
    avoid: [
      { hex: '#D2691E', label: 'Warm orange', textOnSwatch: 'light' },
      { hex: '#FFDB58', label: 'Mustard', textOnSwatch: 'dark' },
      { hex: '#8B4513', label: 'Warm brown', textOnSwatch: 'light' },
    ],
    jewelryNote:
      'Jewelry test: silver and platinum suit you more than gold or brass.',
    rationale: [
      'Cool undertone means your skin reads with blue, pink, or rosy base notes — color theory says colors with the same temperature flatter, opposite-temperature colors fight.',
      'Navy, charcoal, and slate share a cool base; jewel tones (sapphire, emerald) read saturated against cool skin without competing.',
      'True white (vs cream or off-white) lifts a cool complexion; warm whites can pull yellow against the face.',
      'Warm oranges, mustards, and warm browns near the collarline reflect warmth onto your skin and clash — they\'re fine on shoes, belts, or pants where the face isn\'t adjacent.',
      'Framework borrowed from the Real Men Real Style + Gentleman\'s Gazette undertone literature; the jewelry test (silver vs gold flatter) is the cheapest 30-second self-check.',
    ],
  },
  warm: {
    title: 'Your palette — warm',
    description:
      "Anchor near the face in the warm family. Cool tones can still appear lower in the outfit — keep them away from the collarline where they'd fight your undertone.",
    anchorLabel: 'Wear near the face',
    anchor: [
      { hex: '#708238', label: 'Olive', textOnSwatch: 'light' },
      { hex: '#B7410E', label: 'Rust', textOnSwatch: 'light' },
      { hex: '#CC7722', label: 'Ochre', textOnSwatch: 'light' },
      { hex: '#654321', label: 'Warm brown', textOnSwatch: 'light' },
      { hex: '#FFFDD0', label: 'Cream', textOnSwatch: 'dark' },
    ],
    avoidLabel: 'Keep away from the face',
    avoid: [
      { hex: '#ADD8E6', label: 'Icy blue', textOnSwatch: 'dark' },
      { hex: '#8C92AC', label: 'Cool grey', textOnSwatch: 'light' },
      { hex: '#FFFFFF', label: 'Stark white', textOnSwatch: 'dark' },
    ],
    jewelryNote:
      'Jewelry test: gold and brass suit you more than silver.',
    rationale: [
      'Warm undertone means your skin reads with yellow, peach, or golden base notes — colors with the same temperature flatter, opposite-temperature colors fight.',
      'Olive, rust, ochre, and warm browns share a warm base and pull your complexion forward without competing.',
      'Cream (vs stark white) lifts a warm complexion; stark white can pull cold and grey-out the face.',
      'Icy blues and cool greys near the collarline reflect cool light onto warm skin and create a washed-out read — they work fine in pants, shoes, or accessories below the chest.',
      'Framework borrowed from the Real Men Real Style + Gentleman\'s Gazette undertone literature; the jewelry test (gold vs silver flatter) is the cheapest 30-second self-check.',
    ],
  },
  neutral: {
    title: 'Your palette — neutral',
    description:
      "Most colors work credibly on you, which is the easy mode of color. When in doubt, lean toward whichever your eyes (and beard or hair, when present) most clearly point at — hazel/amber/golden-brown eyes or a warm-brown beard toward warm tones near the face; blue/grey eyes or a cool/silver/grey beard toward cool tones. Pick a direction per outfit so the look doesn't read undecided.",
    anchorLabel: 'A balanced default',
    anchor: [
      { hex: '#1B2845', label: 'Navy', textOnSwatch: 'light' },
      { hex: '#36454F', label: 'Charcoal', textOnSwatch: 'light' },
      { hex: '#FFFFFF', label: 'White', textOnSwatch: 'dark' },
      { hex: '#708238', label: 'Olive', textOnSwatch: 'light' },
      { hex: '#654321', label: 'Brown', textOnSwatch: 'light' },
      { hex: '#FFFDD0', label: 'Cream', textOnSwatch: 'dark' },
    ],
    avoidLabel: null,
    avoid: [],
    jewelryNote:
      'Jewelry: either silver or gold works. Pick per outfit, then commit — mixing in the same look reads inconsistent.',
    rationale: [
      'Neutral undertone means your skin doesn\'t lean strongly cool or warm — most palettes work, which is why both jewelry tones flatter.',
      'The default swatches above are the highest-leverage versatile core: navy + charcoal + olive + brown + white + cream cover business, casual, and most archetypes without fighting your face.',
      'When you do want to lean a direction, eye color is the most universal read (hazel/amber/golden-brown → warm; blue/grey → cool); facial hair color is the next-best signal when present.',
      'The trap with neutral is wearing one warm piece and one cool piece together near the face — the look reads undecided. Pick a direction per outfit and commit.',
      'Framework borrowed from the Real Men Real Style + Gentleman\'s Gazette undertone literature.',
    ],
  },
};

type Props = {
  skinUndertone: SkinUndertone | null;
};

export function ColorPaletteCard({ skinUndertone }: Props) {
  if (!skinUndertone) return null;
  const palette = PALETTE_BY_UNDERTONE[skinUndertone];

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <header className="mb-4">
        <h2 className="text-lg font-medium tracking-tight">
          {palette.title}
        </h2>
      </header>
      <p className="mb-5 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
        {palette.description}
      </p>

      <div className="space-y-5">
        <SwatchRow label={palette.anchorLabel} swatches={palette.anchor} />
        {palette.avoidLabel && palette.avoid.length > 0 && (
          <SwatchRow
            label={palette.avoidLabel}
            swatches={palette.avoid}
            muted
          />
        )}
      </div>

      <p className="mt-5 text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">
        {palette.jewelryNote}
      </p>

      <WhyThis lines={palette.rationale} label="Why these colors?" />
    </section>
  );
}

function SwatchRow({
  label,
  swatches,
  muted = false,
}: {
  label: string;
  swatches: Swatch[];
  muted?: boolean;
}) {
  return (
    <div>
      <p
        className={
          muted
            ? 'mb-2 text-[12px] uppercase tracking-wider text-zinc-500'
            : 'mb-2 text-[12px] uppercase tracking-wider text-zinc-700 dark:text-zinc-300'
        }
      >
        {label}
      </p>
      <div
        className={
          muted
            ? 'flex flex-wrap gap-2 opacity-70'
            : 'flex flex-wrap gap-2'
        }
      >
        {swatches.map((s) => (
          <div
            key={`${s.hex}-${s.label}`}
            className="flex h-16 w-24 flex-col justify-end rounded-md border border-zinc-200 px-2 py-1.5 shadow-sm dark:border-zinc-700"
            style={{ backgroundColor: s.hex }}
          >
            <span
              className="text-[11px] font-medium leading-tight"
              style={{
                color: s.textOnSwatch === 'dark' ? '#18181b' : '#ffffff',
                textShadow:
                  s.textOnSwatch === 'dark'
                    ? '0 1px 0 rgba(255,255,255,0.3)'
                    : '0 1px 0 rgba(0,0,0,0.3)',
              }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
