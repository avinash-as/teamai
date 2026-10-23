require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { callModel } = require("./providers.js");
const { runInSandbox, available: sandboxAvailable } = require("./sandbox.js");

const app = express();
app.use(cors());
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

const PORT = process.env.SERVER_PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title TEXT,
      messages JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log("DB schema ready");
}

function authMiddleware(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

app.get("/health", async (req, res) => {
  try { await pool.query("SELECT 1"); res.json({ ok: true, db: "connected" }); }
  catch (e) { res.status(503).json({ ok: false, db: "disconnected", error: e.message }); }
});

// Auth
const registerSchema = z.object({ email: z.string().email(), password: z.string().min(6), name: z.string().optional() });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const projectSchema = z.object({ name: z.string().min(1), description: z.string().optional() });

app.post("/auth/register", authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { email, password, name } = parsed.data;
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      "INSERT INTO users (email, password_hash, name) VALUES ($1,$2,$3) RETURNING id,email,name",
      [email, hash, name || email.split("@")[0]]
    );
    const user = rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ user, token });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Email already registered" });
    res.status(500).json({ error: e.message });
  }
});

app.post("/auth/login", authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { email, password } = parsed.data;
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/auth/me", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id,email,name,created_at FROM users WHERE id=$1", [req.user.id]);
    res.json({ user: rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Projects
app.get("/projects", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM projects WHERE user_id=$1 ORDER BY updated_at DESC", [req.user.id]);
    res.json({ projects: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/projects", authMiddleware, async (req, res) => {
  const parsed = projectSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { name, description } = parsed.data;
  try {
    const { rows } = await pool.query(
      "INSERT INTO projects (user_id,name,description) VALUES ($1,$2,$3) RETURNING *",
      [req.user.id, name, description || ""]
    );
    res.json({ project: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/projects/:id", authMiddleware, async (req, res) => {
  try {
    await pool.query("DELETE FROM projects WHERE id=$1 AND user_id=$2", [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Multi-agent build endpoint (SSE)
app.post("/build", authMiddleware, async (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "prompt required" });
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  const extract = (raw) => { const m = raw.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : null; };

  try {
    send({ type: "progress", agent: "planner", status: "running", title: "Planning" });
    const planRaw = await callModel("You are the Planner Agent. Output ONLY JSON: { \"goal\": string, \"tasks\": [] }", [{ role: "user", content: prompt }]);
    const plan = extract(planRaw) || { goal: prompt, tasks: [] };
    send({ type: "progress", agent: "planner", status: "done", title: "Planning", output: plan });

    send({ type: "progress", agent: "architect", status: "running", title: "Designing structure" });
    const archRaw = await callModel("You are the Architect Agent. Output ONLY JSON: { \"projectName\": string, \"structure\": [string], \"techStack\": [string] }", [{ role: "user", content: JSON.stringify({ goal: plan.goal }) }]);
    const architect = extract(archRaw) || { projectName: "project", structure: [], techStack: [] };
    send({ type: "progress", agent: "architect", status: "done", title: "Designing structure", output: architect });

    send({ type: "progress", agent: "developer", status: "running", title: "Generating files" });
    const devRaw = await callModel("You are the Developer Agent. Output ONLY JSON: { \"files\": [ { \"path\": string, \"content\": string } ] }", [{ role: "user", content: JSON.stringify({ goal: plan.goal, architect }) }]);
    const developer = extract(devRaw) || { files: [] };
    send({ type: "progress", agent: "developer", status: "done", title: "Generating files", output: { fileCount: developer.files?.length || 0 } });

    send({ type: "progress", agent: "reviewer", status: "running", title: "Reviewing" });
    const revRaw = await callModel("You are the Code Review Agent. Output ONLY JSON: { \"approved\": boolean, \"issues\": [string], \"suggestions\": [string] }", [{ role: "user", content: JSON.stringify({ files: developer.files }) }]);
    const review = extract(revRaw) || { approved: true, issues: [], suggestions: [] };
    send({ type: "progress", agent: "reviewer", status: "done", title: "Reviewing", output: review });

    send({ type: "result", projectName: architect.projectName, files: developer.files || [], review });
    res.end();
  } catch (e) {
    send({ type: "error", message: e.message });
    res.end();
  }
});

// Sandbox endpoint
app.post("/sandbox/run", authMiddleware, async (req, res) => {
  const { code, language } = req.body || {};
  if (!code) return res.status(400).json({ error: "code required" });
  if (!sandboxAvailable()) return res.status(503).json({ error: "E2B not configured" });
  try {
    const result = await runInSandbox(code, language);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/sandbox/status", (req, res) => res.json({ available: sandboxAvailable() }));

// Centralized error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

initDb().then(() => {
  app.listen(PORT, () => console.log(`TeamAI API server listening on http://localhost:${PORT}`));
}).catch((e) => {
  console.error("DB init failed:", e.message);
  process.exit(1);
});
