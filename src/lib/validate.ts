import { z } from "zod";
import { config } from "../config.js";
import { imageTooLarge, invalidInput } from "./errors.js";

/** Media types Claude's vision input accepts. */
const MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const GenerateAuraCardInput = z.object({
  description: z
    .string()
    .trim()
    .min(3, "description must be at least 3 characters")
    .max(config.maxDescriptionChars, `description must be at most ${config.maxDescriptionChars} characters`),
  image: z
    .string()
    .optional()
    .describe("Optional photo as a base64 string or a data: URL"),
});

export type GenerateAuraCardInput = z.infer<typeof GenerateAuraCardInput>;

export interface ParsedImage {
  base64: string;
  mediaType: MediaType;
}

/**
 * Accepts either a bare base64 payload or a `data:image/png;base64,...` URL.
 * Sniffs the media type from magic bytes rather than trusting the data-URL label,
 * since a mislabelled type is a 400 from the model, not from us.
 */
export function parseImage(input: string | undefined): ParsedImage | undefined {
  if (!input) return undefined;

  const raw = input.startsWith("data:") ? input.slice(input.indexOf(",") + 1) : input;
  const cleaned = raw.replace(/\s/g, "");

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) {
    throw invalidInput("image is not valid base64", "Send a base64 string or a data: URL.");
  }

  const bytes = Buffer.from(cleaned, "base64");
  if (bytes.length === 0) throw invalidInput("image decoded to zero bytes");
  if (bytes.length > config.maxImageBytes) {
    throw imageTooLarge(
      `image is ${(bytes.length / 1024 / 1024).toFixed(1)} MB; the limit is ${config.maxImageBytes / 1024 / 1024} MB`,
    );
  }

  const mediaType = sniffMediaType(bytes);
  if (!mediaType) {
    throw invalidInput(
      "image is not a supported format",
      `Supported: ${MEDIA_TYPES.join(", ")}.`,
    );
  }

  return { base64: cleaned, mediaType };
}

function sniffMediaType(b: Buffer): MediaType | undefined {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png";
  if (b.length >= 6 && (b.subarray(0, 6).toString("ascii") === "GIF87a" || b.subarray(0, 6).toString("ascii") === "GIF89a"))
    return "image/gif";
  if (b.length >= 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP")
    return "image/webp";
  return undefined;
}
