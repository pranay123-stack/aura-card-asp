import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AGENT_NAME, config } from "./config.js";
import { AspError } from "./lib/errors.js";
import { generateAuraCard } from "./pipeline/index.js";

/**
 * The MCP surface. One primary tool, as the platform expects: `generate_aura_card`.
 *
 * Payment is enforced by the x402 middleware in front of the transport, so by the
 * time a tool call reaches this handler it has already been paid for.
 */
export function buildMcpServer(): McpServer {
  const server = new McpServer(
    { name: AGENT_NAME, version: "1.0.0" },
    {
      instructions:
        `${AGENT_NAME} turns a short personal description (a desk, an outfit, a pet, a mood) ` +
        `into a shareable card: a witty one-or-two-line "aura reading", a matching 4-colour ` +
        `palette, and generated artwork, composed into a single portrait PNG. ` +
        `Costs ${config.feeUsdt} USDT per call, settled via x402 on X Layer.`,
    },
  );

  server.registerTool(
    "generate_aura_card",
    {
      title: "Generate an Aura Card",
      description:
        "Reads a short personal description (and optionally a photo) and returns a shareable " +
        "portrait card image containing a witty aura reading, a matching colour palette, and " +
        "generated artwork. Also returns the raw reading text and palette as structured data. " +
        `Priced at ${config.feeUsdt} USDT per call (x402).`,
      inputSchema: {
        description: z
          .string()
          .min(3)
          .max(config.maxDescriptionChars)
          .describe(
            "A short description of something personal: your desk setup, outfit, pet, mood, or the vibe of your day. " +
              "Concrete details give a much better reading. e.g. 'three half-finished mugs and a cable nest under my monitor'",
          ),
        image: z
          .string()
          .optional()
          .describe(
            "Optional photo to factor into the reading. Base64 string or a data: URL. " +
              "JPEG, PNG, GIF, or WebP. Max 4 MB.",
          ),
      },
      outputSchema: {
        card_png_base64: z.string().describe("The composed shareable card, PNG, base64-encoded. 1024x1536."),
        reading: z.string().describe("The raw aura reading text."),
        title: z.string().describe("The card's title."),
        vibe: z.string().describe("One-word vibe tag."),
        palette: z.array(z.string()).describe("Four hex colours, e.g. ['#2A2D34', ...]."),
        visual: z
          .object({
            motif: z.string(),
            energy: z.number(),
            density: z.number(),
            grain: z.number(),
            symmetry: z.number(),
          })
          .describe("The visual DNA used to generate the artwork."),
        artwork_source: z
          .string()
          .describe("Which engine drew the illustration: 'openai' or 'procedural'."),
        width: z.number(),
        height: z.number(),
        generated_in_ms: z.number(),
      },
    },
    async (args) => {
      try {
        const result = await generateAuraCard(args);

        return {
          // Both blocks: the image for humans/clients that render it, the structured
          // payload for agents that want the palette and text as data.
          content: [
            { type: "image" as const, data: result.card_png_base64, mimeType: "image/png" },
            {
              type: "text" as const,
              text: `${result.title.toUpperCase()} — ${result.reading}\n\nPalette: ${result.palette.join(" ")}\nVibe: ${result.vibe}`,
            },
          ],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      } catch (err) {
        const e =
          err instanceof AspError
            ? err
            : new AspError("internal_error", (err as Error).message ?? "Unknown error", 500);
        return {
          isError: true,
          content: [{ type: "text" as const, text: `[${e.code}] ${e.message}${e.hint ? ` — ${e.hint}` : ""}` }],
        };
      }
    },
  );

  return server;
}
