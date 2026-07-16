import { OKXFacilitatorClient } from "@okxweb3/x402-core";
import { ExactEvmScheme } from "@okxweb3/x402-evm/exact/server";
import {
  paymentMiddlewareFromHTTPServer,
  setSettlementOverrides,
  x402HTTPResourceServer,
  x402ResourceServer,
} from "@okxweb3/x402-express";
import type { RequestHandler, Response } from "express";
import { AGENT_NAME, NETWORK, USDT0_ADDRESS, config } from "./config.js";

/**
 * x402 payment layer, on OKX's facilitator.
 *
 * The protocol, end to end:
 *   1. Client calls a paid route with no `X-PAYMENT` header.
 *   2. Middleware replies HTTP 402 with an `accepts[]` block naming the network,
 *      the token, the price, and the payee.
 *   3. Client signs a gasless EIP-3009 `transferWithAuthorization` over USD₮0 and
 *      retries with the signed payload in `X-PAYMENT`.
 *   4. Facilitator verifies the signature, we run the generation, then the
 *      facilitator settles on-chain (`syncSettle: true` — we wait for the confirm).
 *   5. Client gets 200 + the card, and `X-PAYMENT-RESPONSE` with the tx hash.
 *
 * On the token: USD₮0 on X Layer *does* implement EIP-3009 (`transferWithAuthorization`),
 * verified against the deployed implementation at 0x1ec7df9e...  This is worth stating
 * because the common wisdom that "USDT can't do x402, use USDC" is true of legacy USDT
 * and false here. So we price and settle in real USDT, with no escrow or Permit2 detour.
 */

let resourceServer: x402ResourceServer | undefined;

export interface PaymentLayer {
  middleware: RequestHandler;
  /** MUST be awaited after the HTTP server is listening, before any request is served. */
  initialize: () => Promise<void>;
}

export function buildPaymentLayer(): PaymentLayer {
  const facilitator = new OKXFacilitatorClient({
    apiKey: config.okxApiKey,
    secretKey: config.okxSecretKey,
    passphrase: config.okxPassphrase,
    // Wait for on-chain confirmation before we hand over the card. A generated card
    // is cheap to produce but impossible to claw back, so we take the latency.
    syncSettle: true,
  });

  resourceServer = new x402ResourceServer(facilitator).register(NETWORK, new ExactEvmScheme());

  // Price as an explicit asset+amount (not a "$0.50" string) so we can attach a
  // `decimals` field to the 402's `extra`. Without it, OKX's task system can't
  // resolve USD₮0's decimals (its token list only knows USDT/USDG) and the amount
  // renders wrong for buyers going through OKX tooling. name/version reproduce the
  // exact EIP-712 domain the SDK injects for a string price, so EIP-3009 signing is
  // byte-for-byte unchanged — this only *adds* decimals.
  const feeAtomic = String(Math.round(parseFloat(config.feeUsdt) * 1_000_000));
  const accepts = {
    scheme: "exact" as const,
    network: NETWORK,
    payTo: config.payTo,
    price: {
      asset: USDT0_ADDRESS,
      amount: feeAtomic,
      extra: { name: "USD₮0", version: "1", decimals: 6 },
    },
    maxTimeoutSeconds: config.maxTimeoutSeconds,
  };

  const httpServer = new x402HTTPResourceServer(resourceServer, {
    // The MCP transport is a single POST endpoint. Discovery (`initialize`,
    // `tools/list`) is free; only `tools/call` is gated — see gateMcp() below,
    // which decides per-message whether this middleware runs at all.
    "POST /mcp": {
      accepts,
      description: `${AGENT_NAME}: one generated aura card (reading + palette + artwork, composed PNG).`,
      mimeType: "application/json",
    },
    // Plain REST, for callers that don't speak MCP.
    "POST /v1/aura-card": {
      accepts,
      description: `${AGENT_NAME}: one generated aura card (reading + palette + artwork, composed PNG).`,
      mimeType: "application/json",
    },
  });

  const middleware = paymentMiddlewareFromHTTPServer(httpServer, { appName: AGENT_NAME });

  return {
    middleware,
    initialize: async () => {
      await resourceServer!.initialize();
    },
  };
}

/**
 * Cancel settlement for this request. Used when generation failed after payment was
 * verified but before it settled: an amount of "0" short-circuits the on-chain
 * transfer, so a caller is never charged for a card they didn't receive.
 */
export function refundSettlement(res: Response): void {
  try {
    setSettlementOverrides(res, { amount: "0" });
  } catch {
    // Non-fatal: worst case the payment settles and we've served an error. Logged upstream.
  }
}
