```markdown
<role>
You are a Senior Full-Stack Engineer with 10+ years of experience building 
production web platforms, API backends, and developer tooling in TypeScript. 
You write clean, idiomatic TypeScript that compiles on the first attempt. You 
never leave a package in a state where `npx tsc --noEmit` fails. You follow 
the project's established coding standards without deviation. Every file you 
produce is complete — no placeholders, no TODOs, no stub comments that say 
"implement later."
</role>

<project>
You are building Step 0 of ConfigForge — a production-grade config-driven AI 
App Generator Platform, written in TypeScript.

Finalized project facts (do not deviate from these):
  Frontend framework:  Next.js 14 (App Router)
  Frontend styling:    Tailwind CSS
  Backend runtime:     Node.js + Express
  Language:            TypeScript (strict mode)
  Database:            PostgreSQL 15+ with JSONB
  ORM / Query Builder: Knex.js
  Auth:                NextAuth.js (Email + Google OAuth)
  Validation:          Zod
  Email:               Nodemailer
  CSV parsing:         PapaParse
  LLM:                 Anthropic Claude API (@anthropic-ai/sdk)
  File uploads:        Multer
  Event system:        Node.js EventEmitter
  Logging:             Pino (structured JSON logging)
  Caching:             Redis (ioredis)
  Deployment:          Docker + Vercel (frontend) + Railway (backend/DB)

Architecture decisions now locked:
  - Project structure: Two separate directories (frontend/ + backend/), NOT a monorepo tool
  - Runtime interpretation: Config is interpreted at runtime, NOT compiled to code
  - Tenant isolation: Every DB query scoped by app_id + user_id
  - Config validation: Fail-fast — entire config rejected if ANY error exists
  - Entity storage: JSONB hybrid — fixed system columns + dynamic data column
  - Auth token: JWT contains user_id + email ONLY — app_id resolved per-request from subdomain or header
  - Secret generation: NEXTAUTH_SECRET via `openssl rand -base64 32`, never hardcoded
  - Config size limit: 256KB max
  - API payload limit: 1MB max
  - CSV upload limit: 2MB max
  - Rate limiting: 100 requests per 60 seconds on /api prefix
  - Config reload uses Express Router hot-swap with async-mutex
  - Auth providers rebuilt per-request from runtimeState, not at boot
  - Tenant resolution: X-App-Subdomain header first, hostname subdomain fallback, X-App-ID last resort
  - Notification recipients come from config, not env vars
  - CSV import uses knex.batchInsert for large datasets
  - Config snapshots stored in DB with version history
  - Structured logging with request IDs via pino
  - Redis for config caching with pub/sub invalidation
</project>

<context>
This is the FIRST step. Nothing has been built yet. You are initializing the 
ConfigForge project from scratch.

The key documentation references for this step are:
  1. documentation_01.md — Quick Start, Environment Variables
  2. documentation_06.md — Section 2 (System Tables), Section 6 (Migration System)
  3. documentation_09.md — Section 1 (Project Structure), Section 2 (Development Setup)

The system tables that must exist after this step:
  - apps:          id (UUID PK), subdomain (VARCHAR 63 UNIQUE), name (VARCHAR 255), config (JSONB), timestamps
  - users:         id (UUID PK), email (VARCHAR 255 UNIQUE), password_hash (VARCHAR 255 NULLABLE), auth_provider (VARCHAR 50), created_at
  - app_users:     id (UUID PK), app_id (FK→apps), user_id (FK→users), role (VARCHAR 50), joined_at, UNIQUE(app_id, user_id)
  - config_snapshots: id (UUID PK), app_id (FK→apps), config (JSONB), version (INTEGER), created_at, UNIQUE(app_id, version)
</context>

<task>
Implement Step 0: Project Setup. This step produces a fully scaffolded, 
runnable two-directory project. Every dependency must be installed. Every 
config file must exist. The database must connect and migrations must run.

Step 0 does NOT implement any application logic. It implements:
  - The complete two-directory project structure (frontend/ + backend/)
  - A Next.js 14 frontend with App Router, Tailwind CSS, TypeScript
  - A Node.js + Express backend with TypeScript compilation
  - Knex.js configuration and database connection
  - Initial migration creating apps, users, app_users, config_snapshots tables with indexes
  - A minimal Express server with health check endpoint
  - Environment variable templates (.env.example) for both directories
  - .gitignore, package.json scripts, tsconfig.json for both directories
  - A placeholder config file (backend/config/app.json)
  - Pino structured logger with request IDs
  - Dockerfile and docker-compose.yml for containerized deployment
</task>

<output_requirements>
Produce every file listed below. Each file must be complete.
Do not skip any file. Do not use placeholder comments.

Output format for each file:
### path/to/file.ts
```ts
(complete file content)
```

FILES TO PRODUCE:

GROUP 1 — Frontend Scaffold
  frontend/package.json         ← Next.js 14 + React + Tailwind + NextAuth + TypeScript
  frontend/tsconfig.json        ← Strict mode, path aliases (@/)
  frontend/next.config.js       ← Minimal Next.js config
  frontend/tailwind.config.js   ← Default Tailwind config with content paths
  frontend/postcss.config.js    ← PostCSS with Tailwind + autoprefixer
  frontend/src/app/layout.tsx   ← Root layout with HTML/body tags
  frontend/src/app/page.tsx     ← Default home page (placeholder)
  frontend/src/styles/globals.css ← Tailwind base/components/utilities
  frontend/.env.example         ← NEXT_PUBLIC_API_URL, NEXTAUTH_URL, NEXTAUTH_SECRET

GROUP 2 — Backend Scaffold
  backend/package.json          ← Express + Knex + pg + Zod + bcrypt + nodemailer + 
                                    multer + papaparse + dotenv + express-rate-limit + 
                                    uuid + events + cors + helmet + pino + async-mutex + ioredis
                                    DevDeps: typescript + @types/* + tsx + nodemon
  backend/tsconfig.json         ← Strict mode, ES2020, commonjs, outDir: dist
  backend/knexfile.ts           ← Dev + production configs, pg client, migrations dir
  backend/src/index.ts          ← Express app, cors, JSON limit 1MB, health check on /health,
                                    pino logger integration, request ID middleware
  backend/src/db/connection.ts  ← Knex instance from DATABASE_URL, pool min:2 max:10
  backend/src/lib/logger.ts     ← Pino logger instance with request ID support.
                                    Export: createLogger(name), logger instance.
                                    Logger includes: level, name, timestamp, requestId (optional).
                                    Default level from LOG_LEVEL env var (default: "info").
                                    Production mode uses pino-pretty only in development.
  backend/config/app.json       ← Empty JSON object: {}
  backend/.env.example          ← DATABASE_URL, NEXTAUTH_SECRET, GOOGLE_*, SMTP_*, 
                                    ANTHROPIC_API_KEY, NODE_ENV, PORT, LOG_LEVEL,
                                    REDIS_URL, CORS_ORIGIN, LLM_MODEL

GROUP 3 — Migration
  backend/migrations/001_initial_setup.ts ← Creates apps, users, app_users, config_snapshots tables with:
                                            - UUID primary keys (gen_random_uuid())
                                            - Foreign keys with ON DELETE CASCADE
                                            - Composite unique constraint on (app_id, user_id)
                                            - Unique constraint on (app_id, version) for config_snapshots
                                            - Indexes: idx_app_users_app, idx_app_users_user, idx_config_snapshots_app
                                            - Down migration drops all four tables

GROUP 4 — Infrastructure
  Dockerfile                    ← Multi-stage Node.js build:
                                    - Build stage: npm ci, tsc
                                    - Production stage: node:18-alpine, copy dist + node_modules
                                    - Expose port 4000
                                    - HEALTHCHECK instruction
                                    - Start: node dist/index.js
  docker-compose.yml            ← Services:
                                    - backend: build ., port 4000, depends on db + redis
                                    - db: postgres:15-alpine, port 5432, volume for data
                                    - redis: redis:7-alpine, port 6379
                                    All config via environment variables

GROUP 5 — Root Files
  .gitignore                    ← node_modules, dist, .env, .env.local, .next, *.log, coverage/
  .env.example                  ← Root-level template referencing both directories
</output_requirements>

<implementation_rules>
RULE 1 — Every file compiles.
  No file may have an import that is not used. No file may have a 
  declared variable that is not used. No file may have a syntax error.
  `npx tsc --noEmit` must succeed in both frontend/ and backend/.

RULE 2 — No hardcoded secrets.
  No secret values appear in any source file. All sensitive values 
  come from environment variables. NEXTAUTH_SECRET must be generated 
  via `openssl rand -base64 32`. No placeholder strings like 
  "supersecret", "REPLACE_ME", or "your-secret-here".

RULE 3 — Tables created ONLY through migrations.
  No SQL CREATE TABLE statements exist outside the migrations/ directory.
  No ad-hoc table creation in application code. The migration file is 
  the single source of truth for database schema.

RULE 4 — Migration matches exact SQL specification.
  The migration must produce tables matching this exact SQL:
  ```sql
  CREATE TABLE apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subdomain VARCHAR(63) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    auth_provider VARCHAR(50) NOT NULL DEFAULT 'email',
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(app_id, user_id)
  );
  CREATE TABLE config_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    config JSONB NOT NULL,
    version INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(app_id, version)
  );
  CREATE INDEX idx_app_users_app ON app_users(app_id);
  CREATE INDEX idx_app_users_user ON app_users(user_id);
  CREATE INDEX idx_config_snapshots_app ON config_snapshots(app_id);
  ```

RULE 5 — Health check is real.
  GET /health must execute `SELECT 1` against the database and return:
  `{"status":"ok","db":"connected"}` on success, or
  `{"status":"fail","db":"disconnected"}` with HTTP 500 on failure.

RULE 6 — Dev scripts work.
  backend/package.json must have: "dev": "tsx watch src/index.ts",
  "build": "tsc", "start": "node dist/index.js".
  frontend/package.json uses the default Next.js scripts.

RULE 7 — No application logic in this step.
  Do NOT implement config validation, route registration, authentication,
  CRUD handlers, or any frontend components beyond the default page.
  This step is ONLY scaffolding + database provisioning.

RULE 8 — All env vars documented.
  Every environment variable referenced by process.env.* in code must 
  have a corresponding entry in the relevant .env.example file. Run 
  `grep -r "process.env\." backend/src/` to verify completeness.

RULE 9 — Migration rollback works.
  The down() function in the migration must drop all four tables in 
  reverse dependency order: config_snapshots → app_users → users → apps. Running 
  `npx knex migrate:rollback` must succeed without errors.

RULE 10 — Port defaults.
  Backend defaults to port 4000 (process.env.PORT || 4000).
  Frontend defaults to port 3000 (Next.js default).

RULE 11 — Logger is structured JSON.
  pino logger outputs JSON. In development, use pino-pretty for readability.
  Logger attaches requestId to each log entry when available.
  Log format: { level, time, msg, name, requestId?, ...context }

RULE 12 — Docker compose configures all services.
  docker-compose.yml must wire backend, PostgreSQL 15, and Redis 7.
  Backend depends on db and redis being healthy.
  Database volume is persisted across restarts.
</implementation_rules>

<verification>
After completing all files, run these checks. ALL must pass:

CHECK 1 — Backend starts:
  cd backend && npm run dev
  Expected: "ConfigForge backend running on port 4000", no errors

CHECK 2 — Health check returns OK:
  curl http://localhost:4000/health
  Expected: {"status":"ok","db":"connected"}

CHECK 3 — Migration creates tables:
  cd backend && npx knex migrate:latest
  Expected: Migration runs, \dt shows apps, users, app_users, config_snapshots

CHECK 4 — Tables have correct columns:
  \d apps → id(uuid), subdomain(varchar 63), name(varchar 255), config(jsonb), timestamps
  \d users → id(uuid), email(varchar 255 unique), password_hash(varchar 255 nullable), auth_provider, created_at
  \d app_users → id(uuid), app_id(uuid FK), user_id(uuid FK), role, joined_at, UNIQUE(app_id,user_id)
  \d config_snapshots → id(uuid), app_id(uuid FK), config(jsonb), version(integer), created_at, UNIQUE(app_id,version)

CHECK 5 — Unique constraints work:
  INSERT INTO apps (subdomain,name) VALUES ('test','Test');
  INSERT INTO apps (subdomain,name) VALUES ('test','Test2'); → FAILS

CHECK 6 — Foreign keys enforced:
  INSERT INTO app_users (app_id,user_id) VALUES ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000000'); → FAILS

CHECK 7 — Frontend starts:
  cd frontend && npm run dev → Next.js on port 3000, no errors

CHECK 8 — Migration rollback:
  npx knex migrate:rollback → All tables dropped

CHECK 9 — No tables outside migrations:
  grep -r "CREATE TABLE" backend/src/ → Zero matches

CHECK 10 — No hardcoded secrets:
  grep -r "supersecret\|REPLACE_ME\|your-secret" backend/src/ frontend/src/ → Zero matches

CHECK 11 — .env files in .gitignore:
  cat .gitignore | grep -E "\.env" → Both .env and .env.local listed

CHECK 12 — TypeScript compiles:
  cd backend && npx tsc --noEmit → 0 errors

CHECK 13 — Logger produces JSON:
  Start backend, check one log line → valid JSON with level, time, msg fields

CHECK 14 — Docker compose builds:
  docker compose build → backend image builds successfully

CHECK 15 — Request ID middleware active:
  curl -H "X-Request-Id: test-123" http://localhost:4000/health
  Check backend log → log entry contains "requestId": "test-123"
</verification>
```
