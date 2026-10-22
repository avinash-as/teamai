export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const { system, messages } = req.body || {};

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  async function streamText(text) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    const chunkSize = 120;
    for (let i = 0; i < text.length; i += chunkSize) {
      res.write(`data: ${JSON.stringify({ text: text.slice(i, i + chunkSize) })}\n\n`);
      await new Promise(r => setTimeout(r, 12));
    }
    res.write("data: [DONE]\n\n");
    res.end();
  }

  // OpenAI-compatible caller (Groq, OpenRouter)
  async function openaiCompatible(baseUrl, apiKey, model, attempt = 0) {
    const body = {
      model,
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        ...(messages || []).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
      ],
      max_tokens: 2000,
      temperature: 0.7,
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);
    try {
      const r = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`HTTP ${r.status}: ${t.slice(0, 200)}`);
      }
      const data = await r.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("Empty response");
      return text;
    } catch (e) {
      clearTimeout(timer);
      if (attempt < 2) {
        await sleep(1500 * (attempt + 1));
        return openaiCompatible(baseUrl, apiKey, model, attempt + 1);
      }
      throw e;
    }
  }

  // Pollinations free fallback (no key)
  async function freeGenerate(attempt = 0) {
    const msgs = [
      ...(system ? [{ role: "system", content: system }] : []),
      ...(messages || []).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    ];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);
    try {
      const r = await fetch("https://text.pollinations.ai/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs, model: "openai" }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!r.ok) throw new Error(`Free AI HTTP ${r.status}`);
      const text = (await r.text()).trim();
      if (!text) throw new Error("Free AI returned empty response");
      return text;
    } catch (e) {
      clearTimeout(timer);
      if (attempt < 2) {
        await sleep(1500 * (attempt + 1));
        return freeGenerate(attempt + 1);
      }
      throw e;
    }
  }

  // Try providers in order
  const tryProvider = async (name, fn) => {
    try {
      const text = await fn();
      return { ok: true, text };
    } catch (e) {
      return { ok: false, error: `${name}: ${e.message}` };
    }
  };

  // Gemini (streaming-capable, but we collect full text here)
  if (geminiKey) {
    const geminiContents = (messages || []).map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));
    const geminiBody = {
      ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
      contents: geminiContents,
      generationConfig: { maxOutputTokens: 2000, temperature: 0.7 }
    };
    const ATTEMPTS = [
      { version: "v1beta", model: "gemini-2.0-flash-lite" },
      { version: "v1beta", model: "gemini-1.5-flash" },
      { version: "v1", model: "gemini-1.5-flash" },
    ];
    for (const { version, model } of ATTEMPTS) {
      try {
        const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${geminiKey}`;
        const geminiRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiBody),
        });
        const data = await geminiRes.json();
        if (geminiRes.ok) {
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) return streamText(text);
        }
        if (geminiRes.status === 400 && data.error?.message?.includes("API key not valid")) {
          return res.status(403).json({ error: "Invalid Gemini API key", hint: "Check GEMINI_API_KEY" });
        }
      } catch {
        // try next
      }
    }
  }

  // Groq (free tier, fast)
  if (groqKey) {
    const r = await tryProvider("groq", () => openaiCompatible("https://api.groq.com/openai/v1", groqKey, "llama-3.3-70b-versatile"));
    if (r.ok) return streamText(r.text);
  }

  // OpenRouter (free models)
  if (openrouterKey) {
    const r = await tryProvider("openrouter", () => openaiCompatible("https://openrouter.ai/api/v1", openrouterKey, "meta-llama/llama-3.3-70b-instruct:free"));
    if (r.ok) return streamText(r.text);
  }

  // Pollinations (no key, always available)
  try {
    const text = await freeGenerate();
    return streamText(text);
  } catch (e) {
    return res.status(500).json({ error: e.message, hint: "All AI providers failed. Add GEMINI_API_KEY or GROQ_API_KEY for better results." });
  }
}