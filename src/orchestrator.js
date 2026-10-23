import { askAI } from "./ai.js";

const PLANNER_SYSTEM = `You are the TeamAI Planner+Developer agent.
Given a user request, produce a complete, working project as JSON ONLY.
Output format (no markdown, no prose, just JSON):
{
  "projectName": "string",
  "summary": "string",
  "files": [ { "path": "relative/path.ext", "content": "full file content" } ]
}
Rules:
- Include all files needed to run the project.
- Use relative paths with forward slashes.
- Provide full file contents, not snippets.
- Prefer simple, runnable projects (HTML/CSS/JS or Node) unless asked otherwise.
- No extra commentary outside JSON.`;

export async function buildProject(prompt, onProgress) {
  onProgress?.("Planning with AI...");
  const raw = await askAI(PLANNER_SYSTEM, [{ role: "user", content: prompt }]);
  onProgress?.("Parsing plan...");
  let plan;
  try {
    // extract JSON if wrapped
    const match = raw.match(/\{[\s\S]*\}/);
    plan = JSON.parse(match ? match[0] : raw);
  } catch (e) {
    throw new Error("AI did not return valid JSON: " + e.message);
  }
  if (!plan.files || !Array.isArray(plan.files)) throw new Error("Plan has no files");
  return plan;
}

export async function writePlanToRuntime(plan, runtimeUrl, root, onProgress) {
  const results = [];
  for (let i = 0; i < plan.files.length; i++) {
    const f = plan.files[i];
    onProgress?.(`Writing ${f.path} (${i + 1}/${plan.files.length})...`);
    const res = await fetch(`${runtimeUrl}/write`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ root, path: f.path, content: f.content }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Failed to write ${f.path}`);
    results.push({ path: f.path, ok: true });
  }
  return results;
}
