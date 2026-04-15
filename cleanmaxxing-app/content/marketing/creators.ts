/**
 * Creator registry for parameterized landing pages (spec §9 Week 5).
 *
 * Each entry drives a page at /from/:slug. Add a new creator here and the
 * page becomes live on the next deploy — no per-creator route changes.
 *
 * `slug` must be URL-safe. `hook` is a single sentence — the piece of
 * their content that earned their audience's trust and is worth echoing
 * back on the landing page. `tone` shifts the copy slightly without
 * creating a full template fork.
 */
export type CreatorTone = 'direct' | 'analytical' | 'warm';

export type CreatorEntry = {
  slug: string;
  name: string;
  handle: string;
  hook: string;
  tone: CreatorTone;
};

export const CREATORS: Record<string, CreatorEntry> = {
  clav: {
    slug: 'clav',
    name: 'Clavicular',
    handle: '@clavicular',
    hook: 'Clav is one of the strongest voices on body composition as the primary driver of facial aesthetics — and one of the sharpest on the under-optimization gap most men sit inside.',
    tone: 'analytical',
  },
  hamza: {
    slug: 'hamza',
    name: 'Hamza',
    handle: '@hamza',
    hook: 'Hamza\u2019s work on environment, systems, and not relying on willpower is directionally correct and genuinely useful for most men trying to build consistency.',
    tone: 'warm',
  },
  'tren-twins': {
    slug: 'tren-twins',
    name: 'the Tren Twins',
    handle: '@trentwins',
    hook: 'The Tren Twins have an audience because they\u2019re honest about the work physique change actually takes — that honesty is worth hearing, with some important corrections.',
    tone: 'direct',
  },
};

export function getCreator(slug: string): CreatorEntry | null {
  return CREATORS[slug] ?? null;
}

export function allCreatorSlugs(): string[] {
  return Object.keys(CREATORS);
}
