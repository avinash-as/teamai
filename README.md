# 🚀 TeamAI

TeamAI is a collaborative AI workspace where users can interact with different AI teams designed for various tasks such as development, creativity, problem solving, and productivity.

The platform provides an interactive interface where users can explore AI-powered teams and use them to assist with different types of work.

## 🌟 Features

- Multiple AI teams for different tasks
- Interactive AI chat interface
- Clean and modern UI
- Fast responses powered by AI models (Google Gemini)
- Real-time streaming responses
- Easy team switching
- Responsive design for web applications
- Shareable project links
- Export results to PDF
- PWA + Android (Capacitor) support

## 🛠 Tech Stack

Frontend
- React 19
- JavaScript
- HTML / CSS

Build Tool
- Vite

AI Integration
- Google Gemini (via Vercel serverless proxy)
- Free fallback: Pollinations.ai (no key required, used when GEMINI_API_KEY is absent)

Tools
- Git / GitHub
- Vercel (deploy)
- Capacitor (mobile)

## 📂 Project Structure

```
teamai
├── src/            # React app (components, styles, storage)
├── api/            # Vercel serverless functions (Gemini proxy)
├── public/         # Static assets
├── android/        # Capacitor Android project
├── package.json
└── README.md
```

## ⚙️ Environment Variables

Set in Vercel (or `.env` for local dev):

- `GEMINI_API_KEY` — from https://aistudio.google.com/app/apikey

## 🚀 Getting Started

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## 👨‍💻 Author

Avinash Yadav

GitHub: https://github.com/Avinash-AS
LinkedIn: www.linkedin.com/in/avinashhhh

## ⭐ Support

If you like this project, consider giving it a ⭐ on GitHub.