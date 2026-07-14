/**
 * Demo harness — runs 5 example calls straight through the pipeline and writes
 * the cards to out/. This is what you screen-record.
 *
 *   npx tsx scripts/demo.ts
 *
 * Needs ANTHROPIC_API_KEY. Does NOT need OKX credentials — it calls the pipeline
 * directly, bypassing the payment layer, so you can iterate on the creative output
 * without spending USDT on every run. Use scripts/paid-call.ts to exercise x402.
 */
import { writeFileSync } from "node:fs";
import { generateAuraCard } from "../src/pipeline/index.js";

const EXAMPLES = [
  {
    slug: "desk",
    description:
      "my desk: three half-finished mugs, a mechanical keyboard i regret buying, sticky notes with tasks from march, and a small plastic dinosaur",
  },
  {
    slug: "outfit",
    description:
      "grey hoodie i've worn four days running, one sock inside out, and the good jacket over the top because i have a meeting",
  },
  {
    slug: "pet",
    description:
      "my cat has claimed the warm spot on top of the router and hisses at anyone who reboots it",
  },
  {
    slug: "mood",
    description:
      "shipped the thing at 2am, woke up at 11, currently eating cereal and staring at the ceiling with a strange sense of peace",
  },
  {
    slug: "day",
    description:
      "rainy tuesday, four back-to-back calls, i have not left this chair, the plant is judging me",
  },
];

console.log(`\n🔮 Generating ${EXAMPLES.length} aura cards...\n`);

let total = 0;
for (const ex of EXAMPLES) {
  const t0 = Date.now();
  try {
    const result = await generateAuraCard({ description: ex.description });
    const file = `out/demo-${ex.slug}.png`;
    writeFileSync(file, Buffer.from(result.card_png_base64, "base64"));
    total += result.generated_in_ms;

    console.log(`── ${ex.slug} ─────────────────────────────────────────`);
    console.log(`   in:      "${ex.description.slice(0, 60)}..."`);
    console.log(`   title:   ${result.title}`);
    console.log(`   reading: ${result.reading}`);
    console.log(`   vibe:    ${result.vibe}`);
    console.log(`   palette: ${result.palette.join("  ")}`);
    console.log(`   visual:  ${result.visual.motif} · energy ${result.visual.energy} · density ${result.visual.density}`);
    console.log(`   → ${file}  (${(result.card_png_base64.length / 1365).toFixed(0)} KB, ${Date.now() - t0}ms)\n`);
  } catch (err) {
    console.error(`   ✗ ${ex.slug} failed:`, (err as Error).message, "\n");
  }
}

console.log(`Done. ${EXAMPLES.length} cards, avg ${(total / EXAMPLES.length / 1000).toFixed(1)}s each.`);
console.log(`Open out/demo-*.png\n`);
