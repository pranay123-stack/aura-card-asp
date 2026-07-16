/**
 * Builds 1280×720 landscape showcase images for the hackathon submission's
 * Images field (which wants 500×300 or 1280×720). Places the portrait cards
 * on a branded background matching the card house style.
 *
 *   npx tsx scripts/make-showcase.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const W = 1280;
const H = 720;
const INK = "#15171F";
const INK2 = "#1F2233";
const AMBER = "#E8A94B";
const PAPER = "#EFE7DA";
const MUTED = "#9AA0AD";
const SERIF = "DejaVu Serif, Georgia, serif";
const SANS = "DejaVu Sans, Helvetica, Arial, sans-serif";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** A branded landscape background with optional heading text. */
function bg(opts: { title?: string; sub?: string; badge?: string; titleX?: number; titleY?: number; align?: "start" | "middle" }): string {
  const { title, sub, badge, titleX = 64, titleY = 360, align = "start" } = opts;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <radialGradient id="g" cx="30%" cy="35%" r="90%">
        <stop offset="0%" stop-color="${INK2}"/>
        <stop offset="100%" stop-color="${INK}"/>
      </radialGradient>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.05"/></feComponentTransfer></filter>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <circle cx="220" cy="180" r="320" fill="${AMBER}" opacity="0.10"/>
    <circle cx="1050" cy="560" r="300" fill="#D96A54" opacity="0.08"/>
    <rect width="${W}" height="${H}" filter="url(#grain)" style="mix-blend-mode:overlay"/>
    ${title ? `<text x="${titleX}" y="${titleY}" font-family="${SERIF}" font-size="72" font-weight="bold" fill="${PAPER}" text-anchor="${align}" letter-spacing="1">${esc(title)}</text>` : ""}
    ${sub ? `<text x="${titleX}" y="${titleY + 44}" font-family="${SANS}" font-size="23" fill="${MUTED}" text-anchor="${align}">${esc(sub)}</text>` : ""}
    ${badge ? `<rect x="${titleX}" y="${titleY + 74}" width="366" height="44" rx="22" fill="${AMBER}"/><text x="${titleX + 183}" y="${titleY + 102}" font-family="${SANS}" font-size="17" font-weight="bold" fill="${INK}" text-anchor="middle" letter-spacing="0.5">${esc(badge)}</text>` : ""}
    <circle cx="${W - 150}" cy="${H - 36}" r="6" fill="${AMBER}"/>
    <text x="${W - 132}" y="${H - 30}" font-family="${SANS}" font-size="15" font-weight="bold" fill="${MUTED}" letter-spacing="2">AURA CARD · x402</text>
  </svg>`;
}

/** Resize a card to a target height and give it a soft drop shadow. */
async function cardLayer(file: string, targetH: number): Promise<{ buf: Buffer; w: number; h: number }> {
  const resized = await sharp(readFileSync(file)).resize({ height: targetH }).png().toBuffer();
  const meta = await sharp(resized).metadata();
  const w = meta.width!;
  const h = meta.height!;
  // shadow: a blurred dark rounded rect slightly larger, composited behind
  const pad = 40;
  const shadow = await sharp({
    create: { width: w + pad * 2, height: h + pad * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${w + pad * 2}" height="${h + pad * 2}"><rect x="${pad}" y="${pad + 8}" width="${w}" height="${h}" rx="18" fill="#000" opacity="0.55"/></svg>`,
        ),
        top: 0,
        left: 0,
      },
    ])
    .blur(18)
    .png()
    .toBuffer();
  const withShadow = await sharp(shadow)
    .composite([{ input: resized, top: pad, left: pad }])
    .png()
    .toBuffer();
  return { buf: withShadow, w: w + pad * 2, h: h + pad * 2 };
}

async function compose(out: string, background: string, cards: Array<{ file: string; h: number; x: number; y: number }>) {
  const bgBuf = await sharp(Buffer.from(background), { density: 96 }).resize(W, H).png().toBuffer();
  const layers = [];
  for (const c of cards) {
    const l = await cardLayer(c.file, c.h);
    layers.push({ input: l.buf, top: c.y, left: c.x });
  }
  const png = await sharp(bgBuf).composite(layers).png({ quality: 92 }).toBuffer();
  writeFileSync(out, png);
  console.log(`wrote ${out}`);
}

// 1) HERO — title + tagline on the left, one prominent card on the right
await compose(
  "out/showcase-1-hero.png",
  bg({ title: "AURA CARD", sub: "Describe your vibe. Get a shareable card.", badge: "0.5 USDT · x402 · X LAYER", titleY: 300 }),
  [{ file: "out/live-card.png", h: 636, x: 800, y: 42 }],
);

// 2) RANGE — three cards, small header band
await compose(
  "out/showcase-2-range.png",
  bg({ title: "One read, three ways", sub: "warm · funny · uncomfortably specific", titleX: 640, titleY: 92, align: "middle" }),
  [
    { file: "out/test-desk.png", h: 560, x: 130, y: 130 },
    { file: "out/demo-mood.png", h: 560, x: 520, y: 130 },
    { file: "out/container-card.png", h: 560, x: 910, y: 130 },
  ],
);

// 3) FEATURE — one big card left, reading callout right
await compose(
  "out/showcase-3-feature.png",
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs><radialGradient id="g" cx="70%" cy="40%" r="90%"><stop offset="0%" stop-color="${INK2}"/><stop offset="100%" stop-color="${INK}"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <circle cx="1000" cy="200" r="300" fill="${AMBER}" opacity="0.10"/>
    <text x="560" y="220" font-family="${SANS}" font-size="18" font-weight="bold" fill="${AMBER}" letter-spacing="3">ROUTER WARLORD</text>
    <text x="560" y="292" font-family="${SERIF}" font-size="34" font-weight="bold" fill="${PAPER}">"Your cat has correctly</text>
    <text x="560" y="338" font-family="${SERIF}" font-size="34" font-weight="bold" fill="${PAPER}">identified the router as</text>
    <text x="560" y="384" font-family="${SERIF}" font-size="34" font-weight="bold" fill="${PAPER}">the throne room."</text>
    <text x="560" y="470" font-family="${SANS}" font-size="21" fill="${MUTED}">One Claude call writes the reading, the palette,</text>
    <text x="560" y="500" font-family="${SANS}" font-size="21" fill="${MUTED}">and the visual DNA that draws the art.</text>
    <circle cx="566" cy="560" r="6" fill="${AMBER}"/>
    <text x="584" y="566" font-family="${SANS}" font-size="15" font-weight="bold" fill="${MUTED}" letter-spacing="2">AURA CARD · x402</text>
  </svg>`,
  [{ file: "out/demo-pet.png", h: 620, x: 90, y: 12 }],
);

// 4) MOTIFS — art range
await compose(
  "out/showcase-4-art.png",
  bg({ title: "The art is the reading", sub: "generated from the same judgement as the words", titleX: 640, titleY: 92, align: "middle" }),
  [
    { file: "out/demo-outfit.png", h: 560, x: 130, y: 130 },
    { file: "out/live-card.png", h: 560, x: 520, y: 130 },
    { file: "out/test-cat.png", h: 560, x: 910, y: 130 },
  ],
);

console.log("\nDone — 4 showcase images at 1280×720 in out/showcase-*.png");
