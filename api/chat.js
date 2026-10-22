export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  const { system, messages } = req.body || {};

  // Free fallback (no key required): Pollinations.ai text generation
  async function freeGenerate(sys, msgs, attempt = 0) {
    const messages = [];
    if (sys) messages.push({ role: "system", content: sys });
    (msgs || []).forEach(m => messages.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);
    try {
      const r = await fetch("https://text.pollinations.ai/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, model: "openai" }),
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
        await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
        return freeGenerate(sys, msgs, attempt + 1);
      }
      throw e;
    }
  }

  async function streamText(text) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    // Stream in small chunks to feel live
    const chunkSize = 120;
    for (let i = 0; i < text.length; i += chunkSize) {
      res.write(`data: ${JSON.stringify({ text: text.slice(i, i + chunkSize) })}\n\n`);
      await new Promise(r => setTimeout(r, 12));
    }
    res.write("data: [DONE]\n\n");
    res.end();
  }

  if (!apiKey) {
    try {
      const text = await freeGenerate(system, messages);
      return streamText(text || "No response received.");
    } catch (e) {
      return res.status(500).json({ error: e.message, hint: "Free AI fallback failed. Add GEMINI_API_KEY for better results." });
    }
  }

  const geminiContents = (messages || []).map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  const body = {
    ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
    contents: geminiContents,
    generationConfig: { maxOutputTokens: 2000, temperature: 0.7 }
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const ATTEMPTS = [
    { version: "v1beta", model: "gemini-2.0-flash-lite" },
    { version: "v1beta", model: "gemini-1.5-flash" },
    { version: "v1",     model: "gemini-1.5-flash" },
    { version: "v1beta", model: "gemini-1.5-flash-8b" },
    { version: "v1",     model: "gemini-1.5-flash-8b" },
    { version: "v1",     model: "gemini-pro" },
  ];

  let lastError = "";

  for (const { version, model } of ATTEMPTS) {
    try {
      const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
      const geminiRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!geminiRes.ok) {
        const data = await geminiRes.json().catch(() => ({}));
        const errMsg = data.error?.message || `HTTP ${geminiRes.status}`;
        lastError = errMsg;

        if (geminiRes.status === 400 && errMsg.includes("API key not valid")) {
          return res.status(403).json({
            error: "Invalid API key",
            hint: "Your GEMINI_API_KEY is wrong. Go to aistudio.google.com/app/apikey → Create API key in new project → update in Vercel env vars → redeploy"
          });
        }
        if (geminiRes.status === 404 || geminiRes.status === 429) {
          await sleep(300);
          continue;
        }
        continue;
      }

      // Stream proxy: transform Gemini SSE into our own SSE format
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const reader = geminiRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                res.write(`data: ${JSON.stringify({ text })}\n\n`);
              }
              if (parsed.error?.message) {
                lastError = parsed.error.message;
              }
            } catch {
              // ignore malformed chunk
            }
          }
        }
      } catch (e) {
        lastError = e.message;
      }

      res.write("data: [DONE]\n\n");
      return res.end();
    } catch (e) {
      lastError = e.message;
      continue;
    }
  }

  // All Gemini models failed - try free fallback
  try {
    const text = await freeGenerate(system, messages);
    return streamText(text || "No response received.");
  } catch (e) {
    lastError = lastError || e.message;
  }

  return res.status(500).json({
    error: lastError || "All models failed",
    hint: "Go to aistudio.google.com/app/apikey → click 'Create API key' → choose 'Create API key in NEW project' → paste new key in Vercel → redeploy"
  });
}