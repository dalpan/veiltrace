// Unit tests for the EXPERIMENTAL payment-manipulation detector (M5.2) on hand-written snapshots.
import { describe, expect, it } from 'vitest';
import { analyze, analyzeCredentials, analyzePayments, normalize, PAY_DETECTOR_VERSION, PAY_LEXICON } from '../src/core/index.js';
import type { PaymentResult } from '../src/core/index.js';
import { inContainer, snapshot } from './fixtures/build.js';
import { SCENARIOS } from './fixtures/scenarios.js';

const short = (r: PaymentResult): string[] => r.findings.map((f) => `${f.ruleId}:${f.classification}`);
const pay = (blocks: Parameters<typeof snapshot>[0]): PaymentResult => analyzePayments(snapshot(blocks));

describe('payment detector: manipulative and suspicious requests', () => {
  it('PR1: fake refund that requires a release fee first, from claimed support → manipulative, high action risk', () => {
    const r = pay(inContainer('widget:#chat', ['Hello, this is the customer support team.', 'Your refund of $480 is ready, but a release fee of $35 must be paid first.',
      'Please pay it within 2 hours to receive your refund.']));
    expect(r.detectorVersion).toBe(PAY_DETECTOR_VERSION);
    expect(r.experimental).toBe(true);
    expect(short(r)).toEqual(['PR1:manipulative_instruction']);
    const f = r.findings[0]!;
    expect(f).toMatchObject({ actionRisk: 'high', confidence: 'high', trustContext: ['third-party-widget'] });
    expect(f.promises).toEqual(expect.arrayContaining(['refund', 'release']));
    expect(f.pressures).toEqual(expect.arrayContaining(['claimed-authority', 'urgency']));
    expect(f.limitations).toEqual(['claimed-identity-unverifiable', 'trust-boundary-heuristic', 'amount-not-reported']);
  });

  it('PR1 in Indonesian: hadiah undian with "pajak hadiah" to be transferred first → manipulative', () => {
    const r = pay(['Selamat! Anda terpilih sebagai pemenang undian berhadiah mobil.', 'Untuk mencairkan hadiah, transfer pajak hadiah Rp 2.500.000 ke rekening petugas hari ini juga.']);
    expect(short(r)).toEqual(['PR1:manipulative_instruction']);
    expect(r.findings[0]!.promises).toEqual(expect.arrayContaining(['prize', 'release']));
    expect(r.findings[0]!.destinations).toEqual(['personal-account']);
  });

  it('PR1: fake account-unlock (verification) fee in Indonesian with a blocking threat → manipulative', () => {
    const r = pay(inContainer('overlay:#m', ['Akun Anda telah diblokir sementara.', 'Bayar biaya verifikasi Rp 99.000 agar akun dapat dibuka kembali.']));
    expect(short(r)).toEqual(['PR1:manipulative_instruction']);
    expect(r.findings[0]!.pressures).toEqual(['threat']);
  });

  it('PR1 without any pressure is still suspicious: a prize that must be paid for first', () => {
    expect(short(pay(["You've won a new phone! Pay the $12 shipping fee to claim your prize."]))).toEqual(['PR1:suspicious_correlation']);
  });

  it('PR2: fake support asks to pay with gift cards → manipulative', () => {
    const r = pay(['This is the tax office. You owe back taxes.', 'Buy three Google Play gift cards of $100 each and send us the codes.']);
    expect(short(r)).toEqual(['PR2:manipulative_instruction']);
    expect(r.findings[0]).toMatchObject({ destinations: ['gift-card'], actionRisk: 'high' });
  });

  it('PR2: marketplace seller asks to transfer outside the app → suspicious', () => {
    const r = pay(inContainer('ugc:#msg', ['Kak, biar lebih murah transfer langsung ke rekening pribadi saya ya, di luar aplikasi. Totalnya Rp 1.200.000.']));
    expect(short(r)).toEqual(['PR2:suspicious_correlation']);
    expect(r.findings[0]!.destinations).toEqual(expect.arrayContaining(['personal-account', 'off-platform']));
  });

  it('PR3: threat of arrest + claimed police + urgency → manipulative', () => {
    const r = pay(['Police officer notice: a warrant for your arrest has been issued.', 'To settle the case, pay the fine of $2,000 immediately or you will be arrested.']);
    expect(short(r)).toEqual(['PR3:manipulative_instruction']);
    expect(r.findings[0]!.pressures).toEqual(['claimed-authority', 'threat', 'urgency']);
  });

  it('PR3 in Indonesian: account blocking threat + deadline → suspicious', () => {
    expect(short(pay(['Rekening Anda akan diblokir dalam 2 jam.', 'Segera lakukan pembayaran tunggakan Rp 350.000.']))).toEqual(['PR3:suspicious_correlation']);
  });
});

describe('payment detector: benign controls (hard negatives)', () => {
  it('ordinary checkout with a deadline, fees and a customer-service footer → observed only', () => {
    const r = pay(['Order summary', 'Subtotal Rp 245.000 · Biaya layanan Rp 2.000 · Ongkir Rp 15.000',
      'Selesaikan pembayaran dalam 24 jam. Bayar sekarang dengan transfer bank atau e-wallet.', 'Butuh bantuan? Hubungi customer service kami.']);
    expect(short(r)).toEqual(['PR4:observed_instruction']);
  });

  it('invoice with bank transfer details and a due date → observed', () => {
    expect(short(pay(['Invoice #2026-114', 'Amount due: $1,250.00', 'Please pay by bank transfer to the account below by 30 November.']))).toEqual(['PR4:observed_instruction']);
  });

  it('donation page with a foundation account → observed', () => {
    expect(short(pay(['Bantu korban banjir.', 'Salurkan donasi Anda: transfer ke rekening Yayasan Peduli Sesama, minimal Rp 10.000.']))).toEqual(['PR4:observed_instruction']);
  });

  it('return policy: refund mentioned with a return shipping fee, but no pay-to-receive clause → observed', () => {
    expect(short(pay(['Refunds are issued within 5 business days after we receive the item.', 'To return an item, pay the $6 return shipping fee at checkout.']))).toEqual(['PR4:observed_instruction']);
  });

  it('e-wallet top-up with cashback → observed', () => {
    expect(short(pay(['Top up minimal Rp 50.000 dan dapatkan cashback 10%.']))).toEqual(['PR4:observed_instruction']);
  });

  it('security awareness: protective advice is not a request', () => {
    expect(short(pay(['Never pay a release fee to receive a refund.', 'Jangan transfer uang ke rekening pribadi petugas mana pun.']))).toEqual([]);
  });

  it('awareness article that reports what scammers ask → demoted to observed', () => {
    const r = pay([{ t: 'Scammers ask victims to pay a verification fee of Rp 150.000 to unlock their account.', h: 'How to spot payment scams' }]);
    expect(short(r)).toEqual(['PR1:observed_instruction']);
    expect(r.findings[0]!.modifiers.map((m) => m.id)).toEqual(['C.REPORTED', 'C.EDUCATIONAL']);
  });

  it('news report quoting the scam message → demoted to observed', () => {
    const r = pay(['Police arrested two suspects on Monday.', { t: 'Your account will be blocked. Pay the unlock fee of Rp 500.000 immediately.', ctx: { quote: true } },
      'Victims transferred more than Rp 300 million in total, investigators said.']);
    expect(r.verdict).toBe('observed_instruction');
  });

  it('a personal account is only another person’s: "transfer from your personal account" is ordinary banking', () => {
    expect(short(pay(['Transfer $200 from your personal account to your savings account.']))).toEqual(['PR4:observed_instruction']);
  });
});

describe('payment detector: privacy and invariants', () => {
  it('never reports amounts, and masks long digit runs such as account numbers', () => {
    const r = pay(['Akun Anda telah diblokir. Transfer biaya buka blokir Rp 750.000 ke rekening admin 1234567890 sekarang juga.']);
    expect(r.verdict).toBe('manipulative_instruction');
    const json = JSON.stringify(r);
    expect(json).not.toContain('750.000');
    expect(json).not.toContain('1234567890');
    expect(r.observations.filter((o) => o.signal === 'PA.AMOUNT').every((o) => o.text === '')).toBe(true);
  });

  it('never reads url, title or form fields', () => {
    const s = snapshot(['Your refund is on hold. Pay the release fee of $40 to receive it.']);
    const a = analyzePayments(s);
    expect(analyzePayments({ ...s, url: 'https://pay.bank.example/', title: 'Official bank' })).toEqual(a);
    expect(analyzePayments({ ...s, formFields: [{ id: 'fd0', kind: 'text', label: 'Card number', hints: [], containerId: 'body', locator: '#c' }] })).toEqual(a);
  });

  it('does not change the ClickFix or credential results', () => {
    for (const sc of SCENARIOS) {
      const before = [analyze(sc.snapshot), analyzeCredentials(sc.snapshot)];
      analyzePayments(sc.snapshot);
      expect([analyze(sc.snapshot), analyzeCredentials(sc.snapshot)], sc.id).toEqual(before);
    }
  });

  it('every lexicon example matches its own pattern', () => {
    for (const e of PAY_LEXICON) {
      for (const ex of e.examples) expect([...normalize(ex).text.matchAll(e.pattern)].length, `${e.id}: ${ex}`).toBeGreaterThan(0);
    }
  });
});

describe('payment detector pay-0.2.0-exp: informal Indonesian (D-083)', () => {
  it('"tf dlu biaya admin 50rb ke rek admin, abis itu langsung cair" → manipulative', () => {
    const r = pay(inContainer('ugc:#chat', ['selamat kak, saldo bonus 2jt kakak udah siap dicairin ya', 'tf dlu biaya admin 50rb ke rek admin, abis itu langsung cair ke rekening kakak', 'buruan ya kak, slotnya cuma sampe jam 12']));
    expect(r.verdict).toBe('manipulative_instruction');
    expect(r.findings[0]!.ruleId).toBe('PR1');
  });

  it('ordinary informal shop messages stay observed: pay, then the order ships', () => {
    expect(pay(['Bayar 150rb lewat aplikasi ya kak, setelah bayar pesanan langsung dikirim.']).verdict).toBe('observed_instruction');
  });
});

