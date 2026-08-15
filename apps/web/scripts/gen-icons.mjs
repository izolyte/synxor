// Renders the brand raster set (app icons, maskable variants, favicon.ico, OG
// share image) from the × logomark so the binary assets stay reproducible.
// Source of truth for colour is apps/web/src/styles/globals.css — the hexes
// below are the sRGB equivalents of those oklch tokens.
//
//   pnpm --filter web exec node scripts/gen-icons.mjs
//
// resvg loads the Geist Mono woff2 straight from the workspace dependency, so
// the OG wordmark renders without any system font installed.
import { Resvg } from "@resvg/resvg-js";
import { Buffer } from "node:buffer";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, "../public");

const TEAL = "#1c989e"; // light --primary — the brand anchor
const TEAL_ON_DARK = "#38abb1"; // dark --primary — reads brighter on the near-black ground
const INK = "#030303"; // dark --background — the near-black brand ground
const WHITE = "#ffffff"; // --primary-foreground
const WORDMARK = "#e7ecec"; // dark --foreground
const TAGLINE = "#7c898a"; // dark --muted-foreground

const fontDir = dirname(require.resolve("@fontsource-variable/geist-mono/package.json"));
const geistMono = readFileSync(resolve(fontDir, "files/geist-mono-latin-wght-normal.woff2"));

// The approved logomark: two rounded crossing strokes. `reach` is how far each
// arm extends from the 12,12 centre on a 24 grid.
const mark = (reach, width, color) => {
  const lo = 12 - reach;
  const hi = 12 + reach;
  return `<path d="M${lo} ${lo}L${hi} ${hi}M${hi} ${lo}L${lo} ${hi}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
};

// Teal app-icon tile. radius 0 is full-bleed (for masks / Apple's own crop);
// a radius rounds the corners for surfaces that show the icon as-is.
const tile = (radius, reach) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="${radius}" fill="${TEAL}"/>${mark(reach, 2.8, WHITE)}</svg>`;

// .ico frame: teal mark on transparent so it reads on any tab colour.
const faviconFrame = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${mark(7, 3, TEAL)}</svg>`;

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${INK}"/>
  <path d="M528 190L672 334M672 190L528 334" fill="none" stroke="${TEAL_ON_DARK}" stroke-width="24" stroke-linecap="round"/>
  <text x="600" y="452" text-anchor="middle" font-family="Geist Mono" font-weight="600" font-size="116" letter-spacing="4" fill="${WORDMARK}">synxor</text>
  <text x="600" y="520" text-anchor="middle" font-family="Geist Mono" font-weight="400" font-size="34" letter-spacing="1" fill="${TAGLINE}">Send it. It vanishes.</text>
</svg>`;

const renderPng = (svg, width, withText = false) => {
  const opts = { fitTo: { mode: "width", value: width } };
  if (withText) {
    opts.font = {
      fontBuffers: [geistMono],
      loadSystemFonts: false,
      defaultFontFamily: "Geist Mono",
    };
  }
  return Buffer.from(new Resvg(svg, opts).render().asPng());
};

// PNG-in-ICO (Vista+): every modern browser reads it, and it keeps the file tiny.
const buildIco = (frames) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(frames.length, 4);
  const dir = Buffer.alloc(frames.length * 16);
  let offset = header.length + dir.length;
  frames.forEach((f, i) => {
    const e = dir.subarray(i * 16, i * 16 + 16);
    e.writeUInt8(f.size >= 256 ? 0 : f.size, 0); // width (0 == 256)
    e.writeUInt8(f.size >= 256 ? 0 : f.size, 1); // height
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(f.png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += f.png.length;
  });
  return Buffer.concat([header, dir, ...frames.map((f) => f.png)]);
};

const out = (name, buf) => {
  writeFileSync(resolve(publicDir, name), buf);
  console.log(`  ${name}  ${buf.length} bytes`);
};

console.log("brand icons →");
out("apple-touch-icon.png", renderPng(tile(0, 6.5), 180));
out("icon-192.png", renderPng(tile(5.3, 6.5), 192));
out("icon-512.png", renderPng(tile(5.3, 6.5), 512));
out("icon-maskable-192.png", renderPng(tile(0, 6), 192));
out("icon-maskable-512.png", renderPng(tile(0, 6), 512));
out(
  "favicon.ico",
  buildIco([16, 32, 48].map((size) => ({ size, png: renderPng(faviconFrame, size) }))),
);
out("og.png", renderPng(og, 1200, true));
