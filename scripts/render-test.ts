/**
 * Renders sample cards with a hardcoded reading — no API key, no network.
 * Purpose: verify sharp + SVG + font rendering works before wiring the model.
 *   npx tsx scripts/render-test.ts
 */
import { writeFileSync } from "node:fs";
import { composeCard } from "../src/pipeline/compose.js";
import type { AuraReading } from "../src/pipeline/reading.js";

const samples: Array<{ file: string; seed: string; reading: AuraReading }> = [
  {
    file: "out/test-desk.png",
    seed: "three mugs, none finished, cables everywhere",
    reading: {
      title: "Caffeinated Monk",
      reading:
        "Three mugs, none of them finished — you don't drink coffee, you keep it as a hostage. The cable nest is not a mess, it's a nervous system.",
      vibe: "gently-unhinged",
      palette: ["#2A2D34", "#E8B04B", "#D96A54", "#EFE7DA"],
      visual: { motif: "static", energy: 0.85, density: 0.8, grain: 0.4, symmetry: 2 },
      safe: true,
      reject_reason: "",
    },
  },
  {
    file: "out/test-cat.png",
    seed: "my cat sleeps in the sunbeam all afternoon",
    reading: {
      title: "Sunbeam Tenant",
      reading:
        "She has located the one warm rectangle in the house and filed for permanent residency. You work around her now. That's the arrangement.",
      vibe: "monastic",
      palette: ["#1F3A5F", "#F4D58D", "#BF9B7A", "#F7F3E9"],
      visual: { motif: "bloom", energy: 0.2, density: 0.35, grain: 0.15, symmetry: 5 },
      safe: true,
      reject_reason: "",
    },
  },
  {
    file: "out/test-tide.png",
    seed: "rainy sunday, nothing done, no regrets",
    reading:
      {
        title: "Productive Nothing",
        reading: "You've done zero things and defended the position beautifully. The rain is doing the work of an entire personality today.",
        vibe: "feral-cozy",
        palette: ["#3D3B52", "#7B94B8", "#C9ADA7", "#F2E9E4"],
        visual: { motif: "tide", energy: 0.3, density: 0.6, grain: 0.55, symmetry: 3 },
        safe: true,
        reject_reason: "",
      },
  },
];

for (const s of samples) {
  const png = await composeCard(s.reading, s.seed);
  writeFileSync(s.file, png);
  console.log(`wrote ${s.file}  (${(png.length / 1024).toFixed(0)} KB)`);
}
console.log("\nOpen the PNGs and check: text is visible, nothing clipped, art fills the top.");
