// Generates the extension icons as PNG files with no dependencies (zlib only).
// Design (assets/brand/logo.svg): dark rounded square, light eye outline, olive iris and pupil, olive trace ticks.
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

const BG = [18, 21, 16, 1];
const EDGE = [61, 71, 57, 1];
const LIGHT = [238, 240, 230, 1];
const OLIVE = [185, 201, 138, 1];

function roundedSquareDistance(x, y) {
  // Signed distance to the rounded square x,y ∈ [1, 31], corner radius 7 (negative inside).
  const r = 7;
  const qx = Math.abs(x - 16) - (15 - r);
  const qy = Math.abs(y - 16) - (15 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function segmentDistance(x, y, ax, ay, bx, by) {
  const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
  return Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay)));
}

// The eye's lids are two circular arcs through (5,16) and (27,16) with radius 13.75 (centers 8.25 below and above the axis).
const LID_R = 13.75;
const TICKS = [[16, 4, 16, 7.5], [16, 24.5, 16, 28]];

function shade(x, y) {
  const sd = roundedSquareDistance(x, y);
  if (sd > 0.35) return null;
  if (sd > -0.35) return EDGE;
  const dx = x - 16, dy = y - 16;
  const r = Math.hypot(dx, dy);
  if (r <= 1.4) return BG;
  if (r <= 3.6) return OLIVE;
  if (x >= 4.5 && x <= 27.5) {
    if (dy <= 0.3 && Math.abs(Math.hypot(dx, y - 24.25) - LID_R) <= 0.9) return LIGHT;
    if (dy >= -0.3 && Math.abs(Math.hypot(dx, y - 7.75) - LID_R) <= 0.9) return LIGHT;
  }
  if (TICKS.some(([ax, ay, bx, by]) => segmentDistance(x, y, ax, ay, bx, by) <= 0.8)) return OLIVE;
  return BG;
}

/** One icon of any size (the PWA needs 192 and 512 px). */
export function iconPng(size) {
  return render(size, shade);
}

export function icons() {
  return Object.fromEntries([16, 32, 48, 128].map((s) => [`icon-${s}.png`, render(s, shade)]));
}
