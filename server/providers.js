const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, attempts = 2) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (e) { lastErr = e; if (i < attempts - 1) await sleep(800 * (i + 1)); }
  }
  throw lastErr;
}

async function openaiCompatible(baseUrl, apiKey, model, system, messages) {
  const body = {
    model,
    messages: [
      ...(system ? [{ role: "system", content: system }] : []),
      ...(messages || []).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    ],
    max_tokens: 2000,
    temperature: 0.7,
  };
  const r = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty response");
  return text;
}

const providers = [
  { name: "gemini", available: () => !!process.env.GEMINI_API_KEY, call: async (system, messages) => {
      const key = process.env.GEMINI_API_KEY;
      const contents = (messages || []).map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
      const body = { ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}), contents, generationConfig: { maxOutputTokens: 2000, temperature: 0.7 } };
      for (const { version, model } of [{ version: "v1beta", model: "gemini-2.0-flash-lite" }, { version: "v1beta", model: "gemini-1.5-flash" }]) {
        const r = await fetch(`https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${key}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        const data = await r.json();
        if (r.ok) { const t = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim(); if (t) return t; }
      }
      throw new Error("Gemini failed");
    } },
  { name: "groq", available: () => !!process.env.GROQ_API_KEY, call: (s, m) => openaiCompatible("https://api.groq.com/openai/v1", process.env.GROQ_API_KEY, "llama-3.3-70b-versatile", s, m) },
  { name: "openrouter", available: () => !!process.env.OPENROUTER_API_KEY, call: (s, m) => openaiCompatible("https://openrouter.ai/api/v1", process.env.OPENROUTER_API_KEY, "meta-llama/llama-3.3-70b-instruct:free", s, m) },
  { name: "pollinations", available: () => true, call: async (system, messages) => {
      const msgs = [...(system ? [{ role: "system", content: system }] : []), ...(messages || []).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }))];
      const r = await fetch("https://text.pollinations.ai/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: msgs, model: "openai" }) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const t = (await r.text()).trim();
      if (!t) throw new Error("Empty");
      return t;
    } },
];

async function callModel(system, messages) {
  const errs = [];
  for (const p of providers.filter((x) => x.available())) {
    try { return { text: await withRetry(() => p.call(system, messages), 2), provider: p.name }; }
    catch (e) { errs.push(`${p.name}: ${e.message}`); }
  }
  throw new Error(errs.join("\n"));
}

export { callModel };