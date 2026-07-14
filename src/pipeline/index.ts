import { config } from "../config.js";
import { withTimeout } from "../lib/errors.js";
import { GenerateAuraCardInput, parseImage } from "../lib/validate.js";
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
  width: number;
  height: number;
  generated_in_ms: number;
}

/**
 * The full pipeline: one model call for the reading + palette + visual DNA,
 * then procedural art, then compositing. Bounded by a single hard deadline —
 * a caller who paid must not wait indefinitely.
 */
export async function generateAuraCard(raw: unknown): Promise<AuraCardResult> {
  const started = Date.now();

  const input = GenerateAuraCardInput.parse(raw);
  const image = parseImage(input.image);

  return withTimeout(async () => {
    const reading = await generateReading(input.description, image);
    const png = await composeCard(reading, input.description);

    return {
      card_png_base64: png.toString("base64"),
      reading: reading.reading,
      title: reading.title,
      vibe: reading.vibe,
      palette: reading.palette,
      visual: reading.visual,
      width: CARD_W,
      height: CARD_H,
      generated_in_ms: Date.now() - started,
    };
  }, config.generationTimeoutMs);
}
