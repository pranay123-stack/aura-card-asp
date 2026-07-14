import type { AuraReading } from "./reading.js";

/**
 * Procedural art engine.
 *
 * The artwork is not decoration chosen at random — it is rendered from the same
 * "visual DNA" the model produced alongside the reading (motif, energy, density,
 * grain, symmetry) plus the palette. Same input always produces the same card,
 * because the PRNG is seeded from the description text.
 *
 * Output is an SVG fragment sized ART_W x ART_H, meant to be embedded in the card.
 */

export const ART_W = 1024;
export const ART_H = 1000;

/** mulberry32 — small, fast, good enough for visual noise. */
function prng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function renderArt(reading: AuraReading, seedText: string): string {
  const rand = prng(hash(seedText));
  const [c1, c2, c3, c4] = reading.palette;
  const { motif, energy, density, grain, symmetry } = reading.visual;

  const cx = ART_W / 2;
  const cy = ART_H / 2;

  // Soft colour field: a handful of heavily blurred orbs. This is what stops the
  // card reading as flat clip-art — it gives the palette somewhere to breathe.
  const orbCount = 4 + Math.round(density * 4);
  let orbs = "";
  for (let i = 0; i < orbCount; i++) {
    const col = [c2, c3, c4][i % 3];
    const r = 150 + rand() * 320;
    const x = rand() * ART_W;
    const y = rand() * ART_H;
    const op = 0.30 + rand() * 0.35;
    orbs += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${col}" opacity="${op.toFixed(2)}"/>`;
  }

  const motifSvg = renderMotif(motif, { rand, cx, cy, energy, density, symmetry, colors: [c2, c3, c4] });

  const grainOpacity = (0.05 + grain * 0.22).toFixed(3);

  return `
<defs>
  <radialGradient id="bg" cx="50%" cy="38%" r="78%">
    <stop offset="0%" stop-color="${lighten(c1, 0.16)}"/>
    <stop offset="100%" stop-color="${darken(c1, 0.30)}"/>
  </radialGradient>
  <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="${(70 + (1 - density) * 60).toFixed(0)}"/>
  </filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="3" seed="${(hash(seedText) % 97).toFixed(0)}" result="n"/>
    <feColorMatrix type="saturate" values="0" in="n" result="m"/>
    <feComponentTransfer in="m">
      <feFuncA type="linear" slope="${grainOpacity}"/>
    </feComponentTransfer>
  </filter>
  <clipPath id="artClip"><rect width="${ART_W}" height="${ART_H}"/></clipPath>
</defs>

<g clip-path="url(#artClip)">
  <rect width="${ART_W}" height="${ART_H}" fill="url(#bg)"/>
  <g filter="url(#soft)">${orbs}</g>
  ${motifSvg}
  <rect width="${ART_W}" height="${ART_H}" filter="url(#grain)" style="mix-blend-mode:overlay"/>
  <rect width="${ART_W}" height="${ART_H}" fill="url(#vignette)"/>
</g>
<defs>
  <radialGradient id="vignette" cx="50%" cy="45%" r="75%">
    <stop offset="55%" stop-color="#000000" stop-opacity="0"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0.38"/>
  </radialGradient>
</defs>`;
}

interface MotifCtx {
  rand: () => number;
  cx: number;
  cy: number;
  energy: number;
  density: number;
  symmetry: number;
  colors: string[];
}

function renderMotif(motif: AuraReading["visual"]["motif"], ctx: MotifCtx): string {
  switch (motif) {
    case "orbit":
      return orbit(ctx);
    case "bloom":
      return bloom(ctx);
    case "static":
      return staticNoise(ctx);
    case "drift":
      return drift(ctx);
    case "spire":
      return spire(ctx);
    case "tide":
      return tide(ctx);
  }
}

/** Concentric rings with satellites — focused, cyclical, a little obsessive. */
function orbit({ rand, cx, cy, energy, density, colors }: MotifCtx): string {
  const rings = 3 + Math.round(density * 5);
  let out = "";
  for (let i = 0; i < rings; i++) {
    const r = 90 + i * (55 + rand() * 40);
    const col = colors[i % colors.length];
    const w = (1 + rand() * 2.5).toFixed(1);
    out += `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(0)}" fill="none" stroke="${col}" stroke-width="${w}" opacity="${(0.28 + rand() * 0.4).toFixed(2)}"/>`;

    const sats = 1 + Math.round(energy * 4);
    for (let s = 0; s < sats; s++) {
      const a = rand() * Math.PI * 2;
      const sr = 3 + rand() * (5 + energy * 12);
      out += `<circle cx="${(cx + Math.cos(a) * r).toFixed(1)}" cy="${(cy + Math.sin(a) * r).toFixed(1)}" r="${sr.toFixed(1)}" fill="${col}" opacity="0.85"/>`;
    }
  }
  return out;
}

/** Petals radiating from the centre — expansive, generous, warm. */
function bloom({ rand, cx, cy, energy, density, symmetry, colors }: MotifCtx): string {
  const petals = symmetry * (3 + Math.round(density * 4));
  let out = "";
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2 + rand() * 0.12;
    const len = 180 + rand() * (200 + energy * 200);
    const wob = 40 + rand() * 90;
    const x2 = cx + Math.cos(a) * len;
    const y2 = cy + Math.sin(a) * len;
    const mx = cx + Math.cos(a + 0.4) * (len * 0.55);
    const my = cy + Math.sin(a + 0.4) * (len * 0.55);
    const col = colors[i % colors.length];
    out += `<path d="M${cx} ${cy} Q${mx.toFixed(0)} ${my.toFixed(0)} ${x2.toFixed(0)} ${y2.toFixed(0)}" fill="none" stroke="${col}" stroke-width="${(1 + rand() * wob * 0.03).toFixed(1)}" opacity="${(0.2 + rand() * 0.4).toFixed(2)}" stroke-linecap="round"/>`;
  }
  out += `<circle cx="${cx}" cy="${cy}" r="${(30 + energy * 40).toFixed(0)}" fill="${colors[1]}" opacity="0.75"/>`;
  return out;
}

/** Jagged scanlines — frazzled, electric, too many tabs open. */
function staticNoise({ rand, energy, density, colors }: MotifCtx): string {
  const lines = 14 + Math.round(density * 40);
  let out = "";
  for (let i = 0; i < lines; i++) {
    const y = rand() * ART_H;
    const segs = 8 + Math.round(energy * 22);
    let d = `M0 ${y.toFixed(0)}`;
    for (let s = 1; s <= segs; s++) {
      const x = (s / segs) * ART_W;
      const jitter = (rand() - 0.5) * (14 + energy * 70);
      d += ` L${x.toFixed(0)} ${(y + jitter).toFixed(1)}`;
    }
    const col = colors[i % colors.length];
    out += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${(0.8 + rand() * 2).toFixed(1)}" opacity="${(0.18 + rand() * 0.42).toFixed(2)}"/>`;
  }
  return out;
}

/** Long horizontal currents — calm, unhurried, slightly adrift. */
function drift({ rand, density, energy, colors }: MotifCtx): string {
  const lines = 8 + Math.round(density * 16);
  let out = "";
  for (let i = 0; i < lines; i++) {
    const y = (i / lines) * ART_H + rand() * 30;
    const amp = 20 + rand() * (40 + energy * 90);
    const phase = rand() * Math.PI * 2;
    let d = `M0 ${y.toFixed(0)}`;
    for (let x = 0; x <= ART_W; x += 24) {
      const yy = y + Math.sin(x / (140 + rand() * 40) + phase) * amp;
      d += ` L${x} ${yy.toFixed(1)}`;
    }
    const col = colors[i % colors.length];
    out += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${(1 + rand() * 3).toFixed(1)}" opacity="${(0.16 + rand() * 0.32).toFixed(2)}" stroke-linecap="round"/>`;
  }
  return out;
}

/** Vertical tapering shards — ambitious, sharp, upward. */
function spire({ rand, density, energy, colors }: MotifCtx): string {
  const count = 6 + Math.round(density * 14);
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = rand() * ART_W;
    const h = 250 + rand() * (400 + energy * 350);
    const w = 14 + rand() * 70;
    const base = ART_H * (0.72 + rand() * 0.28);
    const col = colors[i % colors.length];
    out += `<path d="M${x.toFixed(0)} ${(base - h).toFixed(0)} L${(x - w / 2).toFixed(0)} ${base.toFixed(0)} L${(x + w / 2).toFixed(0)} ${base.toFixed(0)} Z" fill="${col}" opacity="${(0.2 + rand() * 0.4).toFixed(2)}"/>`;
  }
  return out;
}

/** Stacked sine bands — moody, tidal, in a feeling. */
function tide({ rand, density, energy, colors }: MotifCtx): string {
  const bands = 5 + Math.round(density * 8);
  let out = "";
  for (let i = 0; i < bands; i++) {
    const base = (i / bands) * ART_H + 60;
    const amp = 30 + rand() * (50 + energy * 80);
    const phase = rand() * Math.PI * 2;
    let d = `M0 ${ART_H} L0 ${base.toFixed(0)}`;
    for (let x = 0; x <= ART_W; x += 20) {
      const yy = base + Math.sin(x / (110 + rand() * 60) + phase) * amp;
      d += ` L${x} ${yy.toFixed(1)}`;
    }
    d += ` L${ART_W} ${ART_H} Z`;
    const col = colors[i % colors.length];
    out += `<path d="${d}" fill="${col}" opacity="${(0.12 + rand() * 0.22).toFixed(2)}"/>`;
  }
  return out;
}

// ---- colour helpers ----

function toRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function toHex([r, g, b]: [number, number, number]): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function darken(hex: string, amt: number): string {
  const [r, g, b] = toRgb(hex);
  return toHex([r * (1 - amt), g * (1 - amt), b * (1 - amt)]);
}

export function lighten(hex: string, amt: number): string {
  const [r, g, b] = toRgb(hex);
  return toHex([r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt]);
}

/** Perceived luminance — used to pick readable text colour over a swatch. */
export function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
