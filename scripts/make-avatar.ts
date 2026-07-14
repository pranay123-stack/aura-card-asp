/**
 * Generates the ASP avatar — required for on-chain registration.
 *
 *   npx tsx scripts/make-avatar.ts
 *
 * Constraints imposed by the registry: an image FILE (links are rejected),
 * 1:1 square recommended, under 1 MB, PNG/JPEG/WebP.
 *
 * We render it from the same art engine that draws the cards, so the brand mark
 * and the product are visibly the same thing.
 */
import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { renderArt } from "../src/pipeline/art.js";
import type { AuraReading } from "../src/pipeline/reading.js";

const SIZE = 512;

// The house palette. Warm amber against deep ink — reads well at small sizes.
const BRAND: AuraReading = {
  title: "Aura Card",
  reading: "",
  vibe: "",
  palette: ["#1F2233", "#E8A94B", "#D96A54", "#EFE7DA"],
  visual: { motif: "orbit", energy: 0.55, density: 0.5, grain: 0.3, symmetry: 4 },
  safe: true,
  reject_reason: "",
};

// renderArt targets the card's 1024x1000 art box; render it there, then
// centre-crop to a square so the orbit motif stays concentric.
const art = renderArt(BRAND, "aura-card-brand-mark-v1");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1000" viewBox="0 0 1024 1000">${art}</svg>`;

const png = await sharp(Buffer.from(svg))
  .extract({ left: 12, top: 0, width: 1000, height: 1000 }) // square, centred on the orbit
  .resize(SIZE, SIZE)
  .png({ compressionLevel: 9 })
  .toBuffer();

const out = "assets/avatar.png";
writeFileSync(out, png);

const kb = png.length / 1024;
console.log(`wrote ${out}  ${SIZE}x${SIZE}  ${kb.toFixed(0)} KB`);
console.log(kb < 1024 ? "✓ under the 1 MB registry limit" : "✗ TOO BIG — registry rejects >1 MB");
