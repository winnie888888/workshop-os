/**
 * Generate the PWA / home-screen icons as real PNG files, with no external
 * tools or network — Node's built-in zlib is enough to write a valid compressed
 * PNG. We draw an on-brand mark: the workshop "ink" background (#14181d) with a
 * safety-yellow hex nut (#ffb000), which reads as an automotive/workshop glyph
 * and crops cleanly as a maskable icon. Run once on a connected machine (or here)
 * to (re)generate the files in apps/web/public; the PNGs are then committed.
 *
 *   node scripts/generate-icons.mjs
 */
import zlib from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'apps', 'web', 'public');

// --- colours (from the Tailwind palette) ---
const INK = [0x14, 0x18, 0x1d];      // background
const SAFETY = [0xff, 0xb0, 0x00];   // hex nut
const HOLE = [0x14, 0x18, 0x1d];     // nut hole = background

// CRC32 (for PNG chunks) — standard table-based implementation.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

// Is point (px,py) inside a regular hexagon centred at (cx,cy) with radius r?
function inHex(px, py, cx, cy, r) {
  const dx = Math.abs(px - cx) / r;
  const dy = Math.abs(py - cy) / r;
  // flat-top hexagon test
  if (dx > 1 || dy > Math.sqrt(3) / 2) return false;
  return Math.sqrt(3) / 2 - dy >= (Math.sqrt(3) / 2) * (dx - 0.5) * (dx > 0.5 ? 1 : 0);
}

function makePng(size) {
  const cx = size / 2, cy = size / 2;
  const nutR = size * 0.34;     // hex nut radius
  const holeR = size * 0.15;    // central hole radius
  const corner = size * 0.18;   // rounded-corner radius for the tile

  // Build RGBA pixel buffer with a filter byte (0) at the start of each row.
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter type 0 (None)
    for (let x = 0; x < size; x++) {
      let col = INK; let a = 255;

      // Rounded-corner tile: transparent outside the rounded square so the icon
      // sits well on any home-screen background.
      const inCorner = (qx, qy) => {
        const dx = x - qx, dy = y - qy;
        return dx * dx + dy * dy <= corner * corner;
      };
      const outsideRounded =
        (x < corner && y < corner && !inCorner(corner, corner)) ||
        (x > size - corner && y < corner && !inCorner(size - corner, corner)) ||
        (x < corner && y > size - corner && !inCorner(corner, size - corner)) ||
        (x > size - corner && y > size - corner && !inCorner(size - corner, size - corner));
      if (outsideRounded) a = 0;

      // Hex nut + hole on top of the ink tile.
      if (a === 255) {
        const inNut = inHex(x, y, cx, cy, nutR);
        const dh = Math.hypot(x - cx, y - cy);
        if (inNut && dh > holeR) col = SAFETY;
        else if (dh <= holeR) col = HOLE;
      }

      const o = rowStart + 1 + x * 4;
      raw[o] = col[0]; raw[o + 1] = col[1]; raw[o + 2] = col[2]; raw[o + 3] = a;
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type 6 = RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync(OUT, { recursive: true });
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  writeFileSync(join(OUT, name), makePng(size));
  console.log('wrote', name, `(${size}x${size})`);
}
console.log('done');
