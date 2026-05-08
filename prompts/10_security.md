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
You are building Step 10 of ConfigForge — a production-grade config-driven AI
App Generator Platform, written in TypeScript.

Finalized project facts (do not deviate from these):
  Backend runtime:     Node.js + Express
  Security packages:   helmet, express-rate-limit, cors
  Validation:          Zod
  Database:            Knex.js (parameterized queries only)
  Logging:             Pino + audit service (Step 13)

Architecture decisions now locked:
  - Helmet.js for HTTP security headers
  - CORS configured for specific origins, not wildcard *
  - Rate limiting: 100 req/min on /api prefix (global) + per-tenant counters
  - Input sanitization via Zod — all input validated before processing
  - No raw SQL interpolation anywhere in the codebase
  - Identifier allowlisting: /^[a-zA-Z_][a-zA-Z0-9_]*$/ on ALL entity/field names
  - Config size limit: 256KB, API payload: 1MB, CSV upload: 2MB
  - Secrets: all in env vars, never in code or config JSON
  - app_id resolved server-side, never from client token
  - Logging: audit events for auth failures, rate limit triggers, config changes
  - Per-tenant rate limiting via Redis (optional, falls back to global)
</project>

<context>
Steps 0–9 are complete:
  - Full platform: auth, CRUD, CSV, notifications, hot reload, LLM
  - All features functional, all endpoints working
  - Security exists in parts: Zod validation, identifier regex,
    rate limiting, tenant scoping, audit logging (Step 13)
  - Redis available for distributed rate limiting

This step is a security hardening pass. The goal is NOT to add new
features but to audit and strengthen the security posture of all
existing code.

Key documentation references:
  1. documentation_11.md — ALL sections (Threat model, config injection,
     SQL injection prevention, auth security, tenant isolation, API
     security, LLM security, CSV security, DoS prevention, secrets
     management, observability)
</context>

<task>
Implement Step 10: Security Hardening. This is a comprehensive security
audit and hardening pass across the entire codebase.

Step 10 implements:
  - Helmet.js middleware for HTTP security headers
  - CORS restriction to specific origins (from CORS_ORIGIN env var)
  - Input sanitization audit — verify all endpoints validate input via Zod
  - SQL injection audit — verify no raw SQL interpolation exists
  - Identifier allowlisting audit — verify regex applied before all DB ops
  - Rate limiting verification on all API routes
  - Per-tenant rate limiting (separate counters per app_id, if Redis available)
  - Payload size enforcement audit (256KB config, 1MB API, 2MB CSV)
  - Secrets audit — no hardcoded secrets anywhere
  - Security logging: audit events for auth failures, rate limits, config changes
  - CSP headers via Helmet
  - Request body size limits at all levels

Step 10 does NOT implement:
  - New features
  - Final integrity audit (Step 11)
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

GROUP 1 — Security Middleware
  backend/src/middleware/security.ts ← registerSecurityMiddleware(app):
                                        1. Helmet.js: app.use(helmet())
                                        2. CORS: app.use(cors({
                                             origin: process.env.CORS_ORIGIN || "*",
                                             credentials: true
                                           }))
                                        3. Global rate limiting: app.use("/api", rateLimit({
                                             windowMs: 60_000, max: 100
                                           }))
                                        4. JSON body limit: app.use(express.json({
                                             limit: "1mb"
                                           }))
                                        5. Per-tenant rate limiting (if Redis available):
                                           Track requests per app_id in Redis
                                           Different limits for different tiers

GROUP 2 — Security Audit Script
  backend/scripts/security-audit.sh ← Shell script that checks:
                                        1. grep -r "db.raw" → list ALL raw SQL usages
                                        2. grep -r "process.env\." → verify all env vars
                                           have .env.example entries
                                        3. grep -r "supersecret\|REPLACE_ME" → zero matches
                                        4. grep -r "SELECT.*FROM.*\${" → zero matches
                                        5. Verify helmet is imported and used
                                        6. Verify CORS is not set to wildcard in production

GROUP 3 — Entry Point Update
  backend/src/index.ts              ← MODIFY:
                                        1. Add registerSecurityMiddleware(app) early (first middleware)
                                        2. Remove any duplicate CORS/rate-limit setup
                                        3. Add CORS_ORIGIN to .env.example

GROUP 4 — Environment Variables Update
  backend/.env.example              ← MODIFY: Ensure CORS_ORIGIN variable is present
</output_requirements>

<implementation_rules>
RULE 1 — Every file compiles.
  `npx tsc --noEmit` must succeed after all changes.

RULE 2 — Helmet.js is the FIRST middleware.
  app.use(helmet()) must be called before any route registration.
  This ensures all responses have security headers.

RULE 3 — CORS is restrictive in production.
  CORS_ORIGIN env var specifies allowed origins.
  In development (no env var), allow wildcard.
  In production, MUST be set to specific frontend URL.

RULE 4 — No raw SQL interpolation in the entire codebase.
  Run: grep -r "db.raw" backend/src/
  Every match must use parameterized queries:
    ALLOWED: db.raw("SELECT 1")
    ALLOWED: .whereRaw("data->>? = ?", ["field", "value"])
    FORBIDDEN: db.raw(`SELECT * FROM ${table}`)
    FORBIDDEN: .whereRaw(`data->>'${field}' = '${value}'`)

RULE 5 — All entity/field names validated against regex.
  Before ANY name is used in a database operation, it must pass:
    /^[a-zA-Z_][a-zA-Z0-9_]*$/
  This check exists in: ensureEntityTable, registerDynamicRoutes,
  and buildZodSchema.

RULE 6 — Security events are logged via audit service.
  The audit service from Step 13 (backend/src/services/auditService.ts)
  is used for all security-relevant events.
  Event types: AUTH_FAILURE, RATE_LIMIT, CONFIG_UPDATE,
  CONFIG_RELOAD, CSV_IMPORT, LLM_GENERATION, SECURITY_VIOLATION
  Logging is non-blocking — never affects response times.

RULE 7 — No secrets in client-accessible responses.
  GET /config/runtime must not expose SMTP passwords, API keys,
  or any process.env secrets. Only the config JSON is returned.

RULE 8 — Payload limits enforced at correct layers.
  Config: 256KB (POST /config)
  API: 1MB (express.json global)
  CSV: 2MB (Multer fileSize)
  Each limit is enforced before processing, not after.

RULE 9 — Auth failures are logged via audit service.
  Every 401 and 403 response should log an audit event with
  the requesting IP and path. This helps detect brute force attacks.

RULE 10 — Per-tenant rate limiting (optional).
  If Redis is available, track request counts per app_id.
  Different limits for different tiers (default: 100 req/min).
  Falls back to global rate limiting if Redis unavailable.
</implementation_rules>

<verification>
After completing all files, run these checks. ALL must pass:

CHECK 1 — TypeScript compiles:
  cd backend && npx tsc --noEmit → 0 errors

CHECK 2 — Helmet headers present:
  curl -I http://localhost:4000/health
  Expected: X-Content-Type-Options, X-Frame-Options headers present

CHECK 3 — CORS headers present:
  curl -H "Origin: http://localhost:3000" -I http://localhost:4000/health
  Expected: Access-Control-Allow-Origin header present

CHECK 4 — Rate limiting active:
  Send 101 requests in 60 seconds → 429 on 101st

CHECK 5 — SQL injection audit:
  bash backend/scripts/security-audit.sh
  Expected: No unsafe raw SQL patterns found

CHECK 6 — No hardcoded secrets:
  grep -r "supersecret\|REPLACE_ME\|your-secret" backend/src/ → 0 matches

CHECK 7 — Entity name injection blocked:
  Attempt to create entity with name "task; DROP TABLE apps;"
  Expected: Zod regex rejects at validation

CHECK 8 — Config does not expose secrets:
  GET /config/runtime → response does not contain any process.env values

CHECK 9 — Auth failure logged:
  Send request with invalid token → 401 AND audit log entry

CHECK 10 — Payload limits enforced:
  POST /config with >256KB body → 413
  POST /api/bug with >1MB body → 413

CHECK 11 — Environment variables documented:
  grep -r "process.env\." backend/src/ | extract var names
  Compare against backend/.env.example → all present

CHECK 12 — Security audit script runs:
  bash backend/scripts/security-audit.sh → exits 0

CHECK 13 — Steps 0-9 regression:
  Full platform functional after security hardening
</verification>
```
