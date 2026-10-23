# TeamAI — Multi-Agent AI Coding Platform

A ChatGPT-style AI development platform that plans, generates, and modifies real projects in a local workspace.

## Quick Start

```bash
npm install
npm run dev          # web app -> http://localhost:5173
npm run runtime      # local file/command/editor runtime -> http://localhost:3002 (optional)
```

## Features
- ChatGPT-style home screen with prompt input and suggestions.
- Real AI responses via /api/chat (Pollinations free fallback; add GEMINI_API_KEY/GROQ_API_KEY for better quality).
- Local Workspace: browse, edit, save, run commands, open in VS Code/Cursor/Windsurf via the runtime.
- AI-driven project build: describe an app, TeamAI generates files into your selected workspace.

## Architecture
- Frontend: Vite + React (src/)
- Serverless API: /api/* (Vercel-compatible), served in dev by Vite middleware.
- Local runtime: runtime/server.mjs (Node, port 3002) for filesystem/command/editor access.
- AI client: src/ai.js, orchestrator: src/orchestrator.js.

## Environment Variables
Copy .env.example to .env. Optional:
- GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (for persistence)
- GITHUB_TOKEN (for GitHub file browsing)

## Security
- Runtime restricts paths to the selected workspace root (no traversal).
- Only allowlisted commands can run.
- Secrets stay server-side.

## Known Limitations
- Full multi-agent orchestration and auth are foundational; extend src/orchestrator.js.
- Monaco editor not yet integrated (textarea used).
- Cloud deployment of local runtime features requires the runtime installed on the user's machine.
