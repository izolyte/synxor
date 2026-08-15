// Renders the brand raster set (app icons, maskable variants, favicon.ico, OG
// share image) from the Exchange logomark so the binary assets stay reproducible.
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

// The approved Exchange logomark, on a 32 grid: two offset arrows pointing
// opposite ways (⇄) — the two-way transfer between sender and receiver. The
// arrows are point-symmetric about the 16,16 centre; horizontal shafts (upper
// band y≈12, lower band y≈20) keep it from collapsing into an × at a glance.
const exchange = (width, color) =>
  `<path d="M8 12H22M18.5 8L23.5 12L18.5 16M10 20H24M13.5 16L8.5 20L13.5 24" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;

// Teal app-icon tile. radius 0 is full-bleed (for masks / Apple's own crop);
// a radius rounds the corners for surfaces that show the icon as-is. The mark
// sits inside the 80% maskable safe zone at this size, so one placement serves
// every tile.
const tile = (radius) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="${radius}" fill="${TEAL}"/>${exchange(3.4, WHITE)}</svg>`;

// .ico frame: teal mark on transparent so it reads on any tab colour. Thicken
// the strokes at 16px so the arrowheads stay legible at tab size.
const faviconFrame = (size) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${exchange(size <= 16 ? 4 : 3.4, TEAL)}</svg>`;

// OG mark: the 32-grid exchange scaled up and centred on x=600, y=262.
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${INK}"/>
  <g transform="translate(456 118) scale(9)">${exchange(3, TEAL_ON_DARK)}</g>
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
out("apple-touch-icon.png", renderPng(tile(0), 180));
out("icon-192.png", renderPng(tile(7), 192));
out("icon-512.png", renderPng(tile(7), 512));
out("icon-maskable-192.png", renderPng(tile(0), 192));
out("icon-maskable-512.png", renderPng(tile(0), 512));
out(
  "favicon.ico",
  buildIco([16, 32, 48].map((size) => ({ size, png: renderPng(faviconFrame(size), size) }))),
);
out("og.png", renderPng(og, 1200, true));
