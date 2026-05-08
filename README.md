# ConfigForge

> **Define your app in JSON. Get a full-stack application instantly.**

ConfigForge is a production-grade config-driven AI App Generator Platform. Unlike traditional code generators that produce static output, ConfigForge interprets configuration at **runtime** — enabling hot reload, version-controlled config-as-source-of-truth, and zero-deploy schema changes.

---

## Architecture

ConfigForge uses runtime interpretation (not code generation). Configuration JSON is the single source of truth — it defines entities, fields, pages, auth methods, and features. The platform reads this config at boot and on every hot-reload, dynamically registering API routes, database tables, and frontend pages.

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────┐
│   Next.js 14     │────▶│  Express API      │────▶│  PostgreSQL 15  │
│  (App Router)    │◀────│  (Node.js)        │◀────│  (JSONB)        │
└─────────────────┘     └────────┬─────────┘     └────────────────┘
                                  │
                        ┌─────────▼─────────┐
                        │   Redis (Cache)    │
                        │   + Pub/Sub        │
                        └───────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS |
| Backend | Node.js, Express 4, TypeScript 5 |
| Database | PostgreSQL 15+ with JSONB |
| Query Builder | Knex.js |
| Auth | NextAuth.js (Email + Google OAuth), bcryptjs, JWT (jose) |
| Validation | Zod (fail-fast, runtime interpretation) |
| Caching | Redis (config cache, pub/sub invalidation) |
| Logging | Pino structured JSON with request IDs |
| Email | Nodemailer (config-driven recipients) |
| LLM | Anthropic Claude 3.5 Sonnet |
| File Upload | Multer (CSV import) |
| CSV Parsing | PapaParse |
| Security | Helmet, CORS, rate limiting (express-rate-limit), audit logging |

---

## Features

| Feature | Description |
|---|---|
| **Dynamic CRUD API** | RESTful endpoints generated per entity from config |
| **Runtime UI** | Components rendered from config — forms, lists, detail, dashboard |
| **Config-Driven Auth** | Email + Google OAuth, config-controlled provider selection |
| **Hot Reload** | POST new config → routes/UI update without restart |
| **Diff Engine** | Breaking change detection returns 409 on incompatible schema changes |
| **Rollback** | Mutex-protected atomic reload with config snapshots |
| **CSV Import** | Two-step parse → map → batch insert (500 rows/batch) |
| **Notifications** | Event-driven email alerts to config-defined recipients |
| **LLM Generation** | Natural language → validated config via Claude 3.5 Sonnet |
| **Tenant Isolation** | 3-strategy resolution (subdomain/header/hostname) |
| **Audit Logging** | Structured audit events for auth, rate limiting, config changes |
| **Redis Caching** | Config cache with pub/sub invalidation for multi-instance |

---

## Project Structure

```
configforge/
├── backend/
│   ├── config/
│   │   └── app.json                  # Bug Tracker demo config
│   ├── migrations/
│   │   └── 001_initial_setup.ts      # DB schema (apps, users, app_users, config_snapshots)
│   ├── src/
│   │   ├── api/
│   │   │   ├── authRoutes.ts         # /auth/register, /auth/login, /auth/google-register
│   │   │   ├── configRoutes.ts       # GET /config/runtime, POST /config
│   │   │   ├── csvRoutes.ts          # POST /api/csv-parse, POST /api/csv-import
│   │   │   ├── handlers.ts           # CRUD handlers (list, create, update, delete)
│   │   │   ├── llmRoutes.ts          # POST /api/generate-config
│   │   │   └── routes.ts             # Router engine integration
│   │   ├── auth/
│   │   │   ├── nextauth.ts           # NextAuth options factory
│   │   │   └── providers.ts          # Auth provider builder (email, google)
│   │   ├── core/
│   │   │   ├── types.ts              # Config type definitions
│   │   │   ├── validator.ts          # Zod + semantic validation (6 rules)
│   │   │   ├── normalizer.ts         # Defaults injection
│   │   │   ├── configLoader.ts       # File loading with 256KB limit
│   │   │   ├── diff.ts               # Config diff + breaking change detection
│   │   │   ├── reloadEngine.ts       # Mutex-protected atomic reload
│   │   │   ├── routerEngine.ts       # Hot-swappable Express Router
│   │   │   ├── runtime.ts            # Runtime state + boot sequence
│   │   │   └── configSchema.json     # JSON Schema for LLM
│   │   ├── db/
│   │   │   ├── connection.ts         # Knex connection
│   │   │   └── schemaBuilder.ts      # Entity table creation + Zod schema builder
│   │   ├── middleware/
│   │   │   ├── auth.ts               # JWT verification
│   │   │   ├── membership.ts         # App membership check
│   │   │   ├── requestId.ts          # Request ID middleware
│   │   │   ├── security.ts           # Helmet, CORS, rate limiting
│   │   │   └── tenantResolver.ts     # 3-strategy tenant resolution
│   │   ├── services/
│   │   │   ├── auditService.ts       # Audit event logging
│   │   │   ├── cacheListener.ts      # Redis pub/sub subscriber
│   │   │   ├── cacheService.ts       # Redis config cache
│   │   │   ├── emailService.ts       # Nodemailer integration
│   │   │   ├── eventBus.ts           # Event emitter for notifications
│   │   │   ├── llmService.ts         # Anthropic Claude integration
│   │   │   └── notificationService.ts # Event-driven email notifications
│   │   ├── types/
│   │   │   └── express.d.ts          # Express Request augmentation
│   │   ├── lib/
│   │   │   └── logger.ts             # Pino logger setup
│   │   └── index.ts                  # Entry point
│   ├── knexfile.ts
│   ├── tsconfig.json
│   └── package.json
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── api/auth/[...nextauth]/route.ts  # NextAuth API route
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components/
│       │   ├── auth/LoginPage.tsx
│       │   ├── common/ErrorBoundary.tsx
│       │   ├── common/LoadingSkeleton.tsx
│       │   ├── csv/CSVMapperUI.tsx
│       │   ├── csv/CSVUploadFlow.tsx
│       │   ├── csv/ImportResult.tsx
│       │   ├── inputs/BooleanInput.tsx
│       │   ├── inputs/DateInput.tsx
│       │   ├── inputs/NumberInput.tsx
│       │   ├── inputs/SelectInput.tsx
│       │   ├── inputs/TextInput.tsx
│       │   ├── inputs/UnknownField.tsx
│       │   ├── pages/AppShell.tsx
│       │   ├── pages/DashboardPage.tsx
│       │   ├── pages/DetailPage.tsx
│       │   ├── pages/ErrorPage.tsx
│       │   ├── pages/FormPage.tsx
│       │   ├── pages/ListPage.tsx
│       │   ├── pages/PageRenderer.tsx
│       │   ├── pages/PageRouter.tsx
│       │   └── GeneratorUI.tsx
│       ├── context/ConfigContext.tsx
│       ├── hooks/useConfigPolling.ts
│       ├── hooks/useRuntimeConfig.ts
│       ├── lib/auth.ts
│       ├── lib/componentRegistry.ts
│       ├── lib/renderField.tsx
│       ├── types/config.ts
│       └── styles/globals.css
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── .gitignore
```

---

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+ (optional, graceful fallback)

### 1. Clone & Install

```bash
git clone <repo-url> configforge
cd configforge

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

# Frontend
cp frontend/.env.example frontend/.env
```

### 3. Start Database

```bash
docker compose up db -d
# Or use your local PostgreSQL
```

### 4. Run Migrations

```bash
cd backend && npm run migrate
```

### 5. Start Backend

```bash
cd backend && npm run dev
# Runs on http://localhost:4000
```

### 6. Start Frontend

```bash
cd frontend && npm run dev
# Runs on http://localhost:3000
```

### 7. Verify

```bash
curl http://localhost:4000/health
# {"status":"ok","db":"connected","redis":"not available"}
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://postgres:postgres@localhost:5432/configforge` | PostgreSQL connection string |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection string |
| `NEXTAUTH_SECRET` | Yes | — | At least 32 chars, generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` | Frontend URL for NextAuth callbacks |
| `GOOGLE_CLIENT_ID` | For Google Auth | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For Google Auth | — | Google OAuth client secret |
| `SMTP_HOST` | For Email | `localhost` | SMTP server hostname |
| `SMTP_PORT` | No | `587` | SMTP server port |
| `SMTP_USER` | For Email | — | SMTP username |
| `SMTP_PASS` | For Email | — | SMTP password |
| `SMTP_FROM` | No | `noreply@configforge.dev` | From address for notification emails |
| `ANTHROPIC_API_KEY` | For LLM | — | Anthropic API key |
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `4000` | Backend server port |
| `LOG_LEVEL` | No | `info` | Pino log level |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origin |
| `LLM_MODEL` | No | `claude-3-5-sonnet-20241022` | Anthropic model ID |
| `LLM_MAX_TOKENS` | No | `4096` | Max tokens for LLM response |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:4000` | Backend API base URL |
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` | Frontend URL |
| `NEXTAUTH_SECRET` | Yes | — | Must match backend value |

---

## API Reference

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | No | Health check (DB + Redis status) |

### Config

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/config/runtime` | No | Current runtime config with version |
| `GET` | `/config/version` | No | Current config version number |
| `POST` | `/config` | JWT | Upload new config (max 256KB, 409 on breaking change) |

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | No | Register with email + password |
| `POST` | `/auth/login` | No | Login, returns user data |
| `POST` | `/auth/google-register` | No | Register/login with Google email |

### CRUD (per entity, e.g. `bug`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/:entity` | JWT + Tenant | List records (paginated) |
| `POST` | `/api/:entity` | JWT + Tenant | Create record |
| `PUT` | `/api/:entity/:id` | JWT + Tenant | Update record |
| `DELETE` | `/api/:entity/:id` | JWT + Tenant | Delete record |

### CSV Import

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/csv-parse` | JWT + Tenant | Upload CSV, returns headers + preview |
| `POST` | `/api/csv-import` | JWT + Tenant | Import CSV with column mapping (batch insert 500) |

### LLM

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/generate-config` | No | Generate config from natural language prompt |

---

## Demo Walkthrough

### 10-Step Judge Flow

1. **Start PostgreSQL** — `docker compose up db -d`
2. **Run migrations** — `cd backend && npm run migrate`
3. **Start backend** — `cd backend && npm run dev`  → logs "ConfigForge backend running on port 4000"
4. **Start frontend** — `cd frontend && npm run dev`  → serves on port 3000
5. **Register a user** — `POST /auth/register` with email + password
6. **Create a record via form** — Navigate to `/bugs/new`, fill in fields, submit
7. **View records in list** — Navigate to `/bugs`, see created record with pagination
8. **View detail page** — Click a record or navigate to `/bugs/:id`
9. **Import CSV** — Click "Import CSV" on list page, upload `.csv`, map columns, import
10. **Generate config via LLM** — Click "Generate with AI" button, describe your app
11. **Update config via POST** — `POST /config` with new config → routes/UI update instantly

---

## Docker Deployment

### Full Stack

```bash
# Build and start all services
docker compose up --build

# Services:
#   Backend:  http://localhost:4000
#   Frontend: http://localhost:3000
#   DB:       localhost:5432
#   Redis:    localhost:6379
```

### Backend Only

```bash
docker build -t configforge-backend -f Dockerfile .
docker run -p 4000:4000 --env-file backend/.env configforge-backend
```

---

## What Was Fixed (CTO Review)

All 20 issues from the CTO Review are implemented:

| # | Fix | Implementation |
|---|---|---|
| 1 | `RouterEngine.replaceRoutes()` hot-swap | `routerEngine.ts` — replaces Express Router reference |
| 2 | Auth providers rebuilt per-request | `getAuthOptions()` reads `runtimeState` live in `nextauth.ts` |
| 3 | Subdomain + header tenant resolution | 3-strategy fallback in `tenantResolver.ts` |
| 4 | Docker deployment | `Dockerfile`, `docker-compose.yml` with health checks |
| 5 | LLM model updated | `claude-3-5-sonnet-20241022` in `llmService.ts` |
| 6 | Batch CSV inserts | `knex.batchInsert` 500-row batches in `csvRoutes.ts` |
| 7 | bcrypt null check | `if (!user.password_hash) return null` in `providers.ts` |
| 8 | Mutex on config reload | `async-mutex` `runExclusive` in `reloadEngine.ts` |
| 9 | Atomic DB sync | `runtimeState` updated after `syncDatabase` succeeds in `reloadEngine.ts` |
| 10 | Config-driven notification recipients | `notification_recipients` from config in `emailService.ts` |
| 11 | Redis distributed state | Cache + pub/sub invalidation in `cacheService.ts`, `cacheListener.ts` |
| 12 | Typed JSONB querying | GIN indexes on data column in migration |
| 13 | Duplicate select options validation | Semantic rule #6 in `validator.ts` |
| 14 | Config size limit | 256KB enforced in `configLoader.ts` |
| 15 | React Context for config | `ConfigContext.tsx` provider |
| 16 | Pagination on ListPage | 20 items/page, prev/next in `ListPage.tsx` |
| 17 | DetailPage and DashboardPage | Implemented in `DetailPage.tsx` and `DashboardPage.tsx` |
| 18 | Reduced polling | 10s interval in `useConfigPolling.ts` |
| 19 | Structured logging | Pino with request IDs in `logger.ts` + `requestId.ts` |
| 20 | Error boundaries | `ErrorBoundary` component wrapping pages in `AppShell.tsx` |

---

## License

MIT
