import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Detect opencode installation
  if (req.method === "GET" || req.body?.action === "detect") {
    try {
      const { stdout } = await execAsync("opencode --version", { timeout: 5000 });
      return res.status(200).json({ installed: true, version: stdout.trim() });
    } catch (e) {
      return res.status(200).json({ installed: false, error: e.message, hint: "Install from https://opencode.ai" });
    }
  }

  // Run a task (local only - requires opencode binary)
  if (req.method === "POST" && req.body?.action === "run") {
    const { task, cwd, model } = req.body;
    if (!task) return res.status(400).json({ error: "task required" });
    try {
      const args = ["run", task];
      if (model) args.push("--model", model);
      const { stdout, stderr } = await execAsync("opencode " + args.map(a => JSON.stringify(a)).join(" "), {
        cwd: cwd || process.cwd(),
        timeout: 300000,
        maxBuffer: 10 * 1024 * 1024,
      });
      return res.status(200).json({ ok: true, stdout, stderr });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message, stdout: e.stdout, stderr: e.stderr });
    }
  }

  return res.status(400).json({ error: "Unknown action. Use GET/detect or POST/run." });
}