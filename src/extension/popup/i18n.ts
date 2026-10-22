// UI strings in English and Indonesian, bundled in popup.js (no runtime language files, no translation service).
// Page evidence is never translated. Never says "safe". Severity, confidence and completeness stay distinct.
import type { ScanGap } from '../../core/coverage.js';
import type { CredModifierId, CredPretextSignalId, CredRuleId, CredSignalId, SecretType, TrustContext } from '../../core/credential/types.js';
import type { PayDestination, PayLimitation, PayPressure, PayPromise, PayRuleId, PaySignalId } from '../../core/payment/types.js';
import type {
  ImpersonationIndicator, SupportAction, SupportChannel, SupportClaim, SupportLimitation, SupportPressure, SupportRuleId, SupportSignalId,
} from '../../core/support/types.js';
import type { ActionRisk, Classification, FieldKind, FormDestination, Level, ModifierId, OverrideId, RuleId, SignalId, Verdict } from '../../core/types.js';
import type { Category } from './aggregate.js';

export type Lang = 'en' | 'id';
export type HighlightKey = 'highlighted' | 'invalid-locator' | 'not-found' | 'frame-inaccessible' | 'not-visible' | 'failed';
export type SourceKey = 'visible-text' | 'hidden-clipboard' | 'copy-control';

export interface Messages {
  locale: string;
  tagline: string;
  pageLabel: string;
  noPage: string;
  protectedPage: string;
  scan: string;
  scanAgain: string;
  scanning: string;
  scanFinished: string;
  languageLabel: string;
  limitsSummary: string;
  limitsText: string;
  metaIdle: string;
  meta: (engine: string, extractor: string, ms: number) => string;
  partialQualifier: string;
  classification: Record<Classification, string>;
  findingTitle: Record<Classification, string>;
  confidence: Record<Level, string>;
  confidenceHelp: string;
  actionRisk: Record<ActionRisk, string>;
  ruleChip: (id: RuleId) => string;
  rule: Record<RuleId, string>;
  signal: Record<SignalId, string>;
  source: Record<SourceKey, string>;
  deobfuscated: string;
  showOnPage: string;
  evidenceAria: string;
  highlight: Record<HighlightKey, string>;
  completeTitle: string;
  completeText: (blocks: string) => string;
  partialTitle: string;
  partialFooter: (blocks: string) => string;
  partial: Record<ScanGap, string>;
  loweredFrom: (cls: string) => string;
  contextPrefix: string;
  modifier: Record<ModifierId, string>;
  override: Record<OverrideId, string>;
  overrideCapped: string;
  contextSetAside: string;
  overrideEvidence: string;
  moreEvidence: (n: number) => string;
  moreFindings: (n: number) => string;
  /** Per-finding severity, derived one-to-one from the classification (not a score; D-073). */
  severity: Record<Classification, string>;
  /** M5.1: experimental credential-disclosure detector. */
  cred: {
    experimental: string;
    findingTitle: Record<Classification, string>;
    ruleChip: (id: CredRuleId) => string;
    rule: Record<CredRuleId, string>;
    asks: (action: 'send' | 'enter', secrets: string) => string;
    secret: Record<SecretType, string>;
    indicators: string;
    pretext: Record<CredPretextSignalId, string>;
    trust: Record<TrustContext, string>;
    destination: Record<FormDestination, string>;
    actionRisk: Record<ActionRisk, string>;
    modifier: Record<CredModifierId, string>;
    overrideLiveField: string;
    signal: Record<CredSignalId, string>;
    fieldSource: string;
    fieldKind: Record<FieldKind, string>;
    unlabeledField: string;
    limitation: Record<'claimed-identity-unverifiable' | 'destination-not-scored' | 'trust-boundary-heuristic', string>;
  };
  /** M5.2: experimental payment-manipulation detector. Trust, modifier and highlight labels are shared with `cred`. */
  pay: {
    findingTitle: Record<Classification, string>;
    ruleChip: (id: PayRuleId) => string;
    rule: Record<PayRuleId, string>;
    promise: Record<PayPromise, string>;
    destination: Record<PayDestination, string>;
    pressure: Record<PayPressure, string>;
    promisesLabel: string;
    destinationsLabel: string;
    indicators: string;
    actionRisk: Record<ActionRisk, string>;
    signal: Record<PaySignalId, string>;
    amountHidden: string;
    limitation: Record<PayLimitation, string>;
  };
  /** M5.3: experimental fake-support and authority-impersonation detector. Trust, modifier and highlight labels are shared. */
  sup: {
    findingTitle: Record<Classification, string>;
    ruleChip: (id: SupportRuleId) => string;
    rule: Record<SupportRuleId, string>;
    action: Record<SupportAction, string>;
    channel: Record<SupportChannel, string>;
    claim: Record<SupportClaim, string>;
    indicator: Record<ImpersonationIndicator, string>;
    pressure: Record<SupportPressure, string>;
    asksLabel: string;
    claimsLabel: string;
    indicatorsLabel: string;
    pressureLabel: string;
    actionRisk: Record<ActionRisk, string>;
    signal: Record<SupportSignalId, string>;
    contactHidden: string;
    limitation: Record<SupportLimitation, string>;
  };
  /** "Cek Pesan" PWA (D-084). */
  pwa: {
    title: string;
    intro: string;
    sourceLabel: string;
    source: Record<'chat' | 'sms' | 'email' | 'web', string>;
    placeholder: string;
    check: string;
    clear: string;
    paste: string;
    shareHint: string;
    privacy: string;
    empty: string;
    tooLong: string;
    linkOnly: string;
    yourMessage: string;
    offlineReady: string;
  };
  /** Opt-in automatic scanning (D-081). */
  auto: {
    actionTitle: string;
    badgeTitle: string;
    title: string;
    /** Technical label in the header and the mode summary. */
    modeLabel: Record<'manual' | 'automatic', string>;
    manualText: string;
    automaticText: string;
    consent: string;
    managedText: string;
    enable: string;
    disable: string;
    denied: string;
    failed: string;
  };
  /** M5.4: unified threat dashboard (all four detectors). */
  dash: {
    stateLabel: Record<'standby' | 'scanning' | 'complete' | 'partial' | 'error', string>;
    assessment: string;
    headline: Record<Verdict, { title: string; detail: string; tone: 'danger' | 'warning' | 'neutral' }>;
    statHighest: string;
    statActionable: string;
    statCategories: string;
    statCoverage: string;
    coverageValue: Record<'complete' | 'partial', string>;
    noCategories: string;
    verdictLabel: Record<Verdict, string>;
    overviewTitle: string;
    categoryName: Record<Category, string>;
    /** Short technical codes; identical in both languages. */
    categoryCode: Record<Category, string>;
    tileCount: (total: number, actionable: number) => string;
    experimental: string;
    experimentalNote: string;
    findingsTitle: (n: number) => string;
    observedTitle: (n: number) => string;
    groupTitle: (n: number) => string;
    groupNote: string;
    alsoCitedBy: (categories: string) => string;
    evidenceTitle: string;
    evidenceId: (id: string) => string;
    findingId: (id: string) => string;
    actionRiskChip: Record<ActionRisk, string>;
    adviceTitle: string;
    advice: Record<Category | 'remoteAccess', string>;
    adviceNone: string;
  };
  errors: {
    noPageTitle: string; noPageDetail: string;
    restrictedTitle: string; restrictedDetail: string;
    accessTitle: string; accessDetail: string; fileDetail: string;
    badReportTitle: string; badReportDetail: string;
  };
}

const EN: Messages = {
  locale: 'en-US',
  tagline: 'Uncover the manipulation behind the page',
  pageLabel: 'Page',
  noPage: 'No page',
  protectedPage: 'Protected page',
  scan: 'Scan page',
  scanAgain: 'Scan again',
  scanning: 'Scanning this page on your device…',
  scanFinished: 'Scan finished.',
  languageLabel: 'Language',
  limitsSummary: 'What VeilTrace can and cannot see',
  limitsText:
    'VeilTrace analyzes visible page text and some hidden clipboard text, on this device only. It does not examine images, videos, scripts or ' +
    'content from other sites inside frames, and it can miss instructions worded in unusual ways. A result without findings is not a guarantee.',
  metaIdle: 'Runs on this device only. Nothing is sent anywhere.',
  meta: (engine, extractor, ms) => `Engine ${engine} · extractor ${extractor} · ${ms} ms · on this device only`,
  partialQualifier: ' Part of the page could not be examined (see below).',
  classification: { manipulative_instruction: 'Manipulative', suspicious_correlation: 'Suspicious', observed_instruction: 'Observed' },
  findingTitle: { manipulative_instruction: 'Manipulative instruction', suspicious_correlation: 'Suspicious instruction', observed_instruction: 'Observed instruction' },
  confidence: { high: 'Confidence: high', medium: 'Confidence: medium', low: 'Confidence: low' },
  confidenceHelp: 'How strongly the evidence supports this classification.',
  actionRisk: {
    high: 'Action risk: high. Following it would run code on your computer.',
    medium: 'Action risk: medium. Part of a sequence that runs code.',
  },
  ruleChip: (id) => `Rule ${id}`,
  rule: {
    R1: 'Asks you to open Run or a terminal, paste and execute, presented as a human-verification (CAPTCHA) step.',
    R2: 'Puts a command on your screen or clipboard and presents running it as a human-verification step.',
    R3: 'Contains part of an open, paste and execute sequence, presented as a human-verification step.',
    R4: 'Asks you to run code and uses urgency, claimed authority or a "fix this error" story nearby.',
    R5: 'Contains an instruction to run code, with no manipulation signs in the same part of the page.',
  },
  signal: {
    'A.OPEN_RUN': 'Open Run / terminal', 'A.PASTE': 'Paste step', 'A.EXECUTE': 'Execute step', 'A.COMMAND': 'Shell command',
    'A.COPY_TRIGGER': 'Copy / verify control', 'P.HUMAN_VERIFY': 'Fake human verification', 'P.FAKE_FIX': 'Error or "fix" pretext',
    'P.URGENCY': 'Urgency or threat', 'P.AUTHORITY': 'Claimed authority', 'C.NEGATION': 'Negation', 'C.REPORTED': 'Reported speech',
    'C.EDUCATIONAL': 'Educational context',
  },
  source: { 'visible-text': 'Visible text', 'hidden-clipboard': 'Hidden clipboard text', 'copy-control': 'Copy button' },
  deobfuscated: 'disguised characters normalized',
  showOnPage: 'Show on page',
  evidenceAria: 'Evidence',
  highlight: {
    highlighted: 'Highlighted on the page.',
    'invalid-locator': 'This evidence cannot be located on the page.',
    'not-found': 'This element is no longer on the page. The page may have changed since the scan; scan again.',
    'frame-inaccessible': 'This evidence is inside an embedded frame that VeilTrace cannot highlight.',
    'not-visible': 'This evidence is not visible on the page (for example, hidden clipboard text).',
    failed: 'Could not highlight: the page is no longer accessible. Scan again.',
  },
  completeTitle: 'Complete scan',
  completeText: (n) => `${n} text blocks analyzed. Complete within what VeilTrace can see.`,
  partialTitle: 'Partial scan: some content was not examined',
  partialFooter: (n) => `Findings cover only the ${n} text blocks that were analyzed.`,
  partial: {
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
  },
  loweredFrom: (cls) => `Lowered from ${cls.toLowerCase()} because of context: `,
  contextPrefix: 'Context: ',
  modifier: {
    'C.QUOTED': 'the instruction is inside a quotation.',
    'C.REPORTED': 'the text reports what someone else was told to do.',
    'C.EDUCATIONAL': 'the surrounding text is educational or awareness material.',
    'C.CODE_EXAMPLE': 'the instruction is a code example inside an article.',
    'C.PROCEDURAL': 'the instruction is a step in a procedural document.',
  },
  override: {
    'O.CONCEALED_PAYLOAD': 'Not lowered: this part of the page also places hidden text on your clipboard, which a quotation or tutorial would not do.',
    'O.VERIFICATION_GATE': 'Not lowered: the instruction sits in a short verification dialog addressed to you.',
  },
  overrideCapped: 'Lowered by at most one level: the instruction sits in a short verification dialog addressed to you.',
  contextSetAside: 'Context set aside',
  overrideEvidence: 'Supporting evidence',
  moreEvidence: (n) => `${n} more evidence item(s) not shown.`,
  moreFindings: (n) => `${n} more finding(s) not shown (display limit).`,
  severity: { manipulative_instruction: 'Severity: high', suspicious_correlation: 'Severity: medium', observed_instruction: 'Severity: informational' },
  cred: {
    experimental: 'Experimental',
    findingTitle: { manipulative_instruction: 'Manipulative request for a secret', suspicious_correlation: 'Suspicious request for a secret', observed_instruction: 'Sign-in or code request' },
    ruleChip: (id) => `Rule ${id}`,
    rule: {
      CR1: 'Asks you to send a secret to a person or channel. Real services ask you to type codes into their own form, never to pass them on.',
      CR2: 'Asks for a wallet recovery phrase and wraps the request in a pretext. Anyone with the phrase controls the wallet.',
      CR3: 'Asks for a secret inside content the site may not control (comments, widgets, embedded frames), together with a pretext.',
      CR4: 'Asks for a secret together with a threat to suspend, lock or close your account.',
      CR5: 'Asks for a password or code with no manipulation signs nearby.',
    },
    asks: (action, secrets) => (action === 'send' ? `Asks you to send: ${secrets}` : `Asks you to enter: ${secrets}`),
    secret: { password: 'password', otp: 'one-time code', pin: 'PIN', 'recovery-code': 'recovery code', 'recovery-phrase': 'recovery phrase', token: 'access token' },
    indicators: 'Indicators',
    pretext: {
      'CP.ACCOUNT_THREAT': 'threat to the account', 'CP.URGENCY': 'deadline or urgency', 'CP.SUPPORT': 'claims to be support or an official',
      'CP.VERIFY': 'verification framing', 'CP.REWARD': 'prize or reward',
    },
    trust: {
      'user-content': 'in user-posted content', 'third-party-widget': 'in an embedded widget', 'embedded-frame': 'in an embedded frame',
      dialog: 'in a dialog', overlay: 'in an overlay', form: 'in a form',
    },
    destination: {
      none: 'The form submits to this page.', 'same-origin': 'The form submits to this site.', 'other-origin': 'The form submits to another site.',
      mailto: 'The form opens an email message.', javascript: 'The form is handled by a script on the page.', data: 'The form submits to an inline data address.',
      other: 'The form submits to an unusual address.',
    },
    actionRisk: {
      high: 'Action risk: high. Whoever gets this can take over the account or wallet.',
      medium: 'Action risk: medium. Entering it on the wrong site can expose your account.',
    },
    modifier: {
      'C.QUOTED': 'the request is inside a quotation.', 'C.REPORTED': 'the text reports what someone else was asked to do.',
      'C.EDUCATIONAL': 'the surrounding text is educational or awareness material.', 'C.CODE_EXAMPLE': 'the request is inside a code sample.',
    },
    overrideLiveField: 'Not lowered: the same part of the page has a working input field for the secret.',
    signal: {
      'S.PASSWORD': 'Password', 'S.OTP': 'One-time code', 'S.PIN': 'PIN', 'S.RECOVERY_CODE': 'Recovery code', 'S.SEED_PHRASE': 'Recovery phrase', 'S.TOKEN': 'Access token',
      'D.SEND': 'Send or share', 'D.ENTER': 'Enter', 'CP.ACCOUNT_THREAT': 'Account threat', 'CP.URGENCY': 'Urgency', 'CP.SUPPORT': 'Claimed support or authority',
      'CP.VERIFY': 'Verification framing', 'CP.REWARD': 'Reward', 'F.SECRET_FIELD': 'Input field', 'C.NEGATION': 'Negation', 'C.REPORTED': 'Reported speech',
      'C.EDUCATIONAL': 'Educational context',
    },
    fieldSource: 'Form field',
    fieldKind: {
      password: 'password', otp: 'one-time code', pin: 'PIN', 'recovery-code': 'recovery code', 'secret-phrase': 'recovery phrase', email: 'email', text: 'text', other: 'other',
    },
    unlabeledField: '(field without a label)',
    limitation: {
      'claimed-identity-unverifiable': 'VeilTrace cannot verify who wrote this. A claim to be support or an official is not proof.',
      'destination-not-scored': 'Where the form submits is shown for information only; VeilTrace does not judge sites.',
      'trust-boundary-heuristic': 'Whether this content comes from the site or from others is estimated from the page structure.',
    },
  },
  pay: {
    findingTitle: { manipulative_instruction: 'Manipulative payment request', suspicious_correlation: 'Suspicious payment request', observed_instruction: 'Payment request' },
    ruleChip: (id) => `Rule ${id}`,
    rule: {
      PR1: 'Asks you to pay first in order to receive something (a refund, a prize, released funds or an unlocked account). Real refunds and prizes never require an upfront payment.',
      PR2: 'Asks you to pay outside an ordinary checkout (a personal account, off the platform, gift cards or cryptocurrency), together with pressure. Such payments are hard to get back.',
      PR3: 'Asks for a payment together with a threat (account closure, arrest or legal action) and urgency or a claimed authority.',
      PR4: 'Asks for a payment with no manipulation signs nearby.',
    },
    promise: { refund: 'a refund', prize: 'a prize', 'account-unlock': 'an unlocked account', release: 'released money or goods', recruitment: 'a guaranteed place in a selection', job: 'a job' },
    destination: { 'personal-account': 'a personal account', 'off-platform': 'outside the platform', 'gift-card': 'gift cards', crypto: 'cryptocurrency' },
    pressure: { threat: 'threat', urgency: 'deadline or urgency', 'claimed-authority': 'claims to be support or an authority' },
    promisesLabel: 'Promised in return',
    destinationsLabel: 'Payment goes to',
    indicators: 'Indicators',
    actionRisk: {
      high: 'Action risk: high. Money sent this way is usually lost.',
      medium: 'Action risk: medium. Paying the wrong party can cost you money.',
    },
    signal: {
      'PY.PAY': 'Payment request', 'PA.AMOUNT': 'Amount', 'PF.FEE': 'Fee', 'PF.RELEASE_FEE': 'Fee to release or unlock', 'PD.PERSONAL': 'Personal account',
      'PD.OFF_PLATFORM': 'Outside the platform', 'PD.GIFT_CARD': 'Gift cards', 'PD.CRYPTO': 'Cryptocurrency', 'PR.REFUND': 'Refund or held money',
      'PR.PRIZE': 'Prize', 'PR.UNLOCK': 'Account unlock', 'PR.RECRUIT': 'Guaranteed selection', 'PR.JOB': 'Job offer', 'PC.CONDITION': 'Payment as a condition', 'PP.THREAT': 'Threat', 'PP.URGENCY': 'Urgency',
      'PP.AUTHORITY': 'Claimed support or authority', 'C.NEGATION': 'Negation', 'C.REPORTED': 'Reported speech', 'C.EDUCATIONAL': 'Educational context',
    },
    amountHidden: '(amount on the page; the value is not shown)',
    limitation: {
      'claimed-identity-unverifiable': 'VeilTrace cannot verify who wrote this. A claim to be support, a bank or the police is not proof.',
      'trust-boundary-heuristic': 'Whether this content comes from the site or from others is estimated from the page structure.',
      'amount-not-reported': 'Amounts are matched to understand the request, but their values are never copied into the report.',
    },
  },
  sup: {
    findingTitle: { manipulative_instruction: 'Manipulative support direction', suspicious_correlation: 'Suspicious support direction', observed_instruction: 'Support direction' },
    ruleChip: (id) => `Rule ${id}`,
    rule: {
      SR1: 'The web page claims your device is infected or locked and tells you to call, install or allow access. Browsers and operating systems do not show such alarms inside web pages.',
      SR2: 'Someone presenting as support, a bank or an administrator asks you to install software or allow remote access, under pressure or from content the site may not control.',
      SR3: 'Someone presenting as support, a bank or an administrator sends you to an outside contact together with a threat to your account or data.',
      SR4: 'A comment or other user-posted content presents itself as official support and sends you to an outside contact.',
      SR5: 'Directs you to contact support, install software or allow remote access, with no impersonation or pressure signs nearby.',
      SR6: 'A message presented as a notice from a bank, e-wallet, marketplace or its support raises an alarm, a threat or a reward and asks you to reply, choose an option, open a link or fill in a form. Banks and platforms do not settle such matters through a reply or a link in a message.',
      SR7: 'Congratulates you on a cash prize you did not enter for and asks you to answer a quiz, often in a company\'s name. Such quizzes lead people to share the link or hand over data or money.',
      SR8: 'Offers to get into someone else\'s messages, account or phone and sends you to a contact. Such services are illegal, and buyers are commonly cheated or blackmailed.',
    },
    action: { contact: 'contact someone', respond: 'reply, choose an option, open a link or fill in a form', survey: 'answer a quiz or questionnaire', 'remote-access': 'allow remote access', install: 'install software' },
    channel: { phone: 'phone number', mobile: 'mobile number', messenger: 'messaging app', link: 'link' },
    claim: { support: 'support or customer service', bank: 'a bank', administrator: 'an administrator', 'security-team': 'a security team', official: 'an official, officer or investigator', organization: 'a company or institution' },
    indicator: {
      'page-rendered-system-alert': 'virus or lock alarm shown by the web page', 'remote-access-request': 'asks for remote access',
      'software-install-request': 'asks you to install software', 'personal-channel-contact': 'official-sounding claim with a mobile number or messaging app',
      'claim-in-user-content': 'official claim inside user-posted content', 'alert-in-overlay': 'alarm in an overlay covering the page',
    },
    pressure: { 'system-alert': 'device alarm', 'account-alarm': 'account alarm (sign-in, transaction or tariff)', threat: 'threat to the account or data', urgency: 'deadline or urgency', reward: 'reward or points', 'pre-won': 'congratulations on a prize you did not enter for', 'illicit-access': 'offer to get into someone else\'s account or phone' },
    asksLabel: 'Asks you to',
    claimsLabel: 'Claims to be (not verified)',
    indicatorsLabel: 'Observed indicators',
    pressureLabel: 'Pressure',
    actionRisk: {
      high: 'Action risk: high. Installing software or allowing remote access can give a stranger control of your device.',
      medium: 'Action risk: medium. Contacting a fake support line can lead to requests for money, codes or access.',
    },
    signal: {
      'SC.CONTACT': 'Contact direction', 'SC.RESPOND': 'Reply, link or form request', 'SC.SURVEY': 'Quiz or questionnaire', 'SA.REMOTE': 'Remote access request', 'SA.INSTALL': 'Install request', 'SX.PHONE': 'Phone number',
      'SX.MOBILE': 'Mobile number', 'SX.MESSENGER': 'Messaging app', 'SX.LINK': 'Link', 'SI.SUPPORT': 'Claimed support', 'SI.BANK': 'Claimed bank',
      'SI.ADMIN': 'Claimed administrator', 'SI.SECURITY': 'Claimed security team', 'SI.OFFICIAL': 'Claimed official or rank', 'SW.ALERT': 'Device alarm', 'ST.THREAT': 'Threat',
      'SU.URGENCY': 'Urgency', 'SW.ACCOUNT': 'Account alarm', 'SP.REWARD': 'Reward', 'SP.WON': 'Unentered prize', 'SO.ILLICIT': 'Illegal access offer', 'SI.ORG': 'Claimed company or institution', 'SH.UNASSERTED': 'Condition or attribution', 'C.NEGATION': 'Negation', 'C.REPORTED': 'Reported speech', 'C.EDUCATIONAL': 'Educational context',
    },
    contactHidden: '(contact number on the page; not shown)',
    limitation: {
      'claimed-identity-unverifiable': 'VeilTrace cannot verify who wrote this. A claim to be support, a bank or an administrator is not proof, and VeilTrace does not say the organization itself is fake.',
      'trust-boundary-heuristic': 'Whether this content comes from the site or from others is estimated from the page structure.',
      'contact-details-not-reported': 'Phone numbers are matched to understand the direction, but are never copied into the report.',
    },
  },
  pwa: {
    title: 'Check a message',
    intro: 'Paste a suspicious message (WhatsApp, SMS, email or text from a website) to see whether it tries to manipulate you.',
    sourceLabel: 'Where is it from?',
    source: { chat: 'Chat (WhatsApp, Telegram…)', sms: 'SMS', email: 'Email', web: 'Text from a website' },
    placeholder: 'Paste the message here…',
    check: 'Check message',
    clear: 'Clear',
    paste: 'Paste from clipboard',
    shareHint: 'On Android, install this app, then use Share → VeilTrace from WhatsApp or Messages.',
    privacy: 'Checked on this device only. The message is not sent, saved or shared.',
    empty: 'Paste or share a message first.',
    tooLong: 'Only the first 20,000 characters were checked.',
    linkOnly: 'Only a link was pasted. VeilTrace checks what a message says and does not judge web addresses. Paste the whole message, including the text around the link. Do not open the link just to check it.',
    yourMessage: 'Your message',
    offlineReady: 'Ready to work offline.',
  },
  auto: {
    actionTitle: 'VeilTrace: scan this page',
    badgeTitle: 'VeilTrace: manipulative content found on this page. Click for details.',
    title: 'Scan mode',
    modeLabel: { manual: 'MANUAL', automatic: 'AUTO' },
    manualText: 'Manual: VeilTrace reads a page only when you click Scan page.',
    automaticText: 'Automatic: VeilTrace checks pages as they load and change, and marks the toolbar icon with "!" when it finds manipulative content.',
    consent: 'Chrome will ask you to let VeilTrace read all websites. Pages are still analyzed only on this device: nothing is sent, stored or shared, and form values are never read. It applies to pages opened or reloaded afterwards, and you can turn it off here or in Chrome settings at any time.',
    managedText: 'Automatic scanning is turned on by your organization. Pages are still analyzed only on this device; nothing is reported to your organization or anyone else.',
    enable: 'Turn on automatic scanning',
    disable: 'Turn off automatic scanning',
    denied: 'Permission not granted. VeilTrace stays in manual mode.',
    failed: 'The scan mode could not be changed. Try again.',
  },
  dash: {
    stateLabel: { standby: 'STANDBY', scanning: 'SCANNING', complete: 'SCAN COMPLETE', partial: 'PARTIAL SCAN', error: 'SCAN FAILED' },
    assessment: 'PAGE THREAT ASSESSMENT',
    headline: {
      manipulative_instruction: { tone: 'danger', title: 'Manipulative content detected',
        detail: 'This page tries to make you do something harmful. Do not follow the instructions listed below.' },
      suspicious_correlation: { tone: 'warning', title: 'Suspicious content detected',
        detail: 'This page combines requests with signs often seen in scams. Check the findings below before you act.' },
      observed_instruction: { tone: 'neutral', title: 'No manipulation signs in the analyzed content',
        detail: 'Ordinary instructions or requests were found and are listed as observed. This is not a guarantee about the page.' },
      none: { tone: 'neutral', title: 'Nothing to report in the analyzed content',
        detail: 'VeilTrace found no findings in what it could examine. This is not a guarantee about the page.' },
    },
    statHighest: 'Highest classification',
    statActionable: 'Actionable findings',
    statCategories: 'Affected categories',
    statCoverage: 'Scan coverage',
    coverageValue: { complete: 'Complete', partial: 'Partial' },
    noCategories: 'None',
    verdictLabel: { manipulative_instruction: 'Manipulative', suspicious_correlation: 'Suspicious', observed_instruction: 'Observed only', none: 'No findings' },
    overviewTitle: 'Detection categories',
    categoryName: {
      command: 'Command Execution Manipulation', credential: 'Credential Disclosure Manipulation', payment: 'Payment Manipulation',
      support: 'Support & Authority Impersonation',
    },
    categoryCode: { command: 'CMD', credential: 'CRED', payment: 'PAY', support: 'SUP' },
    tileCount: (total, actionable) => (total === 0 ? '0 findings' : `${actionable} actionable · ${total} total`),
    experimental: 'Experimental',
    experimentalNote: 'Credential, payment and support checks are experimental and have not yet passed an independent evaluation. They read only the page text and form structure, never what you typed, and never copy amounts or phone numbers.',
    findingsTitle: (n) => `Findings (${n})`,
    observedTitle: (n) => `Observed without manipulation signs (${n})`,
    groupTitle: (n) => `${n} related findings on the same page element`,
    groupNote: 'Each detector’s finding is shown with its own evidence.',
    alsoCitedBy: (c) => `Also cited by: ${c}`,
    evidenceTitle: 'Observed evidence',
    evidenceId: (id) => `Evidence ID ${id}`,
    findingId: (id) => `Finding ID ${id}`,
    actionRiskChip: { high: 'Action risk: high', medium: 'Action risk: medium' },
    adviceTitle: 'What to do',
    advice: {
      command: 'Do not press Win+R, open a terminal, paste or run anything this page asks for. A real CAPTCHA never asks you to run commands.',
      credential: 'Do not send passwords, one-time codes or recovery phrases to anyone. Sign in only on a site you opened yourself.',
      payment: 'Do not pay to receive a refund, prize or unlocked account, and do not pay personal accounts, gift cards or crypto on request. Contact the organization through a channel you already know.',
      support: 'Do not call numbers or message accounts shown in alerts or comments. Look up the organization’s contact details yourself.',
      remoteAccess: 'Never install remote-access apps (AnyDesk, TeamViewer) or other software because someone claiming to be support asks you to.',
    },
    adviceNone: 'No findings does not make a page trustworthy. VeilTrace checks only what it can see on this page, at the moment of the scan.',
  },
  errors: {
    noPageTitle: 'No page to scan', noPageDetail: 'Open a web page, then click the VeilTrace button again.',
    restrictedTitle: 'This page cannot be scanned',
    restrictedDetail: 'Browser-protected pages (such as chrome:// pages, the Chrome Web Store and other extensions) do not allow extensions to read them.',
    accessTitle: 'VeilTrace could not access this page',
    accessDetail: 'The page may block extensions or may have changed. Reload the page and try again.',
    fileDetail: 'To scan local files, turn on "Allow access to file URLs" for VeilTrace in chrome://extensions.',
    badReportTitle: 'Scan failed', badReportDetail: 'The scan returned unexpected data and was discarded.',
  },
};

const ID: Messages = {
  locale: 'id-ID',
  tagline: 'Ungkap manipulasi di balik halaman',
  pageLabel: 'Halaman',
  noPage: 'Tidak ada halaman',
  protectedPage: 'Halaman terlindungi',
  scan: 'Pindai halaman',
  scanAgain: 'Pindai ulang',
  scanning: 'Memindai halaman ini di perangkat Anda…',
  scanFinished: 'Pemindaian selesai.',
  languageLabel: 'Bahasa',
  limitsSummary: 'Apa yang bisa dan tidak bisa dilihat VeilTrace',
  limitsText:
    'VeilTrace menganalisis teks yang terlihat di halaman dan sebagian teks clipboard tersembunyi, hanya di perangkat ini. VeilTrace tidak memeriksa gambar, video, skrip, ' +
    'atau konten dari situs lain di dalam frame, dan bisa melewatkan instruksi yang ditulis dengan cara tidak biasa. Hasil tanpa temuan bukan jaminan.',
  metaIdle: 'Berjalan hanya di perangkat ini. Tidak ada data yang dikirim.',
  meta: (engine, extractor, ms) => `Engine ${engine} · extractor ${extractor} · ${ms} md · hanya di perangkat ini`,
  partialQualifier: ' Sebagian halaman tidak dapat diperiksa (lihat di bawah).',
  classification: { manipulative_instruction: 'Manipulatif', suspicious_correlation: 'Mencurigakan', observed_instruction: 'Teramati' },
  findingTitle: { manipulative_instruction: 'Instruksi manipulatif', suspicious_correlation: 'Instruksi mencurigakan', observed_instruction: 'Instruksi teramati' },
  confidence: { high: 'Keyakinan: tinggi', medium: 'Keyakinan: sedang', low: 'Keyakinan: rendah' },
  confidenceHelp: 'Seberapa kuat bukti mendukung klasifikasi ini.',
  actionRisk: {
    high: 'Risiko tindakan: tinggi. Mengikutinya akan menjalankan kode di komputer Anda.',
    medium: 'Risiko tindakan: sedang. Bagian dari rangkaian langkah yang menjalankan kode.',
  },
  ruleChip: (id) => `Aturan ${id}`,
  rule: {
    R1: 'Meminta Anda membuka Run atau terminal, menempelkan, lalu menjalankan, dengan dalih verifikasi manusia (CAPTCHA).',
    R2: 'Menaruh perintah di layar atau clipboard Anda dan menyajikan cara menjalankannya sebagai verifikasi manusia.',
    R3: 'Memuat sebagian rangkaian buka, tempel, dan jalankan, dengan dalih verifikasi manusia.',
    R4: 'Meminta Anda menjalankan kode dan memakai desakan, klaim otoritas, atau cerita "perbaiki error ini" di dekatnya.',
    R5: 'Memuat instruksi untuk menjalankan kode, tanpa tanda manipulasi di bagian halaman yang sama.',
  },
  signal: {
    'A.OPEN_RUN': 'Buka Run / terminal', 'A.PASTE': 'Langkah tempel', 'A.EXECUTE': 'Langkah jalankan', 'A.COMMAND': 'Perintah shell',
    'A.COPY_TRIGGER': 'Tombol salin / verifikasi', 'P.HUMAN_VERIFY': 'Verifikasi manusia palsu', 'P.FAKE_FIX': 'Dalih error atau "perbaikan"',
    'P.URGENCY': 'Desakan atau ancaman', 'P.AUTHORITY': 'Klaim otoritas', 'C.NEGATION': 'Negasi', 'C.REPORTED': 'Kalimat laporan',
    'C.EDUCATIONAL': 'Konteks edukasi',
  },
  source: { 'visible-text': 'Teks terlihat', 'hidden-clipboard': 'Teks clipboard tersembunyi', 'copy-control': 'Tombol salin' },
  deobfuscated: 'karakter samaran dinormalkan',
  showOnPage: 'Tunjukkan di halaman',
  evidenceAria: 'Bukti',
  highlight: {
    highlighted: 'Ditandai di halaman.',
    'invalid-locator': 'Bukti ini tidak dapat ditemukan di halaman.',
    'not-found': 'Elemen ini sudah tidak ada di halaman. Halaman mungkin berubah sejak pemindaian; pindai ulang.',
    'frame-inaccessible': 'Bukti ini berada di dalam frame tersemat yang tidak dapat ditandai VeilTrace.',
    'not-visible': 'Bukti ini tidak terlihat di halaman (misalnya teks clipboard tersembunyi).',
    failed: 'Tidak dapat menandai: halaman sudah tidak dapat diakses. Pindai ulang.',
  },
  completeTitle: 'Pemindaian lengkap',
  completeText: (n) => `${n} blok teks dianalisis. Lengkap sebatas yang dapat dilihat VeilTrace.`,
  partialTitle: 'Pemindaian sebagian: ada konten yang tidak diperiksa',
  partialFooter: (n) => `Temuan hanya mencakup ${n} blok teks yang dianalisis.`,
  partial: {
    'node-budget': 'Halaman sangat besar. Analisis berhenti di batas jumlah elemen.',
    'block-budget': 'Halaman sangat besar. Hanya 5.000 blok teks pertama yang dianalisis.',
    'char-budget': 'Halaman berisi sangat banyak teks. Analisis berhenti di batas teks.',
    timeout: 'Analisis mencapai batas waktu. Sisa halaman tidak diperiksa.',
    'block-text-capped': 'Beberapa blok teks yang sangat panjang hanya dianalisis sebagian.',
    'aux-capped': 'Halaman memiliki banyak tombol salin atau teks clipboard tersembunyi. Sebagian dilewati.',
    'frames-skipped': 'Frame tersemat dari situs lain tidak dapat diperiksa.',
    'closed-shadow-skipped': 'Beberapa komponen halaman tersemat tidak dapat diperiksa.',
    'extractor-truncated': 'Sebagian konten dilewati.',
    'core-truncated': 'Sebagian konten melebihi batas analisis dan dilewati.',
  },
  loweredFrom: (cls) => `Diturunkan dari ${cls.toLowerCase()} karena konteks: `,
  contextPrefix: 'Konteks: ',
  modifier: {
    'C.QUOTED': 'instruksi berada di dalam kutipan.',
    'C.REPORTED': 'teks melaporkan apa yang diminta kepada orang lain.',
    'C.EDUCATIONAL': 'teks di sekitarnya adalah materi edukasi atau kewaspadaan.',
    'C.CODE_EXAMPLE': 'instruksi adalah contoh kode di dalam artikel.',
    'C.PROCEDURAL': 'instruksi adalah langkah dalam dokumen prosedural.',
  },
  override: {
    'O.CONCEALED_PAYLOAD': 'Tidak diturunkan: bagian halaman ini juga menaruh teks tersembunyi di clipboard Anda, sesuatu yang tidak dilakukan kutipan atau tutorial.',
    'O.VERIFICATION_GATE': 'Tidak diturunkan: instruksi berada di dialog verifikasi singkat yang ditujukan kepada Anda.',
  },
  overrideCapped: 'Diturunkan paling banyak satu tingkat: instruksi berada di dialog verifikasi singkat yang ditujukan kepada Anda.',
  contextSetAside: 'Konteks yang dikesampingkan',
  overrideEvidence: 'Bukti pendukung',
  moreEvidence: (n) => `${n} bukti lainnya tidak ditampilkan.`,
  moreFindings: (n) => `${n} temuan lainnya tidak ditampilkan (batas tampilan).`,
  severity: { manipulative_instruction: 'Tingkat keparahan: tinggi', suspicious_correlation: 'Tingkat keparahan: sedang', observed_instruction: 'Tingkat keparahan: informasi' },
  cred: {
    experimental: 'Eksperimental',
    findingTitle: { manipulative_instruction: 'Permintaan rahasia yang manipulatif', suspicious_correlation: 'Permintaan rahasia yang mencurigakan', observed_instruction: 'Permintaan masuk atau kode' },
    ruleChip: (id) => `Aturan ${id}`,
    rule: {
      CR1: 'Meminta Anda mengirim rahasia kepada orang atau kanal. Layanan asli meminta Anda mengetik kode di formulirnya sendiri, tidak pernah meneruskannya.',
      CR2: 'Meminta frasa pemulihan dompet dengan suatu dalih. Siapa pun yang memegang frasa itu menguasai dompetnya.',
      CR3: 'Meminta rahasia di dalam konten yang mungkin tidak dikendalikan situs (komentar, widget, frame tersemat), disertai dalih.',
      CR4: 'Meminta rahasia disertai ancaman untuk menangguhkan, mengunci, atau menutup akun Anda.',
      CR5: 'Meminta kata sandi atau kode tanpa tanda manipulasi di sekitarnya.',
    },
    asks: (action, secrets) => (action === 'send' ? `Meminta Anda mengirim: ${secrets}` : `Meminta Anda mengisi: ${secrets}`),
    secret: { password: 'kata sandi', otp: 'kode sekali pakai (OTP)', pin: 'nomor PIN', 'recovery-code': 'kode pemulihan', 'recovery-phrase': 'frasa pemulihan', token: 'token akses' },
    indicators: 'Indikator',
    pretext: {
      'CP.ACCOUNT_THREAT': 'ancaman terhadap akun', 'CP.URGENCY': 'tenggat atau desakan', 'CP.SUPPORT': 'mengaku sebagai petugas atau pihak resmi',
      'CP.VERIFY': 'dalih verifikasi', 'CP.REWARD': 'hadiah atau imbalan',
    },
    trust: {
      'user-content': 'di konten kiriman pengguna', 'third-party-widget': 'di widget tersemat', 'embedded-frame': 'di frame tersemat',
      dialog: 'di dalam dialog', overlay: 'di dalam overlay', form: 'di dalam formulir',
    },
    destination: {
      none: 'Formulir dikirim ke halaman ini.', 'same-origin': 'Formulir dikirim ke situs ini.', 'other-origin': 'Formulir dikirim ke situs lain.',
      mailto: 'Formulir membuka pesan email.', javascript: 'Formulir ditangani skrip di halaman.', data: 'Formulir dikirim ke alamat data sebaris.',
      other: 'Formulir dikirim ke alamat yang tidak biasa.',
    },
    actionRisk: {
      high: 'Risiko tindakan: tinggi. Siapa pun yang mendapatkannya bisa mengambil alih akun atau dompet.',
      medium: 'Risiko tindakan: sedang. Mengisinya di situs yang salah dapat membuka akses ke akun Anda.',
    },
    modifier: {
      'C.QUOTED': 'permintaan berada di dalam kutipan.', 'C.REPORTED': 'teks melaporkan apa yang diminta dari orang lain.',
      'C.EDUCATIONAL': 'teks di sekitarnya adalah materi edukasi atau kesadaran keamanan.', 'C.CODE_EXAMPLE': 'permintaan berada di dalam contoh kode.',
    },
    overrideLiveField: 'Tidak diturunkan: bagian halaman yang sama memiliki kolom isian yang berfungsi untuk rahasia tersebut.',
    signal: {
      'S.PASSWORD': 'Kata sandi', 'S.OTP': 'Kode sekali pakai', 'S.PIN': 'Nomor PIN', 'S.RECOVERY_CODE': 'Kode pemulihan', 'S.SEED_PHRASE': 'Frasa pemulihan', 'S.TOKEN': 'Token akses',
      'D.SEND': 'Kirim atau bagikan', 'D.ENTER': 'Isi', 'CP.ACCOUNT_THREAT': 'Ancaman akun', 'CP.URGENCY': 'Desakan', 'CP.SUPPORT': 'Mengaku petugas atau otoritas',
      'CP.VERIFY': 'Dalih verifikasi', 'CP.REWARD': 'Hadiah', 'F.SECRET_FIELD': 'Kolom isian', 'C.NEGATION': 'Negasi', 'C.REPORTED': 'Kalimat dilaporkan',
      'C.EDUCATIONAL': 'Konteks edukasi',
    },
    fieldSource: 'Kolom formulir',
    fieldKind: {
      password: 'kata sandi', otp: 'kode sekali pakai', pin: 'nomor PIN', 'recovery-code': 'kode pemulihan', 'secret-phrase': 'frasa pemulihan', email: 'alamat email', text: 'teks', other: 'lainnya',
    },
    unlabeledField: '(kolom tanpa label)',
    limitation: {
      'claimed-identity-unverifiable': 'VeilTrace tidak dapat memastikan siapa penulisnya. Pengakuan sebagai petugas atau pihak resmi bukan bukti.',
      'destination-not-scored': 'Tujuan formulir hanya ditampilkan sebagai informasi; VeilTrace tidak menilai situs.',
      'trust-boundary-heuristic': 'Apakah konten ini berasal dari situs atau dari pihak lain diperkirakan dari struktur halaman.',
    },
  },
  pay: {
    findingTitle: { manipulative_instruction: 'Permintaan pembayaran manipulatif', suspicious_correlation: 'Permintaan pembayaran mencurigakan', observed_instruction: 'Permintaan pembayaran' },
    ruleChip: (id) => `Aturan ${id}`,
    rule: {
      PR1: 'Meminta Anda membayar lebih dulu untuk menerima sesuatu (refund, hadiah, dana yang dicairkan, atau akun yang dibuka). Refund dan hadiah asli tidak pernah meminta pembayaran di muka.',
      PR2: 'Meminta Anda membayar di luar checkout biasa (rekening pribadi, di luar platform, kartu hadiah, atau kripto), disertai tekanan. Pembayaran seperti ini sulit ditarik kembali.',
      PR3: 'Meminta pembayaran disertai ancaman (penutupan akun, penangkapan, atau tuntutan hukum) dan desakan atau klaim otoritas.',
      PR4: 'Meminta pembayaran tanpa tanda manipulasi di sekitarnya.',
    },
    promise: { refund: 'refund', prize: 'hadiah', 'account-unlock': 'akun yang dibuka kembali', release: 'uang atau barang yang dilepas', recruitment: 'kelulusan seleksi yang dijamin', job: 'pekerjaan' },
    destination: { 'personal-account': 'rekening pribadi', 'off-platform': 'di luar platform', 'gift-card': 'kartu hadiah', crypto: 'aset kripto' },
    pressure: { threat: 'ancaman', urgency: 'tenggat atau desakan', 'claimed-authority': 'mengaku sebagai petugas atau otoritas' },
    promisesLabel: 'Dijanjikan sebagai imbalan',
    destinationsLabel: 'Pembayaran ditujukan ke',
    indicators: 'Indikator',
    actionRisk: {
      high: 'Risiko tindakan: tinggi. Uang yang dikirim dengan cara ini biasanya hilang.',
      medium: 'Risiko tindakan: sedang. Membayar pihak yang salah dapat merugikan Anda.',
    },
    signal: {
      'PY.PAY': 'Permintaan pembayaran', 'PA.AMOUNT': 'Nominal', 'PF.FEE': 'Biaya', 'PF.RELEASE_FEE': 'Biaya pencairan atau buka blokir', 'PD.PERSONAL': 'Rekening pribadi',
      'PD.OFF_PLATFORM': 'Di luar platform', 'PD.GIFT_CARD': 'Kartu hadiah', 'PD.CRYPTO': 'Aset kripto', 'PR.REFUND': 'Refund atau dana tertahan',
      'PR.PRIZE': 'Hadiah', 'PR.UNLOCK': 'Pembukaan akun', 'PR.RECRUIT': 'Jaminan lulus seleksi', 'PR.JOB': 'Tawaran kerja', 'PC.CONDITION': 'Pembayaran sebagai syarat', 'PP.THREAT': 'Ancaman', 'PP.URGENCY': 'Desakan',
      'PP.AUTHORITY': 'Mengaku petugas atau otoritas', 'C.NEGATION': 'Negasi', 'C.REPORTED': 'Kalimat dilaporkan', 'C.EDUCATIONAL': 'Konteks edukasi',
    },
    amountHidden: '(nominal di halaman; nilainya tidak ditampilkan)',
    limitation: {
      'claimed-identity-unverifiable': 'VeilTrace tidak dapat memastikan siapa penulisnya. Pengakuan sebagai petugas, bank, atau polisi bukan bukti.',
      'trust-boundary-heuristic': 'Apakah konten ini berasal dari situs atau dari pihak lain diperkirakan dari struktur halaman.',
      'amount-not-reported': 'Nominal dicocokkan untuk memahami permintaan, tetapi nilainya tidak pernah disalin ke laporan.',
    },
  },
  sup: {
    findingTitle: { manipulative_instruction: 'Arahan dukungan yang manipulatif', suspicious_correlation: 'Arahan dukungan yang mencurigakan', observed_instruction: 'Arahan dukungan' },
    ruleChip: (id) => `Aturan ${id}`,
    rule: {
      SR1: 'Halaman web mengklaim perangkat Anda terinfeksi atau terkunci lalu menyuruh Anda menelepon, menginstal, atau memberi akses. Browser dan sistem operasi tidak menampilkan alarm seperti itu di dalam halaman web.',
      SR2: 'Pihak yang mengaku petugas, bank, atau admin meminta Anda menginstal perangkat lunak atau memberi akses jarak jauh, disertai tekanan atau dari konten yang mungkin tidak dikendalikan situs.',
      SR3: 'Pihak yang mengaku petugas, bank, atau admin mengarahkan Anda ke kontak luar disertai ancaman terhadap akun atau data Anda.',
      SR4: 'Komentar atau konten kiriman pengguna mengaku sebagai dukungan resmi dan mengarahkan Anda ke kontak luar.',
      SR5: 'Mengarahkan Anda menghubungi petugas, menginstal perangkat lunak, atau memberi akses jarak jauh, tanpa tanda peniruan atau tekanan di sekitarnya.',
      SR6: 'Pesan yang tampil sebagai pemberitahuan dari bank, e-wallet, marketplace, atau layanan pelanggannya membunyikan alarm, ancaman, atau hadiah, lalu meminta Anda membalas, memilih opsi, membuka tautan, atau mengisi formulir. Bank dan platform tidak menyelesaikan urusan seperti ini lewat balasan atau tautan di pesan.',
      SR7: 'Mengucapkan selamat atas hadiah uang yang tidak pernah Anda ikuti, lalu meminta Anda menjawab kuis, sering atas nama ulang tahun perusahaan. Kuis seperti ini menggiring orang untuk menyebarkan tautan atau menyerahkan data atau uang.',
      SR8: 'Menawarkan akses ke pesan, akun, atau HP orang lain lalu mengarahkan Anda ke kontak. Jasa seperti ini ilegal, dan pembelinya sering ditipu atau diperas.',
    },
    action: { contact: 'menghubungi seseorang', respond: 'membalas, memilih opsi, membuka tautan, atau mengisi formulir', survey: 'menjawab kuis atau kuesioner', 'remote-access': 'memberi akses jarak jauh', install: 'menginstal perangkat lunak' },
    channel: { phone: 'nomor telepon', mobile: 'nomor ponsel', messenger: 'aplikasi pesan', link: 'tautan' },
    claim: { support: 'petugas atau layanan pelanggan', bank: 'pihak bank', administrator: 'admin', 'security-team': 'tim keamanan', official: 'pejabat, aparat, atau penyidik', organization: 'perusahaan atau instansi' },
    indicator: {
      'page-rendered-system-alert': 'alarm virus atau kunci yang dibuat halaman web', 'remote-access-request': 'meminta akses jarak jauh',
      'software-install-request': 'meminta Anda menginstal perangkat lunak', 'personal-channel-contact': 'klaim resmi dengan nomor ponsel atau aplikasi pesan',
      'claim-in-user-content': 'klaim resmi di dalam konten kiriman pengguna', 'alert-in-overlay': 'alarm di overlay yang menutupi halaman',
    },
    pressure: { 'system-alert': 'alarm perangkat', 'account-alarm': 'alarm akun (login, transaksi, atau tarif)', threat: 'ancaman terhadap akun atau data', urgency: 'tenggat atau desakan', reward: 'hadiah atau poin', 'pre-won': 'ucapan selamat atas hadiah yang tidak Anda ikuti', 'illicit-access': 'tawaran akses ke akun atau HP orang lain' },
    asksLabel: 'Meminta Anda',
    claimsLabel: 'Mengaku sebagai (belum terverifikasi)',
    indicatorsLabel: 'Indikator teramati',
    pressureLabel: 'Tekanan',
    actionRisk: {
      high: 'Risiko tindakan: tinggi. Menginstal perangkat lunak atau memberi akses jarak jauh dapat menyerahkan kendali perangkat kepada orang asing.',
      medium: 'Risiko tindakan: sedang. Menghubungi layanan palsu dapat berujung pada permintaan uang, kode, atau akses.',
    },
    signal: {
      'SC.CONTACT': 'Arahan menghubungi', 'SC.RESPOND': 'Permintaan balasan, tautan, atau formulir', 'SC.SURVEY': 'Kuis atau kuesioner', 'SA.REMOTE': 'Permintaan akses jarak jauh', 'SA.INSTALL': 'Permintaan instalasi', 'SX.PHONE': 'Nomor telepon',
      'SX.MOBILE': 'Nomor ponsel', 'SX.MESSENGER': 'Aplikasi pesan', 'SX.LINK': 'Tautan', 'SI.SUPPORT': 'Mengaku petugas', 'SI.BANK': 'Mengaku pihak bank',
      'SI.ADMIN': 'Mengaku admin', 'SI.SECURITY': 'Mengaku tim keamanan', 'SI.OFFICIAL': 'Mengaku pejabat atau berpangkat', 'SW.ALERT': 'Alarm perangkat', 'ST.THREAT': 'Ancaman',
      'SU.URGENCY': 'Desakan', 'SW.ACCOUNT': 'Alarm akun', 'SP.REWARD': 'Hadiah', 'SP.WON': 'Hadiah tanpa ikut', 'SO.ILLICIT': 'Tawaran akses ilegal', 'SI.ORG': 'Mengaku perusahaan atau instansi', 'SH.UNASSERTED': 'Pengandaian atau kutipan', 'C.NEGATION': 'Negasi', 'C.REPORTED': 'Kalimat dilaporkan', 'C.EDUCATIONAL': 'Konteks edukasi',
    },
    contactHidden: '(nomor kontak di halaman; tidak ditampilkan)',
    limitation: {
      'claimed-identity-unverifiable': 'VeilTrace tidak dapat memastikan siapa penulisnya. Pengakuan sebagai petugas, bank, atau admin bukan bukti, dan VeilTrace tidak menyatakan organisasinya palsu.',
      'trust-boundary-heuristic': 'Apakah konten ini berasal dari situs atau dari pihak lain diperkirakan dari struktur halaman.',
      'contact-details-not-reported': 'Nomor telepon dicocokkan untuk memahami arahan, tetapi tidak pernah disalin ke laporan.',
    },
  },
  pwa: {
    title: 'Cek pesan',
    intro: 'Tempel pesan yang mencurigakan (WhatsApp, SMS, email, atau teks dari situs) untuk melihat apakah pesan itu mencoba memanipulasi Anda.',
    sourceLabel: 'Dari mana pesannya?',
    source: { chat: 'Chat (WhatsApp, Telegram…)', sms: 'SMS', email: 'Email', web: 'Teks dari situs' },
    placeholder: 'Tempel pesan di sini…',
    check: 'Periksa pesan',
    clear: 'Hapus',
    paste: 'Tempel dari clipboard',
    shareHint: 'Di Android, pasang aplikasi ini, lalu gunakan Bagikan → VeilTrace dari WhatsApp atau Pesan.',
    privacy: 'Diperiksa hanya di perangkat ini. Pesan tidak dikirim, disimpan, atau dibagikan.',
    empty: 'Tempel atau bagikan pesan terlebih dahulu.',
    tooLong: 'Hanya 20.000 karakter pertama yang diperiksa.',
    linkOnly: 'Yang ditempel hanya tautan. VeilTrace memeriksa isi pesan dan tidak menilai alamat situs. Tempel seluruh pesannya, termasuk teks di sekitar tautan. Jangan membuka tautan hanya untuk mengeceknya.',
    yourMessage: 'Pesan Anda',
    offlineReady: 'Siap dipakai tanpa internet.',
  },
  auto: {
    actionTitle: 'VeilTrace: pindai halaman ini',
    badgeTitle: 'VeilTrace: konten manipulatif ditemukan di halaman ini. Klik untuk detail.',
    title: 'Mode pemindaian',
    modeLabel: { manual: 'MANUAL', automatic: 'OTOMATIS' },
    manualText: 'Manual: VeilTrace membaca halaman hanya saat Anda menekan Pindai halaman.',
    automaticText: 'Otomatis: VeilTrace memeriksa halaman saat dimuat dan berubah, dan memberi tanda "!" pada ikon toolbar jika menemukan konten manipulatif.',
    consent: 'Chrome akan meminta izin agar VeilTrace dapat membaca semua situs. Halaman tetap dianalisis hanya di perangkat ini: tidak ada yang dikirim, disimpan, atau dibagikan, dan isian formulir tidak pernah dibaca. Berlaku untuk halaman yang dibuka atau dimuat ulang setelahnya, dan dapat dimatikan di sini atau di pengaturan Chrome kapan saja.',
    managedText: 'Pemindaian otomatis diaktifkan oleh organisasi Anda. Halaman tetap dianalisis hanya di perangkat ini; tidak ada yang dilaporkan ke organisasi Anda atau pihak lain.',
    enable: 'Aktifkan pemindaian otomatis',
    disable: 'Matikan pemindaian otomatis',
    denied: 'Izin tidak diberikan. VeilTrace tetap dalam mode manual.',
    failed: 'Mode pemindaian tidak dapat diubah. Coba lagi.',
  },
  dash: {
    stateLabel: { standby: 'SIAGA', scanning: 'MEMINDAI', complete: 'PEMINDAIAN LENGKAP', partial: 'PEMINDAIAN SEBAGIAN', error: 'PEMINDAIAN GAGAL' },
    assessment: 'PENILAIAN ANCAMAN HALAMAN',
    headline: {
      manipulative_instruction: { tone: 'danger', title: 'Konten manipulatif terdeteksi',
        detail: 'Halaman ini mencoba membuat Anda melakukan sesuatu yang merugikan. Jangan ikuti instruksi yang tercantum di bawah.' },
      suspicious_correlation: { tone: 'warning', title: 'Konten mencurigakan terdeteksi',
        detail: 'Halaman ini menggabungkan permintaan dengan tanda yang sering muncul dalam penipuan. Periksa temuan di bawah sebelum bertindak.' },
      observed_instruction: { tone: 'neutral', title: 'Tidak ada tanda manipulasi di konten yang dianalisis',
        detail: 'Instruksi atau permintaan biasa ditemukan dan dicantumkan sebagai teramati. Ini bukan jaminan tentang halaman.' },
      none: { tone: 'neutral', title: 'Tidak ada yang perlu dilaporkan di konten yang dianalisis',
        detail: 'VeilTrace tidak menemukan temuan di bagian yang dapat diperiksa. Ini bukan jaminan tentang halaman.' },
    },
    statHighest: 'Klasifikasi tertinggi',
    statActionable: 'Perlu tindakan',
    statCategories: 'Kategori terdampak',
    statCoverage: 'Cakupan pemindaian',
    coverageValue: { complete: 'Lengkap', partial: 'Sebagian' },
    noCategories: 'Tidak ada',
    verdictLabel: { manipulative_instruction: 'Manipulatif', suspicious_correlation: 'Mencurigakan', observed_instruction: 'Hanya teramati', none: 'Tidak ada temuan' },
    overviewTitle: 'Kategori deteksi',
    categoryName: {
      command: 'Manipulasi Eksekusi Perintah', credential: 'Manipulasi Pengungkapan Kredensial', payment: 'Manipulasi Pembayaran',
      support: 'Peniruan Dukungan & Otoritas',
    },
    categoryCode: { command: 'CMD', credential: 'CRED', payment: 'PAY', support: 'SUP' },
    tileCount: (total, actionable) => (total === 0 ? '0 temuan' : `${actionable} perlu tindakan · ${total} total`),
    experimental: 'Eksperimental',
    experimentalNote: 'Pemeriksaan kredensial, pembayaran, dan dukungan bersifat eksperimental dan belum lulus evaluasi independen. Hanya teks halaman dan struktur formulir yang dibaca, tidak pernah isian Anda, dan nominal maupun nomor telepon tidak pernah disalin.',
    findingsTitle: (n) => `Temuan (${n})`,
    observedTitle: (n) => `Teramati tanpa tanda manipulasi (${n})`,
    groupTitle: (n) => `${n} temuan terkait pada elemen halaman yang sama`,
    groupNote: 'Temuan setiap detektor ditampilkan dengan buktinya sendiri.',
    alsoCitedBy: (c) => `Juga dirujuk oleh: ${c}`,
    evidenceTitle: 'Bukti teramati',
    evidenceId: (id) => `ID bukti ${id}`,
    findingId: (id) => `ID temuan ${id}`,
    actionRiskChip: { high: 'Risiko tindakan: tinggi', medium: 'Risiko tindakan: sedang' },
    adviceTitle: 'Yang perlu dilakukan',
    advice: {
      command: 'Jangan tekan Win+R, membuka terminal, menempel, atau menjalankan apa pun yang diminta halaman ini. CAPTCHA asli tidak pernah meminta Anda menjalankan perintah.',
      credential: 'Jangan kirim kata sandi, kode sekali pakai, atau frasa pemulihan kepada siapa pun. Masuk hanya di situs yang Anda buka sendiri.',
      payment: 'Jangan membayar untuk menerima refund, hadiah, atau pembukaan akun, dan jangan membayar ke rekening pribadi, kartu hadiah, atau kripto atas permintaan. Hubungi organisasinya lewat saluran yang sudah Anda kenal.',
      support: 'Jangan menelepon nomor atau menghubungi akun yang muncul di peringatan atau komentar. Cari sendiri kontak resmi organisasinya.',
      remoteAccess: 'Jangan pernah menginstal aplikasi akses jarak jauh (AnyDesk, TeamViewer) atau perangkat lunak lain karena diminta orang yang mengaku petugas.',
    },
    adviceNone: 'Tidak adanya temuan tidak membuat halaman dapat dipercaya. VeilTrace hanya memeriksa yang terlihat di halaman ini, pada saat pemindaian.',
  },
  errors: {
    noPageTitle: 'Tidak ada halaman untuk dipindai', noPageDetail: 'Buka sebuah halaman web, lalu klik tombol VeilTrace lagi.',
    restrictedTitle: 'Halaman ini tidak dapat dipindai',
    restrictedDetail: 'Halaman yang dilindungi browser (seperti halaman chrome://, Chrome Web Store, dan ekstensi lain) tidak mengizinkan ekstensi membacanya.',
    accessTitle: 'VeilTrace tidak dapat mengakses halaman ini',
    accessDetail: 'Halaman mungkin memblokir ekstensi atau sudah berubah. Muat ulang halaman lalu coba lagi.',
    fileDetail: 'Untuk memindai file lokal, aktifkan "Izinkan akses ke URL file" untuk VeilTrace di chrome://extensions.',
    badReportTitle: 'Pemindaian gagal', badReportDetail: 'Pemindaian mengembalikan data yang tidak terduga dan data itu dibuang.',
  },
};

export const MESSAGES: Readonly<Record<Lang, Messages>> = { en: EN, id: ID };

/** Deterministic: Indonesian when the browser UI language is Indonesian ('id', 'id-ID', legacy 'in'), otherwise English. */
export function detectLang(uiLanguage: string | undefined): Lang {
  return /^(id|in)(?:[-_]|$)/i.test(uiLanguage ?? '') ? 'id' : 'en';
}

export function formatCount(n: number, lang: Lang): string {
  return n.toLocaleString(MESSAGES[lang].locale);
}
