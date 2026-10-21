// Unit tests for the EXPERIMENTAL fake-support and authority-impersonation detector (M5.3) on hand-written snapshots.
import { describe, expect, it } from 'vitest';
import { analyze, analyzeCredentials, analyzePayments, analyzeSupport, normalize, SUPPORT_DETECTOR_VERSION, SUPPORT_LEXICON } from '../src/core/index.js';
import type { SupportResult } from '../src/core/index.js';
import { inContainer, snapshot } from './fixtures/build.js';
import { SCENARIOS } from './fixtures/scenarios.js';

const short = (r: SupportResult): string[] => r.findings.map((f) => `${f.ruleId}:${f.classification}`);
const sup = (blocks: Parameters<typeof snapshot>[0]): SupportResult => analyzeSupport(snapshot(blocks));

describe('support detector: manipulative and suspicious directions', () => {
  it('SR1: page-rendered virus alert in an overlay telling the reader to call a toll-free number → manipulative', () => {
    const r = sup(inContainer('overlay:#alert', ['Windows Defender Security Center', 'Your computer is infected with 3 viruses. Do not restart your computer.',
      'Call Windows Support immediately: +1 (888) 555-0199']));
    expect(r.detectorVersion).toBe(SUPPORT_DETECTOR_VERSION);
    expect(r.experimental).toBe(true);
    expect(short(r)).toEqual(['SR1:manipulative_instruction']);
    const f = r.findings[0]!;
    expect(f).toMatchObject({ requestedActions: ['contact'], channels: ['phone'], actionRisk: 'medium', trustContext: ['overlay'] });
    expect(f.indicators).toEqual(['page-rendered-system-alert', 'alert-in-overlay']);
    expect(f.claims).toEqual(expect.arrayContaining(['support', 'security-team']));
    expect(f.limitations).toEqual(['claimed-identity-unverifiable', 'contact-details-not-reported']);
  });

  it('SR1 in Indonesian: "HP kamu kena virus" with an install request → manipulative, high action risk', () => {
    const r = sup(['Peringatan! HP kamu kena virus berbahaya.', 'Segera instal aplikasi pembersih berikut sekarang juga.']);
    expect(short(r)).toEqual(['SR1:manipulative_instruction']);
    expect(r.findings[0]).toMatchObject({ requestedActions: ['install'], actionRisk: 'high' });
  });

  it('SR2: claimed bank officer asks to install AnyDesk under an account threat → manipulative', () => {
    const r = sup(['This is your bank fraud department. Your account will be locked today.', 'Please install AnyDesk so our technician can secure it.']);
    expect(short(r)).toEqual(['SR2:manipulative_instruction']);
    expect(r.findings[0]!.indicators).toEqual(['remote-access-request']);
  });

  it('SR2 informal Indonesian: "kurir" asks to download an APK over WA → suspicious', () => {
    const r = sup(inContainer('ugc:#m', ['kak sy kurir, paketnya ga bisa dikirim. dl aplikasi cek resi.apk ini ya']));
    expect(short(r)).toEqual(['SR2:suspicious_correlation']);
    expect(r.findings[0]!.indicators).toEqual(['software-install-request', 'claim-in-user-content']);
  });

  it('SR3: claimed CS + account threat + WhatsApp mobile number + urgency → manipulative; the number is never reported', () => {
    const r = sup(['Akun Anda akan diblokir dalam 1 jam.', 'Segera hubungi CS resmi kami via WhatsApp 0812-3456-7890.']);
    expect(short(r)).toEqual(['SR3:manipulative_instruction']);
    expect(r.findings[0]!.channels).toEqual(['mobile', 'messenger']);
    expect(r.findings[0]!.indicators).toEqual(['personal-channel-contact']);
    expect(JSON.stringify(r)).not.toMatch(/3456|7890/);
  });

  it('SR3 informal Indonesian: "akunnya bakal disuspend, japri mimin di wa" → suspicious', () => {
    expect(short(sup(['akunnya bakal disuspend, japri mimin di wa 081234567890 ya']))).toEqual(['SR3:suspicious_correlation']);
  });

  it('SR4: a forum comment claiming official support with a Telegram contact → suspicious', () => {
    const r = sup(inContainer('ugc:#c4', ['Official support team here. Contact us on Telegram and we will fix your wallet.']));
    expect(short(r)).toEqual(['SR4:suspicious_correlation']);
    expect(r.findings[0]!.indicators).toEqual(['personal-channel-contact', 'claim-in-user-content']);
  });
  it('the strongest applicable rule wins: an official claim in a comment with Telegram and a threat is manipulative (SR4), not SR3 suspicious', () => {
    const r = sup(inContainer('ugc:#c', ['Official support team here: contact us on Telegram or your account will be deleted.']));
    expect(short(r)).toEqual(['SR4:manipulative_instruction']);
  });
});

describe('support detector: benign controls (hard negatives)', () => {
  it('help-center contact page with phone and WhatsApp → observed only', () => {
    const r = sup(['Contact us', 'Our customer service team is available 24/7.', 'Call us at +62 21 5000 1234 or chat with us on WhatsApp.']);
    expect(short(r)).toEqual(['SR5:observed_instruction']);
  });

  it('IT helpdesk remote-support procedure → observed', () => {
    expect(short(sup(['IT help desk: remote support sessions', 'During a scheduled session, the technician may ask you to open TeamViewer QuickSupport and share your screen.'])))
      .toEqual(['SR5:observed_instruction']);
  });

  it('genuine bank notice: blocked after wrong PINs, call the call center (no urgency, no personal channel) → observed', () => {
    expect(short(sup(['Akun Anda telah diblokir karena salah PIN 3 kali.', 'Hubungi call center kami di (021) 500-1234 untuk membuka blokir.']))).toEqual(['SR5:observed_instruction']);
  });

  it('antivirus help: a hypothetical infection is not an alert', () => {
    expect(short(sup(['If your computer is infected, run a full scan and contact our support team at +1 800 555 0100.']))).toEqual(['SR5:observed_instruction']);
    expect(short(sup(['Jika komputer Anda terinfeksi, hubungi layanan pelanggan kami di 1500-123-456.']))).toEqual(['SR5:observed_instruction']);
  });

  it('awareness advice: never call numbers shown in pop-ups → no direction', () => {
    expect(short(sup(['Never call a phone number shown in a pop-up.', 'Jangan instal AnyDesk atas permintaan orang yang mengaku petugas bank.']))).toEqual([]);
  });

  it('awareness list: negation covers "or" lists, and an alarm a pop-up "says" is not asserted (dev SN08 regression)', () => {
    expect(short(sup([{ t: 'Never call a phone number shown in a pop-up that says your computer is infected.', h: 'How to spot fake support' },
      'We will never ask you to install AnyDesk or share your screen.']))).toEqual([]);
    // "and" still ends the negation: a lure's "do not close this window and call …" keeps its contact direction.
    expect(short(sup(['Your PC has been blocked. Do not close this window and call +1 888 555 0199.']))).toEqual(['SR1:manipulative_instruction']);
  });

  it('news report quoting the scam alert → demoted to observed', () => {
    const r = sup(['Police warn of fake virus pop-ups.', { t: 'Your computer is infected. Call Microsoft Support now at +1 888 555 0142.', ctx: { quote: true } },
      'Scammers tell victims to install remote access software, investigators said.']);
    expect(r.verdict).toBe('observed_instruction');
  });

  it('awareness article that reports what scammers ask → demoted', () => {
    const r = sup([{ t: 'Scammers ask victims to install AnyDesk while claiming to be the bank fraud department; your account will be blocked, they say.', h: 'How to spot fake support' }]);
    expect(['observed_instruction', 'none']).toContain(r.verdict);
  });

  it('a seller sharing a WhatsApp number without claims or threats → observed', () => {
    expect(short(sup(inContainer('ugc:#c1', ['Masih ada kak, chat aja ke WA 0812 3456 7890.'])))).toEqual(['SR5:observed_instruction']);
  });
});

describe('support detector: privacy and invariants', () => {
  it('masks handles and long digit runs in reported text', () => {
    const r = sup(inContainer('ugc:#c', ['Official support: message @fix_wallet_help on Telegram, ID 99887766554 immediately or your account will be deleted.']));
    expect(r.verdict).toBe('manipulative_instruction');
    const json = JSON.stringify(r);
    expect(json).not.toContain('fix_wallet_help');
    expect(json).not.toContain('99887766554');
  });

  it('never reads url, title or form fields', () => {
    const s = snapshot(['Your PC has been blocked. Call support at +1 888 555 0199.']);
    const a = analyzeSupport(s);
    expect(analyzeSupport({ ...s, url: 'https://support.microsoft.example/', title: 'Official support' })).toEqual(a);
    expect(analyzeSupport({ ...s, formFields: [{ id: 'fd0', kind: 'text', label: 'Phone', hints: [], containerId: 'body', locator: '#p' }] })).toEqual(a);
  });

  it('does not change the ClickFix, credential or payment results', () => {
    for (const sc of SCENARIOS) {
      const before = [analyze(sc.snapshot), analyzeCredentials(sc.snapshot), analyzePayments(sc.snapshot)];
      analyzeSupport(sc.snapshot);
      expect([analyze(sc.snapshot), analyzeCredentials(sc.snapshot), analyzePayments(sc.snapshot)], sc.id).toEqual(before);
    }
  });

  it('every lexicon example matches its own pattern', () => {
    for (const e of SUPPORT_LEXICON) {
      for (const ex of e.examples) expect([...normalize(ex).text.matchAll(e.pattern)].length, `${e.id}: ${ex}`).toBeGreaterThan(0);
    }
  });
});

describe('support detector sup-0.2.0-exp: alarm wording (D-083)', () => {
  it('"Windows has detected a Zeus trojan" with a number to call → SR1', () => {
    expect(short(sup(['Windows has detected a Zeus trojan on this device.', 'Call support immediately: +1 877 555 0163']))).toEqual(['SR1:manipulative_instruction']);
  });

  it('a clean antivirus status ("0 threats detected", "no threats detected") is not an alarm', () => {
    for (const t of ['Scan complete: 0 threats detected. Questions? Call support at +1 800 555 0177.', 'Scan complete, no threats detected. Call us at +1 800 555 0177.']) {
      expect(sup([t]).verdict, t).toBe('observed_instruction');
    }
  });
});

