// Entry point for the make.fun bounty "Sum up 21 November's world news in one image".
// The page was drawn once, as entry.png next to this file. This program only
// checks that the image is a real 1024x1024 PNG inside the size cap and then
// copies it, unchanged, to the grader's output directory.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, 'entry.png');
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR;
if (!OUT_DIR) {
  console.error('MAKEFUN_OUTPUT_DIR is not set');
  process.exit(1);
}

const buf = readFileSync(SRC);

// PNG signature: 89 50 4E 47 0D 0A 1A 0A
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (buf.length < 33 || !buf.subarray(0, 8).equals(PNG_SIG)) {
  console.error('entry.png is not a PNG file');
  process.exit(1);
}

// IHDR must be the first chunk: 4-byte length 13, type "IHDR", then
// width (4), height (4), bit depth (1), colour type (1).
const ihdrLen = buf.readUInt32BE(8);
const ihdrType = buf.subarray(12, 16).toString('ascii');
if (ihdrLen !== 13 || ihdrType !== 'IHDR') {
  console.error('entry.png has no valid IHDR chunk');
  process.exit(1);
}
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);
const bitDepth = buf[24];
const colourType = buf[25];
if (width !== 1024 || height !== 1024) {
  console.error(`entry.png is ${width}x${height}, expected 1024x1024`);
  process.exit(1);
}
if (bitDepth !== 8 || (colourType !== 2 && colourType !== 6)) {
  console.error(`unexpected PNG format: bit depth ${bitDepth}, colour type ${colourType}`);
  process.exit(1);
}
if (buf.length > 1048576) {
  console.error(`entry.png is ${buf.length} bytes, over the 1 MiB cap`);
  process.exit(1);
}

// A complete PNG ends with the IEND chunk: 4-byte length 0, type "IEND",
// 4-byte CRC. A truncated file that passes the header checks above must
// still be caught here.
const tail = buf.subarray(buf.length - 12);
if (tail.readUInt32BE(0) !== 0 || tail.subarray(4, 8).toString('ascii') !== 'IEND') {
  console.error('entry.png is truncated: no IEND chunk at the end');
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
const dest = path.join(OUT_DIR, 'entry.png');
writeFileSync(dest, buf);

// The grader runs the program twice and demands identical bytes, so prove
// the copy matches the source before reporting success.
const back = readFileSync(dest);
const a = createHash('sha256').update(buf).digest('hex');
const b = createHash('sha256').update(back).digest('hex');
if (a !== b) {
  console.error('copied entry.png does not match the source');
  process.exit(1);
}
console.log(`wrote ${dest} (${buf.length} bytes, sha256 ${a})`);
