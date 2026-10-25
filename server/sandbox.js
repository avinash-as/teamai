import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

let Sandbox = null;
try { Sandbox = require("@e2b/code-interpreter").Sandbox; } catch { Sandbox = null; }

async function runInSandbox(code, language = "python") {
  if (!process.env.E2B_API_KEY || !Sandbox) {
    return { ok: false, error: "E2B not configured. Set E2B_API_KEY and install @e2b/code-interpreter." };
  }
  const sandbox = await Sandbox.create({ apiKey: process.env.E2B_API_KEY });
  try {
    const exec = await sandbox.runCode(code, { language });
    return { ok: true, stdout: exec.text, stderr: exec.error?.value || "", results: exec.results };
  } finally {
    await sandbox.kill();
  }
}

export { runInSandbox };
export const available = () => !!process.env.E2B_API_KEY && !!Sandbox;