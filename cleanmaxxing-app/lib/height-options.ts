/**
 * Shared height-dropdown options.
 *
 * Stored value: inches as a string (e.g. "70"). Display label:
 * feet'inches" (e.g. 5'10"). The stored format matches everywhere
 * else in the codebase that reads height_inches as a number, so
 * downstream consumers (Mister P state, profile completion,
 * personalization) need no changes.
 *
 * Range: 4'10" (58") through 7'2" (86"). Covers 99.9% of adult
 * men. Existing column min/max remained 48–96 in the DB; the
 * narrower set here is just what we offer in the UI.
 */
export type HeightChoice = { value: string; label: string };

const MIN_INCHES = 58; // 4'10"
const MAX_INCHES = 86; // 7'2"

function inchesToLabel(totalInches: number): string {
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}"`;
}

export const HEIGHT_OPTIONS: HeightChoice[] = (() => {
  const out: HeightChoice[] = [];
  for (let i = MIN_INCHES; i <= MAX_INCHES; i += 1) {
    out.push({ value: String(i), label: inchesToLabel(i) });
  }
  return out;
})();

export function labelForInches(inches: number | null | undefined): string | null {
  if (inches === null || inches === undefined || !Number.isFinite(inches)) return null;
  return inchesToLabel(Math.round(inches));
}
