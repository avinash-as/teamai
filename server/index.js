require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

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

app.get("/health", (req, res) => res.json({ ok: true }));

// Auth
app.post("/auth/register", async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });
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

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
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
  const { name, description } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });
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

initDb().then(() => {
  app.listen(PORT, () => console.log(`TeamAI API server listening on http://localhost:${PORT}`));
}).catch((e) => {
  console.error("DB init failed:", e.message);
  process.exit(1);
});
