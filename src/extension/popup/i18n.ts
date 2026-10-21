// UI strings in English and Indonesian, bundled in popup.js (no runtime language files, no translation service).
// Page evidence is never translated. Never says "safe". Severity, confidence and completeness stay distinct.
import type { ScanGap } from '../../core/coverage.js';
import type { CredModifierId, CredPretextSignalId, CredRuleId, CredSignalId, SecretType, TrustContext } from '../../core/credential/types.js';
import type { ActionRisk, Classification, FieldKind, FormDestination, Level, ModifierId, OverrideId, RuleId, SignalId, Verdict } from '../../core/types.js';

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
  headline: Record<Verdict, { title: string; detail: string; tone: 'danger' | 'warning' | 'neutral' }>;
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
  findingsHeading: (n: number) => string;
  observedHeading: (n: number) => string;
  loweredFrom: (cls: string) => string;
  contextPrefix: string;
  modifier: Record<ModifierId, string>;
  override: Record<OverrideId, string>;
  overrideCapped: string;
  contextSetAside: string;
  overrideEvidence: string;
  moreEvidence: (n: number) => string;
  moreFindings: (n: number) => string;
  /** M5.1: experimental credential-disclosure detector. */
  cred: {
    categoryCommand: string;
    categorySecret: string;
    experimental: string;
    headline: Record<Verdict, { title: string; detail: string; tone: 'danger' | 'warning' | 'neutral' }>;
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
    experimentalNote: string;
    observedHeading: (n: number) => string;
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
  headline: {
    manipulative_instruction: { tone: 'danger', title: 'Manipulative instruction detected',
      detail: 'This page asks you to run something on your computer and presents it as a verification step. Do not follow these instructions.' },
    suspicious_correlation: { tone: 'warning', title: 'Suspicious instruction detected',
      detail: 'This page asks you to run something on your computer and uses pressure, authority or a "fix" story. Be careful before following it.' },
    observed_instruction: { tone: 'neutral', title: 'No suspicious instructions detected in the analyzed content.',
      detail: 'Instructions to run commands were found, but without signs of manipulation nearby. Only follow them if you trust the source.' },
    none: { tone: 'neutral', title: 'No suspicious instructions detected in the analyzed content.',
      detail: 'VeilTrace looked for instructions that try to make you run commands. It did not find any in the content it could examine.' },
  },
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
  findingsHeading: (n) => `Findings (${n})`,
  observedHeading: (n) => `Observed instructions without manipulation signs (${n})`,
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
  cred: {
    categoryCommand: 'Command execution',
    categorySecret: 'Passwords and codes',
    experimental: 'Experimental',
    headline: {
      manipulative_instruction: { tone: 'danger', title: 'Manipulative request for a password or code detected',
        detail: 'This page asks you to give a password, code or recovery phrase to someone, or wraps the request in a false pretext. Do not share it.' },
      suspicious_correlation: { tone: 'warning', title: 'Suspicious request for a password or code detected',
        detail: 'This page asks for a password or code together with a threat to your account, or inside content the site may not control. Check before you enter anything.' },
      observed_instruction: { tone: 'neutral', title: 'Sign-in or code requests found, without signs of manipulation.',
        detail: 'Ordinary sign-in and verification steps look like this. Only enter secrets on sites you opened yourself.' },
      none: { tone: 'neutral', title: 'No requests for passwords, codes or recovery phrases found in the analyzed content.',
        detail: 'VeilTrace looked for requests to give or type passwords, one-time codes and recovery phrases.' },
    },
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
    experimentalNote: 'Experimental: this check has not yet passed an independent evaluation. It looks only at the page text and form structure, never at what you typed.',
    observedHeading: (n) => `Sign-in and code requests without manipulation signs (${n})`,
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
  headline: {
    manipulative_instruction: { tone: 'danger', title: 'Instruksi manipulatif terdeteksi',
      detail: 'Halaman ini meminta Anda menjalankan sesuatu di komputer dan menyamarkannya sebagai langkah verifikasi. Jangan ikuti instruksi ini.' },
    suspicious_correlation: { tone: 'warning', title: 'Instruksi mencurigakan terdeteksi',
      detail: 'Halaman ini meminta Anda menjalankan sesuatu di komputer dan memakai tekanan, klaim otoritas, atau cerita "perbaikan". Berhati-hatilah sebelum mengikutinya.' },
    observed_instruction: { tone: 'neutral', title: 'Tidak ada instruksi mencurigakan di konten yang dianalisis.',
      detail: 'Ada instruksi untuk menjalankan perintah, tetapi tanpa tanda manipulasi di sekitarnya. Ikuti hanya jika Anda memercayai sumbernya.' },
    none: { tone: 'neutral', title: 'Tidak ada instruksi mencurigakan di konten yang dianalisis.',
      detail: 'VeilTrace mencari instruksi yang mencoba membuat Anda menjalankan perintah, dan tidak menemukannya di konten yang dapat diperiksa.' },
  },
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
  findingsHeading: (n) => `Temuan (${n})`,
  observedHeading: (n) => `Instruksi teramati tanpa tanda manipulasi (${n})`,
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
  cred: {
    categoryCommand: 'Menjalankan perintah',
    categorySecret: 'Kata sandi dan kode',
    experimental: 'Eksperimental',
    headline: {
      manipulative_instruction: { tone: 'danger', title: 'Permintaan manipulatif atas kata sandi atau kode terdeteksi',
        detail: 'Halaman ini meminta Anda memberikan kata sandi, kode, atau frasa pemulihan kepada seseorang, atau membungkus permintaan itu dengan dalih palsu. Jangan bagikan.' },
      suspicious_correlation: { tone: 'warning', title: 'Permintaan mencurigakan atas kata sandi atau kode terdeteksi',
        detail: 'Halaman ini meminta kata sandi atau kode disertai ancaman terhadap akun Anda, atau di dalam konten yang mungkin tidak dikendalikan situs. Periksa sebelum mengisi apa pun.' },
      observed_instruction: { tone: 'neutral', title: 'Permintaan masuk atau kode ditemukan, tanpa tanda manipulasi.',
        detail: 'Langkah masuk dan verifikasi biasa memang seperti ini. Isi rahasia hanya di situs yang Anda buka sendiri.' },
      none: { tone: 'neutral', title: 'Tidak ada permintaan kata sandi, kode, atau frasa pemulihan di konten yang dianalisis.',
        detail: 'VeilTrace mencari permintaan untuk memberikan atau mengetik kata sandi, kode sekali pakai, dan frasa pemulihan.' },
    },
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
    experimentalNote: 'Eksperimental: pemeriksaan ini belum lulus evaluasi independen. Hanya teks halaman dan struktur formulir yang diperiksa, tidak pernah isian yang Anda ketik.',
    observedHeading: (n) => `Permintaan masuk dan kode tanpa tanda manipulasi (${n})`,
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
