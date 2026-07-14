/**
 * The x402 buyer. This is the script you screen-record.
 *
 * It does the whole handshake in the open:
 *   1. Calls the endpoint with no payment  → prints the raw HTTP 402 and its terms.
 *   2. Signs an EIP-3009 authorization over USD₮0 and retries.
 *   3. Prints the on-chain settlement tx hash and saves the card.
 *
 *   BUYER_PRIVATE_KEY=0x... TARGET=https://your-service.onrender.com npx tsx scripts/paid-call.ts
 *
 * The buyer wallet needs USD₮0 on X Layer. It does NOT need gas: EIP-3009 transfers
 * are gasless for the payer — the facilitator submits the transaction.
 */
import { writeFileSync } from "node:fs";
import { type ClientEvmSigner, ExactEvmScheme } from "@okxweb3/x402-evm";
import { decodePaymentResponseHeader, wrapFetchWithPayment, x402Client } from "@okxweb3/x402-fetch";
import { createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

interface CardResponse {
  card_png_base64: string;
  title: string;
  reading: string;
  palette: string[];
}

const TARGET = process.env.TARGET ?? "http://localhost:8080";
const ENDPOINT = `${TARGET}/v1/aura-card`;
const DESCRIPTION =
  process.argv.slice(2).join(" ") ||
  "my desk: three half-finished mugs, a keyboard i regret buying, and a small plastic dinosaur";

const xLayer = defineChain({
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.xlayer.tech"] } },
});

// ---- 1. Unpaid call. Show the 402. ----

console.log(`\n① Calling ${ENDPOINT} with no payment...\n`);

const unpaid = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ description: DESCRIPTION }),
});

console.log(`   HTTP ${unpaid.status} ${unpaid.statusText}`);
const terms = await unpaid.json();
console.log(`   ${JSON.stringify(terms, null, 2).split("\n").join("\n   ")}\n`);

if (unpaid.status !== 402) {
  console.error("   Expected a 402. Payments are probably disabled on the server.");
  process.exit(1);
}

// ---- 2. Pay and retry. ----

const pk = process.env.BUYER_PRIVATE_KEY;
if (!pk) {
  console.error("Set BUYER_PRIVATE_KEY to a wallet holding USD₮0 on X Layer.");
  process.exit(1);
}

const account = privateKeyToAccount(pk as `0x${string}`);
const wallet = createWalletClient({ account, chain: xLayer, transport: http() });

// The EIP-3009 flow only needs an address and a typed-data signature. (`readContract`
// is only required for the Permit2 path, which USD₮0 doesn't need.)
const signer: ClientEvmSigner = {
  address: account.address,
  signTypedData: (message) =>
    wallet.signTypedData(message as Parameters<typeof wallet.signTypedData>[0]),
};

console.log(`② Signing an EIP-3009 authorization from ${account.address}...\n`);

const client = new x402Client().register("eip155:196", new ExactEvmScheme(signer));
const fetchWithPay = wrapFetchWithPayment(fetch, client);

const t0 = Date.now();
const paid = await fetchWithPay(ENDPOINT, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ description: DESCRIPTION }),
});

console.log(`   HTTP ${paid.status} ${paid.statusText}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

if (!paid.ok) {
  console.error(`   ${JSON.stringify(await paid.json(), null, 2)}`);
  process.exit(1);
}

// ---- 3. Settlement proof + the card. ----

const settlementHeader = paid.headers.get("x-payment-response");
if (settlementHeader) {
  const settlement = decodePaymentResponseHeader(settlementHeader);
  console.log(`\n③ Settled on-chain:`);
  console.log(`   tx:      ${settlement.transaction}`);
  console.log(`   payer:   ${settlement.payer}`);
  console.log(`   explorer: https://www.okx.com/web3/explorer/xlayer/tx/${settlement.transaction}`);
}

const card = (await paid.json()) as CardResponse;
const file = "out/paid-card.png";
writeFileSync(file, Buffer.from(card.card_png_base64, "base64"));

console.log(`\n④ Card delivered:`);
console.log(`   ${card.title.toUpperCase()}`);
console.log(`   "${card.reading}"`);
console.log(`   palette: ${card.palette.join("  ")}`);
console.log(`   → ${file}\n`);
