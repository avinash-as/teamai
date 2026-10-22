// GitHub integration: read/write files in a repo using a PAT (server-side only)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function gh(path, opts = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(data?.message || `GitHub HTTP ${res.status}`);
  return data;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!GITHUB_TOKEN) return res.status(503).json({ error: "GITHUB_TOKEN not configured" });

  const { action, owner, repo, path, content, message, branch } = req.body || {};
  if (!owner || !repo) return res.status(400).json({ error: "owner and repo required" });

  try {
    if (action === "read") {
      const data = await gh(`/repos/${owner}/${repo}/contents/${path}?ref=${branch || "main"}`);
      const decoded = data.content ? Buffer.from(data.content, "base64").toString("utf8") : null;
      return res.status(200).json({ content: decoded, sha: data.sha });
    }
    if (action === "write") {
      // get current sha if file exists
      let sha;
      try { const cur = await gh(`/repos/${owner}/${repo}/contents/${path}?ref=${branch || "main"}`); sha = cur.sha; } catch { /* file may not exist */ }
      const body = {
        message: message || `Update ${path} via TeamAI`,
        content: Buffer.from(content || "").toString("base64"),
        branch: branch || "main",
        ...(sha ? { sha } : {}),
      };
      const data = await gh(`/repos/${owner}/${repo}/contents/${path}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.status(200).json({ commit: data.commit?.sha, path: data.content?.path });
    }
    if (action === "list") {
      const data = await gh(`/repos/${owner}/${repo}/contents/${path || ""}?ref=${branch || "main"}`);
      return res.status(200).json({ files: Array.isArray(data) ? data.map(f => ({ name: f.name, path: f.path, type: f.type, size: f.size })) : [data] });
    }
    return res.status(400).json({ error: "Unknown action. Use read|write|list" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}