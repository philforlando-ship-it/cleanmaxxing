// Single source of truth for confidence score copy.
// Imported by: weekly email template, monthly checkpoint, Today screen chart labels, dashboard.

export type ConfidenceLevel = {
  score: number;          // anchor point on the 1–10 scale
  label: string;          // 2–4 word handle for charts/badges
  description: string;    // behavioral, first-person, 1–2 sentences
};

export const CONFIDENCE_LEVELS: ConfidenceLevel[] = [
  {
    score: 1,
    label: "Hiding",
    description: "I avoid being seen. Mirrors, photos, and most social settings feel like exposure.",
  },
  {
    score: 2,
    label: "Bracing",
    description: "I get through the day but I'm always managing how I look and who's looking. It's exhausting.",
  },
  {
    score: 3,
    label: "Avoiding",
    description: "I avoid photos and mirrors. Changing clothes in front of anyone feels like an ordeal.",
  },
  {
    score: 4,
    label: "Guarded",
    description: "I'm okay in familiar situations. New social settings feel risky and I rehearse a lot.",
  },
  {
    score: 5,
    label: "Neutral",
    description: "I can take a selfie without hating it. Most days feel neutral — not great, not bad.",
  },
  {
    score: 6,
    label: "Steady",
    description: "I'm proud of how I look more days than not. I'll initiate photos sometimes.",
  },
  {
    score: 7,
    label: "Comfortable",
    description: "I feel genuinely good about my appearance. It's not something I worry about.",
  },
  {
    score: 8,
    label: "Confident",
    description: "I walk into rooms without thinking about it. My appearance is a tool, not a question.",
  },
  {
    score: 9,
    label: "Anchored",
    description: "I like how I look and I don't need anyone to confirm it. The work is maintenance, not repair.",
  },
  {
    score: 10,
    label: "Settled",
    description: "This isn't a thing I think about anymore. I'm in my body and it's fine.",
  },
];

// Snap any score (including decimals like 4.7) to the nearest defined level.
export function contextFor(score: number): ConfidenceLevel {
  const clamped = Math.max(1, Math.min(10, score));
  return CONFIDENCE_LEVELS.reduce((best, level) =>
    Math.abs(level.score - clamped) < Math.abs(best.score - clamped) ? level : best
  );
}

// For deltas: "you went from X to Y" copy used by monthly checkpoint + emails.
export function deltaPhrase(from: number, to: number): string {
  const a = contextFor(from);
  const b = contextFor(to);
  if (a.score === b.score) return `still ${a.label.toLowerCase()}`;
  return `${a.label.toLowerCase()} to ${b.label.toLowerCase()}`;
}
