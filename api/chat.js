import { callModel } from "./_providers.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { system, messages } = req.body || {};

  function streamText(text) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    const chunkSize = 120;
    for (let i = 0; i < text.length; i += chunkSize) {
      res.write(`data: ${JSON.stringify({ text: text.slice(i, i + chunkSize) })}\n\n`);
    }
    res.write("data: [DONE]\n\n");
    res.end();
  }

  try {
    const { text, provider } = await callModel(system, messages, { maxTokens: 2000 });
    res.setHeader("X-AI-Provider", provider);
    return streamText(text);
  } catch (e) {
    return streamText(`⚠️ All AI providers are temporarily unavailable (${e.message}).\n\nAdd GEMINI_API_KEY or GROQ_API_KEY to .env for a more reliable experience.`);
  }
}
