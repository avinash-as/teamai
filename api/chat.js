export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured",
      hint: "Add GEMINI_API_KEY in Vercel → Settings → Environment Variables, then redeploy"
    });
  }

  const { system, messages } = req.body || {};

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

  return res.status(500).json({
    error: lastError || "All models failed",
    hint: "Go to aistudio.google.com/app/apikey → click 'Create API key' → choose 'Create API key in NEW project' → paste new key in Vercel → redeploy"
  });
}