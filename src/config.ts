import "dotenv/config";

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

/** X Layer mainnet. The OKX facilitator serves this network and no other. */
export const NETWORK = "eip155:196" as const;

/** USD₮0 on X Layer — 6 decimals, and (verified on-chain) it does implement EIP-3009. */
export const USDT0_ADDRESS = "0x779ded0c9e1022225f8e0630b35a9b54be713736";

export const config = {
  port: Number(process.env.PORT ?? 8080),
  publicUrl: process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 8080}`,

  anthropicApiKey: req("ANTHROPIC_API_KEY"),
  model: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8",

  // ---- x402 / OKX payments ----
  // The OKX SDK takes a USD string and converts to USDT0 atomic units itself.
  // Keep this in sync with the `fee` you register on-chain for the ASP listing.
  price: process.env.PRICE ?? "$0.50",
  /** The bare number, as a quoted string — this is the format the ASP registry demands. */
  feeUsdt: process.env.FEE_USDT ?? "0.5",
  payTo: process.env.PAY_TO ?? "",
  okxApiKey: process.env.OKX_API_KEY ?? "",
  okxSecretKey: process.env.OKX_SECRET_KEY ?? "",
  okxPassphrase: process.env.OKX_PASSPHRASE ?? "",
  maxTimeoutSeconds: 300,

  /** Local dev only. Never true in the deployed ASP — discovery would be free AND execution would be. */
  paymentsDisabled: process.env.PAYMENTS_DISABLED === "true",

  // ---- limits ----
  maxDescriptionChars: 400,
  maxImageBytes: 4 * 1024 * 1024,
  maxBodySize: "12mb",
  generationTimeoutMs: 30_000,
  rateLimitWindowMs: 60_000,
  rateLimitMax: 30,
} as const;

export const AGENT_NAME = "Aura Card";

/** True once every credential needed to actually take money is present. */
export function paymentsConfigured(): boolean {
  return Boolean(config.okxApiKey && config.okxSecretKey && config.okxPassphrase && config.payTo);
}
