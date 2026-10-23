const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export async function buildProjectViaBackend(prompt, onProgress) {
  const token = localStorage.getItem("teamai_token");
  const res = await fetch(`${API_BASE}/build`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const data = t.slice(5).trim();
      if (!data) continue;
      try {
        const obj = JSON.parse(data);
        if (obj.type === "progress") onProgress?.(`${obj.agent}: ${obj.title} (${obj.status})`);
        if (obj.type === "result") result = obj;
        if (obj.type === "error") throw new Error(obj.message);
      } catch (e) {
        if (e && e.message && !e.message.startsWith("Unexpected")) throw e;
      }
    }
  }
  if (!result) throw new Error("No result from backend");
  return { projectName: result.projectName, summary: result.review?.approved ? "Approved" : "Needs review", files: result.files || [] };
}
