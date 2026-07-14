import OpenAI from "openai";
import { config } from "../config.js";
import { ART_H, ART_W } from "./art.js";
import type { AuraReading } from "./reading.js";

/**
 * Artwork generation.
 *
 * Two providers behind one interface:
 *
 *   procedural — the seeded SVG engine in art.ts. Free, ~50ms, deterministic,
 *                and cannot fail. This is the floor.
 *   openai     — gpt-image-1, for a real illustration.
 *
 * When OpenAI is enabled it is *raced against a deadline*, and any failure —
 * timeout, rate limit, safety refusal, outage — silently falls back to procedural.
 * A card always ships. There is no path where a judge watching the demo sees an
 * error because an image API had a bad minute.
 */

export type ArtworkSource = "openai" | "procedural";

export interface Artwork {
  /** PNG bytes for the art panel, or null to mean "render the procedural SVG inline". */
  png: Buffer | null;
  source: ArtworkSource;
  ms: number;
  /** Set when we intended to use OpenAI and fell back. Surfaced for observability, not to the buyer. */
  fellBackBecause?: string;
}

const openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : undefined;

export async function generateArtwork(reading: AuraReading): Promise<Artwork> {
  const started = Date.now();

  if (config.imageProvider !== "openai" || !openai) {
    return { png: null, source: "procedural", ms: Date.now() - started };
  }

  try {
    const png = await withDeadline(
      () => callOpenAI(openai, reading),
      config.imageTimeoutMs,
      "image generation exceeded its deadline",
    );
    return { png, source: "openai", ms: Date.now() - started };
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    console.warn(`[artwork] falling back to procedural: ${why}`);
    return {
      png: null,
      source: "procedural",
      ms: Date.now() - started,
      fellBackBecause: why,
    };
  }
}

async function callOpenAI(client: OpenAI, reading: AuraReading): Promise<Buffer> {
  const result = await client.images.generate({
    model: "gpt-image-1",
    prompt: buildPrompt(reading),
    // Square, then centre-sliced into the card's 1024x1000 art box by the compositor.
    size: "1024x1024",
    quality: "medium", // "high" roughly triples both cost and latency for a background image
    n: 1,
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("gpt-image-1 returned no image data");
  return Buffer.from(b64, "base64");
}

/**
 * The house style. This is the whole reason the cards look like a set rather than
 * five unrelated pictures: the style block is fixed, and only the subject and the
 * palette change. The visual DNA the model already produced drives composition, so
 * the illustration and the words come from the same read of the input.
 */
function buildPrompt(reading: AuraReading): string {
  const [c1, c2, c3, c4] = reading.palette;
  const { motif, energy, density, symmetry } = reading.visual;

  const MOTIF_DIRECTION: Record<string, string> = {
    orbit: "concentric circular composition, orbiting elements around a still centre, cyclical and focused",
    bloom: "radiating outward from a warm centre, petal-like forms opening, expansive and generous",
    static: "restless jagged horizontal bands, interference patterns, electric and overstimulated",
    drift: "long slow horizontal currents, weightless floating forms, calm and adrift",
    spire: "vertical tapering forms reaching upward, sharp and ambitious",
    tide: "stacked flowing wave bands, heavy and rhythmic, moody",
  };

  return [
    "An abstract editorial illustration for a personality card. NOT a photograph, NOT text, NOT a logo.",
    `Mood: ${reading.vibe.replace(/-/g, " ")}. Subject essence: ${reading.title}.`,
    `Composition: ${MOTIF_DIRECTION[motif] ?? MOTIF_DIRECTION.drift}.`,
    `Energy ${pct(energy)} (${energy > 0.6 ? "busy, agitated" : "calm, spacious"}).`,
    `Density ${pct(density)} (${density > 0.6 ? "layered and full" : "minimal, lots of negative space"}).`,
    `Symmetry: ${symmetry > 4 ? "highly ordered and balanced" : symmetry > 2 ? "loosely balanced" : "asymmetric, off-kilter"}.`,
    `Use ONLY this palette: ${c1} (background), ${c2}, ${c3}, ${c4}.`,
    "Style: modern risograph poster art. Flat layered shapes, soft grain texture, visible print misregistration, matte finish. Screen-printed feel.",
    "Absolutely no text, letters, numbers, words, signatures, or watermarks anywhere in the image.",
    "Fill the entire square frame edge to edge. No borders, no framing, no white margins.",
  ].join(" ");
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Reject after `ms`. The underlying request is abandoned, not awaited. */
function withDeadline<T>(fn: () => Promise<T>, ms: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([fn(), deadline]).finally(() => clearTimeout(timer)) as Promise<T>;
}

export const ART_BOX = { width: ART_W, height: ART_H };
