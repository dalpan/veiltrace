// Text read from a screenshot of the tab (D-105) that the page does not already contain as text, so only words drawn inside
// images (posters, banners, photographed letters) are analyzed again. Pure.

const MAX_LINES = 400;
const MAX_LINE_CHARS = 2000;

const words = (s: string): string[] => s.toLowerCase().normalize('NFKC').match(/[\p{L}\p{N}]{3,}/gu) ?? [];

/** Validated OCR lines from the popup, or null when the input is not a short list of strings. */
export function ocrLines(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length > MAX_LINES) return null;
  if (!input.every((l): l is string => typeof l === 'string' && l.length <= MAX_LINE_CHARS)) return null;
  return input.map((l) => l.trim()).filter(Boolean);
}

/**
 * Keeps an OCR line when fewer than 70% of its words (3+ letters) occur in the page text. OCR misreads a few characters, so an
 * exact match would let page text through twice; a line with fewer than two such words carries too little to judge and is dropped.
 */
export function imageOnlyLines(lines: readonly string[], pageTexts: readonly string[]): string[] {
  const page = new Set(pageTexts.flatMap(words));
  return lines.filter((line) => {
    const w = words(line);
    if (w.length < 2) return false;
    return w.filter((x) => page.has(x)).length / w.length < 0.7;
  });
}
