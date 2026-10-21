// UI strings in English and Indonesian, bundled in popup.js (no runtime language files, no translation service).
// Page evidence is never translated. Never says "safe". Severity, confidence and completeness stay distinct.
import type { ScanGap } from '../../core/coverage.js';
import type { ActionRisk, Classification, Level, ModifierId, RuleId, SignalId, Verdict } from '../../core/types.js';

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
