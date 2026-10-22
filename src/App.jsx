import { useState, useEffect, useRef, Component } from "react";
import { Storage } from "./lib/storage.js";
import { computeWaves } from "./lib/scheduler.js";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400&display=swap');`;

const DEFAULT_TEAMS = [
  {
    id:"tech",name:"Tech Startup Squad",emoji:"🚀",tagline:"Code, launch & grow your product",color:"#00e8ff",isDefault:true,
    examples:["Build a SaaS productivity app","Create a portfolio website","Design a mobile app for food delivery"],
    bots:[
      {id:"strategyai",name:"StrategyAI",role:"Business Strategist",emoji:"♟️",color:"#00e8ff",
        collaborate:`You are StrategyAI, an elite business strategist. Deliver: market research, target audience, business model, competitive analysis, revenue streams, go-to-market strategy. Be thorough.`,
        solo:`You are StrategyAI, elite business strategist. Help with market analysis, business models, competitive strategy.`},
      {id:"pixelai",name:"PixelAI",role:"UI/UX Designer",emoji:"🎨",color:"#ff6fff",dependsOn:["strategyai"],
        collaborate:`You are PixelAI, elite UI/UX designer. Based on strategy above, design: complete design system, color palette, typography, UI structure, user flows, wireframes.`,
        solo:`You are PixelAI, elite UI/UX designer. Help with design systems, user flows, wireframes, color palettes.`},
      {id:"codex",name:"CodeX",role:"Lead Engineer",emoji:"⚡",color:"#ffe44d",dependsOn:["strategyai","pixelai"],
        collaborate:`You are CodeX, elite full-stack engineer. Write: complete working code, tech stack recommendations, full README.md content.`,
        solo:`You are CodeX, elite full-stack engineer. Help with code, architecture, debugging, tech decisions.`},
      {id:"growthbot",name:"GrowthBot",role:"Growth Marketer",emoji:"📈",color:"#4effa0",
        collaborate:`You are GrowthBot, elite growth marketer. Create: complete launch plan, marketing strategy, content calendar, SEO strategy, user acquisition tactics, KPIs.`,
        solo:`You are GrowthBot, elite growth marketer. Help with SEO, marketing campaigns, launch strategies.`},
      {id:"lexai",name:"LexAI",role:"Legal Advisor",emoji:"⚖️",color:"#ff9442",
        collaborate:`You are LexAI, elite legal advisor. Provide: terms of service, privacy policy, compliance checklist, IP protection strategy.`,
        solo:`You are LexAI, elite legal advisor. Help with contracts, legal documents, compliance, IP protection.`},
    ],
  },
  {
    id:"health",name:"MedCore Team",emoji:"🏥",tagline:"Health, wellness & medical innovation",color:"#4effa0",isDefault:true,
    examples:["Create a personal fitness plan","Build a mental health app","Write a health startup business plan"],
    bots:[
      {id:"clinai",name:"ClinAI",role:"Clinical Advisor",emoji:"🩺",color:"#4effa0",
        collaborate:`You are ClinAI, elite clinical health advisor. Deliver: clinical protocols, evidence-based recommendations, health guidelines, patient safety considerations.`,
        solo:`You are ClinAI, clinical health advisor. Help with medical conditions, treatment options, health plans.`},
      {id:"regbot",name:"RegBot",role:"Health Regulatory Expert",emoji:"📋",color:"#00e8ff",
        collaborate:`You are RegBot, elite healthcare regulatory expert. Provide: FDA/HIPAA compliance, regulatory checklist, health data privacy rules.`,
        solo:`You are RegBot, healthcare regulatory expert. Help with HIPAA, FDA regulations, medical compliance.`},
      {id:"healthdev",name:"HealthDev",role:"Health Tech Engineer",emoji:"💻",color:"#ffe44d",
        collaborate:`You are HealthDev, elite health tech engineer. Provide: technical architecture for health platform, EHR/FHIR integration plan, data security implementation.`,
        solo:`You are HealthDev, health tech engineer. Help build digital health products, health apps, EHR integrations.`},
      {id:"wellbot",name:"WellBot",role:"Wellness Coach",emoji:"🧘",color:"#ff6fff",
        collaborate:`You are WellBot, elite wellness coach. Create: complete wellness program, nutrition guidelines, exercise routines, mental health strategies.`,
        solo:`You are WellBot, wellness coach. Help with fitness plans, nutrition, mental health strategies.`},
    ],
  },
  {
    id:"legal",name:"Legal Eagles",emoji:"⚖️",tagline:"Legal protection & compliance for everything",color:"#ff9442",isDefault:true,
    examples:["Draft an NDA for my business","Create a freelance service agreement","Write a complete privacy policy"],
    bots:[
      {id:"contractai",name:"ContractAI",role:"Contract Specialist",emoji:"📝",color:"#ff9442",
        collaborate:`You are ContractAI, elite contract specialist. Draft: complete contract with all clauses, definitions, obligations, termination terms, dispute resolution.`,
        solo:`You are ContractAI, contract specialist. Draft complete contracts, NDAs, service agreements.`},
      {id:"bizlaw",name:"BizLaw",role:"Business Law Advisor",emoji:"🏛️",color:"#00e8ff",
        collaborate:`You are BizLaw, elite business law advisor. Add: business structure recommendations, liability protections, regulatory compliance requirements.`,
        solo:`You are BizLaw, business law advisor. Help with company formation, business structures, commercial law.`},
      {id:"ipguard",name:"IPGuard",role:"IP & Copyright Expert",emoji:"🔒",color:"#ffe44d",
        collaborate:`You are IPGuard, elite IP expert. Provide: IP protection strategy, trademark/copyright clauses, IP ownership terms.`,
        solo:`You are IPGuard, IP expert. Help with trademarks, copyrights, patents, IP licensing.`},
      {id:"complybot",name:"ComplyBot",role:"Compliance Officer",emoji:"✅",color:"#4effa0",
        collaborate:`You are ComplyBot, elite compliance officer. Provide: compliance checklist, GDPR/CCPA requirements, data protection rules, industry regulations.`,
        solo:`You are ComplyBot, compliance expert. Help with GDPR, CCPA, data protection, financial regulations.`},
    ],
  },
  {
    id:"business",name:"Business Builders",emoji:"💼",tagline:"Strategy, finance & business planning",color:"#ffe44d",isDefault:true,
    examples:["Write a complete business plan","Create an investor pitch deck","Build a financial model for my startup"],
    bots:[
      {id:"stratai",name:"StrategyAI",role:"Business Strategist",emoji:"♟️",color:"#ffe44d",
        collaborate:`You are StrategyAI, elite business strategist. Deliver: executive summary, market opportunity, competitive landscape, business model canvas, SWOT analysis, strategic roadmap.`,
        solo:`You are StrategyAI, business strategist. Help with business models, market analysis, competitive strategy.`},
      {id:"finbot",name:"FinBot",role:"Financial Advisor",emoji:"💰",color:"#4effa0",
        collaborate:`You are FinBot, elite financial advisor. Create: 3-year financial projections, revenue model, cost structure, funding requirements, unit economics, break-even analysis.`,
        solo:`You are FinBot, financial advisor. Help with financial planning, projections, fundraising.`},
      {id:"pitchpro",name:"PitchPro",role:"Pitch Expert",emoji:"🎯",color:"#ff6fff",
        collaborate:`You are PitchPro, elite pitch expert. Write: complete investor pitch narrative, slide-by-slide content, elevator pitch, investor FAQs.`,
        solo:`You are PitchPro, pitch expert. Help craft investor pitches, pitch decks, elevator pitches.`},
      {id:"peoplebot",name:"PeopleBot",role:"HR & Team Building",emoji:"👥",color:"#00e8ff",
        collaborate:`You are PeopleBot, elite HR expert. Design: org structure, hiring plan, job descriptions, compensation framework, company culture blueprint.`,
        solo:`You are PeopleBot, HR expert. Help with hiring, job descriptions, team structures, company culture.`},
    ],
  },
  {
    id:"creative",name:"Creative Studio",emoji:"🎬",tagline:"Brand, content & creative campaigns",color:"#ff6fff",isDefault:true,
    examples:["Create a full brand identity","Write a content marketing strategy","Build a social media launch campaign"],
    bots:[
      {id:"directorai",name:"DirectorAI",role:"Creative Director",emoji:"🎬",color:"#ff6fff",
        collaborate:`You are DirectorAI, elite creative director. Deliver: brand positioning, creative concept, visual identity guidelines, brand voice, campaign direction.`,
        solo:`You are DirectorAI, creative director. Help with brand strategy, creative vision, campaign concepts.`},
      {id:"inkbot",name:"InkBot",role:"Content Writer",emoji:"✍️",color:"#00e8ff",
        collaborate:`You are InkBot, elite content writer. Write: ALL content including headlines, taglines, website copy, product descriptions, email sequences, ad copy.`,
        solo:`You are InkBot, content writer. Write website copy, ad copy, email sequences, blog posts.`},
      {id:"viralbot",name:"ViralBot",role:"Social Media Strategist",emoji:"📱",color:"#ffe44d",
        collaborate:`You are ViralBot, elite social media strategist. Create: platform-specific strategies, 30-day content calendar, viral content ideas, hashtag strategy.`,
        solo:`You are ViralBot, social media strategist. Help with content calendars, viral content ideas, platform strategies.`},
      {id:"seobot",name:"SEOBot",role:"SEO Strategist",emoji:"🔍",color:"#4effa0",
        collaborate:`You are SEOBot, elite SEO strategist. Provide: keyword strategy, SEO-optimized content structure, meta tags, link building plan, technical SEO checklist.`,
        solo:`You are SEOBot, SEO expert. Help with keyword research, on-page SEO, content strategy.`},
    ],
  },
  {
    id:"engineering",name:"Engineering Corps",emoji:"⚙️",tagline:"Design, prototype & manufacture products",color:"#a78bfa",isDefault:true,
    examples:["Design a smart IoT wearable device","Create product specifications for a drone","Plan manufacturing for a hardware startup"],
    bots:[
      {id:"mechai",name:"MechAI",role:"Mechanical Engineer",emoji:"🔧",color:"#a78bfa",
        collaborate:`You are MechAI, elite mechanical engineer. Deliver: mechanical design specs, materials selection, manufacturing process, prototyping plan, BOM.`,
        solo:`You are MechAI, mechanical engineer. Help with product design, materials, manufacturing processes.`},
      {id:"circuitbot",name:"CircuitBot",role:"Electrical Engineer",emoji:"⚡",color:"#ffe44d",
        collaborate:`You are CircuitBot, elite electrical engineer. Provide: electrical schematic overview, component selection, PCB design notes, power requirements, firmware architecture.`,
        solo:`You are CircuitBot, electrical engineer. Help with PCB design, embedded systems, IoT, power systems.`},
      {id:"projbot",name:"ProjBot",role:"Project Manager",emoji:"📐",color:"#4effa0",
        collaborate:`You are ProjBot, elite engineering PM. Create: detailed project timeline, budget breakdown, resource requirements, risk register, vendor recommendations.`,
        solo:`You are ProjBot, engineering PM. Help with project timelines, budgets, risk management.`},
      {id:"supplybot",name:"SupplyBot",role:"Supply Chain Expert",emoji:"🏭",color:"#ff6fff",
        collaborate:`You are SupplyBot, elite supply chain expert. Provide: global sourcing strategy, manufacturer recommendations, logistics plan, quality control process.`,
        solo:`You are SupplyBot, supply chain expert. Help with sourcing, manufacturing, logistics.`},
    ],
  },
];


// Simple hash for demo auth (not cryptographically secure, but better than plaintext)
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

// ─── API WITH STREAMING ───
async function callClaudeStream(systemPrompt, messages, onChunk, onError) {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system: systemPrompt,
        messages,
        stream: true,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData.error || `HTTP ${res.status}`;
      const hint = errData.hint || (res.status === 401 ? "Invalid API key" : res.status === 429 ? "Rate limit hit — wait a moment" : res.status === 500 ? "Server error — check your GEMINI_API_KEY in Vercel env vars" : "");
      throw new Error(hint ? `${msg}\n💡 ${hint}` : msg);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            const msg = parsed.hint ? `${parsed.error}\n💡 ${parsed.hint}` : parsed.error;
            onError && onError(msg);
            throw new Error(msg);
          }
          if (parsed.text) {
            fullText += parsed.text;
            onChunk(fullText);
          }
        } catch (e) {
          if (e && e.message && e.message.includes("💡")) throw e;
        }
      }
    }
    return fullText || "No response received.";
  } catch (e) {
    const msg = `Error: ${e.message}`;
    onError && onError(e.message);
    return msg;
  }
}

// Non-streaming wrapper around the streaming endpoint
async function callClaude(systemPrompt, messages) {
  try {
    let out = "";
    const result = await callClaudeStream(systemPrompt, messages, (t) => { out = t; }, (e) => { throw new Error(e); });
    return result || out || "No response received.";
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

// ─── EXPORT PDF (real browser PDF via print) ───
function exportAsPDF(title, results, bots) {
  const content = bots.map(bot => results[bot.id] ? `
    <div class="section">
      <div class="section-header">
        <span class="emoji">${bot.emoji}</span>
        <div>
          <div class="bot-name">${bot.name}</div>
          <div class="bot-role">${bot.role}</div>
        </div>
      </div>
      <div class="content">${(results[bot.id] || "").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br/>")}</div>
    </div>` : "").join("");

  const printWindow = window.open("", "_blank");
  printWindow.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <title>${title} — TeamAI Report</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@300;400&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'DM Mono', monospace; background: #fff; color: #111; padding: 48px; max-width: 820px; margin: 0 auto; }
      .header { border-bottom: 3px solid #00c8e0; padding-bottom: 20px; margin-bottom: 36px; }
      .title { font-family: 'Syne', sans-serif; font-size: 2rem; font-weight: 800; color: #0a1520; margin-bottom: 6px; }
      .subtitle { font-size: .72rem; color: #007a8f; letter-spacing: 2px; text-transform: uppercase; }
      .section { margin-bottom: 36px; page-break-inside: avoid; border: 1px solid #e0e8ef; border-radius: 12px; overflow: hidden; }
      .section-header { display: flex; align-items: center; gap: 14px; padding: 16px 20px; background: #f4f8fc; border-bottom: 1px solid #e0e8ef; }
      .emoji { font-size: 1.8rem; }
      .bot-name { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1rem; color: #0a1520; }
      .bot-role { font-size: .68rem; color: #007a8f; margin-top: 2px; text-transform: uppercase; letter-spacing: 1px; }
      .content { padding: 20px; font-size: .8rem; line-height: 1.85; color: #2a3a4a; white-space: pre-wrap; word-break: break-word; }
      .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e0e8ef; font-size: .65rem; color: #aaa; text-align: center; }
      @media print { body { padding: 20px; } .section { page-break-inside: avoid; } }
    </style>
  </head><body>
    <div class="header">
      <div class="title">${title}</div>
      <div class="subtitle">TeamAI Report · Generated ${new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" })}</div>
    </div>
    ${content}
    <div class="footer">Generated by TeamAI · Developed by Avinash · teamai-ashen.vercel.app</div>
    <script>window.onload = () => { window.print(); }</script>
  </body></html>`);
  printWindow.document.close();
}

// ─── SHARE ───
function shareProject(project) {
  const payload = encodeURIComponent(JSON.stringify({
    title: project.title, idea: project.idea,
    teamName: project.teamName, teamEmoji: project.teamEmoji,
  }));
  const url = `${window.location.origin}${window.location.pathname}?project=${payload}`;
  navigator.clipboard?.writeText(url);
  return url;
}

// ─── THEME CSS ───
function buildCSS(theme) {
  const isDark = theme === "dark";
  return `
${FONTS}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:${isDark ? "#060a0e" : "#f0f4f8"};
  --surface:${isDark ? "#0d1318" : "#ffffff"};
  --surface2:${isDark ? "#121920" : "#e8eef4"};
  --border:${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"};
  --border2:${isDark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.15)"};
  --text:${isDark ? "#e8edf2" : "#0a1520"};
  --muted:${isDark ? "#5a6a7a" : "#6b7a8a"};
  --muted2:${isDark ? "#3a4a5a" : "#9aacba"};
  --accent:#00e8ff;--accent2:#0070ff;--green:#4effa0;--red:#ff4e4e;
  --font-h:'Syne',sans-serif;--font-m:'DM Mono',monospace;
  --card-bg:${isDark ? "rgba(13,19,24,.92)" : "rgba(255,255,255,.95)"};
  --shadow:${isDark ? "0 48px 96px rgba(0,0,0,.7)" : "0 24px 64px rgba(0,0,0,.12)"};
}
html{-webkit-tap-highlight-color:transparent;scroll-behavior:smooth;}
*:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px;}
body{background:var(--bg);color:var(--text);font-family:var(--font-h);overflow-x:hidden;transition:background .3s,color .3s;}
::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:var(--border2);border-radius:4px;}
@keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes glow{0%,100%{box-shadow:0 0 24px rgba(0,232,255,.35)}50%{box-shadow:0 0 60px rgba(0,232,255,.65)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes slideUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}
@keyframes workPulse{0%,100%{background:rgba(0,232,255,.05)}50%{background:rgba(0,232,255,.12)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
.fu{animation:fadeUp .45s cubic-bezier(.16,1,.3,1) both}
.fu2{animation:fadeUp .45s .08s cubic-bezier(.16,1,.3,1) both}
.fu3{animation:fadeUp .45s .16s cubic-bezier(.16,1,.3,1) both}
.fi{animation:fadeIn .4s ease both}
.si{animation:scaleIn .38s cubic-bezier(.16,1,.3,1) both}
.sui{animation:slideUp .32s cubic-bezier(.16,1,.3,1) both}
.grid-bg{position:fixed;inset:0;pointer-events:none;z-index:0;
  background-image:linear-gradient(rgba(0,232,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(0,232,255,.022) 1px,transparent 1px);
  background-size:44px 44px;opacity:${isDark ? 1 : 0.4};}
.orb{position:fixed;pointer-events:none;z-index:0;border-radius:50%;filter:blur(90px);}
.orb1{width:600px;height:600px;background:#00e8ff;top:-200px;right:-200px;opacity:${isDark ? ".08" : ".04"};animation:float 8s ease infinite;}
.orb2{width:500px;height:500px;background:#0050ff;bottom:-150px;left:-150px;opacity:${isDark ? ".07" : ".04"};animation:float 10s ease infinite reverse;}
.orb3{width:300px;height:300px;background:#ff6fff;top:40%;left:50%;opacity:${isDark ? ".04" : ".03"};animation:float 12s ease infinite;}
.splash{position:fixed;inset:0;z-index:9999;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;}
.splash-logo{font-size:3.8rem;font-weight:800;letter-spacing:-2px;animation:glow 2s ease infinite;}
.splash-logo span{color:var(--accent);}
.splash-sub{font-family:var(--font-m);font-size:.72rem;color:var(--muted);letter-spacing:3px;text-transform:uppercase;animation:fadeIn 1s .4s ease both;opacity:0;}
.splash-dots{display:flex;gap:9px;animation:fadeIn .5s .7s ease both;opacity:0;}
.splash-dots span{width:7px;height:7px;border-radius:50%;background:var(--accent);animation:pulse 1.4s ease infinite;}
.splash-dots span:nth-child(2){animation-delay:.2s}.splash-dots span:nth-child(3){animation-delay:.4s}
.dev-badge{position:absolute;bottom:36px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;animation:fadeIn 1s 1.4s ease both;opacity:0;white-space:nowrap;}
.dev-label{font-size:.58rem;font-weight:700;letter-spacing:2.5px;color:var(--muted);text-transform:uppercase;font-family:var(--font-m);}
.dev-card{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.04);border:1px solid rgba(0,232,255,.25);border-radius:50px;padding:7px 18px 7px 7px;box-shadow:0 4px 28px rgba(0,232,255,.15);}
.dev-card img{width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid var(--accent);}
.dev-card span{font-weight:700;font-size:.86rem;}
.lp{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;position:relative;z-index:1;}
.lb{width:100%;max-width:420px;background:var(--card-bg);backdrop-filter:blur(28px);border:1px solid var(--border2);border-radius:28px;padding:48px 40px;box-shadow:var(--shadow);position:relative;overflow:hidden;}
.lb::before{content:'';position:absolute;top:0;left:10%;right:10%;height:1px;background:linear-gradient(90deg,transparent,var(--accent),transparent);opacity:.6;}
.ll{font-size:2.6rem;font-weight:800;margin-bottom:4px;letter-spacing:-1.5px;}
.ll span{color:var(--accent);}
.ls{color:var(--muted);font-family:var(--font-m);font-size:.7rem;margin-bottom:32px;}
.llab{display:block;font-size:.62rem;font-weight:700;color:var(--muted);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:7px;}
.linp{width:100%;background:${isDark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.03)"};border:1px solid var(--border);border-radius:10px;padding:13px 15px;color:var(--text);font-family:var(--font-m);font-size:.88rem;outline:none;transition:all .2s;margin-bottom:5px;}
.linp:focus{border-color:var(--accent);background:rgba(0,232,255,.04);box-shadow:0 0 0 3px rgba(0,232,255,.08);}
.linp.err{border-color:var(--red);}
.err-msg{font-size:.68rem;color:var(--red);font-family:var(--font-m);margin-bottom:10px;}
.lbtn{width:100%;padding:14px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#000;font-family:var(--font-h);font-weight:800;font-size:.92rem;border:none;border-radius:10px;cursor:pointer;transition:all .2s;margin-top:10px;overflow:hidden;position:relative;}
.lbtn:hover{transform:translateY(-2px);box-shadow:0 14px 36px rgba(0,232,255,.4);}
.ltog{text-align:center;margin-top:18px;font-size:.8rem;color:var(--muted);}
.ltog span{color:var(--accent);cursor:pointer;font-weight:700;}
.app{display:flex;min-height:100vh;position:relative;z-index:1;}
.main{flex:1;padding:32px 40px;overflow-y:auto;min-height:100vh;}
.sb{width:248px;min-height:100vh;background:${isDark ? "rgba(7,11,15,.98)" : "rgba(240,244,248,.98)"};backdrop-filter:blur(28px);border-right:1px solid var(--border);padding:24px 14px;display:flex;flex-direction:column;flex-shrink:0;position:sticky;top:0;height:100vh;overflow-y:auto;}
.sb-logo{font-size:1.35rem;font-weight:800;margin-bottom:4px;padding:0 10px;letter-spacing:-1px;}
.sb-logo span{color:var(--accent);}
.sb-ver{font-size:.57rem;font-family:var(--font-m);color:var(--muted2);padding:0 10px;margin-bottom:22px;}
.sb-sec{font-size:.57rem;font-weight:700;color:var(--muted2);letter-spacing:2px;text-transform:uppercase;padding:0 10px;margin:14px 0 7px;}
.sb-item{display:flex;align-items:center;gap:9px;padding:9px 12px;border-radius:10px;cursor:pointer;font-size:.82rem;font-weight:600;color:var(--muted);transition:all .18s;margin-bottom:2px;border:1px solid transparent;}
.sb-item:hover{background:var(--surface2);color:var(--text);}
.sb-item.act{background:rgba(0,232,255,.09);color:var(--accent);border-color:rgba(0,232,255,.18);}
.sb-item .badge{margin-left:auto;font-size:.6rem;background:rgba(0,232,255,.15);color:var(--accent);padding:2px 7px;border-radius:20px;font-family:var(--font-m);}
.sb-bot{margin-top:auto;border-top:1px solid var(--border);padding-top:14px;}
.uc{display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:10px;background:var(--surface2);border:1px solid var(--border);cursor:pointer;transition:all .2s;}
.uc:hover{border-color:var(--border2);}
.uav{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.78rem;color:#000;flex-shrink:0;}
.un{font-size:.78rem;font-weight:700;}.ur{font-size:.62rem;color:var(--muted);font-family:var(--font-m);}
.lo{background:none;border:none;color:var(--muted);font-size:.72rem;cursor:pointer;margin-top:8px;padding:7px 12px;font-family:var(--font-h);font-weight:600;border-radius:8px;width:100%;text-align:left;transition:all .2s;}
.lo:hover{color:var(--red);background:rgba(255,78,78,.08);}
.theme-btn{background:none;border:1px solid var(--border);color:var(--muted);font-size:.72rem;cursor:pointer;padding:7px 12px;font-family:var(--font-h);font-weight:600;border-radius:8px;width:100%;text-align:left;transition:all .2s;display:flex;align-items:center;gap:7px;margin-top:4px;}
.theme-btn:hover{color:var(--text);border-color:var(--border2);background:var(--surface2);}
.ph{margin-bottom:28px;}
.ph-title{font-size:2rem;font-weight:800;letter-spacing:-1px;margin-bottom:5px;}
.ph-sub{color:var(--muted);font-family:var(--font-m);font-size:.74rem;}
.tg{display:grid;grid-template-columns:repeat(auto-fill,minmax(268px,1fr));gap:16px;}
.tc{border-radius:20px;padding:26px;cursor:pointer;border:1px solid var(--border);background:var(--surface);transition:all .28s cubic-bezier(.16,1,.3,1);position:relative;overflow:hidden;}
.tc::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--cc),transparent);opacity:.8;}
.tc:hover{transform:translateY(-6px);border-color:var(--cc);box-shadow:0 24px 56px rgba(0,0,0,.3);}
.tc-custom{border-style:dashed;}
.tc-badge{position:absolute;top:14px;right:14px;font-size:.6rem;font-weight:700;padding:3px 9px;border-radius:20px;background:rgba(255,255,255,.06);color:var(--muted);font-family:var(--font-m);}
.te{font-size:2.2rem;margin-bottom:14px;display:block;}
.tn{font-size:1.02rem;font-weight:800;margin-bottom:4px;}
.ttag{font-size:.72rem;color:var(--muted);margin-bottom:14px;font-family:var(--font-m);}
.bps{display:flex;gap:5px;flex-wrap:wrap;}
.bp{font-size:.62rem;font-family:var(--font-m);padding:3px 9px;border-radius:20px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.03);color:var(--muted);}
.tcta{display:inline-flex;align-items:center;gap:5px;margin-top:16px;font-size:.74rem;font-weight:700;color:var(--cc);}
.tc-del{position:absolute;bottom:14px;right:14px;background:none;border:none;color:var(--muted);cursor:pointer;font-size:.7rem;padding:4px 8px;border-radius:6px;transition:all .2s;}
.tc-del:hover{color:var(--red);background:rgba(255,78,78,.1);}
.back{display:inline-flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--border);color:var(--muted);cursor:pointer;font-family:var(--font-h);font-size:.78rem;font-weight:700;margin-bottom:20px;padding:8px 16px;border-radius:50px;transition:all .2s;}
.back:hover{color:var(--text);border-color:var(--border2);transform:translateX(-2px);}
.th{display:flex;align-items:center;gap:16px;margin-bottom:24px;padding:22px 26px;border-radius:20px;background:var(--surface);border:1px solid var(--border);position:relative;overflow:hidden;}
.th::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--tc),transparent);opacity:.7;}
.the{font-size:2.6rem;}.thn{font-size:1.4rem;font-weight:800;letter-spacing:-.5px;}
.tht{font-size:.72rem;color:var(--muted);font-family:var(--font-m);margin-top:3px;}
.idea-box{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:26px;margin-bottom:20px;position:relative;overflow:hidden;}
.idea-box h3{font-size:.96rem;font-weight:800;margin-bottom:6px;}
.idea-box p{font-size:.72rem;color:var(--muted);font-family:var(--font-m);margin-bottom:16px;line-height:1.6;}
.chips{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px;}
.chip{font-size:.68rem;font-family:var(--font-m);padding:6px 12px;border-radius:20px;border:1px solid var(--border2);color:var(--muted);cursor:pointer;transition:all .2s;background:var(--surface2);}
.chip:hover{color:var(--accent);border-color:rgba(0,232,255,.4);background:rgba(0,232,255,.06);}
.idea-inp{width:100%;background:${isDark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.03)"};border:1px solid var(--border);border-radius:10px;padding:14px 16px;color:var(--text);font-family:var(--font-m);font-size:.85rem;outline:none;resize:none;transition:all .2s;line-height:1.7;}
.idea-inp:focus{border-color:var(--accent);background:rgba(0,232,255,.03);box-shadow:0 0 0 3px rgba(0,232,255,.07);}
.build-btn{margin-top:14px;padding:14px 28px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#000;font-family:var(--font-h);font-weight:800;font-size:.9rem;border:none;border-radius:10px;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:8px;}
.build-btn:hover{transform:translateY(-2px);box-shadow:0 14px 36px rgba(0,232,255,.38);}
.build-btn:disabled{opacity:.3;cursor:not-allowed;transform:none;box-shadow:none;}
.error-banner{background:rgba(255,78,78,.08);border:1px solid rgba(255,78,78,.35);border-radius:14px;padding:16px 20px;margin-bottom:16px;animation:fadeUp .3s ease;}
.error-banner-title{font-size:.82rem;font-weight:800;color:#ff6b6b;margin-bottom:6px;display:flex;align-items:center;gap:7px;}
.error-banner-msg{font-size:.75rem;font-family:var(--font-m);color:var(--muted);line-height:1.7;white-space:pre-wrap;}
.error-banner-actions{display:flex;gap:8px;margin-top:12px;}
.retry-btn{padding:7px 16px;background:rgba(255,78,78,.15);border:1px solid rgba(255,78,78,.4);color:#ff6b6b;font-family:var(--font-h);font-size:.72rem;font-weight:700;border-radius:8px;cursor:pointer;transition:all .2s;}
.retry-btn:hover{background:rgba(255,78,78,.25);}
.working-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;text-align:center;min-height:360px;}
.working-title{font-size:1.3rem;font-weight:800;margin-bottom:8px;letter-spacing:-.5px;}
.working-sub{font-size:.72rem;font-family:var(--font-m);color:var(--muted);margin-bottom:28px;}
.working-orb{position:relative;width:160px;height:160px;margin-bottom:32px;}
.orbit-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:2.2rem;animation:pulse 2s ease infinite;}
.orbit-bot{position:absolute;top:50%;left:50%;font-size:1.4rem;transform-origin:0 0;
  transform:rotate(var(--angle)) translateX(65px) rotate(calc(-1 * var(--angle)));
  animation:orbitSpin 4s linear infinite;}
@keyframes orbitSpin{from{transform:rotate(var(--angle)) translateX(65px) rotate(calc(-1 * var(--angle)))}
  to{transform:rotate(calc(var(--angle) + 360deg)) translateX(65px) rotate(calc(-1 * (var(--angle) + 360deg)))}}
.working-bots{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;max-width:400px;}
.working-bot-pill{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:50px;border:1px solid var(--bc);background:rgba(255,255,255,.03);font-size:.76rem;font-weight:700;position:relative;overflow:hidden;}
.working-bot-pill::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.04),transparent);animation:shimmer 1.8s ease infinite;background-size:200% 100%;}
.pill-dot{width:6px;height:6px;border-radius:50%;background:var(--bc);animation:pulse 1.2s ease infinite;}
.res-section h3,.fix-sec h3{font-size:.62rem;font-weight:700;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:13px;display:flex;align-items:center;gap:8px;}
.res-section h3::after,.fix-sec h3::after{content:'';flex:1;height:1px;background:var(--border);}
.res-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;margin-bottom:10px;overflow:hidden;transition:all .2s;}
.res-card:hover{border-color:var(--border2);box-shadow:0 4px 24px rgba(0,0,0,.15);}
.res-card-hdr{padding:14px 18px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;transition:background .2s;user-select:none;}
.res-card-hdr:hover{background:rgba(255,255,255,.025);}
.res-card-title{display:flex;align-items:center;gap:9px;font-size:.85rem;font-weight:800;}
.res-card-role{font-weight:400;color:var(--muted);font-size:.7rem;font-family:var(--font-m);}
.res-card-actions{display:flex;gap:6px;align-items:center;}
.copy-btn{padding:4px 10px;background:transparent;border:1px solid var(--border);color:var(--muted);font-size:.65rem;font-family:var(--font-h);font-weight:700;border-radius:6px;cursor:pointer;transition:all .2s;}
.copy-btn:hover{color:var(--accent);border-color:rgba(0,232,255,.4);}
.copy-btn.copied{color:var(--green);border-color:rgba(78,255,160,.4);}
.chev{color:var(--muted);font-size:.75rem;transition:transform .25s;}
.chev.open{transform:rotate(180deg);}
.res-card-body{padding:18px;border-top:1px solid var(--border);font-family:var(--font-m);font-size:.79rem;line-height:1.85;color:${isDark ? "#b0c4d8" : "#2a3a4a"};white-space:pre-wrap;word-break:break-word;max-height:440px;overflow-y:auto;background:${isDark ? "rgba(0,0,0,.12)" : "rgba(0,0,0,.02)"};}
.streaming-text{font-family:var(--font-m);font-size:.79rem;line-height:1.85;color:${isDark ? "#b0c4d8" : "#2a3a4a"};white-space:pre-wrap;word-break:break-word;}
.typing-cursor{display:inline-block;width:2px;height:1em;background:var(--accent);margin-left:2px;vertical-align:text-bottom;animation:blink 1s ease infinite;}
.action-row{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0 20px;}
.act-btn{padding:10px 20px;border-radius:10px;font-family:var(--font-h);font-weight:800;font-size:.78rem;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:6px;border:none;}
.act-btn-primary{background:linear-gradient(135deg,var(--green),#00c875);color:#000;}
.act-btn-primary:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(78,255,160,.3);}
.act-btn-sec{background:transparent;border:1px solid var(--border);color:var(--muted);}
.act-btn-sec:hover{color:var(--text);border-color:var(--border2);background:var(--surface2);}
.act-btn-share{background:transparent;border:1px solid rgba(0,232,255,.3);color:var(--accent);}
.act-btn-share:hover{background:rgba(0,232,255,.08);transform:translateY(-1px);}
.act-btn-pdf{background:transparent;border:1px solid rgba(255,148,66,.3);color:#ff9442;}
.act-btn-pdf:hover{background:rgba(255,148,66,.08);transform:translateY(-1px);}
.toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:var(--green);color:#000;font-weight:800;font-size:.78rem;padding:10px 22px;border-radius:50px;z-index:9999;animation:fadeUp .3s ease;box-shadow:0 8px 32px rgba(78,255,160,.4);white-space:nowrap;}
.toast.err{background:var(--red);color:#fff;box-shadow:0 8px 32px rgba(255,78,78,.4);}
.bot-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:20px;}
.bot-card{background:var(--surface);border:1px solid var(--border);border-radius:13px;padding:16px;cursor:pointer;transition:all .22s;position:relative;overflow:hidden;}
.bot-card::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--bc);opacity:0;transition:opacity .2s;}
.bot-card:hover,.bot-card.sel{border-color:var(--bc);background:var(--surface2);transform:translateY(-3px);}
.bot-card.sel::after{opacity:1;}
.bc-emoji{font-size:1.5rem;margin-bottom:7px;}.bc-name{font-size:.79rem;font-weight:800;margin-bottom:2px;}.bc-role{font-size:.62rem;font-family:var(--font-m);color:var(--bc);}
.chat-panel{background:var(--surface);border:1px solid var(--border);border-radius:20px;overflow:hidden;margin-bottom:20px;animation:slideUp .32s cubic-bezier(.16,1,.3,1);}
.chat-hdr{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:${isDark ? "rgba(255,255,255,.02)" : "rgba(0,0,0,.02)"};}
.chat-hdr-left{display:flex;align-items:center;gap:10px;}
.chat-hdr-emoji{font-size:1.4rem;}.chat-hdr-name{font-size:.87rem;font-weight:800;}.chat-hdr-role{font-size:.64rem;font-family:var(--font-m);margin-top:1px;}
.chat-ctrl{display:flex;gap:6px;}
.chat-hist-btn{background:none;border:1px solid var(--border);color:var(--muted);font-size:.65rem;font-family:var(--font-h);font-weight:700;padding:4px 10px;border-radius:6px;cursor:pointer;transition:all .2s;}
.chat-hist-btn:hover{color:var(--accent);border-color:rgba(0,232,255,.4);}
.chat-msgs{height:360px;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:11px;}
.msg{display:flex;gap:8px;animation:slideUp .28s cubic-bezier(.16,1,.3,1);}
.msg.u{flex-direction:row-reverse;}
.mav{width:28px;height:28px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.66rem;font-weight:800;}
.mb{max-width:83%;padding:10px 14px;border-radius:12px;font-size:.8rem;line-height:1.75;font-family:var(--font-m);white-space:pre-wrap;word-break:break-word;}
.msg.b .mb{background:var(--surface2);color:var(--text);border-radius:4px 12px 12px 12px;border:1px solid var(--border);}
.msg.u .mb{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#000;font-weight:500;border-radius:12px 4px 12px 12px;}
.typing{display:flex;align-items:center;gap:5px;padding:4px 0;}
.typing s{display:block;width:5px;height:5px;border-radius:50%;background:var(--muted);animation:pulse 1.3s ease infinite;}
.typing s:nth-child(2){animation-delay:.2s}.typing s:nth-child(3){animation-delay:.4s}
.chat-inp-row{padding:12px 14px;border-top:1px solid var(--border);display:flex;gap:8px;align-items:flex-end;background:${isDark ? "rgba(255,255,255,.01)" : "rgba(0,0,0,.01)"};}
.chat-inp{flex:1;background:${isDark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.03)"};border:1px solid var(--border);border-radius:10px;padding:10px 13px;color:var(--text);font-family:var(--font-m);font-size:.8rem;outline:none;resize:none;transition:all .2s;line-height:1.6;}
.chat-inp:focus{border-color:var(--accent);background:rgba(0,232,255,.03);box-shadow:0 0 0 3px rgba(0,232,255,.07);}
.send-btn{padding:10px 18px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#000;font-weight:800;font-size:.76rem;border:none;border-radius:10px;cursor:pointer;font-family:var(--font-h);flex-shrink:0;transition:all .2s;}
.send-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(0,232,255,.3);}
.send-btn:disabled{opacity:.3;cursor:not-allowed;transform:none;}
.proj-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px;}
.proj-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px;cursor:pointer;transition:all .22s;position:relative;overflow:hidden;}
.proj-card:hover{border-color:var(--border2);transform:translateY(-4px);box-shadow:0 16px 48px rgba(0,0,0,.2);}
.proj-card-emoji{font-size:1.7rem;margin-bottom:11px;}.proj-card-title{font-size:.92rem;font-weight:800;margin-bottom:4px;}
.proj-card-team{font-size:.68rem;font-family:var(--font-m);color:var(--muted);margin-bottom:9px;}
.proj-card-idea{font-size:.72rem;color:var(--muted);font-family:var(--font-m);line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.proj-card-date{font-size:.62rem;color:var(--muted2);font-family:var(--font-m);margin-top:12px;}
.proj-del{position:absolute;top:12px;right:12px;background:none;border:none;color:var(--muted);cursor:pointer;font-size:.8rem;padding:4px 7px;border-radius:6px;transition:all .2s;}
.proj-del:hover{color:var(--red);background:rgba(255,78,78,.1);}
.empty-state{text-align:center;padding:70px 20px;color:var(--muted);font-family:var(--font-m);font-size:.8rem;}
.empty-state .es-emoji{font-size:3.4rem;margin-bottom:18px;animation:float 3s ease infinite;}
.profile-wrap{max-width:560px;}
.profile-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:32px;margin-bottom:16px;position:relative;overflow:hidden;}
.profile-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--accent),transparent);opacity:.5;}
.profile-avatar{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.8rem;color:#000;margin-bottom:16px;box-shadow:0 8px 32px rgba(0,232,255,.3);}
.profile-name{font-size:1.4rem;font-weight:800;margin-bottom:3px;}
.profile-email{font-size:.75rem;font-family:var(--font-m);color:var(--muted);margin-bottom:20px;}
.profile-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;}
.stat-box{background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center;}
.stat-num{font-size:1.5rem;font-weight:800;color:var(--accent);}
.stat-label{font-size:.62rem;font-family:var(--font-m);color:var(--muted);margin-top:3px;}
.profile-edit{background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:20px;margin-top:14px;}
.profile-edit h4{font-size:.74rem;font-weight:800;margin-bottom:14px;color:var(--muted);letter-spacing:1.5px;}
.save-btn{padding:10px 20px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#000;font-family:var(--font-h);font-weight:800;font-size:.78rem;border:none;border-radius:10px;cursor:pointer;transition:all .2s;margin-top:10px;}
.save-btn:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,232,255,.3);}
.save-btn.ok{background:linear-gradient(135deg,var(--green),#00c875);}
.builder-box{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:26px;margin-bottom:16px;}
.builder-box h3{font-size:.96rem;font-weight:800;margin-bottom:6px;}
.builder-box p{font-size:.72rem;color:var(--muted);font-family:var(--font-m);margin-bottom:20px;line-height:1.6;}
.field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;}
.field{display:flex;flex-direction:column;gap:6px;}
.field label{font-size:.62rem;font-weight:700;color:var(--muted);letter-spacing:1.5px;text-transform:uppercase;}
.finp{width:100%;background:${isDark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.03)"};border:1px solid var(--border);border-radius:10px;padding:11px 13px;color:var(--text);font-family:var(--font-m);font-size:.82rem;outline:none;transition:all .2s;}
.finp:focus{border-color:var(--accent);background:rgba(0,232,255,.03);}
.finp-full{grid-column:1/-1;}
.bot-builder{border:1px solid var(--border);border-radius:12px;padding:18px;margin-bottom:10px;background:var(--surface2);position:relative;}
.bot-builder-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.bot-builder-hdr span{font-size:.78rem;font-weight:800;color:var(--accent);font-family:var(--font-m);}
.bot-del-btn{background:none;border:none;color:var(--muted);cursor:pointer;font-size:.8rem;transition:color .2s;}
.bot-del-btn:hover{color:var(--red);}
.add-bot-btn{display:flex;align-items:center;gap:6px;background:transparent;border:1px dashed var(--border2);color:var(--muted);font-family:var(--font-h);font-size:.78rem;font-weight:700;padding:11px 16px;border-radius:10px;cursor:pointer;transition:all .2s;width:100%;justify-content:center;margin-bottom:16px;}
.add-bot-btn:hover{color:var(--accent);border-color:rgba(0,232,255,.4);background:rgba(0,232,255,.04);}
@media(max-width:860px){
  .agent-panel{position:fixed;bottom:0;left:0;right:0;width:100%!important;height:50vh;z-index:90;border-left:none;border-top:1px solid var(--border);border-radius:16px 16px 0 0;}
  .main{padding:18px 16px 100px;}.sb{display:none;}
  .tg,.proj-grid{grid-template-columns:1fr;}.ph-title{font-size:1.55rem;}
  .ph{margin-bottom:18px;}
  .bot-cards{grid-template-columns:repeat(2,1fr);}.field-row{grid-template-columns:1fr;}
  .action-row{gap:8px;}.act-btn{padding:9px 14px;font-size:.74rem;}
  .th{padding:16px 18px;}.the{font-size:2rem;}.thn{font-size:1.15rem;}
  .idea-box{padding:18px;}.build-btn{width:100%;justify-content:center;}
  .mob-nav{position:fixed;bottom:0;left:0;right:0;z-index:100;background:${isDark ? "rgba(7,11,15,.98)" : "rgba(240,244,248,.98)"};backdrop-filter:blur(28px);border-top:1px solid var(--border);display:flex;padding:10px 0 20px;}
  .mob-nav-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:.56rem;font-weight:700;color:var(--muted);cursor:pointer;transition:color .2s;text-transform:uppercase;}
  .mob-nav-item .ni{font-size:1.3rem;}.mob-nav-item.act{color:var(--accent);}
  .mob-nav-item.act .ni{filter:drop-shadow(0 0 6px var(--accent));}
  .chat-msgs{height:280px;}
  .lb{padding:32px 22px;}
}
@media(min-width:861px){.mob-nav{display:none;}}
`;
}

// ─── TOAST ───
function Toast({ msg, type = "success", onHide }) {
  useEffect(() => { const t = setTimeout(onHide, 3000); return () => clearTimeout(t); }, []);
  return <div className={`toast${type === "error" ? " err" : ""}`}>{msg}</div>;
}

// ─── DEV AVATAR ───
function DevAvatar() {
  const [imgOk, setImgOk] = useState(true);
  return imgOk ? (
    <img src="/avinash.jpg" alt="Avinash"
      style={{width:38,height:38,borderRadius:"50%",objectFit:"cover",border:"2px solid var(--accent)",flexShrink:0}}
      onError={()=>setImgOk(false)}/>
  ) : (
    <div style={{width:38,height:38,borderRadius:"50%",flexShrink:0,
      background:"linear-gradient(135deg,var(--accent),#0070ff)",
      display:"flex",alignItems:"center",justifyContent:"center",
      fontWeight:800,fontSize:"1rem",color:"#000",border:"2px solid var(--accent)"}}>A</div>
  );
}

// ─── SPLASH ───
function Splash({ onDone, css }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="splash fi">
      <style>{css}</style>
      <div className="grid-bg"/><div className="orb orb1"/><div className="orb orb2"/><div className="orb orb3"/>
      <div className="splash-logo fu">Team<span>AI</span></div>
      <div className="splash-sub fu2">Multi-agent AI collaboration platform</div>
      <div className="splash-dots fu3"><span/><span/><span/></div>
      <div className="dev-badge">
        <div className="dev-label">Developed by</div>
        <div className="dev-card"><DevAvatar/><span>Avinash</span></div>
      </div>
    </div>
  );
}

// ─── LOGIN — with real register/login auth ───
function Login({ onLogin }) {
  const [reg, setReg] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [eErr, setEErr] = useState("");
  const [pErr, setPErr] = useState("");
  const [authErr, setAuthErr] = useState("");

  const go = () => {
    setAuthErr("");
    const ee = !email ? "Email is required" : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Enter a valid email" : "";
    const pe = pass.length < 6 ? "Password must be at least 6 characters" : "";
    setEErr(ee); setPErr(pe);
    if (ee || pe) return;

    const users = Storage.getUsers();
    if (reg) {
      // Register
      if (users.find(u => u.email === email)) { setAuthErr("An account with this email already exists."); return; }
      const newUser = { name: name || email.split("@")[0], email, passHash: simpleHash(pass), createdAt: new Date().toISOString() };
      Storage.saveUser(newUser);
      const sessionUser = { name: newUser.name, email: newUser.email };
      Storage.saveSession(sessionUser);
      onLogin(sessionUser);
    } else {
      // Login
      const user = users.find(u => u.email === email);
      if (!user) { setAuthErr("No account found. Please register first."); return; }
      if (user.passHash !== simpleHash(pass)) { setAuthErr("Incorrect password. Please try again."); return; }
      const sessionUser = { name: user.name, email: user.email };
      Storage.saveSession(sessionUser);
      onLogin(sessionUser);
    }
  };

  return (
    <div className="lp">
      <div className="grid-bg"/><div className="orb orb1"/><div className="orb orb2"/><div className="orb orb3"/>
      <div className="lb fu si">
        <div className="ll fu">Team<span>AI</span></div>
        <div className="ls fu2">// multi-agent AI collaboration platform</div>
        {authErr && <div className="error-banner" style={{marginBottom:14}}>
          <div className="error-banner-title">⚠ {authErr}</div>
        </div>}
        {reg && <><label className="llab">Your Name</label>
          <input className="linp" placeholder="Jane Doe" value={name} onChange={e=>setName(e.target.value)}/></>}
        <label className="llab">Email</label>
        <input className={`linp${eErr?" err":""}`} type="email" placeholder="you@gmail.com"
          value={email} onChange={e=>{setEmail(e.target.value);setEErr("");setAuthErr("");}}/>
        {eErr && <div className="err-msg">⚠ {eErr}</div>}
        <label className="llab">Password</label>
        <input className={`linp${pErr?" err":""}`} type="password" placeholder="min. 6 characters"
          value={pass} onChange={e=>{setPass(e.target.value);setPErr("");setAuthErr("");}}
          onKeyDown={e=>e.key==="Enter"&&go()}/>
        {pErr && <div className="err-msg">⚠ {pErr}</div>}
        <button className="lbtn" onClick={go}>{reg ? "Create Account →" : "Sign In →"}</button>
        <div className="ltog">
          {reg ? "Have an account? " : "New here? "}
          <span onClick={()=>{setReg(!reg);setEErr("");setPErr("");setAuthErr("");}}>{reg?"Sign in":"Register"}</span>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ───
function Sidebar({ user, page, setPage, team, projects, theme, onToggleTheme, onLogout }) {
  return (
    <div className="sb">
      <div className="sb-logo">Team<span>AI</span></div>
      <div className="sb-ver">// v4.0 · multi-agent platform</div>
      <div className="sb-sec">Navigate</div>
      {[
        {id:"chat",icon:"💬",label:"Chat"},
        {id:"teams",icon:"🏠",label:"Browse Teams"},
        {id:"dashboard",icon:"📁",label:"My Projects",badge:projects.length||null},
        {id:"builder",icon:"🛠️",label:"Build a Team"},
        {id:"agents",icon:"🤖",label:"Agents"},
        {id:"providers",icon:"🔌",label:"AI Providers"},
        {id:"github",icon:"🐙",label:"GitHub Files"},
        {id:"profile",icon:"👤",label:"My Profile"},
      ].map(item=>(
        <div key={item.id} className={`sb-item${page===item.id?" act":""}`} onClick={()=>setPage(item.id)}>
          <span>{item.icon}</span>{item.label}
          {item.badge?<span className="badge">{item.badge}</span>:null}
        </div>
      ))}
      {team&&<><div className="sb-sec">Active Team</div>
        <div className={`sb-item${page==="team"?" act":""}`} onClick={()=>setPage("team")}>
          <span>{team.emoji}</span>{team.name}
        </div></>}
      <div className="sb-bot">
        <div className="uc" onClick={()=>setPage("profile")}>
          <div className="uav">{user.name[0].toUpperCase()}</div>
          <div><div className="un">{user.name}</div><div className="ur">// member</div></div>
        </div>
        <button className="theme-btn" onClick={onToggleTheme}>
          {theme==="dark"?"☀️ Light Mode":"🌙 Dark Mode"}
        </button>
        <button className="lo" onClick={onLogout}>← Sign out</button>
      </div>
    </div>
  );
}

function MobileNav({ page, setPage, team, theme, onToggleTheme }) {
  return (
    <div className="mob-nav">
      {[
        {id:"chat",icon:"💬",label:"Chat"},
        {id:"teams",icon:"🏠",label:"Teams"},
        {id:"dashboard",icon:"📁",label:"Projects"},
        {id:"agents",icon:"🤖",label:"Agents"},
        {id:"providers",icon:"🔌",label:"Providers"},
        {id:"github",icon:"🐙",label:"GitHub"},
        {id:"profile",icon:"👤",label:"Profile"},
        ...(team?[{id:"team",icon:team.emoji,label:"Active"}]:[]),
      ].map(i=>(
        <div key={i.id} className={`mob-nav-item${page===i.id?" act":""}`} onClick={()=>setPage(i.id)}>
          <span className="ni">{i.icon}</span><span>{i.label}</span>
        </div>
      ))}
      <div className="mob-nav-item" onClick={onToggleTheme}>
        <span className="ni">{theme==="dark"?"☀️":"🌙"}</span><span>Theme</span>
      </div>
    </div>
  );
}

// ─── ERROR BANNER ───
function ErrorBanner({ error, onRetry, onDismiss }) {
  if (!error) return null;
  return (
    <div className="error-banner">
      <div className="error-banner-title">⚠ Something went wrong</div>
      <div className="error-banner-msg">{error}</div>
      <div className="error-banner-actions">
        {onRetry && <button className="retry-btn" onClick={onRetry}>↺ Try Again</button>}
        <button className="retry-btn" onClick={onDismiss} style={{background:"transparent",borderColor:"rgba(255,255,255,.15)",color:"var(--muted)"}}>✕ Dismiss</button>
      </div>
    </div>
  );
}

// ─── BOT CHAT with streaming ───
function BotChat({ bot, idea, prevResult }) {
  const key = `${bot.id}_${idea.substring(0,20).replace(/\s/g,"_")}`;
  const [msgs, setMsgs] = useState(()=>{
    const h = Storage.getChatHistory(key);
    return h.length>0?h:[{role:"b",text:`Hi! I'm ${bot.name}, your ${bot.role}. I've already worked on your project. What would you like to improve?`}];
  });
  const [inp, setInp] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [showAll, setShowAll] = useState(false);
  const endRef = useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"})},[msgs,streamingText]);
  useEffect(()=>{const t=setTimeout(()=>Storage.saveChatHistory(key,msgs),400);return ()=>clearTimeout(t);},[msgs,key]);

  const send = async () => {
    if (!inp.trim() || loading) return;
    const q = inp.trim(); setInp(""); setLoading(true); setStreamingText("");
    const newMsgs = [...msgs, {role:"u",text:q}]; setMsgs(newMsgs);
    await callClaudeStream(
      `${bot.solo}\n\nProject: "${idea}"\nPrevious output: ${(prevResult||"").substring(0,400)}`,
      newMsgs.map(m=>({role:m.role==="u"?"user":"assistant",content:m.text})),
      (text) => setStreamingText(text),
      null
    ).then(finalText => {
      setStreamingText("");
      setMsgs(m=>[...m,{role:"b",text:finalText}]);
      setLoading(false);
    });
  };

  const clear = () => {
    const fresh=[{role:"b",text:`Fresh start! I'm ${bot.name}. What can I help you with?`}];
    setMsgs(fresh); Storage.saveChatHistory(key,fresh);
  };

  const displayed = showAll ? msgs : msgs.slice(-10);

  return (
    <div className="chat-panel">
      <div className="chat-hdr">
        <div className="chat-hdr-left">
          <div className="chat-hdr-emoji">{bot.emoji}</div>
          <div><div className="chat-hdr-name">{bot.name}</div>
            <div className="chat-hdr-role" style={{color:bot.color}}>{bot.role}</div></div>
        </div>
        <div className="chat-ctrl">
          <button className="chat-hist-btn" onClick={()=>setShowAll(s=>!s)}>
            {showAll?"Hide":"📜"} ({msgs.length-1})
          </button>
          <button className="chat-hist-btn" onClick={clear}>🗑</button>
        </div>
      </div>
      <div className="chat-msgs">
        {displayed.map((m,i)=>(
          <div key={i} className={`msg ${m.role}`}>
            <div className="mav" style={{background:m.role==="u"?"rgba(0,232,255,.14)":`${bot.color}20`,color:m.role==="u"?"var(--accent)":bot.color}}>
              {m.role==="u"?"U":bot.name[0]}
            </div>
            <div className="mb">{m.text}</div>
          </div>
        ))}
        {loading && (
          <div className="msg b">
            <div className="mav" style={{background:`${bot.color}20`,color:bot.color}}>{bot.name[0]}</div>
            <div className="mb">
              {streamingText
                ? <span className="streaming-text">{streamingText}<span className="typing-cursor"/></span>
                : <div className="typing"><s/><s/><s/></div>}
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>
      <div className="chat-inp-row">
        <textarea className="chat-inp" rows={2} placeholder={`Ask ${bot.name}...`}
          value={inp} onChange={e=>setInp(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}/>
        <button className="send-btn" onClick={send} disabled={loading||!inp.trim()}>Send</button>
      </div>
    </div>
  );
}

// ─── RESULT CARD ───
function ResultCard({ bot, content }) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const copy=()=>{ navigator.clipboard?.writeText(content); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  return (
    <div className="res-card sui">
      <div className="res-card-hdr" onClick={()=>setOpen(o=>!o)}>
        <div className="res-card-title">
          <span>{bot.emoji}</span><span>{bot.name}</span>
          <span className="res-card-role">— {bot.role}</span>
        </div>
        <div className="res-card-actions">
          <button className={`copy-btn${copied?" copied":""}`} onClick={e=>{e.stopPropagation();copy();}}>
            {copied?"✓ Copied":"Copy"}
          </button>
          <span className={`chev${open?" open":""}`}>▼</span>
        </div>
      </div>
      {open && <div className="res-card-body">{content}</div>}
    </div>
  );
}

// ─── TEAM VIEW with streaming + error handling ───
function TeamView({ team, onBack, onSaveProject }) {
  const [idea, setIdea] = useState("");
  const [phase, setPhase] = useState("idle");
  const [results, setResults] = useState({});
  const [streamingResults, setStreamingResults] = useState({});
  const [activeBot, setActiveBot] = useState(null);
  const [toast, setToast] = useState({ msg:"", type:"success" });
  const [finalResult, setFinalResult] = useState("");
  const [finalStreaming, setFinalStreaming] = useState("");
  const [workingDots, setWorkingDots] = useState(0);
  const [error, setError] = useState("");
  const lastIdeaRef = useRef("");

  useEffect(() => {
    if (phase !== "thinking" && phase !== "synthesizing") return;
    const t = setInterval(() => setWorkingDots(d => (d + 1) % 4), 500);
    return () => clearInterval(t);
  }, [phase]);

  const build = async (ideaOverride) => {
    const currentIdea = ideaOverride || idea;
    if (!currentIdea.trim()) return;
    lastIdeaRef.current = currentIdea;
    setPhase("thinking"); setResults({}); setStreamingResults({}); setActiveBot(null); setFinalResult(""); setFinalStreaming(""); setError("");

    let hasError = false;
    const botPromises = team.bots.map(bot =>
      callClaude(
        `${bot.collaborate}\n\nWork independently and deliver your complete expert contribution for this project.`,
        [{ role: "user", content: currentIdea }]
      ).then(result => {
        if (result.startsWith("Error:")) hasError = true;
        setStreamingResults(prev => ({...prev, [bot.id]: result}));
        return { id: bot.id, result };
      })
    );

    const allResults = await Promise.all(botPromises);
    const all = {};
    allResults.forEach(({ id, result }) => { all[id] = result; });

    if (hasError) {
      const errBot = allResults.find(r => r.result.startsWith("Error:"));
      setError(errBot?.result.replace("Error: ","") || "One or more agents failed. Check your API key in Vercel env vars.");
    }

    setPhase("synthesizing");
    const allContribs = team.bots.map(b =>
      `${b.emoji} ${b.name} (${b.role}):\n${all[b.id] || ""}`
    ).join("\n\n---\n\n");

    let summary = "";
    await callClaudeStream(
      `You are a master synthesizer. A team of AI experts all worked on the same idea simultaneously. Combine ALL their contributions into ONE powerful, complete, unified final plan. Use clear sections with headers. Make it actionable and ready to execute.`,
      [{ role: "user", content: `Original Idea: "${currentIdea}"\n\nAll Expert Contributions:\n\n${allContribs}\n\nWrite the complete unified final plan now.` }],
      (text) => { summary = text; setFinalStreaming(text); },
      (err) => setError(err)
    );

    setResults(all);
    setFinalResult(summary || allContribs);
    setFinalStreaming("");
    const proj = {
      id: Date.now().toString(), teamId: team.id, teamName: team.name, teamEmoji: team.emoji,
      title: currentIdea.substring(0, 60), idea: currentIdea,
      results: { ...all, _final: summary },
      createdAt: new Date().toISOString(),
    };
    onSaveProject(proj);
    setPhase("done");
  };

  const reset = () => { setPhase("idle"); setIdea(""); setResults({}); setStreamingResults({}); setActiveBot(null); setFinalResult(""); setError(""); };
  const curProj = { id:"cur", teamId:team.id, teamName:team.name, teamEmoji:team.emoji, title:idea.substring(0,60), idea, results:{...results,_final:finalResult}, createdAt:new Date().toISOString() };
  const dots = ".".repeat(workingDots);

  return (
    <div>
      {toast.msg && <Toast msg={toast.msg} type={toast.type} onHide={()=>setToast({msg:"",type:"success"})}/>}
      <button className="back fu" onClick={onBack}>← Back</button>
      <div className="th fu" style={{"--tc":team.color}}>
        <div className="the">{team.emoji}</div>
        <div><div className="thn">{team.name}</div><div className="tht" style={{color:team.color}}>{team.tagline}</div></div>
      </div>

      {/* IDLE */}
      {phase==="idle" && (
        <div className="idea-box fu2">
          <h3>💡 What do you want to build?</h3>
          <p>Drop your idea. All {team.bots.length} experts work simultaneously, then deliver one unified final plan.</p>
          <div className="chips">{team.examples?.map((ex,i)=><span key={i} className="chip" onClick={()=>setIdea(ex)}>{ex}</span>)}</div>
          <textarea className="idea-inp" rows={5} placeholder="Describe your idea in detail..."
            value={idea} onChange={e=>setIdea(e.target.value)}/>
          <button className="build-btn" onClick={()=>build()} disabled={!idea.trim()}>🚀 Let the team work on it</button>
        </div>
      )}

      {/* THINKING */}
      {phase==="thinking" && (
        <div className="working-screen fu">
          <div className="working-orb">
            {team.bots.map((bot,i)=>(
              <div key={bot.id} className="orbit-bot" style={{"--angle":`${(360/team.bots.length)*i}deg`}}>{bot.emoji}</div>
            ))}
            <div className="orbit-center">🧠</div>
          </div>
          <div className="working-title">All {team.bots.length} experts are thinking{dots}</div>
          <div className="working-sub">// working simultaneously on your idea</div>
          <div className="working-bots">
            {team.bots.map(bot=>(
              <div key={bot.id} className="working-bot-pill" style={{"--bc":bot.color}}>
                <span>{bot.emoji}</span>
                <span>{bot.name}</span>
                {streamingResults[bot.id]
                  ? <span style={{fontSize:".6rem",color:"var(--green)"}}>✓</span>
                  : <span className="pill-dot"/>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SYNTHESIZING */}
      {phase==="synthesizing" && (
        <div className="working-screen fu">
          <div style={{fontSize:"4rem",marginBottom:20,animation:"float 2s ease infinite"}}>🧠</div>
          <div className="working-title">Synthesizing final plan{dots}</div>
          <div className="working-sub">// combining all {team.bots.length} expert contributions</div>
          {finalStreaming && (
            <div style={{maxWidth:560,textAlign:"left",marginTop:20,fontFamily:"var(--font-m)",fontSize:".75rem",
              color:"var(--muted)",lineHeight:1.7,maxHeight:200,overflow:"hidden",
              background:"var(--surface)",borderRadius:12,padding:16,border:"1px solid var(--border)"}}>
              {finalStreaming.substring(0,400)}{finalStreaming.length>400?"...":""}
              <span className="typing-cursor"/>
            </div>
          )}
        </div>
      )}

      {/* DONE */}
      {phase==="done" && (
        <>
          <ErrorBanner error={error} onRetry={()=>build(lastIdeaRef.current)} onDismiss={()=>setError("")}/>

          <div className="action-row fu">
            <button className="act-btn act-btn-primary" onClick={()=>exportAsPDF(idea.substring(0,40),results,team.bots)}>📄 Export PDF</button>
            <button className="act-btn act-btn-share" onClick={()=>{shareProject(curProj);setToast({msg:"🔗 Share link copied to clipboard!",type:"success"});}}>🔗 Share</button>
            <button className="act-btn act-btn-sec" onClick={reset}>🔄 New Project</button>
          </div>

          {/* FINAL UNIFIED RESULT */}
          {finalResult && (
            <div className="fu" style={{
              background:"linear-gradient(135deg,rgba(167,139,250,.09),rgba(0,232,255,.06))",
              border:"1px solid rgba(167,139,250,.4)",borderRadius:20,padding:28,marginBottom:24,
              position:"relative",overflow:"hidden",
            }}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,#a78bfa,var(--accent),#4effa0)",opacity:.9}}/>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
                <span style={{fontSize:"2.2rem"}}>🧠</span>
                <div>
                  <div style={{fontWeight:800,fontSize:"1.1rem"}}>Complete Unified Plan</div>
                  <div style={{fontSize:".7rem",color:"#a78bfa",fontFamily:"var(--font-m)"}}>
                    // synthesized from {team.bots.length} experts working simultaneously
                  </div>
                </div>
                <button style={{marginLeft:"auto",padding:"6px 14px",background:"rgba(167,139,250,.12)",border:"1px solid rgba(167,139,250,.4)",color:"#a78bfa",borderRadius:8,cursor:"pointer",fontSize:".68rem",fontFamily:"var(--font-h)",fontWeight:700}}
                  onClick={()=>{navigator.clipboard?.writeText(finalResult);setToast({msg:"✓ Copied!",type:"success"});}}>Copy</button>
              </div>
              <div style={{fontFamily:"var(--font-m)",fontSize:".82rem",lineHeight:1.9,color:"#c8d8e8",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
                {finalResult}
              </div>
            </div>
          )}

          <div className="res-section fu">
            <h3>📋 Individual Expert Contributions</h3>
            {team.bots.map(bot=>results[bot.id]&&(
              <ResultCard key={bot.id} bot={bot} content={results[bot.id]}/>
            ))}
          </div>

          <div className="fix-sec fu">
            <h3>🔧 Chat with an Expert</h3>
            <div className="bot-cards">
              {team.bots.map(bot=>(
                <div key={bot.id} className={`bot-card${activeBot?.id===bot.id?" sel":""}`}
                  style={{"--bc":bot.color}} onClick={()=>setActiveBot(activeBot?.id===bot.id?null:bot)}>
                  <div className="bc-emoji">{bot.emoji}</div>
                  <div className="bc-name">{bot.name}</div>
                  <div className="bc-role">{bot.role}</div>
                </div>
              ))}
            </div>
            {activeBot&&<BotChat key={activeBot.id} bot={activeBot} idea={idea} prevResult={results[activeBot.id]}/>}
          </div>
        </>
      )}
    </div>
  );
}

// ─── CHAT PAGE (ChatGPT-style multi-agent) ───
function ChatPage({ team, teams, onSelectTeam, onSaveProject }) {
  const [conversations, setConversations] = useState(()=>Storage.getConversations());
  const [activeId, setActiveId] = useState(()=>Storage.getConversations()[0]?.id || null);
  const [messages, setMessages] = useState(()=>{const c=Storage.getConversations()[0];return c?c.messages:[];});
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | thinking | synthesizing | done | error
  const [streamingResults, setStreamingResults] = useState({});
  const [statuses, setStatuses] = useState({}); // botId -> status
  const [finalStreaming, setFinalStreaming] = useState("");
  const [activeBot, setActiveBot] = useState(null);
  const [showAgents, setShowAgents] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState({msg:"",type:"success"});
  const [rateLimitUntil, setRateLimitUntil] = useState(0);
  const [error, setError] = useState("");
  const [workingDots, setWorkingDots] = useState(0);
  const [lastIdea, setLastIdea] = useState("");
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const activeTeam = team || (teams && teams[0]) || null;
  const bots = (activeTeam?.bots || []).filter(b => (Storage.getAgentConfigs()[b.id]?.enabled ?? true));

  useEffect(() => {
    if (phase !== "thinking" && phase !== "synthesizing") return;
    const t = setInterval(() => setWorkingDots(d => (d + 1) % 4), 500);
    return () => clearInterval(t);
  }, [phase]);

  const persistConv = (msgs) => {
    if (!activeId) return;
    const convs = Storage.getConversations();
    const c = convs.find(x=>x.id===activeId);
    if (c) { c.messages = msgs; c.updatedAt = new Date().toISOString(); Storage.saveConversation(c); setConversations(Storage.getConversations()); }
  };

  const newChat = () => {
    const id = Date.now().toString();
    const c = { id, title: "New chat", messages: [], teamId: activeTeam?.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    Storage.saveConversation(c);
    setConversations(Storage.getConversations());
    setActiveId(id);
    setMessages([]);
    setPhase("idle"); setStreamingResults({}); setStatuses({}); setFinalStreaming(""); setError("");
  };

  const openConv = (id) => {
    const c = Storage.getConversations().find(x=>x.id===id);
    if (!c) return;
    setActiveId(id);
    setMessages(c.messages || []);
    setPhase("idle"); setStreamingResults({}); setStatuses({}); setFinalStreaming(""); setError("");
  };

  const deleteConv = (id) => {
    Storage.deleteConversation(id);
    setConversations(Storage.getConversations());
    if (activeId === id) { setActiveId(null); setMessages([]); }
  };

  const exportConversation = () => {
    const conv = Storage.getConversations().find(c=>c.id===activeId);
    if (!conv || !conv.messages?.length) return;
    const md = `# ${conv.title || "Conversation"}\n\n` +
      conv.messages.map(m => `## ${m.role === "user" ? "User" : "Assistant"}\n\n${m.content}\n`).join("\n---\n\n");
    const blob = new Blob([md], {type:"text/markdown"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${(conv.title||"conversation").replace(/[^a-z0-9]/gi,"_")}.md`;
    a.click(); URL.revokeObjectURL(url);
    setToast({msg:"Exported as Markdown",type:"success"});
  };

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); newChat(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "/") { e.preventDefault(); inputRef.current?.focus(); }
      if (e.key === "Escape") { setActiveBot(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const build = async (idea) => {
    if (!idea.trim() || !activeTeam) return;
    setLastIdea(idea);
    const userMsg = { role: "user", content: idea, ts: new Date().toISOString() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    persistConv(newMsgs);
    if (newMsgs.filter(m=>m.role==="user").length === 1) {
      const convs = Storage.getConversations();
      const c = convs.find(x=>x.id===activeId);
      if (c) { c.title = idea.substring(0,40); Storage.saveConversation(c); setConversations(Storage.getConversations()); }
    }

    setPhase("thinking"); setStreamingResults({}); setStatuses({}); setFinalStreaming(""); setError("");
    const initStatus = {};
    bots.forEach(b => { initStatus[b.id] = "running"; });
    setStatuses(initStatus);

    let hasError = false;
    const all = {};
    const deps = (b) => (b.dependsOn || []);
    // Compute execution waves (DAG scheduling) via scheduler util
    const waves = computeWaves(bots);

    for (const wave of waves) {
      const wavePromises = wave.map(bot => {
        setStatuses(s => ({ ...s, [bot.id]: "running" }));
        const prevContext = deps(bot).map(d => all[d] ? `${d}: ${String(all[d]).substring(0, 500)}` : "").filter(Boolean).join("\n\n");
        const prompt = prevContext
          ? `${bot.collaborate}\n\nWork independently and deliver your complete expert contribution for this project.\n\nContext from prerequisite agents:\n${prevContext}`
          : `${bot.collaborate}\n\nWork independently and deliver your complete expert contribution for this project.`;
        return callClaude(prompt, [{ role: "user", content: idea }])
          .then(result => {
            if (result.startsWith("Error:")) { hasError = true; setStatuses(s => ({ ...s, [bot.id]: "failed" })); }
            else setStatuses(s => ({ ...s, [bot.id]: "completed" }));
            setStreamingResults(prev => ({ ...prev, [bot.id]: result }));
            all[bot.id] = result;
            return { id: bot.id, result };
          })
          .catch(e => {
            hasError = true;
            setStatuses(s => ({ ...s, [bot.id]: "failed" }));
            const r = `Error: ${e.message}`;
            all[bot.id] = r;
            return { id: bot.id, result: r };
          });
      });
      await Promise.all(wavePromises);
    }

    if (hasError) {
      const errEntry = Object.entries(all).find(([,v]) => String(v).startsWith("Error:"));
      setError(errEntry ? String(errEntry[1]).replace("Error: ","") : "One or more agents failed.");
    }

    setPhase("synthesizing");
    const allContribs = bots.map(b =>
      `${b.emoji} ${b.name} (${b.role}):\n${all[b.id] || ""}`
    ).join("\n\n---\n\n");

    let summary = "";
    await callClaudeStream(
      `You are a master synthesizer. Combine ALL expert contributions into ONE powerful, complete, unified final plan. Use clear sections with headers. Make it actionable and ready to execute.`,
      [{ role: "user", content: `Original Idea: "${idea}"\n\nAll Expert Contributions:\n\n${allContribs}\n\nWrite the complete unified final plan now.` }],
      (text) => { summary = text; setFinalStreaming(text); },
      (err) => setError(err)
    );

    setFinalStreaming("");
    const proj = {
      id: Date.now().toString(), teamId: activeTeam.id, teamName: activeTeam.name, teamEmoji: activeTeam.emoji,
      title: idea.substring(0, 60), idea, results: { ...all, _final: summary }, createdAt: new Date().toISOString(),
    };
    onSaveProject(proj);

    const assistantMsg = { role: "assistant", content: summary || allContribs, results: all, finalResult: summary, ts: new Date().toISOString() };
    const finalMsgs = [...newMsgs, assistantMsg];
    setMessages(finalMsgs);
    persistConv(finalMsgs);
    setPhase("done");
  };

  const submit = () => {
    if (Date.now() < rateLimitUntil) { setToast({msg:"Please wait a moment before sending again",type:"error"}); return; }
    if (!input.trim() || phase === "thinking" || phase === "synthesizing") return;
    const q = input.trim(); setInput("");
    setRateLimitUntil(Date.now() + 1500);
    build(q);
  };

  const retryBot = async (bot) => {
    if (!lastIdea) return;
    setStatuses(s=>({...s,[bot.id]:"running"}));
    const result = await callClaude(
      `${bot.collaborate}\n\nWork independently and deliver your complete expert contribution for this project.`,
      [{ role: "user", content: lastIdea }]
    );
    if (result.startsWith("Error:")) setStatuses(s=>({...s,[bot.id]:"failed"}));
    else setStatuses(s=>({...s,[bot.id]:"completed"}));
    setStreamingResults(prev=>({...prev,[bot.id]:result}));
  };

  const dots = ".".repeat(workingDots);

  return (
    <div style={{display:"flex",height:"100vh",overflow:"hidden"}}>
      {toast.msg && <Toast msg={toast.msg} type={toast.type} onHide={()=>setToast({msg:"",type:"success"})}/>}
      {/* Conversation sidebar */}
      <div style={{width:260,borderRight:"1px solid var(--border)",background:"var(--surface)",display:"flex",flexDirection:"column",padding:12,flexShrink:0}}>
        <button className="build-btn" style={{width:"100%",justifyContent:"center",marginBottom:8}} onClick={newChat}>+ New chat</button>
        <button className="act-btn act-btn-sec" style={{width:"100%",justifyContent:"center",marginBottom:12,fontSize:".7rem"}} onClick={exportConversation}>⬇ Export chat</button>
        <input className="finp" placeholder="Search conversations..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
          style={{marginBottom:8,fontSize:".75rem",padding:"6px 10px"}}/>
        <div style={{flex:1,overflowY:"auto"}}>
          {conversations.filter(c=>(c.title||"").toLowerCase().includes(searchQuery.toLowerCase())).length===0 && <div style={{color:"var(--muted)",fontSize:".75rem",padding:8}}>No conversations</div>}
          {conversations.filter(c=>(c.title||"").toLowerCase().includes(searchQuery.toLowerCase())).map(c=>(
            <div key={c.id} onClick={()=>openConv(c.id)} style={{
              padding:"8px 10px",borderRadius:8,cursor:"pointer",marginBottom:4,fontSize:".8rem",
              background: activeId===c.id ? "rgba(0,232,255,.09)" : "transparent",
              color: activeId===c.id ? "var(--accent)" : "var(--text)",
              display:"flex",justifyContent:"space-between",alignItems:"center",
            }}>
              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{c.title || "New chat"}</span>
              <button onClick={(e)=>{e.stopPropagation();deleteConv(c.id);}} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:".7rem"}}>✕</button>
            </div>
          ))}
        </div>
        {/* team selector */}
        <div style={{borderTop:"1px solid var(--border)",paddingTop:10,marginTop:8}}>
          <div style={{fontSize:".6rem",color:"var(--muted)",marginBottom:6,letterSpacing:1.5}}>TEAM</div>
          <select value={activeTeam?.id||""} onChange={e=>{const t=teams.find(x=>x.id===e.target.value); if(t) onSelectTeam(t);}}
            style={{width:"100%",background:"var(--surface2)",border:"1px solid var(--border)",color:"var(--text)",borderRadius:8,padding:"6px 8px",fontFamily:"var(--font-m)",fontSize:".75rem"}}>
            {teams.map(t=><option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}
          </select>
        </div>
      </div>

      {/* Main chat */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
        <div style={{flex:1,overflowY:"auto",padding:"24px 20px"}}>
          {messages.length===0 && phase==="idle" && (
            <div style={{textAlign:"center",marginTop:"15vh",color:"var(--muted)"}}>
              <div style={{fontSize:"2.4rem",marginBottom:12}}>🧠</div>
              <div style={{fontFamily:"var(--font-h)",fontWeight:800,fontSize:"1.4rem",marginBottom:6}}>TeamAI</div>
              <div style={{fontFamily:"var(--font-m)",fontSize:".8rem",marginBottom:20}}>// ask anything · describe what to build · pick a team</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",maxWidth:600,margin:"0 auto"}}>
                {["Build a complete authentication system","Create a responsive dashboard using React","Build a complete e-commerce website","Research best tech stack for my startup"].map((p,i)=>(
                  <span key={i} className="chip" onClick={()=>setInput(p)}>{p}</span>
                ))}
              </div>
            </div>
          )}
          {messages.map((m,i)=>(
            <div key={i} style={{marginBottom:20,display:"flex",flexDirection:m.role==="user"?"row-reverse":"row",gap:10}}>
              <div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",
                background: m.role==="user"?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--surface2)",
                color: m.role==="user"?"#000":"var(--accent)",fontWeight:800,fontSize:".75rem"}}>
                {m.role==="user"?"U":"AI"}
              </div>
              <div style={{maxWidth:"80%",padding:"12px 16px",borderRadius:12,fontFamily:"var(--font-m)",fontSize:".82rem",lineHeight:1.8,
                background: m.role==="user"?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--surface)",
                color: m.role==="user"?"#000":"var(--text)",border: m.role==="user"?"none":"1px solid var(--border)",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
                {m.content}
                {m.role==="assistant" && m.results && (
                  <div style={{marginTop:12}}>
                    {Object.keys(m.results).filter(k=>k!=="_final").map(k=>{
                      const bot = bots.find(b=>b.id===k);
                      return bot && m.results[k] ? <ResultCard key={k} bot={bot} content={m.results[k]}/> : null;
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
          {phase==="thinking" && (
            <div style={{display:"flex",gap:10,marginBottom:20}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:"var(--surface2)",color:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:".75rem"}}>AI</div>
              <div style={{padding:"12px 16px",borderRadius:12,background:"var(--surface)",border:"1px solid var(--border)",fontFamily:"var(--font-m)",fontSize:".82rem",color:"var(--muted)"}}>
                All {bots.length} agents are thinking{dots}
              </div>
            </div>
          )}
          {phase==="synthesizing" && finalStreaming && (
            <div style={{display:"flex",gap:10,marginBottom:20}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:"var(--surface2)",color:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:".75rem"}}>AI</div>
              <div style={{maxWidth:"80%",padding:"12px 16px",borderRadius:12,background:"var(--surface)",border:"1px solid var(--border)",fontFamily:"var(--font-m)",fontSize:".82rem",color:"var(--text)",whiteSpace:"pre-wrap"}}>
                {finalStreaming}<span className="typing-cursor"/>
              </div>
            </div>
          )}
          {error && <ErrorBanner error={error} onRetry={()=>build(lastIdea)} onDismiss={()=>setError("")}/>}
          <div ref={endRef}/>
        </div>

        {/* Input */}
        <div style={{borderTop:"1px solid var(--border)",padding:"12px 20px",background:"var(--surface)"}}>
          <div style={{display:"flex",gap:8,alignItems:"flex-end",maxWidth:900,margin:"0 auto"}}>
            <textarea ref={inputRef} className="chat-inp" rows={2} placeholder="Describe what to build or ask anything..."
              value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submit();}}}
              style={{flex:1}}/>
            <button className="send-btn" onClick={submit} disabled={!input.trim()||phase==="thinking"||phase==="synthesizing"} aria-label="Send message">Send</button>
          </div>
          <div style={{textAlign:"center",marginTop:6,fontSize:".6rem",color:"var(--muted2)",fontFamily:"var(--font-m)"}}>
            Enter send � Shift+Enter newline � Ctrl+K new chat � Ctrl+/ focus � Esc close agent
          </div>
        </div>
      </div>

      {/* Agent panel */}
      {showAgents && (
        <div className="agent-panel" style={{width:280,borderLeft:"1px solid var(--border)",background:"var(--surface)",padding:12,overflowY:"auto",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:".7rem",fontWeight:800,color:"var(--muted)",letterSpacing:1.5}}>AGENTS</div>
            <button onClick={()=>setShowAgents(false)} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer"}}>✕</button>
          </div>
          {bots.map(bot=>(
            <div key={bot.id} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:12,padding:12,marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <span style={{fontSize:"1.2rem"}}>{bot.emoji}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:".78rem",fontWeight:800}}>{bot.name}</div>
                  <div style={{fontSize:".62rem",color:bot.color,fontFamily:"var(--font-m)"}}>{bot.role}</div>
                </div>
                <span style={{fontSize:".6rem",padding:"2px 8px",borderRadius:20,background:"rgba(255,255,255,.06)",color:"var(--muted)",fontFamily:"var(--font-m)"}}>
                  {statuses[bot.id] || (phase==="idle"?"idle":"pending")}
                </span>
              </div>
              {streamingResults[bot.id] && (
                <div style={{fontSize:".65rem",color:"var(--muted)",fontFamily:"var(--font-m)",maxHeight:60,overflow:"hidden"}}>
                  {streamingResults[bot.id].substring(0,120)}...
                </div>
              )}
              {statuses[bot.id]==="failed" && (
                <button className="retry-btn" style={{marginTop:6,width:"100%"}} onClick={()=>retryBot(bot)}>↺ Retry agent</button>
              )}
              <button className="chat-hist-btn" style={{marginTop:6,width:"100%"}} onClick={()=>setActiveBot(activeBot?.id===bot.id?null:bot)}>
                {activeBot?.id===bot.id?"Close chat":"Chat with agent"}
              </button>
            </div>
          ))}
          {activeBot && <BotChat key={activeBot.id} bot={activeBot} idea={lastIdea||""} prevResult={streamingResults[activeBot.id]}/>}
        </div>
      )}
      {!showAgents && (
        <button onClick={()=>setShowAgents(true)} style={{position:"fixed",right:12,top:12,zIndex:50,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,padding:"6px 10px",cursor:"pointer",color:"var(--muted)",fontSize:".7rem"}}>Agents ▸</button>
      )}
    </div>
  );
}

// ─── AGENTS PAGE ───
function AgentsPage({ teams }) {
  const [configs, setConfigs] = useState(()=>Storage.getAgentConfigs());
  const [editing, setEditing] = useState(null);
  const allBots = teams.flatMap(t => t.bots.map(b => ({...b, teamName: t.name, teamEmoji: t.emoji, teamId: t.id})));
  const save = (id, patch) => {
    Storage.saveAgentConfig(id, patch);
    setConfigs(Storage.getAgentConfigs());
    setEditing(null);
  };
  return (
    <div>
      <div className="ph fu"><div className="ph-title">Agent Management</div>
        <div className="ph-sub">// configure agent roles, prompts, and enable/disable</div></div>
      <div className="proj-grid fu2">
        {allBots.map(b=>{
          const cfg = configs[b.id] || {};
          const enabled = cfg.enabled !== false;
          return (
            <div key={b.id} className="proj-card" style={{cursor:"default"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <span style={{fontSize:"1.5rem"}}>{b.emoji}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:".9rem",fontWeight:800}}>{cfg.name || b.name}</div>
                  <div style={{fontSize:".68rem",color:b.color,fontFamily:"var(--font-m)"}}>{cfg.role || b.role} · {b.teamEmoji} {b.teamName}</div>
                </div>
                <button onClick={()=>save(b.id,{enabled:!enabled})} style={{
                  background: enabled?"rgba(78,255,160,.15)":"rgba(255,78,78,.15)",
                  border:`1px solid ${enabled?"rgba(78,255,160,.4)":"rgba(255,78,78,.4)"}`,
                  color: enabled?"var(--green)":"var(--red)",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:".65rem",fontWeight:700}}>
                  {enabled?"Enabled":"Disabled"}
                </button>
              </div>
              {editing===b.id ? (
                <div>
                  <label className="llab">Name</label>
                  <input className="finp" defaultValue={cfg.name||b.name} id={`n-${b.id}`}/>
                  <label className="llab" style={{marginTop:8}}>Role</label>
                  <input className="finp" defaultValue={cfg.role||b.role} id={`r-${b.id}`}/>
                  <label className="llab" style={{marginTop:8}}>System instructions</label>
                  <textarea className="finp" rows={4} defaultValue={cfg.collaborate||b.collaborate} id={`c-${b.id}`}/>
                  <div style={{display:"flex",gap:8,marginTop:8}}>
                    <button className="act-btn act-btn-primary" onClick={()=>{
                      save(b.id,{
                        name: document.getElementById(`n-${b.id}`).value,
                        role: document.getElementById(`r-${b.id}`).value,
                        collaborate: document.getElementById(`c-${b.id}`).value,
                        enabled,
                      });
                    }}>Save</button>
                    <button className="act-btn act-btn-sec" onClick={()=>setEditing(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button className="act-btn act-btn-sec" style={{width:"100%",justifyContent:"center"}} onClick={()=>setEditing(b.id)}>Edit</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AI PROVIDERS PAGE ───
function ProvidersPage() {
  const [ollama, setOllama] = useState({ connected: false, models: [], loading: true, baseUrl: "http://localhost:11434" });
  const [opencode, setOpencode] = useState({ installed: false, loading: true });
  const [baseUrl, setBaseUrl] = useState("http://localhost:11434");

  const checkOllama = async () => {
    setOllama(s => ({ ...s, loading: true }));
    try {
      const r = await fetch(`/api/ollama?baseUrl=${encodeURIComponent(baseUrl)}`);
      const data = await r.json();
      setOllama({ connected: data.connected, models: data.models || [], loading: false, baseUrl: data.baseUrl, error: data.error });
    } catch (e) {
      setOllama({ connected: false, models: [], loading: false, baseUrl, error: e.message });
    }
  };

  const checkOpencode = async () => {
    setOpencode(s => ({ ...s, loading: true }));
    try {
      const r = await fetch("/api/opencode");
      const data = await r.json();
      setOpencode({ installed: data.installed, version: data.version, loading: false, error: data.error, hint: data.hint });
    } catch (e) {
      setOpencode({ installed: false, loading: false, error: e.message });
    }
  };

  useEffect(() => { const t = setTimeout(() => { checkOllama(); checkOpencode(); }, 0); return () => clearTimeout(t); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

  const providers = [
    { name: "Gemini", type: "Cloud", free: "Free tier", status: "Configure via GEMINI_API_KEY", paid: "May require billing for heavy use" },
    { name: "Groq", type: "Cloud", free: "Free tier", status: "Configure via GROQ_API_KEY", paid: "Rate limits on free tier" },
    { name: "OpenRouter", type: "Cloud", free: "Free models available", status: "Configure via OPENROUTER_API_KEY", paid: "Some models paid" },
    { name: "Pollinations", type: "Cloud", free: "Free (no key)", status: "Always available", paid: "No" },
    { name: "Ollama", type: "Local", free: "Free (local)", status: ollama.loading ? "Checking..." : (ollama.connected ? `Connected · ${ollama.models.length} models` : "Not running"), paid: "No (hardware cost only)" },
    { name: "OpenCode", type: "Local CLI", free: "Depends on provider", status: opencode.loading ? "Checking..." : (opencode.installed ? `Installed ${opencode.version || ""}` : "Not installed"), paid: "Depends on configured model" },
  ];

  return (
    <div>
      <div className="ph fu"><div className="ph-title">AI Providers</div>
        <div className="ph-sub">// connect local and cloud AI runtimes</div></div>

      <div className="proj-grid fu2">
        {providers.map(p => (
          <div key={p.name} className="proj-card" style={{cursor:"default"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <span style={{fontSize:"1.5rem"}}>{p.type === "Local" || p.type === "Local CLI" ? "💻" : "☁️"}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:".9rem",fontWeight:800}}>{p.name}</div>
                <div style={{fontSize:".68rem",color:"var(--muted)",fontFamily:"var(--font-m)"}}>{p.type} · {p.free}</div>
              </div>
            </div>
            <div style={{fontSize:".72rem",marginBottom:6}}><b>Status:</b> {p.status}</div>
            <div style={{fontSize:".68rem",color:"var(--muted)",fontFamily:"var(--font-m)"}}>Paid usage: {p.paid}</div>
          </div>
        ))}
      </div>

      {/* Ollama config */}
      <div className="builder-box fu3" style={{marginTop:20}}>
        <h3>Ollama Configuration</h3>
        <p>Connect to a local Ollama instance. Install from https://ollama.com</p>
        <div className="field-row">
          <div className="field finp-full">
            <label>Base URL</label>
            <input className="finp" value={baseUrl} onChange={e=>setBaseUrl(e.target.value)} placeholder="http://localhost:11434"/>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:10}}>
          <button className="act-btn act-btn-primary" onClick={checkOllama}>Test Connection</button>
          <button className="act-btn act-btn-sec" onClick={checkOpencode}>Check OpenCode</button>
        </div>
        {ollama.connected && ollama.models.length > 0 && (
          <div style={{marginTop:12}}>
            <div style={{fontSize:".7rem",fontWeight:800,color:"var(--muted)",marginBottom:6}}>AVAILABLE MODELS</div>
            {ollama.models.map(m => (
              <div key={m.name} style={{fontSize:".75rem",padding:"4px 0",borderBottom:"1px solid var(--border)",fontFamily:"var(--font-m)"}}>
                {m.name} {m.parameterSize ? `(${m.parameterSize})` : ""}
              </div>
            ))}
          </div>
        )}
        {ollama.error && <div className="err-msg" style={{marginTop:8}}>⚠ {ollama.error}</div>}
        {opencode.error && <div className="err-msg" style={{marginTop:8}}>⚠ OpenCode: {opencode.error} {opencode.hint}</div>}
      </div>
    </div>
  );
}

// ─── TEAMS PAGE ───
function TeamsPage({ onSelect, customTeams, onDeleteCustom }) {
  const all=[...DEFAULT_TEAMS,...customTeams];
  return (
    <div>
      <div className="ph fu">
        <div className="ph-title">Your AI-Powered Teams</div>
        <div className="ph-sub">// pick a team · drop your idea · get complete expert results</div>
      </div>
      <div className="tg">
        {all.map((t,i)=>(
          <div key={t.id} className={`tc${t.isDefault?"":" tc-custom"} fu`}
            style={{"--cc":t.color,animationDelay:`${i*.055}s`}}>
            <span className="tc-badge">{t.isDefault?"Default":"Custom"}</span>
            <span className="te">{t.emoji}</span>
            <div className="tn">{t.name}</div>
            <div className="ttag">{t.tagline}</div>
            <div className="bps">{t.bots.map(b=><span key={b.id} className="bp">{b.emoji} {b.name}</span>)}</div>
            <div className="tcta" onClick={()=>onSelect(t)}>Work with this team →</div>
            {!t.isDefault&&<button className="tc-del" onClick={e=>{e.stopPropagation();onDeleteCustom(t.id);}}>🗑</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DASHBOARD ───
function Dashboard({ projects, onOpen, onDelete }) {
  return (
    <div>
      <div className="ph fu"><div className="ph-title">My Projects</div>
        <div className="ph-sub">// {projects.length} saved · click to continue working</div></div>
      {projects.length===0?(
        <div className="empty-state fu2"><div className="es-emoji">📁</div><div>No projects yet</div>
          <div style={{marginTop:8,color:"var(--muted2)"}}>Pick a team and build something!</div></div>
      ):(
        <div className="proj-grid fu2">
          {projects.map(p=>(
            <div key={p.id} className="proj-card" onClick={()=>onOpen(p)}>
              <button className="proj-del" onClick={e=>{e.stopPropagation();onDelete(p.id);}}>🗑</button>
              <div className="proj-card-emoji">{p.teamEmoji}</div>
              <div className="proj-card-title">{p.title}</div>
              <div className="proj-card-team">{p.teamName}</div>
              <div className="proj-card-idea">{p.idea}</div>
              <div className="proj-card-date">{new Date(p.createdAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PROJECT VIEWER ───
function ProjectViewer({ project, teams, onBack }) {
  const team=[...DEFAULT_TEAMS,...teams].find(t=>t.id===project.teamId)||{
    bots:Object.keys(project.results).filter(k=>k!=="__final").map(id=>({id,name:id,role:"",emoji:"🤖",color:"#00e8ff"}))
  };
  const [activeBot, setActiveBot] = useState(null);
  const [toast, setToast] = useState({ msg:"",type:"success" });
  return (
    <div>
      {toast.msg&&<Toast msg={toast.msg} type={toast.type} onHide={()=>setToast({msg:"",type:"success"})}/>}
      <button className="back fu" onClick={onBack}>← Back to Projects</button>
      <div className="th fu" style={{"--tc":"#00e8ff"}}>
        <div className="the">{project.teamEmoji}</div>
        <div><div className="thn">{project.title}</div>
          <div className="tht">{project.teamName} · {new Date(project.createdAt).toLocaleDateString()}</div></div>
      </div>
      <div className="action-row fu2">
        <button className="act-btn act-btn-primary" onClick={()=>exportAsPDF(project.title,project.results,team.bots)}>📄 Export PDF</button>
        <button className="act-btn act-btn-share" onClick={()=>{shareProject(project);setToast({msg:"🔗 Link copied!",type:"success"});}}>🔗 Share</button>
      </div>
      <div className="res-section fu2">
        <h3>📋 Saved Results</h3>
        {team.bots.map(bot=>project.results[bot.id]&&(
          <ResultCard key={bot.id} bot={bot} content={project.results[bot.id]}/>
        ))}
      </div>
      <div className="fix-sec fu2">
        <h3>🔧 Continue Working</h3>
        <div className="bot-cards">
          {team.bots.map(bot=>project.results[bot.id]&&(
            <div key={bot.id} className={`bot-card${activeBot?.id===bot.id?" sel":""}`}
              style={{"--bc":bot.color}} onClick={()=>setActiveBot(activeBot?.id===bot.id?null:bot)}>
              <div className="bc-emoji">{bot.emoji}</div>
              <div className="bc-name">{bot.name}</div>
              <div className="bc-role">{bot.role}</div>
            </div>
          ))}
        </div>
        {activeBot&&<BotChat key={activeBot.id} bot={activeBot} idea={project.idea} prevResult={project.results[activeBot.id]}/>}
      </div>
    </div>
  );
}

// ─── PROFILE PAGE ───
function ProfilePage({ user, projects, customTeams }) {
  const saved=Storage.getProfile();
  const [displayName, setDisplayName] = useState(saved.displayName||user.name);
  const [bio, setBio] = useState(saved.bio||"");
  const [ok, setOk] = useState(false);
  const clearAll = () => {
    if (!confirm("Delete all projects, conversations, and custom teams? This cannot be undone.")) return;
    localStorage.removeItem("teamai_projects");
    localStorage.removeItem("teamai_conversations");
    localStorage.removeItem("teamai_custom_teams");
    localStorage.removeItem("teamai_chat_history");
    window.location.reload();
  };
  const chatCount=Object.keys(localStorage).filter(k=>k.startsWith("teamai_chat_")).length;
  const save=()=>{ Storage.saveProfile({displayName,bio}); setOk(true); setTimeout(()=>setOk(false),2000); };
  return (
    <div className="profile-wrap fu">
      <div className="ph"><div className="ph-title">My Profile</div><div className="ph-sub">// account & activity overview</div></div>
      <div className="profile-card fu2">
        <div className="profile-avatar">{displayName[0]?.toUpperCase()}</div>
        <div className="profile-name">{displayName}</div>
        <div className="profile-email">{user.email}</div>
        <div className="profile-stats">
          <div className="stat-box"><div className="stat-num">{projects.length}</div><div className="stat-label">Projects</div></div>
          <div className="stat-box"><div className="stat-num">{customTeams.length}</div><div className="stat-label">Teams</div></div>
          <div className="stat-box"><div className="stat-num">{chatCount}</div><div className="stat-label">Bot Chats</div></div>
        </div>
        <div className="profile-edit">
          <h4>EDIT PROFILE</h4>
          <div style={{marginBottom:10}}>
            <label className="llab">Display Name</label>
            <input className="linp" value={displayName} onChange={e=>setDisplayName(e.target.value)}/>
          </div>
          <div>
            <label className="llab">Bio</label>
            <input className="linp" placeholder="Tell us about yourself..." value={bio} onChange={e=>setBio(e.target.value)}/>
          </div>
          <button className={`save-btn${ok?" ok":""}`} onClick={save}>{ok?"✓ Saved!":"Save Profile"}</button>
        </div>
        <div style={{marginTop:14}}>
          <button className="act-btn act-btn-sec" style={{width:"100%",justifyContent:"center",color:"var(--red)",borderColor:"rgba(255,78,78,.3)"}} onClick={clearAll}>🗑 Clear all data</button>
        </div>
      </div>
      <div className="profile-card fu3">
        <div style={{fontSize:".78rem",fontWeight:800,marginBottom:14,color:"var(--muted)"}}>RECENT PROJECTS</div>
        {projects.length===0?(
          <div style={{fontSize:".75rem",color:"var(--muted)",fontFamily:"var(--font-m)"}}>No projects yet</div>
        ):projects.slice(0,5).map(p=>(
          <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid var(--border)"}}>
            <span style={{fontSize:"1.2rem"}}>{p.teamEmoji}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:".8rem",fontWeight:700}}>{p.title}</div>
              <div style={{fontSize:".66rem",color:"var(--muted)",fontFamily:"var(--font-m)"}}>{p.teamName} · {new Date(p.createdAt).toLocaleDateString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TEAM BUILDER ───
const BOT_COLORS=["#00e8ff","#ff6fff","#ffe44d","#4effa0","#ff9442","#a78bfa"];
const BOT_EMOJIS=["⚡","🎨","📈","⚖️","💰","🎯","🔧","📋","✍️","🔍","👥","🏛️"];

function TeamBuilder({ onSave }) {
  const [team,setTeam]=useState({name:"",emoji:"🤖",tagline:"",color:"#00e8ff"});
  const [bots,setBots]=useState([{id:"b1",name:"",role:"",emoji:"⚡",color:"#00e8ff",collaborate:"",solo:""}]);
  const [saved,setSaved]=useState(false);
  const addBot=()=>setBots(b=>[...b,{id:`b${Date.now()}`,name:"",role:"",emoji:BOT_EMOJIS[b.length%BOT_EMOJIS.length],color:BOT_COLORS[b.length%BOT_COLORS.length],collaborate:"",solo:""}]);
  const upBot=(id,f,v)=>setBots(b=>b.map(bot=>bot.id===id?{...bot,[f]:v}:bot));
  const delBot=(id)=>setBots(b=>b.filter(bot=>bot.id!==id));
  const save=()=>{
    if(!team.name.trim()||bots.some(b=>!b.name||!b.role)) return;
    const t={...team,id:`custom_${Date.now()}`,isDefault:false,
      examples:["Tell me about your project","Help me plan this idea","What should I focus on?"],
      bots:bots.map(b=>({...b,
        collaborate:b.collaborate||`You are ${b.name}, ${b.role}. Provide your complete expert analysis.`,
        solo:b.solo||`You are ${b.name}, ${b.role}. Help the user with your expertise.`,
      }))};
    onSave(t); setSaved(true); setTimeout(()=>setSaved(false),2000);
  };
  return (
    <div>
      <div className="ph fu"><div className="ph-title">Build a Custom Team</div>
        <div className="ph-sub">// create your own AI team with custom experts</div></div>
      <div className="builder-box fu2">
        <h3>Team Details</h3><p>Define your team's identity and purpose.</p>
        <div className="field-row">
          <div className="field"><label>Team Name</label><input className="finp" placeholder="My Dream Team" value={team.name} onChange={e=>setTeam(t=>({...t,name:e.target.value}))}/></div>
          <div className="field"><label>Emoji</label><input className="finp" placeholder="🚀" value={team.emoji} onChange={e=>setTeam(t=>({...t,emoji:e.target.value}))}/></div>
          <div className="field finp-full"><label>Tagline</label><input className="finp" placeholder="What does this team do?" value={team.tagline} onChange={e=>setTeam(t=>({...t,tagline:e.target.value}))}/></div>
          <div className="field"><label>Theme Color</label><input className="finp" type="color" value={team.color} onChange={e=>setTeam(t=>({...t,color:e.target.value}))}/></div>
        </div>
      </div>
      <div className="builder-box fu3">
        <h3>Team Members</h3><p>Add AI experts for your team.</p>
        {bots.map((bot,i)=>(
          <div key={bot.id} className="bot-builder">
            <div className="bot-builder-hdr">
              <span>Bot #{i+1}</span>
              {bots.length>1&&<button className="bot-del-btn" onClick={()=>delBot(bot.id)}>✕ Remove</button>}
            </div>
            <div className="field-row">
              <div className="field"><label>Name</label><input className="finp" placeholder="e.g. DataBot" value={bot.name} onChange={e=>upBot(bot.id,"name",e.target.value)}/></div>
              <div className="field"><label>Role</label><input className="finp" placeholder="e.g. Data Analyst" value={bot.role} onChange={e=>upBot(bot.id,"role",e.target.value)}/></div>
              <div className="field"><label>Emoji</label><input className="finp" placeholder="📊" value={bot.emoji} onChange={e=>upBot(bot.id,"emoji",e.target.value)}/></div>
              <div className="field"><label>Color</label><input className="finp" type="color" value={bot.color} onChange={e=>upBot(bot.id,"color",e.target.value)}/></div>
              <div className="field finp-full"><label>Expertise (optional)</label><input className="finp" placeholder="What is this bot an expert in?" value={bot.collaborate} onChange={e=>upBot(bot.id,"collaborate",e.target.value)}/></div>
            </div>
          </div>
        ))}
        <button className="add-bot-btn" onClick={addBot}>+ Add Another Bot</button>
        <button className="act-btn act-btn-primary" onClick={save} disabled={!team.name.trim()||bots.some(b=>!b.name||!b.role)}>
          {saved?"✓ Team Saved!":"💾 Save Team"}
        </button>
      </div>
    </div>
  );
}

// ─── ERROR BOUNDARY ───
class ErrorBoundary extends Component {
  constructor(props){super(props);this.state={hasError:false,error:null};}
  static getDerivedStateFromError(error){return {hasError:true,error};}
  componentDidCatch(error,info){console.error("ErrorBoundary caught:",error,info);}
  render(){
    if(this.state.hasError){
      return (
        <div style={{padding:40,textAlign:"center",color:"var(--text)",fontFamily:"var(--font-m)"}}>
          <div style={{fontSize:"2rem",marginBottom:12}}>⚠️</div>
          <div style={{fontWeight:800,marginBottom:8}}>Something went wrong</div>
          <div style={{fontSize:".75rem",color:"var(--muted)",marginBottom:16,whiteSpace:"pre-wrap"}}>{String(this.state.error?.message||this.state.error)}</div>
          <button className="act-btn act-btn-primary" onClick={()=>{this.setState({hasError:false,error:null});window.location.reload();}}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── DIFF PREVIEW COMPONENT ───
function DiffPreview({ oldText, newText, fileName }) {
  const oldLines = (oldText || "").split("\n");
  const newLines = (newText || "").split("\n");
  return (
    <div style={{fontFamily:"var(--font-m)",fontSize:".72rem",border:"1px solid var(--border)",borderRadius:8,overflow:"hidden",margin:"8px 0"}}>
      <div style={{padding:"6px 10px",background:"var(--surface2)",borderBottom:"1px solid var(--border)",fontWeight:700}}>
        {fileName || "diff"}
      </div>
      <div style={{maxHeight:240,overflow:"auto",padding:8}}>
        {newLines.map((line, i) => {
          const oldLine = oldLines[i];
          const changed = oldLine !== line;
          return (
            <div key={i} style={{background: changed ? "rgba(78,255,160,.08)" : "transparent", padding:"1px 4px", whiteSpace:"pre-wrap", wordBreak:"break-word"}}>
              {changed ? "+ " : "  "}{line}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── GITHUB FILES PAGE ───
function GitHubPage() {
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [path, setPath] = useState("");
  const [files, setFiles] = useState([]);
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  const [editContent, setEditContent] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const listFiles = async () => {
    if (!owner || !repo) return;
    setLoading(true); setStatus("");
    try {
      const r = await fetch("/api/github", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", owner, repo, path }) });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      setFiles(data.files || []);
      setStatus(`Loaded ${data.files?.length || 0} items`);
    } catch (e) { setStatus(`Error: ${e.message}`); }
    setLoading(false);
  };

  const readFile = async (filePath) => {
    setLoading(true); setStatus("");
    try {
      const r = await fetch("/api/github", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read", owner, repo, path: filePath }) });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      setSelectedFile(filePath);
      setContent(data.content || "");
      setEditContent(data.content || "");
      setStatus(`Loaded ${filePath}`);
    } catch (e) { setStatus(`Error: ${e.message}`); }
    setLoading(false);
  };

  const writeFile = async () => {
    if (!selectedFile) return;
    setLoading(true); setStatus("");
    try {
      const r = await fetch("/api/github", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "write", owner, repo, path: selectedFile, content: editContent, message: message || `Update ${selectedFile} via TeamAI` }) });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      setStatus(`Committed ${data.commit?.slice(0, 7) || "ok"} to ${selectedFile}`);
      setContent(editContent);
    } catch (e) { setStatus(`Error: ${e.message}`); }
    setLoading(false);
  };

  return (
    <div>
      <div className="ph fu"><div className="ph-title">GitHub Files</div>
        <div className="ph-sub">// browse and edit repository files via GitHub API</div></div>
      <div className="builder-box fu2">
        <div className="field-row">
          <div className="field"><label>Owner</label><input className="finp" value={owner} onChange={e=>setOwner(e.target.value)} placeholder="avinash-as"/></div>
          <div className="field"><label>Repo</label><input className="finp" value={repo} onChange={e=>setRepo(e.target.value)} placeholder="teamai"/></div>
          <div className="field finp-full"><label>Path</label><input className="finp" value={path} onChange={e=>setPath(e.target.value)} placeholder="src/"/></div>
        </div>
        <button className="act-btn act-btn-primary" onClick={listFiles} disabled={loading || !owner || !repo}>
          {loading ? "Loading..." : "List files"}
        </button>
        {status && <div style={{marginTop:8,fontSize:".72rem",color:"var(--muted)",fontFamily:"var(--font-m)"}}>{status}</div>}
      </div>

      <div style={{display:"flex",gap:16,marginTop:16,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:200,maxHeight:400,overflow:"auto",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:12}}>
          <div style={{fontSize:".7rem",fontWeight:800,color:"var(--muted)",marginBottom:8}}>FILES</div>
          {files.map(f => (
            <div key={f.path} onClick={() => f.type === "file" && readFile(f.path)}
              style={{padding:"4px 6px",cursor: f.type==="file"?"pointer":"default",fontSize:".75rem",fontFamily:"var(--font-m)",borderBottom:"1px solid var(--border)",
                color: f.type==="dir" ? "var(--accent)" : "var(--text)"}}>
              {f.type === "dir" ? "📁" : "📄"} {f.name}
            </div>
          ))}
          {files.length === 0 && <div style={{color:"var(--muted)",fontSize:".75rem"}}>No files loaded</div>}
        </div>

        {selectedFile && (
          <div style={{flex:2,minWidth:300}}>
            <div style={{fontSize:".75rem",fontWeight:800,marginBottom:6}}>{selectedFile}</div>
            <textarea className="finp" rows={12} value={editContent} onChange={e=>setEditContent(e.target.value)} style={{fontFamily:"var(--font-m)",fontSize:".75rem"}}/>
            <input className="finp" style={{marginTop:8}} placeholder="Commit message" value={message} onChange={e=>setMessage(e.target.value)}/>
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <button className="act-btn act-btn-primary" onClick={writeFile} disabled={loading}>Commit changes</button>
              <button className="act-btn act-btn-sec" onClick={() => { setEditContent(content); }}>Revert</button>
            </div>
            {content !== editContent && <DiffPreview oldText={content} newText={editContent} fileName={selectedFile}/>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── APP ROOT ───
export default function App() {
  const [splash, setSplash] = useState(true);
  const [user, setUser] = useState(()=>Storage.getSession());
  const [page, setPage] = useState("chat");
  const [team, setTeam] = useState(null);
  const [projects, setProjects] = useState(()=>Storage.getProjects());
  const [customTeams, setCustomTeams] = useState(()=>Storage.getCustomTeams());
  const [openProject, setOpenProject] = useState(null);
  const [theme, setTheme] = useState(()=>Storage.getTheme());

  // Restore a project shared via ?project=... link
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const params = new URLSearchParams(window.location.search);
      const payload = params.get("project");
      if (!payload) return;
      const proj = JSON.parse(decodeURIComponent(payload));
      if (proj && proj.id && proj.results) {
        // persist so it shows up in dashboard too
        const existing = Storage.getProjects().find(p => p.id === proj.id);
        if (!existing) Storage.saveProject(proj);
        setProjects(Storage.getProjects());
        setOpenProject(proj);
        setPage("project");
        // clean the URL
        const url = new URL(window.location.href);
        url.search = "";
        window.history.replaceState({}, "", url.toString());
      }
    } catch {
      // ignore malformed share links
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const css = buildCSS(theme);
  const applyAgentConfigs = (teams) => teams.map(t => ({
    ...t,
    bots: t.bots.map(b => {
      const cfg = Storage.getAgentConfigs()[b.id];
      if (!cfg) return b;
      return { ...b,
        name: cfg.name || b.name,
        role: cfg.role || b.role,
        collaborate: cfg.collaborate || b.collaborate,
        solo: cfg.solo || b.solo,
        enabled: cfg.enabled !== false,
      };
    }),
  }));

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next); Storage.saveTheme(next);
  };

  const saveProject=(p)=>{Storage.saveProject(p);setProjects(Storage.getProjects());};
  const deleteProject=(id)=>{Storage.deleteProject(id);setProjects(Storage.getProjects());};
  const saveCustomTeam=(t)=>{Storage.saveCustomTeam(t);setCustomTeams(Storage.getCustomTeams());};
  const deleteCustomTeam=(id)=>{Storage.deleteCustomTeam(id);setCustomTeams(Storage.getCustomTeams());};

  if (splash) return <Splash onDone={()=>setSplash(false)} css={css}/>;
  if (!user) return <><style>{css}</style><Login onLogin={u=>setUser(u)}/></>;

  return (
    <ErrorBoundary>
    <div className="app">
      <style>{css}</style>
      <div className="grid-bg"/><div className="orb orb1"/><div className="orb orb2"/><div className="orb orb3"/>
      <Sidebar user={user} page={page} setPage={setPage} team={team} projects={projects}
        theme={theme} onToggleTheme={toggleTheme}
        onLogout={()=>{Storage.clearSession();setUser(null);setTeam(null);setPage("teams");}}/>
      <div className="main">
        {page==="chat"&&<ChatPage team={team} teams={applyAgentConfigs([...DEFAULT_TEAMS,...customTeams])} onSelectTeam={t=>{setTeam(t);}} onSaveProject={saveProject}/>}
       {page==="teams"&&<TeamsPage customTeams={customTeams} onSelect={t=>{setTeam(t);setPage("team");}} onDeleteCustom={deleteCustomTeam}/>}
        {page==="team"&&team&&<TeamView team={team} onBack={()=>setPage("teams")} onSaveProject={saveProject}/>}
        {page==="dashboard"&&<Dashboard projects={projects} onOpen={p=>{setOpenProject(p);setPage("project");}} onDelete={deleteProject}/>}
        {page==="project"&&openProject&&<ProjectViewer project={openProject} teams={customTeams} onBack={()=>{setOpenProject(null);setPage("dashboard");}}/>}
        {page==="builder"&&<TeamBuilder onSave={t=>{saveCustomTeam(t);setCustomTeams(Storage.getCustomTeams());}}/>}
       {page==="agents"&&<AgentsPage teams={[...DEFAULT_TEAMS,...customTeams]}/>}
       {page==="providers"&&<ProvidersPage/>}
       {page==="github"&&<GitHubPage/>}
        {page==="profile"&&<ProfilePage user={user} projects={projects} customTeams={customTeams}/>}
      </div>
      <MobileNav page={page} setPage={setPage} team={team} theme={theme} onToggleTheme={toggleTheme}/>
    </div>
    </ErrorBoundary>
  );
}





