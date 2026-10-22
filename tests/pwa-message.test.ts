// "Cek Pesan" PWA message helpers (D-084): a pasted link alone is reported as such, not as a checked message.
import { describe, expect, it } from 'vitest';
import { isLinkOnly } from '../src/pwa/message.js';

describe('isLinkOnly', () => {
  it('a bare link, or a link with a word or two, is link-only', () => {
    expect(isLinkOnly('https://pln.example.invalid/?id=3gJXN')).toBe(true);
    expect(isLinkOnly('cek ini https://pln.example.invalid/?id=3gJXN')).toBe(true);
  });

  it('a message around a link, or text without a link, is not', () => {
    expect(isLinkOnly('PLN - Hadiah Tahun Baru 2026, klik tautan untuk ikut kuesioner https://pln.example.invalid/?id=3gJXN')).toBe(false);
    expect(isLinkOnly('Selamat siang kak')).toBe(false);
  });
});
