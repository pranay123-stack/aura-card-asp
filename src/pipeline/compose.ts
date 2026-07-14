import sharp from "sharp";
import { AGENT_NAME } from "../config.js";
import { generationFailed } from "../lib/errors.js";
import { ART_H, ART_W, darken, lighten, luminance, renderArt } from "./art.js";
import type { AuraReading } from "./reading.js";

export const CARD_W = 1024;
export const CARD_H = 1536;
const PANEL_Y = ART_H; // 1000
const PANEL_H = CARD_H - PANEL_Y; // 536
const MARGIN = 72;

const SANS = "DejaVu Sans, Liberation Sans, Helvetica, Arial, sans-serif";
const SERIF = "DejaVu Serif, Liberation Serif, Georgia, serif";

/**
 * Composes the final card.
 *
 * `artworkPng` is the generated illustration, when there is one. It is cover-fitted
 * into the art box and then run through the same grain + vignette treatment the
 * procedural art gets, so an OpenAI card and a procedural card sit in the same set
 * rather than looking like two different products.
 *
 * When it's null we render the procedural SVG inline instead. Everything below the
 * art box — typography, swatches, watermark — is identical either way.
 */
export async function composeCard(
  reading: AuraReading,
  seedText: string,
  artworkPng?: Buffer | null,
): Promise<Buffer> {
  try {
    let artDataUri: string | undefined;

    if (artworkPng) {
      // Cover-fit to the art box: fill it completely, crop the overflow, never letterbox.
      const fitted = await sharp(artworkPng)
        .resize(ART_W, ART_H, { fit: "cover", position: "attention" })
        .png()
        .toBuffer();
      artDataUri = `data:image/png;base64,${fitted.toString("base64")}`;
    }

    const svg = buildCardSvg(reading, seedText, artDataUri);
    return await sharp(Buffer.from(svg), { density: 96 }).png({ quality: 92 }).toBuffer();
  } catch (err) {
    throw generationFailed(`Card compositing failed: ${(err as Error).message}`);
  }
}

function buildCardSvg(reading: AuraReading, seedText: string, artDataUri?: string): string {
  const [c1, c2, c3, c4] = reading.palette;
  const ink = darken(c1, 0.62);
  const paper = lighten(c1, 0.92);
  const muted = lighten(ink, 0.45);

  // Either the generated illustration, treated to match the house look, or the
  // procedural engine's own SVG.
  const art = artDataUri
    ? `
    <defs>
      <filter id="grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="3" seed="7" result="n"/>
        <feColorMatrix type="saturate" values="0" in="n" result="m"/>
        <feComponentTransfer in="m"><feFuncA type="linear" slope="${(0.05 + reading.visual.grain * 0.18).toFixed(3)}"/></feComponentTransfer>
      </filter>
      <radialGradient id="vignette" cx="50%" cy="45%" r="75%">
        <stop offset="55%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.38"/>
      </radialGradient>
    </defs>
    <image href="${artDataUri}" x="0" y="0" width="${ART_W}" height="${ART_H}" preserveAspectRatio="xMidYMid slice"/>
    <rect width="${ART_W}" height="${ART_H}" filter="url(#grain)" style="mix-blend-mode:overlay"/>
    <rect width="${ART_W}" height="${ART_H}" fill="url(#vignette)"/>`
    : renderArt(reading, seedText);

  // Title: shrink a step if it's long, so it never collides with the margin.
  const titleSize = reading.title.length > 22 ? 46 : 58;
  const titleLines = wrap(reading.title.toUpperCase(), CARD_W - MARGIN * 2, titleSize * 0.62, 2);

  const bodySize = reading.reading.length > 170 ? 27 : 31;
  const bodyLines = wrap(reading.reading, CARD_W - MARGIN * 2, bodySize * 0.505, 5);

  const titleY = PANEL_Y + 92;
  const bodyY = titleY + titleLines.length * (titleSize * 1.18) + 34;
  const swatchY = CARD_H - 176;
  const footerY = CARD_H - 44;

  const swatches = reading.palette
    .map((hex, i) => {
      const x = MARGIN + i * 96;
      const label = luminance(hex) > 0.6 ? darken(hex, 0.6) : lighten(hex, 0.85);
      return `
      <rect x="${x}" y="${swatchY}" width="80" height="80" rx="10" fill="${hex}" stroke="${muted}" stroke-opacity="0.25" stroke-width="1"/>
      <text x="${x + 40}" y="${swatchY + 47}" font-family="${SANS}" font-size="13" font-weight="bold"
            fill="${label}" text-anchor="middle" letter-spacing="0.5">${esc(hex.replace("#", ""))}</text>`;
    })
    .join("");

  const vibeTag = reading.vibe.toLowerCase();
  const tagW = Math.max(120, vibeTag.length * 12 + 40);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
  <rect width="${CARD_W}" height="${CARD_H}" fill="${paper}"/>

  <!-- generative artwork, driven by the model's visual DNA -->
  <g>${art}</g>

  <!-- reading panel -->
  <rect x="0" y="${PANEL_Y}" width="${CARD_W}" height="${PANEL_H}" fill="${paper}"/>
  <rect x="0" y="${PANEL_Y}" width="${CARD_W}" height="6" fill="${c2}"/>

  <!-- vibe tag, straddling the seam -->
  <rect x="${MARGIN}" y="${PANEL_Y - 24}" width="${tagW}" height="48" rx="24" fill="${ink}"/>
  <text x="${MARGIN + tagW / 2}" y="${PANEL_Y + 7}" font-family="${SANS}" font-size="17" font-weight="bold"
        fill="${paper}" text-anchor="middle" letter-spacing="1.2">${esc(vibeTag)}</text>

  <!-- title -->
  ${titleLines
    .map(
      (line, i) =>
        `<text x="${MARGIN}" y="${titleY + i * titleSize * 1.18}" font-family="${SERIF}" font-size="${titleSize}"
               font-weight="bold" fill="${ink}" letter-spacing="1.5">${esc(line)}</text>`,
    )
    .join("")}

  <!-- reading -->
  ${bodyLines
    .map(
      (line, i) =>
        `<text x="${MARGIN}" y="${bodyY + i * bodySize * 1.42}" font-family="${SANS}" font-size="${bodySize}"
               fill="${lighten(ink, 0.12)}">${esc(line)}</text>`,
    )
    .join("")}

  <!-- palette -->
  ${swatches}

  <!-- footer / watermark -->
  <line x1="${MARGIN}" y1="${footerY - 30}" x2="${CARD_W - MARGIN}" y2="${footerY - 30}" stroke="${muted}" stroke-opacity="0.3" stroke-width="1"/>
  <circle cx="${MARGIN + 8}" cy="${footerY - 6}" r="7" fill="${c3}"/>
  <text x="${MARGIN + 26}" y="${footerY}" font-family="${SANS}" font-size="16" font-weight="bold"
        fill="${ink}" letter-spacing="2.5">${esc(AGENT_NAME.toUpperCase())}</text>
  <text x="${CARD_W - MARGIN}" y="${footerY}" font-family="${SANS}" font-size="14"
        fill="${muted}" text-anchor="end" letter-spacing="0.8">an agent service provider · x402</text>
</svg>`;
}

/**
 * Greedy word wrap. We have no font metrics here, so `charW` is an empirical
 * average advance width for the size in use — conservative enough that lines
 * stay inside the margin.
 */
function wrap(text: string, maxWidth: number, charW: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";

  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length * charW > maxWidth && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    } else {
      cur = next;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);

  // If we ran out of lines, ellipsize the last one rather than silently dropping words.
  if (lines.length === maxLines) {
    const consumed = lines.join(" ").split(/\s+/).length;
    if (consumed < words.length) {
      const last = lines[maxLines - 1];
      const budget = Math.floor(maxWidth / charW) - 1;
      lines[maxLines - 1] = last.length > budget ? `${last.slice(0, budget - 1).trimEnd()}…` : `${last}…`;
    }
  }
  return lines;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
