// Unit tests for the EXPERIMENTAL credential-disclosure detector (M5.1) on hand-written snapshots.
import { describe, expect, it } from 'vitest';
import { analyze, analyzeCredentials, CRED_DETECTOR_VERSION, CRED_LEXICON, normalize } from '../src/core/index.js';
import type { CredentialResult } from '../src/core/index.js';
import { inContainer, snapshot } from './fixtures/build.js';
import { SCENARIOS } from './fixtures/scenarios.js';

const short = (r: CredentialResult): string[] => r.findings.map((f) => `${f.ruleId}:${f.classification}`);
const otpField = (c: string, label = 'Verification code') => ({ kind: 'otp' as const, label, containerId: c, afterBlockId: 'b0', locator: '#otp' });
const passwordField = (c: string, after = 'b0') => ({ kind: 'password' as const, label: 'Password', containerId: c, afterBlockId: after, locator: '#pw', formId: 'form0' });

describe('credential detector: manipulative and suspicious requests', () => {
  it('CR1: a community comment asking to send the OTP, claiming to be support → manipulative, high action risk', () => {
    const r = analyzeCredentials(snapshot(inContainer('ugc:#c2', ['Hi, this is the official support team.', 'To verify your account, please send me the 6-digit code you just received.'])));
    expect(r.detectorVersion).toBe(CRED_DETECTOR_VERSION);
    expect(r.experimental).toBe(true);
    expect(short(r)).toEqual(['CR1:manipulative_instruction']);
    const f = r.findings[0]!;
    expect(f).toMatchObject({ requestedAction: 'send', secretTypes: ['otp'], actionRisk: 'high', confidence: 'high', trustContext: ['user-content'] });
    expect(f.pretexts).toEqual(['CP.SUPPORT', 'CP.VERIFY']);
    expect(f.limitations).toEqual(['claimed-identity-unverifiable', 'trust-boundary-heuristic']);
    expect(f.observationIds.map((id) => r.observations.find((o) => o.id === id)!.text)).toEqual(['official support', 'verify your account', 'send me', '6-digit code']);
  });

  it('CR1 in Indonesian: "kirimkan kode OTP" from a claimed bank officer → manipulative', () => {
    const r = analyzeCredentials(snapshot(['Saya petugas bank, transaksi Anda tertahan.', 'Mohon kirimkan kode OTP yang masuk ke HP Anda sekarang juga.']));
    expect(short(r)).toEqual(['CR1:manipulative_instruction']);
    expect(r.findings[0]!.pretexts).toEqual(['CP.SUPPORT', 'CP.URGENCY']);
  });

  it('CR1 without any pretext is still suspicious: legitimate services do not ask you to pass codes on', () => {
    const r = analyzeCredentials(snapshot(['Reply with your recovery code and I will restore it.']));
    expect(short(r)).toEqual(['CR1:suspicious_correlation']);
    expect(r.findings[0]!.ruleClassification).toBe('suspicious_correlation');
  });

  it('CR2: wallet recovery phrase requested to "validate" the wallet → manipulative', () => {
    const r = analyzeCredentials(snapshot(['Validate your wallet to continue receiving rewards.', 'Enter your 12-word recovery phrase below.'],
      { fields: [{ kind: 'secret-phrase', label: 'Recovery phrase', containerId: 'body', afterBlockId: 'b1' }] }));
    expect(short(r)).toEqual(['CR2:manipulative_instruction']);
    expect(r.findings[0]!.secretTypes).toEqual(['recovery-phrase']);
  });

  it('CR3: secret field inside a third-party widget with an account-verification pretext → suspicious', () => {
    const r = analyzeCredentials(snapshot([{ t: 'Verify your account to keep chatting.', c: 'widget:#chat::shadow::' }], { fields: [otpField('widget:#chat::shadow::')] }));
    expect(short(r)).toEqual(['CR3:suspicious_correlation']);
    expect(r.findings[0]!.trustContext).toEqual(['third-party-widget']);
  });

  it('CR4: account threat + deadline + password field → suspicious with high confidence; destination is reported, not scored', () => {
    const s = snapshot(inContainer('overlay:#m', ['Your account will be suspended within 24 hours.', 'Confirm your password to keep access.']),
      { fields: [passwordField('overlay:#m', 'b1')], forms: [{ id: 'form0', containerId: 'overlay:#m', method: 'post', destination: 'other-origin' }] });
    const r = analyzeCredentials(s);
    expect(short(r)).toEqual(['CR4:suspicious_correlation']);
    expect(r.findings[0]).toMatchObject({ confidence: 'high', actionRisk: 'medium', formDestination: 'other-origin', trustContext: ['overlay', 'form'] });
    expect(r.findings[0]!.limitations).toContain('destination-not-scored');
    const same = analyzeCredentials({ ...s, forms: [{ id: 'form0', containerId: 'overlay:#m', method: 'post', destination: 'same-origin' }] });
    expect(short(same)).toEqual(short(r));
  });
});

describe('credential detector: benign controls (hard negatives)', () => {
  it('ordinary login form → observed (CR5), never an alert', () => {
    const r = analyzeCredentials(snapshot(['Sign in to your account', 'Email', 'Forgot password?'],
      { fields: [{ kind: 'email', label: 'Email', containerId: 'body', afterBlockId: 'b1' }, passwordField('body', 'b1')] }));
    expect(short(r)).toEqual(['CR5:observed_instruction']);
  });

  it('legitimate MFA: "verify it is you" + code field + "expires in 10 minutes" → observed', () => {
    const r = analyzeCredentials(snapshot(['Verify your identity', 'Enter the 6-digit code we sent to your phone. The code expires in 10 minutes.'], { fields: [otpField('body')] }));
    expect(short(r)).toEqual(['CR5:observed_instruction']);
    expect(r.findings[0]!.pretexts).toEqual(['CP.VERIFY']);
  });

  it('Indonesian bank OTP page with "berlaku 5 menit" and "jangan berikan" → observed', () => {
    const r = analyzeCredentials(snapshot(['Masukkan kode OTP yang dikirim ke nomor Anda. Kode berlaku dalam 5 menit.', 'Jangan berikan kode OTP kepada siapa pun, termasuk petugas bank.'],
      { fields: [otpField('body', 'Kode OTP')] }));
    expect(short(r)).toEqual(['CR5:observed_instruction']);
  });

  it('protective advice alone ("never share your OTP") is not a request', () => {
    expect(short(analyzeCredentials(snapshot(['Never share your OTP or recovery code with anyone.', 'Our support team will never ask you to send your password.'])))).toEqual([]);
  });

  it('awareness article that reports what scammers ask → observed, demoted by reported speech', () => {
    const r = analyzeCredentials(snapshot(['How to spot OTP scams', 'Scammers ask victims to send the verification code within 5 minutes.']));
    expect(short(r)).toEqual(['CR1:observed_instruction']);
    expect(r.findings[0]!.modifiers.map((m) => m.id)).toEqual(['C.REPORTED', 'C.EDUCATIONAL']);
  });

  it('a quoted phishing message → observed', () => {
    const r = analyzeCredentials(snapshot([{ t: 'Your account will be suspended. Send us your password immediately.', ctx: { quote: true } }]));
    expect(short(r)).toEqual(['CR1:observed_instruction']);
  });

  it('developer docs: paste your API token when prompted → observed', () => {
    expect(short(analyzeCredentials(snapshot(['Run the login command, then paste your API token when prompted.'])))).toEqual(['CR5:observed_instruction']);
  });

  it('HTML tutorial with a password input in a code sample → observed', () => {
    const r = analyzeCredentials(snapshot([{ t: '<input type="password" placeholder="Enter your password">', ctx: { pre: true, code: true, article: true } }]));
    expect(short(r)).toEqual(['CR5:observed_instruction']);
  });
});

describe('credential detector: override and invariants', () => {
  it('a live secret field next to a planted educational heading keeps the request suspicious (O.LIVE_SECRET_FIELD)', () => {
    const r = analyzeCredentials(snapshot([{ t: 'Your wallet will be frozen today. Enter your PIN below.', h: 'Security tips' }],
      { fields: [{ kind: 'pin', label: 'PIN', containerId: 'body', afterBlockId: 'b0' }] }));
    expect(short(r)).toEqual(['CR4:suspicious_correlation']);
    expect(r.findings[0]!.overrides.map((o) => o.id)).toEqual(['O.LIVE_SECRET_FIELD']);
    expect(r.findings[0]!.modifiers).toEqual([]);
  });

  it('never reads url or title', () => {
    const s = snapshot(inContainer('ugc:#c', ['Support here: send me the code we sent you.']));
    const a = analyzeCredentials(s);
    expect(analyzeCredentials({ ...s, url: 'https://accounts.example-bank.test/', title: 'Official bank' })).toEqual(a);
    expect(analyzeCredentials({ ...s, url: 'http://192.0.2.9/x', title: '' })).toEqual(a);
  });

  it('form fields never change the ClickFix result on any unit fixture', () => {
    for (const sc of SCENARIOS) {
      const withFields = { ...sc.snapshot, formFields: [{ ...passwordField(sc.snapshot.blocks[0]?.containerId ?? 'body'), id: 'fd0', hints: ['type=password'] }], forms: [] };
      expect(analyze(withFields), sc.id).toEqual(analyze(sc.snapshot));
    }
  });

  it('every lexicon example matches its own pattern', () => {
    for (const e of CRED_LEXICON) {
      for (const ex of e.examples) expect([...normalize(ex).text.matchAll(e.pattern)].length, `${e.id}: ${ex}`).toBeGreaterThan(0);
    }
  });
});

describe('credential detector: targeted false-positive regressions (M5.1 finalization)', () => {
  it('interactive phishing-awareness exercise: quoted threat + practice password field → observed, not suspicious', () => {
    const r = analyzeCredentials(snapshot([
      { t: 'Security awareness training: spot the fake message', h: 'Security awareness training' },
      { t: 'Your account will be suspended within 24 hours. Confirm your password now.', ctx: { quote: true } },
      { t: 'Practice: type any password below to see how the trick works. Nothing is sent.' },
    ], { fields: [{ kind: 'password', label: 'Practice password', containerId: 'body', afterBlockId: 'b2' }] }));
    expect(['observed_instruction', 'none']).toContain(r.verdict);
  });

  it('benign MFA with urgency-related text ("act now", "immediately") and no account threat → observed', () => {
    const r = analyzeCredentials(snapshot(['Complete sign-in immediately: enter the 6-digit code from your authenticator app.', 'Act now to finish setting up your account.'],
      { fields: [{ kind: 'otp', label: 'Code', containerId: 'body', afterBlockId: 'b0' }] }));
    expect(short(r)).toEqual(['CR5:observed_instruction']);
    expect(r.findings[0]!.pretexts).toEqual(['CP.URGENCY']);
  });

  it('nested form: dialog warning text, form inside a section inside the dialog → one scope (CR4)', () => {
    const s = snapshot([{ t: 'Your account will be locked today.', c: 'dialog:#d' }, { t: 'Password', c: 'form:#d > section > form' }],
      { fields: [{ kind: 'password', label: 'Password', containerId: 'form:#d > section > form', afterBlockId: 'b1', formId: 'form0' }],
        forms: [{ id: 'form0', containerId: 'form:#d > section > form', method: 'post', destination: 'none', ancestorContainerIds: ['section:#d > section', 'dialog:#d', 'body'] }] });
    expect(short(analyzeCredentials(s))).toEqual(['CR4:suspicious_correlation']);
  });

  it('a form inside a user comment does not inherit the article context around the comment', () => {
    const s = snapshot([{ t: 'Your account will be suspended unless you act.', c: 'article:#a' }, { t: 'Password', c: 'form:#c1 > form' }],
      { fields: [{ kind: 'password', label: 'Password', containerId: 'form:#c1 > form', afterBlockId: 'b1', formId: 'form0' }],
        forms: [{ id: 'form0', containerId: 'form:#c1 > form', method: 'post', destination: 'none', ancestorContainerIds: ['ugc:#c1'] }] });
    expect(short(analyzeCredentials(s))).toEqual(['CR5:observed_instruction']);
  });

  it('quoted "send me your OTP" next to an unrelated live login password field → observed (no override)', () => {
    const r = analyzeCredentials(snapshot([{ t: 'Scam example: "Send me the OTP we just texted you."', ctx: { quote: true } }, 'Sign in'],
      { fields: [{ kind: 'password', label: 'Password', containerId: 'body', afterBlockId: 'b1' }] }));
    expect(r.verdict).toBe('observed_instruction');
    expect(r.findings.flatMap((f) => f.overrides)).toEqual([]);
  });

  it('legitimate recovery flow (restore access, code + new password) → observed', () => {
    const r = analyzeCredentials(snapshot(['Restore access to your account', 'Enter the code we emailed you, then choose a new password.'],
      { fields: [{ kind: 'otp', label: 'Code', containerId: 'body', afterBlockId: 'b1' }, { kind: 'password', label: 'New password', containerId: 'body', afterBlockId: 'b1' }] }));
    expect(short(r)).toEqual(['CR5:observed_instruction']);
  });
});

describe('credential detector: informal Indonesian (cred-0.1.1-exp, after the owner\'s manual test of CA03)', () => {
  it('CA03: "kasih liat dong angka yg barusan masuk ke hp lu" for "verif akun" → manipulative CR1', () => {
    const r = analyzeCredentials(snapshot(inContainer('ugc:#p', ['bro buat verif akun, kasih liat dong angka yg barusan masuk ke hp lu, cepetan ya'])));
    expect(short(r)).toEqual(['CR1:manipulative_instruction']);
    expect(r.findings[0]).toMatchObject({ requestedAction: 'send', secretTypes: ['otp'] });
    expect(r.findings[0]!.pretexts).toEqual(['CP.URGENCY', 'CP.VERIFY']);
  });

  it('other slang requests: kirimin / spill / sebutin → manipulative', () => {
    for (const t of ['min, kirimin kode verif yg masuk ke wa lo dong, biar akun lo ga kena banned', 'spill otp nya bro biar gw cek, buruan',
      'halo kak, buat verifikasi tolong sebutin 6 angka dari sms yg baru masuk ya']) {
      expect(short(analyzeCredentials(snapshot(inContainer('ugc:#c', [t])))), t).toEqual(['CR1:manipulative_instruction']);
    }
  });

  it('slang that is advice, an ordinary entry step, or not about a secret never alerts', () => {
    expect(short(analyzeCredentials(snapshot(['bro jangan pernah kasih angka yg masuk ke hp lu ke siapapun'])))).toEqual([]);
    expect(analyzeCredentials(snapshot(['masukin kode verif yg masuk ke hp kamu di aplikasi ya, berlaku 5 menit'])).verdict).not.toMatch(/suspicious|manipulative/);
    expect(short(analyzeCredentials(snapshot(inContainer('ugc:#c', ['spill harga dong kak, kasih liat foto produknya juga, buruan ya']))))).toEqual([]);
  });
});

describe('credential detector cred-0.2.0-exp (D-083)', () => {
  it('a secret named before the send verb in the same sentence is the object of the request', () => {
    const r = analyzeCredentials(snapshot(inContainer('ugc:#chat', ['nanti ada kode masuk ke hp kakak, tolong kirim ke sini ya kodenya biar refund nya diproses'])));
    expect(short(r)).toEqual(['CR1:manipulative_instruction']);
  });

  it('a first-person sender ("we will send you a code", "kami akan mengirimkan kode OTP") is a notice, not a request', () => {
    for (const t of ['We will send a verification code to your phone. Enter it below.', 'Kami akan mengirimkan kode OTP ke nomor Anda.', 'Masukkan kode yang kami kirim ke email Anda.']) {
      expect(analyzeCredentials(snapshot([t])).findings.every((f) => f.ruleId !== 'CR1'), t).toBe(true);
    }
  });
});

