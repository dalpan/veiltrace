import type { LexiconEntry, Signal, SignalId, SignalKind } from '../types.js';
import { EN } from './en.js';
import { ID } from './id.js';
import { NEUTRAL } from './neutral.js';

export const LEXICON: readonly LexiconEntry[] = [...NEUTRAL, ...EN, ...ID];

export const SIGNALS: readonly Signal[] = [
  { id: 'A.OPEN_RUN', kind: 'action', description: 'Open the Run dialog, a terminal, PowerShell or a command prompt' },
  { id: 'A.PASTE', kind: 'action', description: 'Paste clipboard content into that surface' },
  { id: 'A.EXECUTE', kind: 'action', description: 'Confirm execution (Enter, OK, run the command)' },
  { id: 'A.COMMAND', kind: 'action', description: 'A shell command is present (strong: execution/download/encoded shape)' },
  { id: 'A.COPY_TRIGGER', kind: 'action', description: 'A control or instruction that copies text to the clipboard' },
  { id: 'P.HUMAN_VERIFY', kind: 'pretext', description: 'Fake human/bot verification (strong pretext)' },
  { id: 'P.FAKE_FIX', kind: 'pretext', description: 'Error, fix or update framing (weak pretext)' },
  { id: 'P.URGENCY', kind: 'pretext', description: 'Deadline, loss or threat (weak pretext)' },
  { id: 'P.AUTHORITY', kind: 'pretext', description: 'Claimed authority (weak pretext)' },
  { id: 'C.NEGATION', kind: 'context', description: 'Negation cue bound to an action' },
  { id: 'C.REPORTED', kind: 'context', description: 'Reported-speech cue: describes what someone else was told' },
  { id: 'C.EDUCATIONAL', kind: 'context', description: 'Educational or awareness framing' },
];

const KIND_BY_SIGNAL = new Map<SignalId, SignalKind>(SIGNALS.map((s) => [s.id, s.kind]));

export function kindOf(signal: SignalId): SignalKind {
  return KIND_BY_SIGNAL.get(signal) as SignalKind;
}
