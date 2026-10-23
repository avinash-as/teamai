// TeamAI Local Runtime
// A small companion server that gives the web app safe access to a selected
// local workspace: file listing/reading/writing, approved command execution,
// and opening the project in a supported code editor.
//
// Start with: npm run runtime   (or: node runtime/server.mjs)
// Default port: 3002

import http from "node:http";
import { URL } from "node:url";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const PORT = process.env.RUNTIME_PORT ? Number(process.env.RUNTIME_PORT) : 3002;

const ALLOWED_EDITORS = {
  vscode: "code",
  "vscode-insiders": "code-insiders",
  cursor: "cursor",
  windsurf: "windsurf",
};

// Only these command "heads" may be executed by /run
const ALLOWED_COMMANDS = new Set([
  "npm", "npx", "node", "python", "python3", "pytest", "pip", "git",
  "ls", "dir", "cat", "echo", "tsc", "vite", "vitest", "eslint",
]);

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(data));
}

function safePath(root, rel) {
  if (!root || !path.isAbsolute(root)) throw new Error("root must be an absolute path");
  const base = path.resolve(root);
  const target = path.resolve(base, rel || "");
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new Error("path traversal not allowed");
  }
  return target;
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  try { return body ? JSON.parse(body) : {}; } catch { return {}; }
}

function parseCommandHead(cmd) {
  const trimmed = String(cmd || "").trim();
  if (!trimmed) return null;
  // handle simple "cd x && cmd" not allowed; only single command head
  const first = trimmed.split(/\s+/)[0];
  return first.replace(/^.*[\\/]/, "");
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") { send(res, 204, {}); return; }
  const url = new URL(req.url, `http://localhost:${PORT}`);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      send(res, 200, { ok: true, port: PORT });
      return;
    }

    if (req.method === "GET" && url.pathname === "/ls") {
      const root = url.searchParams.get("root");
      const rel = url.searchParams.get("path") || "";
      const target = safePath(root, rel);
      const entries = await fsp.readdir(target, { withFileTypes: true });
      const list = entries.map((e) => ({
        name: e.name,
        type: e.isDirectory() ? "dir" : "file",
        path: path.join(rel, e.name).replace(/\\/g, "/"),
      }));
      send(res, 200, { path: rel, entries: list });
      return;
    }

    if (req.method === "GET" && url.pathname === "/read") {
      const root = url.searchParams.get("root");
      const rel = url.searchParams.get("path") || "";
      const target = safePath(root, rel);
      const stat = await fsp.stat(target);
      if (!stat.isFile()) throw new Error("not a file");
      const content = await fsp.readFile(target, "utf8");
      send(res, 200, { path: rel, content });
      return;
    }

    if (req.method === "POST" && url.pathname === "/write") {
      const { root, path: rel, content } = await readBody(req);
      const target = safePath(root, rel);
      await fsp.mkdir(path.dirname(target), { recursive: true });
      await fsp.writeFile(target, content ?? "", "utf8");
      send(res, 200, { ok: true, path: rel });
      return;
    }

    if (req.method === "POST" && url.pathname === "/run") {
      const { root, command } = await readBody(req);
      const base = safePath(root, "");
      const head = parseCommandHead(command);
      if (!head || !ALLOWED_COMMANDS.has(head.toLowerCase())) {
        send(res, 403, { error: `Command not allowed: ${head}` });
        return;
      }
      const { stdout, stderr } = await execAsync(command, {
        cwd: base,
        timeout: 120000,
        maxBuffer: 1024 * 1024,
      });
      send(res, 200, { ok: true, stdout, stderr });
      return;
    }

    if (req.method === "POST" && url.pathname === "/open") {
      const { root, path: rel, editor } = await readBody(req);
      const target = safePath(root, rel || "");
      const cmd = ALLOWED_EDITORS[editor || "vscode"] || "code";
      const child = spawn(cmd, [target], { detached: true, stdio: "ignore", shell: true });
      child.unref();
      send(res, 200, { ok: true, editor: cmd, path: target });
      return;
    }

    send(res, 404, { error: "not found" });
  } catch (e) {
    send(res, 500, { error: e && e.message ? e.message : String(e) });
  }
});

server.listen(PORT, () => {
  console.log(`TeamAI runtime listening on http://localhost:${PORT}`);
});
