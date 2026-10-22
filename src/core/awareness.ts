// Awareness phrasing shared by the experimental detectors (cred, pay, sup). Detector-local so the ClickFix lexicon stays unchanged.
// "Waspadai …" frames the text as awareness material (C.EDUCATIONAL); "pesan yang mengatasnamakan petugas pajak dan meminta
// transfer" describes what someone else asks for (C.REPORTED), so a request after it is not addressed to the reader.
import { B, E } from './lexicon/patterns.js';

const CARRIER = '(?:pesan|sms|telepon|telpon|panggilan|akun|pihak|oknum|tautan|link|modus|penipu|orang)';

export const AWARENESS_ID = `${B}(?:waspada(?:i|lah)?|hati-hati(?:lah)?)\\s+(?:terhadap\\s+|dengan\\s+)?${CARRIER}${E}`;
export const AWARENESS_ID_EXAMPLES = ['Waspadai pesan', 'hati-hati terhadap tautan', 'waspada terhadap oknum'];

export const IMPERSONATION_REPORT_ID = `${B}${CARRIER}\\s+(?:yang|yg)\\s+(?:mengatasnamakan|mengaku(?:\\s+sebagai)?)${E}`;
export const IMPERSONATION_REPORT_ID_EXAMPLES = ['pesan yang mengatasnamakan', 'oknum yang mengaku sebagai', 'pihak yg mengatasnamakan'];
