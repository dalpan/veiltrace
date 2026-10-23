// Cleans OCR output of a phone screenshot into message lines. Pure; shared by the "Cek Pesan" app (D-104) and the
// real-world import tooling (D-096).

/**
 * OCR output is one screen line per line: drops clock times, status-bar fragments and single characters, and joins a line
 * that continues the previous sentence (the previous line has no closing punctuation and this one starts in lower case).
 */
export function cleanOcrLines(lines: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.replace(/\s+/gu, ' ').trim();
    if (!line || /^\d{1,2}[.:]\d{2}(?:\s*[✓√]+)?$/u.test(line) || (line.match(/\p{L}/gu) ?? []).length < 2) continue;
    const prev = out[out.length - 1];
    if (prev !== undefined && !/[.!?:;)\]]$/u.test(prev) && /^\p{Ll}/u.test(line)) out[out.length - 1] = `${prev} ${line}`;
    else out.push(line);
  }
  return out;
}
