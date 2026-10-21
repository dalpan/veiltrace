// User-facing wording. Never says "safe" (PRODUCT_SPEC.md §5). Severity, confidence and completeness are distinct.
import type { ScanGap } from '../../core/coverage.js';
import type { ActionRisk, Classification, Level, RuleId, SignalId, Verdict } from '../../core/types.js';

export const HEADLINE: Record<Verdict, { title: string; tone: 'danger' | 'warning' | 'neutral' }> = {
  manipulative_instruction: { title: 'Manipulative instruction detected', tone: 'danger' },
  suspicious_correlation: { title: 'Suspicious instruction detected', tone: 'warning' },
  observed_instruction: { title: 'No suspicious instructions detected in the analyzed content.', tone: 'neutral' },
  none: { title: 'No suspicious instructions detected in the analyzed content.', tone: 'neutral' },
};

export const HEADLINE_DETAIL: Record<Verdict, string> = {
  manipulative_instruction: 'This page asks you to run something on your computer and presents it as a verification step. Do not follow these instructions.',
  suspicious_correlation: 'This page asks you to run something on your computer and uses pressure, authority or a "fix" story. Be careful before following it.',
  observed_instruction: 'Instructions to run commands were found, but without signs of manipulation nearby. Only follow them if you trust the source.',
  none: 'VeilTrace looked for instructions that try to make you run commands. It did not find any in the content it could examine.',
};

export const CLASSIFICATION: Record<Classification, string> = {
  manipulative_instruction: 'Manipulative',
  suspicious_correlation: 'Suspicious',
  observed_instruction: 'Observed',
};

export const CONFIDENCE: Record<Level, string> = {
  high: 'Confidence: high',
  medium: 'Confidence: medium',
  low: 'Confidence: low',
};

export const CONFIDENCE_HELP = 'How strongly the evidence supports this classification.';

export const ACTION_RISK: Record<ActionRisk, string> = {
  high: 'Action risk: high. Following it would run code on your computer.',
  medium: 'Action risk: medium. Part of a sequence that runs code.',
};

export const RULE_EXPLANATION: Record<RuleId, string> = {
  R1: 'Asks you to open Run or a terminal, paste and execute, presented as a human-verification (CAPTCHA) step.',
  R2: 'Puts a command on your screen or clipboard and presents running it as a human-verification step.',
  R3: 'Contains part of an open, paste and execute sequence, presented as a human-verification step.',
  R4: 'Asks you to run code and uses urgency, claimed authority or a "fix this error" story nearby.',
  R5: 'Contains an instruction to run code, with no manipulation signs in the same part of the page.',
};

export const SIGNAL: Record<SignalId, string> = {
  'A.OPEN_RUN': 'Open Run / terminal',
  'A.PASTE': 'Paste step',
  'A.EXECUTE': 'Execute step',
  'A.COMMAND': 'Shell command',
  'A.COPY_TRIGGER': 'Copy / verify control',
  'P.HUMAN_VERIFY': 'Fake human verification',
  'P.FAKE_FIX': 'Error or "fix" pretext',
  'P.URGENCY': 'Urgency or threat',
  'P.AUTHORITY': 'Claimed authority',
  'C.NEGATION': 'Negation',
  'C.REPORTED': 'Reported speech',
  'C.EDUCATIONAL': 'Educational context',
};

export const SOURCE: Record<'visible-text' | 'hidden-clipboard' | 'copy-control', string> = {
  'visible-text': 'Visible text',
  'hidden-clipboard': 'Hidden clipboard text',
  'copy-control': 'Copy button',
};

export const PARTIAL: Record<ScanGap, string> = {
  'node-budget': 'The page is very large. Analysis stopped at the element limit.',
  'block-budget': 'The page is very large. Only the first 5,000 text blocks were analyzed.',
  'char-budget': 'The page contains a lot of text. Analysis stopped at the text limit.',
  timeout: 'Analysis reached its time limit. The rest of the page was not examined.',
  'block-text-capped': 'Some very long text blocks were only partly analyzed.',
  'aux-capped': 'The page has many copy buttons or hidden clipboard texts. Some were skipped.',
  'frames-skipped': 'Embedded frames from other sites could not be examined.',
  'closed-shadow-skipped': 'Some embedded page components could not be examined.',
  'extractor-truncated': 'Some content was skipped.',
  'core-truncated': 'Some content exceeded the analysis limits and was skipped.',
};

export const HIGHLIGHT_STATUS: Record<string, string> = {
  highlighted: 'Highlighted on the page.',
  'invalid-locator': 'This evidence cannot be located on the page.',
  'not-found': 'This element is no longer on the page. The page may have changed since the scan; scan again.',
  'frame-inaccessible': 'This evidence is inside an embedded frame that VeilTrace cannot highlight.',
  'not-visible': 'This evidence is not visible on the page (for example, hidden clipboard text).',
  failed: 'Could not highlight: the page is no longer accessible. Scan again.',
};

export const LIMITATIONS =
  'VeilTrace analyzes visible page text and some hidden clipboard text, on this device only. It does not examine images, videos, scripts or ' +
  'content from other sites inside frames, and it can miss instructions worded in unusual ways. A result without findings is not a guarantee.';
