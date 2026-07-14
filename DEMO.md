# Demo assets

## 90-second demo script

Total: ~88s. Record the terminal and the card side by side — the card is the payoff, don't bury it.

---

**[0:00 – 0:10] · Hook**

> "Every AI agent demo shows you a wall of text. I wanted one that gives you something you'd actually *post*."
>
> "This is Aura Card. You tell it about your desk. It costs fifty cents. Watch."

*(On screen: the terminal, empty. Nothing else.)*

---

**[0:10 – 0:22] · The 402**

Run:

```bash
npm run paid -- "my desk: three half-finished mugs, a keyboard i regret buying, and a small plastic dinosaur"
```

> "First it calls with no money attached. And the server says no."

*(Freeze on the `HTTP 402 Payment Required` block. Point at it.)*

> "That's the whole x402 protocol in one screenshot. It's not an error — it's a price tag. Network, token, amount, who to pay. Machine-readable. My agent didn't need an API key, an account, or a signup form. It just needed to be told the price."

---

**[0:22 – 0:38] · The payment**

> "So it pays. It signs a gasless USDT authorization — real USDT, on X Layer, no gas on my side — and retries."

*(Let the settlement lines print.)*

> "Settled on-chain. There's the transaction hash. Fifty cents moved, and I never touched a wallet UI."

---

**[0:38 – 0:62] · The card**

*(Open the PNG. Full screen. Let it breathe for a beat before talking.)*

> "And here's what fifty cents bought."

*(Read the reading out loud. Deadpan. Let it land.)*

> **"Three mugs abandoned mid-sip, tasks from March still standing guard, and a plastic dinosaur watching you fail to use the keyboard you regret. The dinosaur has outlasted every plan you made."**

*(Beat.)*

> "Palette's pulled from the mood. And the artwork isn't stock — the same model call that wrote that also decided this desk was *high-energy, high-density, low-symmetry*, and the art engine rendered from that. Frazzled desk, frazzled picture. Calm Sunday looks completely different."

---

**[0:62 – 0:78] · Why it's an ASP, not a demo**

> "It's a standard MCP server. One tool. Any agent can find it, read the price, pay, and use it — with no human in the loop, ever."

*(Show `tools/list` returning instantly.)*

> "Discovery is free. You only pay when you actually generate. And if generation fails, the payment is cancelled — you're never charged for a card you didn't get."

---

**[0:78 – 0:88] · Call to action**

> "It's live, it's a public endpoint, and it costs fifty cents. Point your agent at it, or just describe your desk and see what it says about you."
>
> "Link's below. Go get read."

---

### Recording notes

- **Warm the endpoint first.** Make one throwaway call ~30s before you hit record. A cold Render container takes ~50s to wake and it will kill the pacing.
- **Have the card pre-generated as a fallback.** If the live call fails on camera, cut to a saved PNG rather than debugging on tape.
- Generation is ~9s. That's a long time on video. Either speed-ramp it 3–4×, or talk over it (the "why it's an ASP" beat fits neatly there — consider reordering).
- Use a description that's *yours* and slightly embarrassing. The specificity is the product; a generic input makes a generic card and the whole thing falls flat.

---

## X / Twitter post

**Draft (use this one):**

> I built an agent that costs 50 cents and tells you what your desk says about you.
>
> No API key. No signup. My agent hit the endpoint, got a 402, paid in USDT, and got this back.
>
> The dinosaur line genuinely got me.
>
> #OKXAI
>
> *[attach: the desk card]*
> *[link: 90s demo]*

---

**Alternates, if you want a different angle:**

*The builder angle:*
> Agents can't sign up for things. They can't click "get API key". So how does an agent buy anything?
>
> x402: the 402 status code becomes a price tag. My agent got quoted 0.5 USDT, paid it, and got a card back. Zero humans involved.
>
> Built one to prove it out — it reads your desk. #OKXAI

*The short one:*
> told an AI about my desk
> it charged me 50 cents
> it was worth it
>
> #OKXAI

---

### Why the first draft is the one

It leads with the *product*, not the protocol — "tells you what your desk says about you" is a thing a normal person forwards to a friend. The payment rail shows up in line two as the reason it's *interesting*, not as the pitch. And "the dinosaur line genuinely got me" is the only sentence in there that sounds like a person rather than a launch, which is what makes it shareable.

Attach the image. The image is the post. The text is a caption.
