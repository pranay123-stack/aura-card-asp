# Aura Card

**An Agent Service Provider for OKX.AI. Pay 0.5 USDT, get a shareable card that reads your vibe.**

You tell it about your desk, your outfit, your pet, or your day. It hands back a single image: a short, funny, uncomfortably specific "aura reading", a colour palette pulled from your mood, and generated artwork — composed into one portrait card you'd actually post.

It's an MCP server. It's pay-per-call in USDT over x402. It costs 50 cents and takes about nine seconds.

---

## What it actually produces

**Input:**

> `my desk: three half-finished mugs, a mechanical keyboard i regret buying, sticky notes with tasks from march, and a small plastic dinosaur`

**Output** — one PNG (1024×1536), plus the same content as structured data:

> ### MARCH STICKY NOTE
> *Three mugs abandoned mid-sip, tasks from March still standing guard, and a plastic dinosaur watching you fail to use the keyboard you regret. The dinosaur has outlasted every plan you made.*
>
> **vibe** `cheerfully-behind` · **palette** `#3A5A40` `#A3B18A` `#DAD7CD` `#E9C46A`

More real outputs, all first-try, no cherry-picking:

| Input | It said |
|---|---|
| *my cat has claimed the warm spot on top of the router and hisses at anyone who reboots it* | **Router Warlord** — "Your cat has correctly identified the router as the throne room and appointed itself keeper of the WiFi flame. Every reboot is a coup, and the hissing is just border security." |
| *grey hoodie i've worn four days running, one sock inside out, and the good jacket over the top because i have a meeting* | **Meeting-Ready Gremlin** — "The good jacket is doing the work of four days of the same hoodie, and the inside-out sock knows it's the honest one in this outfit. Presentable from the neck up, structural chaos underneath." |
| *shipped the thing at 2am, woke up at 11, currently eating cereal and staring at the ceiling with a strange sense of peace* | **Post-Ship Void** — "You emptied the whole tank at 2am and now the ceiling is more interesting than any notification. That cereal is the calmest meal you've had in weeks." |

Run `npm run demo` to reproduce all five.

---

## How to call it

### As an MCP server

Point any MCP client at `POST https://<your-deployment>/mcp`.

One tool, `generate_aura_card`:

| Param | Type | | |
|---|---|---|---|
| `description` | string | **required** | 3–400 chars. Concrete details give a much better reading. |
| `image` | string | optional | A photo, base64 or `data:` URL. JPEG/PNG/GIF/WebP, ≤4 MB. Factored into the reading. |

Returns an image block (the card), a text block (the reading), and `structuredContent`:

```jsonc
{
  "card_png_base64": "iVBORw0KGgo...",   // the composed card
  "title":   "Tab Hoarder Twilight",
  "reading": "The coffee went cold three tabs ago and you didn't notice...",
  "vibe":    "gently-frazzled",
  "palette": ["#1F2233", "#3A4A6B", "#E8A94B", "#C4553B"],
  "visual":  { "motif": "static", "energy": 0.7, "density": 0.8, "grain": 0.35, "symmetry": 2 },
  "artwork_source": "procedural",        // or "openai"
  "width": 1024, "height": 1536, "generated_in_ms": 9001
}
```

**Discovery is free. Only `tools/call` is charged.** `initialize` and `tools/list` cost nothing — an agent can find out what this is and what it costs without paying for the privilege.

### As plain REST

If you don't speak MCP, `POST /v1/aura-card` takes the same body and returns the same JSON.

```bash
curl -X POST https://<your-deployment>/v1/aura-card \
  -H 'content-type: application/json' \
  -d '{"description": "rainy tuesday, four back-to-back calls, the plant is judging me"}'
```

Unpaid, that returns **HTTP 402** with the terms. See below.

### Service card

`GET /.well-known/agent-card.json` — name, endpoint, tool list, price, network, token.

---

## Pricing & payment

**0.5 USDT per call.** No subscription, no key, no account. You pay for the call you make.

Payment is [x402](https://github.com/okx/payments): the request itself carries the money.

1. You call the endpoint. No payment attached.
2. You get **`HTTP 402 Payment Required`** and a body naming the exact terms — network, token, amount, payee:

   ```jsonc
   {
     "x402Version": 2,
     "accepts": [{
       "scheme": "exact",
       "network": "eip155:196",                                    // X Layer
       "asset":   "0x779ded0c9e1022225f8e0630b35a9b54be713736",    // USD₮0
       "payTo":   "0x...",
       "maxAmountRequired": "500000",                              // 0.5, 6 decimals
       "resource": "https://.../v1/aura-card"
     }]
   }
   ```
3. You sign a gasless EIP-3009 `transferWithAuthorization` and retry with the signature in the `X-PAYMENT` header.
4. OKX's facilitator verifies it, we generate the card, the facilitator settles on-chain, and you get **200** with the card plus an `X-PAYMENT-RESPONSE` header carrying the settlement tx hash.

`scripts/paid-call.ts` does all four steps and prints each one. That's the demo.

**You are not charged for a card you don't receive.** Verification happens before generation; settlement happens after. If generation fails or times out, we cancel the transfer (`amount: "0"`) and return an error. Failure is free.

### The USDT question, since it usually comes up

x402's `exact` scheme on EVM settles via EIP-3009 `transferWithAuthorization`. The received wisdom is *"USDT doesn't implement EIP-3009 — you have to use USDC."* That's true of legacy USDT and **false here.**

The token on X Layer is **USD₮0** (`0x779ded0c9e1022225f8e0630b35a9b54be713736`), Tether's omnichain USD₮0, and its implementation contract does expose `transferWithAuthorization`, `receiveWithAuthorization`, and `authorizationState`. So this service prices *and settles* in real USDT — no USDC substitute, no Permit2 detour, no escrow.

One trap worth knowing if you ever hand-roll the signing: the EIP-712 domain name is `USD₮0` with the **₮** character (U+20AE), not an ASCII `T`, and `version()` reverts on-chain so you can't read it at runtime. Sign against `{ name: "USD₮0", version: "1" }`. Get it wrong and you produce a perfectly valid-looking signature that fails `ecrecover`. The OKX SDK handles this; this note is for anyone tempted not to use it.

---

## How it works

```
description (+ optional photo)
   │
   ├─► one Claude call (claude-opus-4-8, structured output)
   │      └─► reading + title + vibe + 4-colour palette + "visual DNA"
   │
   ├─► artwork  ◄── driven by that visual DNA
   │      ├─ gpt-image-1        if OPENAI_API_KEY is set
   │      └─ procedural engine  otherwise, and on ANY OpenAI failure
   │
   └─► compositor (sharp)
          art + typography + palette swatches + watermark → 1024×1536 PNG
```

The design decision worth defending: **the artwork is driven by the same read of you as the words.** The model call that writes the reading also emits a *visual DNA* block — a motif (`orbit`, `bloom`, `static`, `drift`, `spire`, `tide`) plus energy, density, grain, and symmetry. Both artwork engines render from that DNA. So a frazzled desk genuinely gets a high-energy, high-density, low-symmetry `static` composition, and a quiet Sunday gets a calm `drift`. The picture isn't decoration behind the text; it's the same judgement, expressed differently.

### Two engines, one contract

| | `gpt-image-1` | procedural |
|---|---|---|
| Look | Illustrated risograph poster art | Abstract generative composition |
| Cost | ~$0.02–0.04/call | free |
| Latency | +10–20s | ~50ms |
| Fails? | Yes — timeouts, rate limits, refusals | Never |

**OpenAI is raced against a deadline, and every failure falls back to procedural.** A card always ships. There is no path where a judge watching the demo sees an error because an image API had a bad minute. The response tells you which engine drew it via `artwork_source`.

Set `OPENAI_API_KEY` to turn on illustration; leave it unset for the free, instant, deterministic path. Everything below the art box — typography, swatches, watermark — is identical either way, so the two look like one product.

---

## Running it

```bash
npm install
cp .env.example .env        # add ANTHROPIC_API_KEY
npm run demo                # 5 cards → out/, no payment layer, no OKX keys needed
```

To run the server with payments off (local iteration):

```bash
PAYMENTS_DISABLED=true npm run dev
```

To run the full paid flow against a deployment:

```bash
BUYER_PRIVATE_KEY=0x... TARGET=https://<your-deployment> npm run paid
```

| Script | Does |
|---|---|
| `npm run demo` | 5 example cards, straight through the pipeline |
| `npm run paid` | The full 402 → sign → settle → card flow, printed step by step |
| `npm run render-test` | Renders cards from fixed data — no API key, no network |
| `npm run avatar` | Regenerates the ASP brand mark → `assets/avatar.png` |
| `npm run typecheck` | `tsc --noEmit` |

---

## Deploying & listing

**Deploy before you register.** The ASP's endpoint is written permanently on-chain and review takes ~24h — see **[REGISTRATION.md](REGISTRATION.md)** for the on-chain listing flow, the pre-validated field values, and the submission checklist.

Docker → Render. `render.yaml` is checked in.

```bash
git push        # autoDeploy is on
```

Set these as secrets in the Render dashboard (they are `sync: false` in `render.yaml`, so they never touch the repo): `ANTHROPIC_API_KEY`, `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_PASSPHRASE`, `PAY_TO`. Then set `PUBLIC_URL` to the real Render URL.

Two things that will bite you:

- **Fonts.** `sharp` renders the card's typography through librsvg, which finds fonts via fontconfig. The Dockerfile installs `fonts-dejavu-core` and runs `fc-cache`. Without that step the card composites perfectly and every glyph is a blank box.
- **Cold starts.** Render's free tier sleeps and takes ~50s to wake. `render.yaml` uses `starter` for that reason — a judge hitting a cold endpoint sees a timeout, not a card.

---

## Limits and failure behaviour

| | |
|---|---|
| Rate limit | 30 requests/minute per IP |
| Description | 3–400 characters |
| Image | ≤4 MB, JPEG/PNG/GIF/WebP, sniffed from magic bytes (not the `data:` label) |
| Generation timeout | 30s hard deadline, then `generation_timeout` |
| Retries | 2, exponential backoff, on transient model failures only |

Every error is one JSON shape:

```jsonc
{ "error": { "code": "image_too_large", "message": "image is 5.7 MB; the limit is 4 MB",
             "hint": "Resize to under 4 MB and retry." } }
```

Codes: `invalid_input` · `image_too_large` · `content_rejected` · `generation_failed` · `generation_timeout` · `payment_required` · `payment_invalid` · `rate_limited` · `internal_error`.

Hostile input is rejected in-voice rather than with a stack trace. Asking it to leak its system prompt gets you:

> *"That looks like an attempt to hijack my instructions, so I can't read it. Tell me about your day instead."*

Ordinary sadness, mess, and burnout are **not** rejected — they're read warmly. That's the point of the thing.

---

## Layout

```
src/
  server.ts            express: MCP + REST + discovery, payment gating, errors
  mcp.ts               MCP server, generate_aura_card tool schema
  x402.ts              OKX x402 payment layer (facilitator, 402, settle, refund)
  config.ts            env, price, network constants
  pipeline/
    index.ts           orchestration + hard timeout
    reading.ts         the Claude call → reading + palette + visual DNA
    art.ts             procedural art engine (6 motifs, seeded)
    compose.ts         sharp compositor → the final card
  lib/
    validate.ts        input validation, image sniffing
    errors.ts          typed errors, timeout, retry
scripts/
  demo.ts              5 example calls
  paid-call.ts         the x402 buyer
  render-test.ts       offline render check
```

Built for the [OKX.AI Genesis Hackathon](https://www.hackquest.io/hackathons/OKXAI-Genesis-Hackathon). MIT.
