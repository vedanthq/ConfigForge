# ConfigForge

> Define your app in JSON. Get a full-stack application instantly.

![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Version](https://img.shields.io/badge/version-1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Table of Contents

- [What is ConfigForge?](#what-is-configforge)
- [Core Concepts](#core-concepts)
- [How It Works (End-to-End)](#how-it-works-end-to-end)
- [Key Features](#key-features)
- [Architecture at a Glance](#architecture-at-a-glance)
- [Quick Start](#quick-start)
- [Configuration Example](#configuration-example)
- [Live Demo](#live-demo)
- [Failure Modes](#failure-modes)
- [Documentation](#documentation)
- [License](#license)

---

## What is ConfigForge?

ConfigForge is a **config-driven application runtime** that interprets a declarative JSON configuration and produces a working full-stack application.

It does **not generate code files**. Instead, it:
- Loads configuration at runtime
- Validates and normalizes it (Zod + semantic validation)
- Dynamically registers backend API routes
- Dynamically renders frontend UI
- Dynamically maps data to PostgreSQL via JSONB

> Decision: ConfigForge uses **runtime interpretation instead of code generation**.
>
> **Why:** Enables hot config updates without rebuild. Keeps system flexible and dynamic.
>
> **Trade-off:** Higher runtime complexity. Requires strong validation and error handling layers.

---

## Core Concepts

| Concept | Description |
|---------|-------------|
| Config | JSON file defining the entire application |
| Entity | Data model (maps to a DB table) |
| Field | Attribute inside an entity (text, number, date, select, boolean) |
| Page | UI route (list, form, detail, dashboard) |
| Runtime Engine | Core system that interprets config and builds the app |
| Tenant | A generated application instance, isolated by app_id |

---

## How It Works (End-to-End)

```text
User prompt (natural language)
   |
LLM (Anthropic Claude) -> generates JSON config
   |
Validation (Zod schema + semantic checks)
   |
Normalization (defaults, sanitization)
   |
Runtime Engine boots:
   ├── Frontend: React renders UI from config (component registry)
   ├── Backend: Express creates API routes from entities
   └── Database: PostgreSQL tables with JSONB data column
   |
Working application (forms, lists, CRUD, auth)
```

---

## Key Features

### Three Qualifying Features

1. **CSV Import System** — Upload CSV, map columns to entity fields via UI, validate per row, import with result reporting
2. **Event-Based Notifications** — Entity lifecycle events (create, update, delete) trigger email notifications via Nodemailer, controlled by config
3. **Multiple Login Methods** — Config-driven auth: `auth.methods` array controls which providers (email, Google OAuth) are active at runtime

### Core Platform Capabilities

- Dynamic UI rendering from JSON config (component registry pattern)
- Dynamic REST API generation (no hardcoded routes)
- Config-driven database schema (JSONB hybrid)
- Hot config reload without redeploy (POST /config + frontend polling)
- Strict fail-fast validation (Zod + semantic, no partial execution)
- Multi-tenant data isolation (app_id + user_id scoping on all queries)

### Bonus Feature

- **LLM-Based Config Generation** — Natural language to validated JSON config via Anthropic Claude API, with schema injection and 3-attempt retry

---

## Architecture at a Glance

```text
┌──────────────────────────────────────────────────┐
│                    Frontend                       │
│  Next.js 14 + React + Tailwind CSS              │
│  AppShell -> PageRouter -> PageRenderer          │
│  Component Registry (text, number, select, ...)  │
│  useRuntimeConfig() + useConfigPolling()         │
└───────────────────────┬──────────────────────────┘
                        │ HTTP
┌───────────────────────┴──────────────────────────┐
│                    Backend                        │
│  Node.js + TypeScript + Express                  │
│  Dynamic route registration per entity           │
│  CRUD handlers with tenant scoping               │
│  Config management (GET/POST /config)            │
│  Event bus + Nodemailer                          │
│  buildAuthProviders(config) + NextAuth.js        │
└───────────────────────┬──────────────────────────┘
                        │ SQL
┌───────────────────────┴──────────────────────────┐
│                   Database                        │
│  PostgreSQL + JSONB hybrid                       │
│  System tables: apps, users, app_users           │
│  Entity tables: dynamic, one per config entity   │
│  Tenant isolation: app_id + user_id on all rows  │
└──────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### Setup

```bash
# Clone repository
git clone https://github.com/your-username/configforge.git
cd configforge

# Install frontend dependencies
cd frontend
npm install
cp .env.example .env.local

# Install backend dependencies
cd ../backend
npm install
cp .env.example .env

# Set up database
npx knex migrate:latest
```

### Environment Variables

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
```

**Backend (.env):**
```env
DATABASE_URL=postgres://user:password@localhost:5432/configforge
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your-mailtrap-user
SMTP_PASS=your-mailtrap-pass
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### Run

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

---

## Configuration Example

```json
{
  "version": "1.0",
  "app": { "name": "Bug Tracker" },
  "auth": { "methods": ["email", "google"] },
  "entities": [
    {
      "name": "bug",
      "fields": [
        { "id": "title", "type": "text", "validation": { "required": true } },
        { "id": "severity", "type": "select", "options": ["low", "medium", "high"] },
        { "id": "assignee", "type": "text" },
        { "id": "resolved", "type": "boolean" }
      ]
    }
  ],
  "pages": [
    { "path": "/bugs", "type": "list", "entity": "bug" },
    { "path": "/bugs/new", "type": "form", "entity": "bug" }
  ],
  "features": {
    "csv_import": true,
    "notifications": {
      "on_create": true,
      "on_update": false
    }
  }
}
```

---

## Live Demo

- **Frontend**: [your-frontend-url.vercel.app]
- **Backend**: [your-backend-url.railway.app]
- **Health Check**: [your-backend-url.railway.app/health]

---

## Failure Modes

| Failure | System Behavior |
|---------|----------------|
| Invalid config JSON | Rejected at validation step; app does not change state |
| Unknown field type | Rendered as orange warning (UnknownField component); no crash |
| API endpoint error | Returns structured JSON error with status code; UI shows inline error |
| Missing entity | Page renderer shows "Entity not found" error page |
| Database connection lost | Health check returns 500; API returns DB_ERROR |
| LLM generation fails | Retried up to 3 times; falls back to manual config |
| Breaking schema change | POST /config returns 409 with change details; config not applied |

---

## Documentation

| Document | Topic |
|----------|-------|
| doc_02 | Architecture Overview |
| doc_03 | Config Schema Reference |
| doc_04 | Frontend System |
| doc_05 | Backend API System |
| doc_06 | Database System |
| doc_07 | Authentication System |
| doc_08 | Feature Systems (CSV, Notifications, Auth, LLM) |
| doc_09 | Developer Guide |
| doc_10 | Deployment Guide |
| doc_11 | Security Specification |
| doc_12 | Changelog and Roadmap |
| doc_13 | System Limitations |
| doc_14 | Pitch Guide |
| doc_15 | Competitive Analysis |
| doc_16 | Glossary |

---

## License

MIT

---

CHANGES APPLIED:
- Guide section used: 11 (NEXTAUTH_SECRET fix, feature naming)
- Contradictions resolved: NEXTAUTH_SECRET now shows `openssl rand -base64 32`; three qualifying features explicitly named (CSV Import, Notifications, Multiple Login Methods); LLM marked as bonus; multi-language references removed; version updated to 1.0; added Live Demo section with URL placeholders
- Removed: Trailing "what was fixed" commentary; emoji from headers; `NEXTAUTH_SECRET=supersecret`; multi-language from features; wrapping code fences
