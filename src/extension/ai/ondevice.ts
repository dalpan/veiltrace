// Optional on-device AI second opinion (D-093): the browser's built-in language model (Chrome's Prompt API, Gemini Nano).
// Runs only in the popup, only after the user has seen the payload and clicked, and only on the device: this module makes no
// network request (Chrome downloads the model itself the first time). Where the API is missing (Firefox, Android, older
// Chrome) the feature reports "unsupported" and nothing else happens.
import { AI_RESPONSE_SCHEMA, AI_SYSTEM_PROMPT, buildAiPrompt, parseAiOpinion, type AiOpinion } from './opinion.js';

export type AiAvailability = 'unsupported' | 'unavailable' | 'downloadable' | 'downloading' | 'available';

interface Session {
  prompt(input: string, options?: { responseConstraint?: unknown; signal?: AbortSignal }): Promise<string>;
  destroy(): void;
}
interface Monitor {
  addEventListener(type: 'downloadprogress', cb: (e: { loaded: number }) => void): void;
}
interface LanguageModelApi {
  availability(options?: unknown): Promise<string>;
  create(options?: unknown): Promise<Session>;
}

// The model officially supports English (not Indonesian); answers are fixed values rendered in the UI language.
const LANGUAGES = { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] };

function api(): LanguageModelApi | null {
  const lm = (globalThis as { LanguageModel?: LanguageModelApi }).LanguageModel;
  return lm && typeof lm.availability === 'function' && typeof lm.create === 'function' ? lm : null;
}

export async function aiAvailability(): Promise<AiAvailability> {
  const lm = api();
  if (!lm) return 'unsupported';
  try {
    const a = await lm.availability(LANGUAGES);
    return a === 'available' || a === 'downloadable' || a === 'downloading' ? a : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/** Must be called from a click (the first call may start the model download). Null when the answer is not valid. */
export async function askAi(lines: readonly string[], onProgress: (fraction: number) => void, signal?: AbortSignal): Promise<AiOpinion | null> {
  const lm = api();
  if (!lm) return null;
  const session = await lm.create({
    ...LANGUAGES,
    initialPrompts: [{ role: 'system', content: AI_SYSTEM_PROMPT }],
    monitor: (m: Monitor) => m.addEventListener('downloadprogress', (e) => onProgress(e.loaded)),
    ...(signal ? { signal } : {}),
  });
  try {
    const raw = await session.prompt(buildAiPrompt(lines), { responseConstraint: AI_RESPONSE_SCHEMA, ...(signal ? { signal } : {}) });
    return parseAiOpinion(raw, lines.length);
  } finally {
    session.destroy();
  }
}
