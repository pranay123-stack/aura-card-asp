import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { ZodError } from "zod";
import { AGENT_NAME, NETWORK, USDT0_ADDRESS, config, paymentsConfigured } from "./config.js";
import path from "node:path";
import { AspError } from "./lib/errors.js";
import { landingPage } from "./landing.js";
import { buildMcpServer } from "./mcp.js";
import { generateAuraCard } from "./pipeline/index.js";
import { buildPaymentLayer, refundSettlement } from "./x402.js";

const app = express();
app.set("trust proxy", 1); // behind Render's proxy — needed for correct rate-limit keys
app.use(express.json({ limit: config.maxBodySize }));

const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "rate_limited",
      message: `Too many requests. Limit is ${config.rateLimitMax} per minute.`,
    },
  },
});
app.use(limiter);

// ---------------------------------------------------------------- payments

const paymentsLive = paymentsConfigured() && !config.paymentsDisabled;
const payments = paymentsLive ? buildPaymentLayer() : undefined;

if (!paymentsLive) {
  console.warn(
    "⚠️  PAYMENTS ARE OFF. Missing OKX credentials or PAYMENTS_DISABLED=true.\n" +
      "   The service will answer for free. This is fine locally; it is NOT a valid ASP deployment.",
  );
}

/** Pass-through when payments are off, so local dev doesn't need OKX keys. */
const pay: express.RequestHandler = (req, res, next) =>
  payments ? payments.middleware(req, res, next) : next();

/**
 * MCP is one POST endpoint carrying many JSON-RPC methods. Charging per HTTP request
 * would bill the client for `initialize` and `tools/list`, which is both wrong and
 * hostile to discovery. So: discovery is free, `tools/call` is paid.
 */
const gateMcp: express.RequestHandler = (req, res, next) => {
  const method = (req.body as { method?: string } | undefined)?.method;
  if (method !== "tools/call") return next();
  return pay(req, res, next);
};

// ---------------------------------------------------------------- discovery

// Human-facing landing page + its sample images. Aura Card is an agent service,
// so this is purely so a person who opens the URL sees what it is, not an error.
app.get("/", (_req, res) => {
  res.type("html").send(landingPage());
});
app.use("/assets", express.static(path.resolve(process.cwd(), "assets"), { maxAge: "1h" }));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    agent: AGENT_NAME,
    payments: paymentsLive ? "live" : "disabled",
    network: NETWORK,
  });
});

/** Human- and agent-readable description of the service, its price, and how to call it. */
app.get("/.well-known/agent-card.json", (_req, res) => {
  res.json({
    name: AGENT_NAME,
    type: "A2MCP",
    description:
      "Turns a short description of your desk, outfit, pet, or mood into a shareable card: " +
      "a witty aura reading, a matching colour palette, and generated artwork, composed into one image.",
    version: "1.0.0",
    endpoint: `${config.publicUrl}/mcp`,
    rest_endpoint: `${config.publicUrl}/v1/aura-card`,
    tools: ["generate_aura_card"],
    payment: {
      protocol: "x402",
      network: NETWORK,
      asset: USDT0_ADDRESS,
      asset_symbol: "USDT0",
      fee: config.feeUsdt,
      currency: "USDT",
      per: "call",
      free: ["initialize", "tools/list"],
    },
  });
});

// ---------------------------------------------------------------- MCP

app.post("/mcp", gateMcp, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Stateless: a fresh server + transport per request. No session affinity to lose
    // when the host scales or cold-starts, which matters on a free-tier deploy.
    const server = buildMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    res.on("close", () => {
      void transport.close();
      void server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    next(err);
  }
});

// MCP's Streamable HTTP transport probes these; answer politely rather than 404.
app.get("/mcp", (_req, res) => {
  res.status(405).json({ error: { code: "method_not_allowed", message: "Use POST for MCP." } });
});

// ---------------------------------------------------------------- REST

app.post("/v1/aura-card", pay, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await generateAuraCard(req.body);
    res.json(result);
  } catch (err) {
    // Payment was verified but we failed to deliver — cancel the on-chain transfer
    // so the caller isn't charged for a card they never got.
    refundSettlement(res);
    next(err);
  }
});

// ---------------------------------------------------------------- errors

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AspError) {
    return res.status(err.status).json(err.toJSON());
  }

  // Zod throws a machine-shaped blob. Callers get one readable sentence instead.
  if (err instanceof ZodError) {
    const message = err.issues
      .map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message))
      .join("; ");
    return res.status(400).json({ error: { code: "invalid_input", message } });
  }

  console.error("[error]", err instanceof Error ? err.message : err);
  res.status(500).json({
    error: {
      code: "internal_error",
      message: "Something broke on our side. This is retryable.",
    },
  });
});

// ---------------------------------------------------------------- boot

const server = app.listen(config.port, async () => {
  // The OKX SDK requires this AFTER the server is listening and BEFORE any request
  // is handled. Skipping it is the single most common way to break the payment layer.
  if (payments) {
    try {
      await payments.initialize();
      console.log(`💸 payments live — ${config.price} per call, USDT0 on X Layer (${NETWORK})`);
    } catch (err) {
      console.error("payment layer failed to initialize:", err);
      process.exit(1);
    }
  }
  console.log(`✨ ${AGENT_NAME} listening on :${config.port}`);
  console.log(`   MCP   POST ${config.publicUrl}/mcp`);
  console.log(`   REST  POST ${config.publicUrl}/v1/aura-card`);
  console.log(`   Card  GET  ${config.publicUrl}/.well-known/agent-card.json`);
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    server.close(() => process.exit(0));
  });
}
