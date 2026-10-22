// Optional on-device AI second opinion (D-093): the text the model is allowed to read. Built in the tab's isolated world from
// the same visible block text the detectors read (never form-field values), masked and capped, and shown to the user before
// anything runs. Pure: no DOM, no network.

export const AI_MAX_LINES = 150;
export const AI_MAX_CHARS = 6000;
const LINE_MAX_CHARS = 300;

export interface AiPayload {
  lines: string[];
  truncated: boolean;
}

const MASKS: ReadonlyArray<[RegExp, string]> = [
  [/[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[a-z]{2,}/giu, '[EMAIL]'],
  [/\bhttps?:\/\/\S+|\bwww\.\S+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\/\S*/giu, '[LINK]'],
  // Phone, account, card and code numbers: six or more digits, possibly grouped ("0812 3456 7890", "4665-1234").
  [/\+?\d(?:[\d\s().-]{4,}\d)/gu, '[NUMBER]'],
];

/** Masks addresses, links and long or grouped numbers. Short amounts ("Rp 50.000" keeps its shape) stay readable. */
export function maskForAi(text: string): string {
  let out = text;
  for (const [re, to] of MASKS) {
    // Amounts written with thousand separators ("1.500.000") are not identifiers and stay readable.
    out = out.replace(re, (m) => (to === '[NUMBER]' && (m.replace(/\D/gu, '').length < 6 || /^\d{1,3}(?:[.,]\d{3})+$/u.test(m)) ? m : to));
  }
  return out;
}

/** One masked line per non-empty block, repeated neighbours dropped, each line and the total capped. */
export function buildAiPayload(texts: readonly string[]): AiPayload {
  const lines: string[] = [];
  let chars = 0;
  let truncated = false;
  for (const raw of texts) {
    const text = maskForAi(raw.replace(/\s+/gu, ' ').trim()).slice(0, LINE_MAX_CHARS);
    if (!text || text === lines[lines.length - 1]) continue;
    if (lines.length >= AI_MAX_LINES || chars + text.length > AI_MAX_CHARS) {
      truncated = true;
      break;
    }
    lines.push(text);
    chars += text.length;
  }
  return { lines, truncated };
}

/** Exact-shape validation of what the tab returned. */
export function parseAiPayload(x: unknown): AiPayload | null {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>;
  if (Object.keys(o).sort().join() !== 'lines,truncated' || typeof o.truncated !== 'boolean' || !Array.isArray(o.lines)) return null;
  if (o.lines.length > AI_MAX_LINES || !o.lines.every((l) => typeof l === 'string' && l.length <= LINE_MAX_CHARS)) return null;
  return { lines: o.lines as string[], truncated: o.truncated };
}
