// Generates placeholder PWA icons (indigo gradient + white ring) without
// any image-library dependency by writing the PNG format directly.
// Run: node scripts/generate-pwa-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

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
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, pixelAt) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelAt(x, y, size);
      raw.set([r, g, b, a], row + 1 + x * 4);
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Vertical gradient between two indigo shades (top ~ #6366f1, bottom ~ theme #4f46e5),
// with a centered white ring.
function iconPixel(x, y, size) {
  const t = y / size;
  const bg = [
    Math.round(0x63 + (0x4f - 0x63) * t),
    Math.round(0x66 + (0x46 - 0x66) * t),
    Math.round(0xf1 + (0xe5 - 0xf1) * t),
  ];
  const cx = size / 2 - 0.5;
  const cy = size / 2 - 0.5;
  const d = Math.hypot(x - cx, y - cy) / size;
  const inRing = d >= 0.2 && d <= 0.32;
  // ~1px anti-aliased edge on both ring borders
  const edge = 1 / size;
  let w = 0;
  if (inRing) w = 1;
  else if (d > 0.32 && d < 0.32 + edge) w = 1 - (d - 0.32) / edge;
  else if (d < 0.2 && d > 0.2 - edge) w = 1 - (0.2 - d) / edge;
  return [
    Math.round(bg[0] + (255 - bg[0]) * w),
    Math.round(bg[1] + (255 - bg[1]) * w),
    Math.round(bg[2] + (255 - bg[2]) * w),
    255,
  ];
}

for (const [name, size] of [
  ["icon-192x192.png", 192],
  ["icon-512x512.png", 512],
  ["apple-touch-icon.png", 180],
]) {
  const file = join(publicDir, name);
  writeFileSync(file, png(size, iconPixel));
  console.log(`wrote ${file} (${size}x${size})`);
}
