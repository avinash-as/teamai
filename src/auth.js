const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export function getToken() { try { return localStorage.getItem("teamai_token"); } catch (e) { void e; return null; } }
export function setToken(t) { try { localStorage.setItem("teamai_token", t); } catch (e) { void e; } }
export function clearToken() { try { localStorage.removeItem("teamai_token"); } catch (e) { void e; } }

async function request(path, opts = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function register(email, password, name) {
  const data = await request("/auth/register", { method: "POST", body: JSON.stringify({ email, password, name }) });
  if (data.token) setToken(data.token);
  return data;
}

export async function login(email, password) {
  const data = await request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  if (data.token) setToken(data.token);
  return data;
}

export async function me() {
  return request("/auth/me");
}

export async function logout() {
  clearToken();
}

export async function fetchProjects() {
  return request("/projects");
}

export async function createProject(name, description) {
  return request("/projects", { method: "POST", body: JSON.stringify({ name, description }) });
}
