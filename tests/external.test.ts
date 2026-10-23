// External dataset harness (D-099): CSV parsing and the deterministic dev/test split, without any dataset file.
import { describe, expect, it } from 'vitest';
import { parseCsv, restoreSynthetic, sourceOf, splitOf } from '../src/eval/external.js';

describe('external dataset harness', () => {
  it('parses quoted fields with commas, quotes and line breaks', () => {
    expect(parseCsv('Teks,label\n"a, ""b""\nc",penipuan\nplain,normal\n')).toEqual([['Teks', 'label'], ['a, "b"\nc', 'penipuan'], ['plain', 'normal']]);
  });

  it('assigns each message to dev or test by a stable hash of its text', () => {
    expect(splitOf('contoh pesan')).toEqual(splitOf('contoh pesan'));
    const splits = Array.from({ length: 400 }, (_, i) => splitOf(`pesan ${i}`).split);
    const test = splits.filter((s) => s === 'test').length;
    expect(test).toBeGreaterThan(150);
    expect(test).toBeLessThan(250);
  });

  it('maps the synthetic dataset channels to message sources and fills placeholders with defanged values', () => {
    expect(sourceOf('Halaman web')).toBe('web');
    expect(sourceOf('Popup browser')).toBe('web');
    expect(sourceOf('Email')).toBe('email');
    expect(sourceOf('SMS')).toBe('sms');
    expect(sourceOf('WhatsApp pribadi')).toBe('chat');
    expect(restoreSynthetic('buka [TAUTAN], hubungi [KONTAK], ke [REKENING_SIMULASI], file [LAMPIRAN_SIMULASI]'))
      .toBe('buka https://link.example.invalid/x, hubungi 081200000000, ke 1234567890, file lampiran.apk');
  });
});

describe('OCR pass merge (D-105)', () => {
  it('keeps the first pass in order and adds only lines the first pass did not read', async () => {
    const { mergeOcrPasses } = await import('../src/pwa/ocr-text.js');
    expect(mergeOcrPasses('Kue lebaran renyah\nCampurkan tepung dan gula', 'Kue lebaran renyah\nSELAMAT Anda pemenang undian\nCampurkan tepung dan gula'))
      .toEqual(['Kue lebaran renyah', 'Campurkan tepung dan gula', 'SELAMAT Anda pemenang undian']);
  });
});
