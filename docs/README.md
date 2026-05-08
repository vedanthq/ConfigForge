# ConfigForge

> Define your app in JSON. Get a full-stack application instantly.

ConfigForge is a **config-driven application runtime** that interprets a declarative JSON configuration and produces a working full-stack application — without generating code files.

## Live Demo

- **Frontend**: [your-frontend-url.vercel.app]
- **Backend**: [your-backend-url.railway.app]

## Features

1. **CSV Import** — Upload, map columns to fields, validate per row, import with results
2. **Event-Based Notifications** — Config-driven email alerts on entity lifecycle events
3. **Multiple Login Methods** — `auth.methods` array controls email and/or Google OAuth
4. **LLM Config Generation** (Bonus) — Natural language to validated JSON config via Claude API

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, Tailwind CSS |
| Backend | Node.js, TypeScript, Express |
| Database | PostgreSQL (JSONB hybrid) |
| Auth | NextAuth.js (email + Google OAuth) |
| Email | Nodemailer |
| AI | Anthropic Claude API |

## Quick Start

```bash
# Clone
git clone https://github.com/your-username/configforge.git && cd configforge

# Frontend
cd frontend && npm install && cp .env.example .env.local

# Backend
cd ../backend && npm install && cp .env.example .env

# Database
npx knex migrate:latest

# Run (two terminals)
cd backend && npm run dev
cd frontend && npm run dev
```

## Documentation

See `documentation_01.md` through `documentation_16.md` for complete technical documentation.

## License

MIT
