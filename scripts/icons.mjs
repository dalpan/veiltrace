// Generates the extension icons as PNG files with no dependencies (zlib only).
// Design: indigo rounded square, white eye outline with pupil, dashed "veil" diagonal.
import { deflateSync } from 'node:zlib';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** Coverage-based anti-aliasing: 4×4 supersampling of a shape function returning [r,g,b,a] or null. */
function render(size, shade) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const S = 4;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
        const px = ((x + (sx + 0.5) / S) / size) * 32;
        const py = ((y + (sy + 0.5) / S) / size) * 32;
        const c = shade(px, py);
        if (c) { r += c[0] * c[3]; g += c[1] * c[3]; b += c[2] * c[3]; a += c[3]; }
      }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      const n = S * S;
      raw[o] = a ? Math.round(r / a) : 0;
      raw[o + 1] = a ? Math.round(g / a) : 0;
      raw[o + 2] = a ? Math.round(b / a) : 0;
      raw[o + 3] = Math.round((a / n) * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const BRAND = [67, 56, 202, 1];
const WHITE = [255, 255, 255, 1];

function inRoundedSquare(x, y) {
  const r = 8, lo = 1, hi = 31;
  const cx = Math.min(Math.max(x, lo + r), hi - r);
  const cy = Math.min(Math.max(y, lo + r), hi - r);
  return x >= lo && x <= hi && y >= lo && y <= hi && (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function shade(x, y) {
  if (!inRoundedSquare(x, y)) return null;
  const dx = x - 16, dy = y - 16;
  // Eye outline: two arcs approximated by an ellipse ring.
  const e = (dx / 11) ** 2 + (dy / 6.5) ** 2;
  const ring = e <= 1 && e >= 0.62;
  const pupil = dx * dx + dy * dy <= 3.6 * 3.6;
  // Diagonal veil band (from bottom-left to top-right).
  const d = Math.abs(x + y - 32) / Math.SQRT2;
  const band = d <= 2.4;
  const dash = d <= 0.9 && Math.floor((x - y + 64) / 2.5) % 2 === 0;
  if (band) return dash ? WHITE : BRAND;
  if (ring || pupil) return WHITE;
  return BRAND;
}

export function icons() {
  return Object.fromEntries([16, 32, 48, 128].map((s) => [`icon-${s}.png`, render(s, shade)]));
}
