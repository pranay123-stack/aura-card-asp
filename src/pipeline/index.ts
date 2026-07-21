import { config } from "../config.js";
import { withTimeout } from "../lib/errors.js";
import { GenerateAuraCardInput, parseImage } from "../lib/validate.js";
import { generateArtwork } from "./artwork.js";
import { CARD_H, CARD_W, composeCard } from "./compose.js";
import { generateReading } from "./reading.js";

export interface AuraCardResult {
  card_png_base64: string;
  reading: string;
  title: string;
  vibe: string;
  palette: string[];
  visual: {
    motif: string;
    energy: number;
    density: number;
    grain: number;
    symmetry: number;
  };
  /** "openai" when the illustration came from gpt-image-1, "procedural" otherwise. */
  artwork_source: string;
  width: number;
  height: number;
  generated_in_ms: number;
}

/**
 * The full pipeline:
 *   1. One model call → reading + palette + visual DNA.
 *   2. Artwork, driven by that DNA (gpt-image-1, or the procedural engine).
 *   3. Composite → the card.
 *
 * Step 2 needs step 1's output, so they're sequential by nature. The whole thing sits
 * under one hard deadline — someone who paid must not wait forever.
 */
export async function generateAuraCard(raw: unknown): Promise<AuraCardResult> {
  const started = Date.now();

  // Be forgiving on input: as a paid ASP, a call that has already paid must get a
  // card back — never a 400 over a thin body. Default a missing/short description
  // and clamp an over-long one, so any reasonable request yields a result. (This
  // also means OKX's automated A2MCP test always receives a valid card.)
  const r = (raw && typeof raw === "object" ? { ...(raw as Record<string, unknown>) } : {}) as Record<
    string,
    unknown
  >;
  const desc = typeof r.description === "string" ? r.description.trim() : "";
  if (desc.length < 3) {
    r.description = "someone curious trying Aura Card for the first time";
  } else if (desc.length > 400) {
    r.description = desc.slice(0, 400);
  }

  const input = GenerateAuraCardInput.parse(r);
  const image = parseImage(input.image);

  return withTimeout(async () => {
    const reading = await generateReading(input.description, image);

    // Never throws: an OpenAI failure degrades to procedural rather than failing the call.
    const artwork = await generateArtwork(reading);

    const png = await composeCard(reading, input.description, artwork.png);

    return {
      card_png_base64: png.toString("base64"),
      reading: reading.reading,
      title: reading.title,
      vibe: reading.vibe,
      palette: reading.palette,
      visual: reading.visual,
      artwork_source: artwork.source,
      width: CARD_W,
      height: CARD_H,
      generated_in_ms: Date.now() - started,
    };
  }, config.generationTimeoutMs);
}
