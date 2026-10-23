// Provider abstraction for TeamAI.
// Supports Gemini, Groq, OpenRouter, Ollama, and Pollinations (free fallback).
// Keeps all credentials server-side and offers retries + fallback.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// In-memory usage counters (per process). Replace with Redis/DB for production.
const usage = { calls: 0, byProvider: {} };
function record(provider) {
  usage.calls += 1;
  usage.byProvider[provider] = (usage.byProvider[provider] || 0) + 1;
}

async function withRetry(fn, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      if (i < attempts - 1) await sleep(800 * (i + 1));
    }
  }
  throw lastErr;
}

async function openaiCompatible(baseUrl, apiKey, model, system, messages, opts) {
  const body = {
    model,
    messages: [
      ...(system ? [{ role: "system", content: system }] : []),
      ...(messages || []).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    ],
    max_tokens: opts?.maxTokens || 2000,
    temperature: opts?.temperature ?? 0.7,
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  try {
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
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
  } finally {
    clearTimeout(timer);
  }
}

const providers = [
  {
    name: "gemini",
    available: () => !!process.env.GEMINI_API_KEY,
    call: async (system, messages, opts) => {
      const key = process.env.GEMINI_API_KEY;
      const geminiContents = (messages || []).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
      const geminiBody = {
        ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
        contents: geminiContents,
        generationConfig: { maxOutputTokens: opts?.maxTokens || 2000, temperature: opts?.temperature ?? 0.7 },
      };
      const ATTEMPTS = [
        { version: "v1beta", model: "gemini-2.0-flash-lite" },
        { version: "v1beta", model: "gemini-1.5-flash" },
        { version: "v1", model: "gemini-1.5-flash" },
      ];
      for (const { version, model } of ATTEMPTS) {
        const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${key}`;
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiBody),
        });
        const data = await r.json();
        if (r.ok) {
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) return text;
        }
        if (r.status === 400 && data.error?.message?.includes("API key not valid")) {
          throw new Error("Invalid Gemini API key");
        }
      }
      throw new Error("Gemini: all model attempts failed");
    },
  },
  {
    name: "groq",
    available: () => !!process.env.GROQ_API_KEY,
    call: (system, messages, opts) =>
      openaiCompatible("https://api.groq.com/openai/v1", process.env.GROQ_API_KEY, "llama-3.3-70b-versatile", system, messages, opts),
  },
  {
    name: "openrouter",
    available: () => !!process.env.OPENROUTER_API_KEY,
    call: (system, messages, opts) =>
      openaiCompatible("https://openrouter.ai/api/v1", process.env.OPENROUTER_API_KEY, "meta-llama/llama-3.3-70b-instruct:free", system, messages, opts),
  },
  {
    name: "ollama",
    available: () => !!process.env.OLLAMA_BASE_URL,
    call: async (system, messages, opts) => {
      const baseUrl = (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, "");
      const body = {
        model: opts?.model || "llama3.1",
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          ...(messages || []).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
        ],
        stream: false,
      };
      const r = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`Ollama HTTP ${r.status}`);
      const data = await r.json();
      const text = data.message?.content?.trim();
      if (!text) throw new Error("Ollama empty response");
      return text;
    },
  },
  {
    name: "pollinations",
    available: () => true,
    call: async (system, messages) => {
      const msgs = [
        ...(system ? [{ role: "system", content: system }] : []),
        ...(messages || []).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
      ];
      const r = await fetch("https://text.pollinations.ai/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs, model: "openai" }),
      });
      if (!r.ok) throw new Error(`Free AI HTTP ${r.status}`);
      const text = (await r.text()).trim();
      if (!text) throw new Error("Free AI empty response");
      return text;
    },
  },
];

export async function callModel(system, messages, opts = {}) {
  const available = providers.filter((p) => p.available());
  const errors = [];
  for (const p of available) {
    try {
      const text = await withRetry(() => p.call(system, messages, opts), opts.retries ?? 2);
      record(p.name);
      return { text, provider: p.name };
    } catch (e) {
      errors.push(`${p.name}: ${e.message}`);
    }
  }
  throw new Error(`All providers failed:\n${errors.join("\n")}`);
}

export function getUsage() {
  return { ...usage };
}

export function listProviders() {
  return providers.map((p) => ({ name: p.name, available: p.available() }));
}
