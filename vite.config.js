import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function apiDevPlugin() {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const urlPath = (req.url || '').split('?')[0];
        if (!urlPath.startsWith('/api/')) return next();
        const name = urlPath.replace(/^\/api\//, '').replace(/\/$/, '');
        if (!name || name.includes('..') || name.includes('/')) return next();
        // Vercel provides Express-like helpers on res; shim them for Vite dev.
        if (typeof res.status !== 'function') {
          res.status = (code) => { res.statusCode = code; return res; };
        }
        if (typeof res.json !== 'function') {
          res.json = (obj) => {
            if (!res.getHeader || !res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(obj));
            return res;
          };
        }
        if (typeof res.send !== 'function') {
          res.send = (data) => { res.end(typeof data === 'string' ? data : JSON.stringify(data)); return res; };
        }
        try {
          const mod = await import(`./api/${name}.js`);
          const handler = mod && (mod.default || mod);
          if (typeof handler !== 'function') {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `No default export for /api/${name}` }));
            return;
          }
          let body = '';
          req.on('data', (c) => { body += c; });
          req.on('end', async () => {
            try { req.body = body ? JSON.parse(body) : {}; }
            catch { req.body = {}; }
            try { await handler(req, res); }
            catch (e) {
              if (!res.headersSent) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: e && e.message ? e.message : String(e) }));
              } else {
                try { res.end(); } catch (e) { void e; }
              }
            }
          });
        } catch (e) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: e && e.message ? e.message : String(e) }));
        }
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [
    apiDevPlugin(),
    react(),
    VitePWA({
      devOptions: { enabled: false },
      registerType: 'autoUpdate',
      manifest: {
        name: 'TeamAI - Your AI Powered Team',
        short_name: 'TeamAI',
        description: 'Your AI-powered team, on demand',
        theme_color: '#080c10',
        background_color: '#080c10',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})