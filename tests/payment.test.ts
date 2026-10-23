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

describe('payment detector pay-0.3.0-exp: recruitment scams and rank impersonation (D-087)', () => {
  it('a guaranteed place in a selection for a fee, paid to a personal account → manipulative (PR1)', () => {
    const r = pay(inContainer('ugc:#chat', ['Sy bisa bantu lewat jalur khusus, dijamin lulus sampai pendidikan.', 'Biaya administrasi 35jt, transfer ke rekening pribadi saya dulu ya.']));
    expect(short(r)).toEqual(['PR1:manipulative_instruction']);
    expect(r.findings[0]!.promises).toContain('recruitment');
  });

  it('a claimed commander asking for a transfer to an aide\'s account → manipulative (PR2)', () => {
    expect(short(pay(inContainer('ugc:#chat', ['Saya Dandim yang baru.', 'Mohon bantu transfer dana kegiatan 15jt ke rekening ajudan saya, segera sebelum jam 12.'])))).toEqual(['PR2:manipulative_instruction']);
  });

  it('official recruitment notices, dedicated lanes and toll payments are not recruitment scams', () => {
    expect(pay(['Seluruh tahapan seleksi tidak dipungut biaya. Jangan percaya pihak yang menjanjikan kelulusan dengan imbalan uang.']).verdict).toBe('none');
    expect(pay(['Bayar tol Rp 12.000 dengan kartu elektronik di jalur khusus e-toll.']).verdict).toBe('observed_instruction');
  });
});


describe('payment detector pay-0.4.0-exp: job-offer fees (D-091)', () => {
  it('a job call that requires new hires to buy a uniform, paid to an e-wallet tonight → manipulative (PR1)', () => {
    const r = pay(inContainer('ugc:#chat', ['Panggilan kerja untuk posisi pencuci mobil, mulai besok.',
      'Karyawan baru wajib membeli seragam Rp 120.000, dibayar lewat e-wallet DANA 0813 0000 2222 malam ini juga.']));
    expect(r.detectorVersion).toBe(PAY_DETECTOR_VERSION);
    expect(short(r)).toEqual(['PR1:manipulative_instruction']);
    expect(r.findings[0]!.promises).toContain('job');
    expect(JSON.stringify(r)).not.toContain('0813');
  });

  it('hired without a test on condition of an administration fee → manipulative (PR1)', () => {
    expect(short(pay(inContainer('ugc:#mail', ['Anda bisa langsung bergabung tanpa tes maupun wawancara, langsung tanda tangan kontrak.',
      'Dengan syarat biaya administrasi Rp 300.000. Segera konfirmasi.'])))).toEqual(['PR1:manipulative_instruction']);
  });

  it('a job page that states recruitment is free and warns about uniform fees is not a request', () => {
    expect(pay(['Lowongan: Staf Gudang. Gaji Rp 4.800.000 per bulan.', 'Seluruh proses rekrutmen tidak dipungut biaya. Waspadai pihak yang meminta biaya seragam atas nama kami.']).verdict).toBe('none');
  });

  it('a paid course that mentions job openings stays observed', () => {
    expect(pay(['Biaya pendaftaran Rp 750.000, bayar melalui virtual account setelah mengisi formulir.', 'Peserta yang lulus mendapat informasi lowongan kerja dari mitra kami.']).verdict).toBe('observed_instruction');
  });

  it('"atas nama" the reader is not a personal payee', () => {
    expect(pay(['Resi pengiriman atas nama masnya, baru selesaikan pembayaran Rp 2.000.000 setelah barang dikirim.']).verdict).not.toMatch(/suspicious|manipulative/);
  });
});

describe('payment detector pay-0.5.0-exp: SMS-era requests (D-099)', () => {
  it('a "new number" family member asking for phone credit to that number → manipulative (PR2)', () => {
    const r = pay(inContainer('ugc:#sms', ['Ma, ini nomor baru papa. Tolong isikan pulsa 50rb ke nomor ini 0812 0000 7777 sekarang, penting.']));
    expect(short(r)).toEqual(['PR2:manipulative_instruction']);
    expect(r.findings[0]!.pressures).toContain('claimed-family');
  });

  it('payment routed to a person who "has been authorized" → suspicious; a bill to a company account stays observed', () => {
    expect(short(pay(inContainer('ugc:#sms', ['Soal kontrakan, pembayaran harus melalui Bpk Hendra. Sudah saya kuasakan sepenuhnya.'])))).toEqual(['PR2:suspicious_correlation']);
    expect(pay(inContainer('ugc:#sms', ['Tagihan sewa Rp 1.500.000, silakan transfer ke rekening BCA a.n. PT Griya Sejahtera.'])).verdict).toBe('observed_instruction');
  });

  it('a new number without any request, and a warning that mentions payments, stay quiet', () => {
    expect(pay(inContainer('ugc:#sms', ['Halo, ini nomor baru saya ya, tolong disimpan.'])).verdict).toBe('none');
    expect(pay(['Petugas tidak pernah meminta pembayaran lewat pesan pribadi.']).verdict).not.toMatch(/suspicious|manipulative/);
  });
});

describe('payment detector pay-0.6.0-exp: message-scam phrasing (D-100)', () => {
  it('extortion: pay to an account or the data is spread → manipulative (PR2); without a destination → suspicious (PR3)', () => {
    expect(short(pay(inContainer('ugc:#sms', ['Data pribadi kamu akan disebarkan kalau tidak membayar Rp 2.000.000 ke 9876543210.'])))).toEqual(['PR2:manipulative_instruction']);
    expect(short(pay(inContainer('ugc:#sms', ['Ada biaya tambahan Rp 25.000 untuk pengiriman; bayar sebelum paket dikembalikan.'])))).toEqual(['PR3:suspicious_correlation']);
  });

  it('"terlebih dahulu" ties a fee to a prize; the same words at a shop checkout stay observed', () => {
    expect(short(pay(inContainer('ugc:#sms', ['Pengumuman pemenang undian: transfer biaya pengiriman Rp 175.000 terlebih dahulu.'])))).toEqual(['PR1:manipulative_instruction']);
    expect(pay(['Silakan transfer Rp 85.000 terlebih dahulu, pesanan diproses setelah pembayaran terkonfirmasi.']).verdict).toBe('observed_instruction');
  });

  it('task scams: a deposit before the commission can be withdrawn → manipulative (PR1)', () => {
    expect(short(pay(inContainer('ugc:#chat', ['Dapatkan komisi Rp 300.000 dari tugas like produk; cairkan setelah deposit aktivasi.'])))).toEqual(['PR1:manipulative_instruction']);
  });

  it('a donation that must go to an account "tanpa perlu verifikasi" → suspicious (PR2)', () => {
    expect(short(pay(inContainer('ugc:#chat', ['Donasi darurat harus dikirim sekarang ke 1234567890 tanpa perlu verifikasi lembaga.'])))).toEqual(['PR2:suspicious_correlation']);
  });

  it('awareness text that reports what impersonators ask for is not a request to the reader', () => {
    const r = pay(inContainer('ugc:#sms', ['Waspadai pesan yang mengatasnamakan petugas pajak dan meminta transfer biaya ke rekening pribadi.']));
    expect(r.verdict).not.toMatch(/suspicious|manipulative/);
  });
});

describe('payment detector pay-0.7.0-exp: fixed-return investment and down payments (D-102)', () => {
  it('paying in capital for a fixed daily profit → manipulative (PR1, investment return)', () => {
    const r = pay(inContainer('ugc:#chat', ['Gabung sekarang, profit 3% per hari, modal mulai 500rb, transfer ke 1234567890']));
    expect(short(r)).toEqual(['PR1:manipulative_instruction']);
    expect(r.findings[0]!.promises).toContain('investment-return');
  });

  it('a down payment to a personal account with stock pressure → suspicious (PR2)', () => {
    expect(short(pay(inContainer('ugc:#chat', ['DP 50% dulu ke rekening saya 1234567890, sisanya setelah barang sampai. Stok tinggal 1, buruan.'])))).toEqual(['PR2:suspicious_correlation']);
  });

  it('a deposit with yearly interest and a mutual fund with a risk warning stay observed', () => {
    expect(pay(['Deposito dengan bunga tetap 4% per tahun. Setor dana minimal Rp 10.000.000 di kantor cabang.']).verdict).toBe('observed_instruction');
    expect(pay(['Reksa dana: kinerja masa lalu tidak menjamin kinerja masa depan. Investasi mulai Rp 100.000, bayar lewat virtual account.']).verdict).not.toMatch(/suspicious|manipulative/);
  });
});

describe('payment detector pay-0.8.0-exp: illegal loans and deposit-based task jobs (D-103)', () => {
  it('a loan "sure to be paid out" that asks for an admin fee first → manipulative (PR1, loan)', () => {
    const r = pay(inContainer('ugc:#chat', ['Pinjaman online pasti cair tanpa BI checking. Bayar biaya admin Rp 200.000 dulu, dana langsung cair.']));
    expect(short(r)).toEqual(['PR1:manipulative_instruction']);
    expect(r.findings[0]!.promises).toContain('loan');
  });

  it('a loan ready to be paid out that needs a "data correction" fee → manipulative (PR1)', () => {
    expect(short(pay(inContainer('ugc:#chat', ['Dana pinjaman sudah siap dicairkan, tapi rekening Anda salah. Bayar biaya perbaikan data Rp 150.000 agar dana bisa ditransfer.']))))
      .toEqual(['PR1:manipulative_instruction']);
  });

  it('watching ads or reviewing for pay, with a deposit or balance top-up to start → manipulative (PR1)', () => {
    expect(short(pay(inContainer('ugc:#chat', ['Kerja sampingan nonton iklan dibayar 50rb per tugas. Untuk membuka tugas VIP, deposit Rp 300.000 dulu ya kak.'])))).toEqual(['PR1:manipulative_instruction']);
    expect(short(pay(inContainer('ugc:#chat', ['Tugas review hotel, komisi 15%. Isi saldo akun minimal Rp 200.000 untuk mulai tugas pertama.'])))).toEqual(['PR1:manipulative_instruction']);
  });

  it('a licensed loan page and an instalment reminder are not flagged', () => {
    expect(pay(['Pinjaman tunai bunga 1,5% per bulan. Tidak ada biaya di muka; biaya provisi dipotong dari dana yang cair.']).verdict).not.toMatch(/suspicious|manipulative/);
    expect(pay(inContainer('ugc:#chat', ['Cicilan pinjaman bulan ini Rp 950.000 jatuh tempo besok, silakan bayar lewat virtual account di aplikasi.'])).verdict).toBe('observed_instruction');
  });
});
