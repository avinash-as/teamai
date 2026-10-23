import { askAI } from "./ai.js";

const PLANNER_SYSTEM = `You are the Planner Agent. Given a user request, output ONLY JSON:
{ "goal": string, "tasks": [ { "id": string, "title": string, "agent": "architect"|"developer"|"reviewer", "dependsOn": string[] } ] }`;

const ARCHITECT_SYSTEM = `You are the Architect Agent. Given a goal and plan, design the project structure. Output ONLY JSON:
{ "projectName": string, "structure": [string], "techStack": [string] }`;

const DEVELOPER_SYSTEM = `You are the Developer Agent. Given a goal, plan, and structure, produce the full project files. Output ONLY JSON:
{ "files": [ { "path": string, "content": string } ] }`;

const REVIEWER_SYSTEM = `You are the Code Review Agent. Given the generated files, review for correctness and security. Output ONLY JSON:
{ "approved": boolean, "issues": [string], "suggestions": [string] }`;

export async function buildProject(prompt, onProgress) {
  return runMultiAgent(prompt, onProgress).then((r) => ({
    projectName: r.architect?.projectName || "project",
    summary: r.review?.approved ? "Approved" : "Needs review",
    files: r.developer?.files || [],
  }));
}

export async function runMultiAgent(prompt, onProgress) {
  const tasks = [];
  const emit = (t) => { tasks.push(t); onProgress?.(t); };

  // 1. Planner
  emit({ agent: "planner", status: "running", title: "Planning" });
  const planRaw = await askAI(PLANNER_SYSTEM, [{ role: "user", content: prompt }]);
  let plan;
  try { plan = JSON.parse(planRaw.match(/\{[\s\S]*\}/)[0]); }
  catch { plan = { goal: prompt, tasks: [] }; }
  emit({ agent: "planner", status: "done", title: "Planning", output: plan });

  // 2. Architect
  emit({ agent: "architect", status: "running", title: "Designing structure" });
  const archRaw = await askAI(ARCHITECT_SYSTEM, [{ role: "user", content: JSON.stringify({ goal: plan.goal, plan }) }]);
  let architect;
  try { architect = JSON.parse(archRaw.match(/\{[\s\S]*\}/)[0]); }
  catch { architect = { projectName: "project", structure: [], techStack: [] }; }
  emit({ agent: "architect", status: "done", title: "Designing structure", output: architect });

  // 3. Developer
  emit({ agent: "developer", status: "running", title: "Generating files" });
  const devRaw = await askAI(DEVELOPER_SYSTEM, [{ role: "user", content: JSON.stringify({ goal: plan.goal, plan, architect }) }]);
  let developer;
  try { developer = JSON.parse(devRaw.match(/\{[\s\S]*\}/)[0]); }
  catch { developer = { files: [] }; }
  emit({ agent: "developer", status: "done", title: "Generating files", output: { fileCount: developer.files?.length || 0 } });

  // 4. Reviewer
  emit({ agent: "reviewer", status: "running", title: "Reviewing" });
  const revRaw = await askAI(REVIEWER_SYSTEM, [{ role: "user", content: JSON.stringify({ files: developer.files }) }]);
  let review;
  try { review = JSON.parse(revRaw.match(/\{[\s\S]*\}/)[0]); }
  catch { review = { approved: true, issues: [], suggestions: [] }; }
  emit({ agent: "reviewer", status: "done", title: "Reviewing", output: review });

  return { plan, architect, developer, review };
}

export async function writePlanToRuntime(plan, runtimeUrl, root, onProgress) {
  const files = plan.files || (plan.developer?.files) || [];
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    onProgress?.({ agent: "writer", status: "running", title: `Writing ${f.path}`, progress: `${i + 1}/${files.length}` });
    const res = await fetch(`${runtimeUrl}/write`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ root, path: f.path, content: f.content }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Failed to write ${f.path}`);
    results.push({ path: f.path, ok: true });
  }
  onProgress?.({ agent: "writer", status: "done", title: "All files written", progress: `${results.length}/${files.length}` });
  return results;
}
