// Ollama local model integration (proxy to avoid CORS)
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const baseUrl = (req.body?.baseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, "");

  // Action: list models
  if (req.method === "GET" || req.body?.action === "list") {
    try {
      const r = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const models = (data.models || []).map(m => ({
        name: m.name,
        size: m.size,
        modified: m.modified_at,
        family: m.details?.family,
        parameterSize: m.details?.parameter_size,
      }));
      return res.status(200).json({ connected: true, baseUrl, models });
    } catch (e) {
      return res.status(200).json({ connected: false, baseUrl, models: [], error: e.message });
    }
  }

  // Action: generate (streaming collected)
  if (req.method === "POST" && (req.body?.action === "generate" || req.body?.prompt)) {
    const { model, prompt, system } = req.body;
    if (!model || !prompt) return res.status(400).json({ error: "model and prompt required" });
    try {
      const r = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt, system, stream: false }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      return res.status(200).json({ response: data.response, model, done: data.done });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Action: chat (OpenAI-compatible)
  if (req.method === "POST" && req.body?.action === "chat") {
    const { model, messages } = req.body;
    try {
      const r = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, stream: false }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      return res.status(200).json({ message: data.message, model, done: data.done });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: "Unknown action. Use GET/list, POST generate, or POST chat." });
}