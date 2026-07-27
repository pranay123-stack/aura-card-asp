import { AGENT_NAME, NETWORK, USDT0_ADDRESS, config } from "./config.js";

const GITHUB = "https://github.com/pranay123-stack/aura-card-asp";
const AGENT_ID = "6134";

/**
 * The human-facing landing page served at GET /.
 * Aura Card is an agent/API service, so this exists purely so a person (a judge,
 * a curious visitor) who opens the URL sees what it is — not a "Cannot GET /".
 */
export function landingPage(): string {
  const base = config.publicUrl;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${AGENT_NAME} — an x402 Agent Service Provider</title>
<meta name="description" content="Describe your desk, outfit, pet, or mood — get a shareable card with a witty aura reading, a colour palette, and generated art. 0.5 USDT per call via x402 on X Layer."/>
<style>
  :root{--ink:#15171F;--ink2:#1F2233;--amber:#E8A94B;--coral:#D96A54;--paper:#EFE7DA;--muted:#9AA0AD;--line:rgba(255,255,255,.09)}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--ink);color:var(--paper);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.55;-webkit-font-smoothing:antialiased}
  a{color:var(--amber);text-decoration:none}
  a:hover{text-decoration:underline}
  .wrap{max-width:1080px;margin:0 auto;padding:0 24px}
  .serif{font-family:Georgia,"Times New Roman",serif}
  .hero{position:relative;overflow:hidden;padding:72px 0 48px;background:radial-gradient(120% 90% at 25% 20%,var(--ink2),var(--ink))}
  .hero:before{content:"";position:absolute;width:520px;height:520px;left:-120px;top:-120px;border-radius:50%;background:var(--amber);opacity:.08}
  .hero:after{content:"";position:absolute;width:420px;height:420px;right:-100px;bottom:-160px;border-radius:50%;background:var(--coral);opacity:.07}
  .tag{display:inline-block;font-size:12px;letter-spacing:2px;color:var(--muted);font-weight:700;text-transform:uppercase;margin-bottom:18px}
  h1{font-size:clamp(48px,8vw,84px);font-weight:700;letter-spacing:1px;line-height:1.02}
  .lede{font-size:clamp(18px,2.4vw,23px);color:#d8d2c6;max-width:620px;margin:20px 0 26px}
  .badge{display:inline-flex;align-items:center;gap:8px;background:var(--amber);color:var(--ink);font-weight:700;font-size:14px;letter-spacing:.4px;padding:10px 18px;border-radius:22px}
  .cta{display:flex;gap:12px;flex-wrap:wrap;margin-top:26px}
  .btn{display:inline-block;padding:12px 22px;border-radius:12px;font-weight:600;font-size:15px}
  .btn.primary{background:var(--paper);color:var(--ink)}
  .btn.ghost{border:1px solid var(--line);color:var(--paper)}
  .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin:44px 0}
  .cards img{width:100%;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.5);display:block}
  .cards .third{display:block}
  section{padding:56px 0;border-top:1px solid var(--line)}
  h2{font-size:clamp(26px,4vw,36px);font-weight:700;margin-bottom:8px}
  .sub{color:var(--muted);margin-bottom:30px;font-size:17px}
  .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
  .feat{background:var(--ink2);border:1px solid var(--line);border-radius:14px;padding:22px}
  .feat h3{font-size:19px;margin-bottom:6px;color:var(--paper)}
  .feat p{color:var(--muted);font-size:15px}
  .dot{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:700;margin-bottom:14px;color:var(--ink)}
  pre{background:#0d0f15;border:1px solid var(--line);border-radius:12px;padding:18px;overflow-x:auto;font-size:13.5px;line-height:1.6;color:#cfd3da;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
  pre .c{color:#6b7280}
  pre .k{color:var(--amber)}
  .kv{display:grid;grid-template-columns:auto 1fr;gap:8px 20px;font-size:14.5px;margin-top:8px}
  .kv .key{color:var(--muted)}
  .kv .val{color:var(--paper);font-family:ui-monospace,Menlo,monospace;word-break:break-all}
  footer{padding:40px 0 56px;border-top:1px solid var(--line);color:var(--muted);font-size:14px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:14px}
  .brand{display:flex;align-items:center;gap:9px;font-weight:700;letter-spacing:2px;color:var(--paper);font-size:14px}
  .brand .b{width:9px;height:9px;border-radius:50%;background:var(--amber)}
  @media(max-width:760px){.cards{grid-template-columns:1fr 1fr}.cards .third{display:none}.grid3{grid-template-columns:1fr}.try-grid{grid-template-columns:1fr!important}}
  @media(max-width:480px){.cards{grid-template-columns:1fr}.cards img:nth-child(n+2){display:none}}
  .try-grid{display:grid;grid-template-columns:1fr 1fr;gap:30px;align-items:start}
  textarea{width:100%;min-height:120px;resize:vertical;background:#0d0f15;border:1px solid var(--line);border-radius:12px;padding:16px;color:var(--paper);font-family:inherit;font-size:16px;line-height:1.5}
  textarea:focus{outline:none;border-color:var(--amber)}
  .chips{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}
  .chip{border:1px solid var(--line);background:var(--ink2);color:#d8d2c6;font-size:13px;padding:7px 13px;border-radius:20px;cursor:pointer}
  .chip:hover{border-color:var(--amber);color:var(--paper)}
  .go{background:var(--amber);color:var(--ink);border:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:12px;cursor:pointer;margin-top:6px}
  .go:disabled{opacity:.55;cursor:default}
  .note{color:var(--muted);font-size:13px;margin-top:12px}
  .stage{background:var(--ink2);border:1px solid var(--line);border-radius:14px;min-height:360px;display:flex;align-items:center;justify-content:center;padding:22px;text-align:center;overflow:hidden}
  .stage img{width:100%;max-width:340px;border-radius:12px;box-shadow:0 24px 60px rgba(0,0,0,.5);display:block}
  .stage .ph{color:var(--muted);font-size:15px;max-width:280px}
  .spin{width:34px;height:34px;border:3px solid var(--line);border-top-color:var(--amber);border-radius:50%;animation:sp 1s linear infinite;margin:0 auto 14px}
  @keyframes sp{to{transform:rotate(360deg)}}
  .reveal-read{color:#d8d2c6;font-size:15px;margin-top:16px;line-height:1.5}
  .reveal-read b{color:var(--paper)}
</style>
</head>
<body>
  <div class="hero">
    <div class="wrap">
      <span class="tag">Agent Service Provider · OKX.AI</span>
      <h1 class="serif">${AGENT_NAME}</h1>
      <p class="lede">Describe your desk, outfit, pet, or mood — get a shareable card with a witty, weirdly specific reading, a matching colour palette, and original generated art.</p>
      <span class="badge">◆ ${config.feeUsdt} USDT / call · x402 · X Layer</span>
      <div class="cta">
        <a class="btn primary" href="#try">Try it — get your card →</a>
        <a class="btn ghost" href="${GITHUB}">View the code on GitHub</a>
        <a class="btn ghost" href="${base}/.well-known/agent-card.json">Agent card (JSON)</a>
      </div>
    </div>
  </div>

  <div class="wrap">
    <div class="cards">
      <img src="/assets/sample-1.png" alt="Aura Card example — Friday Deploy Roulette"/>
      <img src="/assets/sample-2.png" alt="Aura Card example — Router Warlord"/>
      <img class="third" src="/assets/sample-3.png" alt="Aura Card example — Caffeinated Monk"/>
    </div>
  </div>

  <section id="try"><div class="wrap">
    <h2 class="serif">Try it — get read right now</h2>
    <p class="sub">Type something personal. A real card comes back — reading, palette, and art. Free to try; no signup.</p>
    <div class="try-grid">
      <div>
        <textarea id="desc" placeholder="e.g. my desk: three half-finished mugs, a plastic dinosaur, and 47 open tabs"></textarea>
        <div class="chips" id="chips"></div>
        <button class="go" id="go">Reveal my aura →</button>
        <p class="note">First card can take ~30s if the service was asleep, then ~8s each. Free tries are limited per day — the paid x402 endpoint below is unlimited.</p>
      </div>
      <div class="stage" id="stage">
        <div class="ph">Your card will appear here.</div>
      </div>
    </div>
  </div></section>

  <section><div class="wrap">
    <h2 class="serif">What one call gives you</h2>
    <p class="sub">One image, three things — all read from the same description.</p>
    <div class="grid3">
      <div class="feat"><div class="dot" style="background:var(--amber)">1</div><h3>A reading</h3><p>One or two witty, specific lines about you. Warm and funny — never generic horoscope filler.</p></div>
      <div class="feat"><div class="dot" style="background:var(--coral)">2</div><h3>A palette</h3><p>Four hex colours pulled from your mood, sitting right on the card.</p></div>
      <div class="feat"><div class="dot" style="background:#7B94B8">3</div><h3>Generated art</h3><p>Original artwork drawn from the same read as the words — the picture is the same judgement, not decoration.</p></div>
    </div>
  </div></section>

  <section><div class="wrap">
    <h2 class="serif">Call it like an agent</h2>
    <p class="sub">A standard x402-paid HTTP endpoint. Discovery is free; a paid call settles ${config.feeUsdt} USDT on-chain via x402. No signup, no API key.</p>
    <pre><span class="c"># 1 · call with no payment — the server quotes a price</span>
curl -X POST <span class="k">${base}/v1/aura-card</span> \\
  -H 'content-type: application/json' \\
  -d '{"description":"three half-finished mugs and a plastic dinosaur"}'

<span class="c"># → HTTP 402 Payment Required — network, token, amount, payee.</span>
<span class="c"># 2 · sign a gasless USDT authorization, retry → 200 + your card.</span></pre>
    <div class="kv">
      <span class="key">Paid endpoint</span><span class="val">${base}/v1/aura-card</span>
      <span class="key">Network</span><span class="val">${NETWORK} (X Layer)</span>
      <span class="key">Token</span><span class="val">USD₮0 · ${USDT0_ADDRESS}</span>
      <span class="key">Price</span><span class="val">${config.feeUsdt} USDT per call</span>
      <span class="key">On-chain identity</span><span class="val">ERC-8004 · Agent ID ${AGENT_ID}</span>
    </div>
  </div></section>

  <footer><div class="wrap" style="display:flex;justify-content:space-between;width:100%;flex-wrap:wrap;gap:14px">
    <span class="brand"><span class="b"></span>${AGENT_NAME.toUpperCase()} · x402</span>
    <span>Agent ID ${AGENT_ID} · <a href="${GITHUB}">GitHub</a> · Built for the OKX.AI Genesis Hackathon</span>
  </div></footer>

  <script>
  (function(){
    var desc=document.getElementById('desc'),go=document.getElementById('go'),
        stage=document.getElementById('stage'),chips=document.getElementById('chips');
    var ideas=[
      'my messy desk','a rainy Sunday with nothing to do','my cat who thinks he runs the house',
      'friday afternoon deploy energy','all black outfit, tired eyes','a half-dead succulent on the windowsill'
    ];
    ideas.forEach(function(t){
      var c=document.createElement('span');c.className='chip';c.textContent=t;
      c.onclick=function(){desc.value=t;desc.focus();};chips.appendChild(c);
    });
    function esc(s){return String(s).replace(/[&<>]/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[m];});}
    go.onclick=function(){
      var d=(desc.value||'').trim();
      if(d.length<3){desc.focus();stage.innerHTML='<div class="ph">Tell it something about you first — a desk, an outfit, a pet, a mood.</div>';return;}
      go.disabled=true;
      stage.innerHTML='<div><div class="spin"></div><div class="ph">Reading your aura… first card can take ~30s.</div></div>';
      fetch('/try',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({description:d})})
        .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j};});})
        .then(function(o){
          if(!o.ok){var m=(o.j&&o.j.error&&o.j.error.message)||'Something went wrong. Try again.';
            stage.innerHTML='<div class="ph">'+esc(m)+'</div>';return;}
          stage.innerHTML='<div><img alt="Your Aura Card" src="data:image/png;base64,'+o.j.card_png_base64+'"/>'+
            '<div class="reveal-read"><b>'+esc(o.j.title||'')+'</b><br>'+esc(o.j.reading||'')+'</div></div>';
        })
        .catch(function(){stage.innerHTML='<div class="ph">Network hiccup. Give it another go.</div>';})
        .then(function(){go.disabled=false;});
    };
  })();
  </script>
</body>
</html>`;
}
