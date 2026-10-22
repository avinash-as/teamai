import http from "node:http";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";

const PORT = 3001;

async function loadHandler(name) {
  const mod = await import(pathToFileURL(path.resolve("api", name + ".js")).href);
  return mod.default;
}

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith("/api/")) {
    res.statusCode = 404; res.end("Not found"); return;
  }
  const name = req.url.replace("/api/", "").split("?")[0].replace(/\.js$/, "");
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", async () => {
    try {
      const handler = await loadHandler(name);
      const parsed = body ? JSON.parse(body) : {};
      const q = Object.fromEntries(new URL(req.url, "http://x").searchParams);
      const fakeReq = { method: req.method, headers: req.headers, body: parsed, query: q };
      const fakeRes = {
        statusCode: 200,
        headers: {},
        setHeader(k, v) { this.headers[k] = v; },
        status(c) { this.statusCode = c; return this; },
        json(obj) { this._body = JSON.stringify(obj); this.end(); },
        end() { this._ended = true; },
        write(chunk) { this._body = (this._body || "") + chunk; },
      };
      await handler(fakeReq, fakeRes);
      res.statusCode = fakeRes.statusCode;
      Object.entries(fakeRes.headers).forEach(([k, v]) => res.setHeader(k, v));
      res.end(fakeRes._body || "");
    } catch (e) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(PORT, () => console.log(`Dev API server on http://127.0.0.1:${PORT}`));