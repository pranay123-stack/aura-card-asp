# ASP registration — do this FIRST

Review takes **~24 hours** and the deadline is **17 July 23:59 UTC**. This is the critical path, not the code.

The endpoint is written **permanently on-chain**. Changing it later needs another update transaction. So the order is:

> **deploy → confirm the URL is live → register**

Not the other way round.

---

## 1. Install OKX's registration skill

Registration is not a config file you author — it's an interactive CLI flow driven by OKX's own agent skill.

```bash
npx skills add https://github.com/okx/onchainos-skills --skill okx-ai
```

Then, in the agent session, say: **`register an ASP`**. It will walk you through the fields below. Registration gas is covered by OKX — it costs you nothing.

---

## 2. Field values — pre-validated, paste these

Every one of these has been checked against the registry's rules (lengths, format, banned content). Copy them verbatim.

### Step 1 · Identity

| Field | Value |
|---|---|
| **Role** | `asp` |
| **Name** | `Aura Card` |
| **Description** | `Aura Card reads the vibe of your desk, outfit, pet, or mood and returns a shareable card with a witty personality reading, a matching colour palette, and original generated artwork.` |
| **Avatar** | Send the file `assets/avatar.png` as an **image attachment** |

> **The avatar must be an uploaded file.** Image *links are rejected* — do not paste a URL. Regenerate it any time with `npx tsx scripts/make-avatar.ts` (512×512, 397 KB, under the 1 MB cap).

### Step 2 · Service

| Field | Value |
|---|---|
| **Service name** | `Personal Aura Card Generation` |
| **Type** | `A2MCP`  (this is the "API service" option) |
| **Fee** | `0.5` |
| **Endpoint** | `https://<your-render-url>/mcp` |

**Service description** — this must be **two parts on separate lines**:

```
Generates a shareable personality card from a short description of your desk, outfit, pet, or mood: a witty reading, a matching colour palette, and original artwork composed into one image.
You provide: 1. a short text description 2. an optional photo
```

---

## 3. The four rules that will get you rejected

I've already complied with all of these — this is so you don't "improve" the copy into a rejection.

**1. The fee is digits only.** Send `0.5`, as a **quoted string** in JSON. The currency is always USDT and is implied. `"0.5 USDT"`, `"~0.5"`, and `0.5` unquoted are all rejected. Keep it consistent with `FEE_USDT` in `.env` and `PRICE` in `render.yaml`.

**2. The service description must not mention the tech.** No "MCP", no "x402", no "Claude", no GitHub or wallet links, no example prompts, no disclaimers. The copy above deliberately says none of it — it describes *what the user gets*, which is what the registry wants. Don't add the stack back in; that's an instant rejection.

**3. The service name can't be the agent name.** The agent is `Aura Card`; the service is `Personal Aura Card Generation`. It also can't contain a price.

**4. The endpoint must be a real, public, deployed `https://` URL.** `http://`, `localhost`, private IPs, and placeholder URLs are all rejected — and the CLI checks. This is why you deploy first.

---

## 4. After it's created

The CLI returns an id and the ASP is **registered but not visible**. It is not live until you activate it:

> say: **`activate #<id>`**

Then verify the listing points at a URL that actually answers:

```bash
curl https://<your-render-url>/health
curl https://<your-render-url>/.well-known/agent-card.json
```

Both must return 200 before you submit. A judge hitting a dead endpoint is the whole submission gone.

---

## 5. Submission checklist

- [ ] Anthropic API key **rotated** (the one from the chat is burned)
- [ ] Deployed to Render, `PUBLIC_URL` set to the real URL
- [ ] `/health` and `/.well-known/agent-card.json` both return 200
- [ ] Wallet funded with USD₮0 on X Layer, `PAY_TO` set
- [ ] `npm run paid` completes a real 402 → pay → settle → card against the deployed URL
- [ ] ASP registered **and activated** (`activate #<id>`)
- [ ] ≤90s demo recorded (see [DEMO.md](DEMO.md))
- [ ] X post published with **#OKXAI** and the demo link
- [ ] Google submission form filed
