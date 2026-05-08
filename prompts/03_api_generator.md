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
You are building Step 3 of ConfigForge — a production-grade config-driven AI
App Generator Platform, written in TypeScript.

Finalized project facts (do not deviate from these):
  Frontend framework:  Next.js 14 (App Router)
  Backend runtime:     Node.js + Express
  Language:            TypeScript (strict mode)
  Database:            PostgreSQL 15+ with JSONB
  ORM / Query Builder: Knex.js
  Validation:          Zod
  Event system:        Node.js EventEmitter
  Logging:             Pino (structured JSON logging)

Architecture decisions now locked:
  - Routes are registered dynamically from config entities at boot
  - Route registration uses Express Router hot-swap: create Router, populate, swap reference
  - Route re-registration is supported via mutex-protected router replacement
  - No routes are hardcoded per entity — one generic set of handlers
  - Every query scoped by app_id + user_id (tenant isolation)
  - Update uses schema.partial() for partial JSONB merge
  - Events emitted after successful DB operations (entity.create, entity.update, entity.delete)
  - app_id resolved from subdomain/header, NEVER from request body
  - user_id resolved from JWT/header, NEVER from request body
  - Placeholder auth: X-User-Id and X-App-Id headers (real auth in Step 5)
  - Config management endpoints: GET /config/runtime, GET /config/version
  - Rate limiting: 100 req/min on /api prefix
  - Structured error responses with error codes
  - Request-scoped config snapshot (req.config) for in-flight request safety
</project>

<context>
Step 0 is complete: project scaffolded, DB connected, system tables exist.
Step 1 is complete: validateConfig(), normalizeConfig(), loadConfig(),
  buildZodSchema(), diffConfigs(), isBreaking() all working.
Step 2 is complete: ensureEntityTable(), syncDatabase() create entity tables
  with JSONB data columns, indexes, and foreign keys.

This step builds the core runtime engine — loading config at boot, creating
entity tables, registering dynamic CRUD routes, and serving config endpoints.

Key documentation references:
  1. documentation_05.md — Section 1 (Runtime State, Boot Process),
     Section 2 (Dynamic Route Registration), Section 3 (CRUD Handlers),
     Section 4 (Middleware), Section 5 (Config Endpoints), Section 6
     (Health Check), Section 7 (buildZodSchema)
  2. documentation_02.md — Section 5 (Runtime Lifecycle)
</context>

<task>
Implement Step 3: Dynamic API Generator. This step produces the core backend
runtime — config is loaded at boot, entity tables are synced, and CRUD
routes are registered dynamically.

Step 3 implements:
  - Runtime state object (runtimeState.config, runtimeState.version)
  - bootApp() — loadConfig → validateConfig → normalizeConfig →
    syncDatabase → registerDynamicRoutes → set runtimeState
  - RouterEngine — Express Router hot-swap for dynamic route management.
    Creates a new Router, populates it with entity routes, swaps it into
    the app at the /api mount point. The old router is garbage-collected
    by Node.js once all in-flight requests complete.
  - registerDynamicRoutes(app, config) — creates GET/POST/PUT/DELETE per entity
    using the RouterEngine pattern.
  - clearRoutes(router) — removes all routes from the API router (for hot-reload).
    Creates a fresh Router instance and swaps it atomically.
  - Four CRUD handlers: list, create, update, delete — all tenant-scoped
  - Event emission (eventBus.emit) on create/update/delete
  - Placeholder tenant middleware (X-App-Id header → req.app.id)
  - Placeholder auth middleware (X-User-Id header → req.user.id)
  - Config endpoints: GET /config/runtime, GET /config/version
  - Rate limiting on /api prefix (100 req/min)
  - req.config middleware (snapshot config at request start for in-flight safety)
  - Structured error responses with error codes for all failure modes

Step 3 does NOT implement:
  - Real JWT authentication (that's Step 5)
  - Frontend rendering
  - CSV import
  - Notifications (event listeners — Step 7)
  - Hot config reload (POST /config — Step 8)
  - Redis caching (Step 13)
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

GROUP 1 — Runtime Core
  backend/src/core/runtime.ts       ← runtimeState object { config, version },
                                        bootApp(app) async function:
                                          1. loadConfig()
                                          2. validateConfig(raw) — throw if fails
                                          3. normalizeConfig(data)
                                          4. syncDatabase(config)
                                          5. registerDynamicRoutes(app, config)
                                          6. Set runtimeState.config + version
                                        reloadConfig(app, newConfig):
                                          (Will be fully implemented in Step 8)
                                          For now: a placeholder that updates runtimeState
                                          and calls registerDynamicRoutes.

GROUP 2 — Router Engine (NEW — fixes clearExistingRoutes)
  backend/src/core/routerEngine.ts  ← RouterEngine class or functions:
                                        createRouterEngine(app):
                                          - Creates an Express Router instance at /api
                                          - Stores reference to current apiRouter
                                          - replaceRoutes(app, config):
                                            1. Create new Router
                                            2. Populate with entity routes
                                            3. Swap into app (replace old router reference)
                                            4. Old router is GC'd after in-flight requests
                                          - getCurrentRouter(): returns current router ref
                                        Why this matters: Express doesn't support route removal.
                                        Router hot-swap is the only clean way to re-register
                                        routes without restarting the server. This fixes the
                                        documented `clearExistingRoutes()` gap.

GROUP 3 — Event Bus
  backend/src/services/eventBus.ts  ← EventEmitter singleton instance,
                                        export const eventBus = new EventEmitter()
                                        Export EventPayload type:
                                        { entity: string, action: string, data: any, userId?: string }

GROUP 4 — Dynamic Routes
  backend/src/api/routes.ts         ← registerDynamicRoutes(app, config):
                                        For each entity: register
                                        GET /api/{name}, POST /api/{name},
                                        PUT /api/{name}/:id, DELETE /api/{name}/:id
                                        Uses routerEngine.replaceRoutes()
                                        All routes behind auth middleware

GROUP 5 — CRUD Handlers
  backend/src/api/handlers.ts       ← listHandler(entity) → GET:
                                          db(entity.name).where({ app_id, user_id })
                                          .orderBy("created_at", "desc")
                                          Return { success: true, data: rows }
                                        createHandler(entity) → POST:
                                          Validate req.body.data via buildZodSchema(entity)
                                          Insert with app_id, user_id, data
                                          Emit "entity.create"
                                          Return 201 { success: true, data: row }
                                        updateHandler(entity) → PUT:
                                          Validate via buildZodSchema(entity).partial()
                                          Find existing by id + app_id + user_id
                                          JSONB merge: { ...existing.data, ...result.data }
                                          Emit "entity.update"
                                          Return { success: true, data: updated }
                                        deleteHandler(entity) → DELETE:
                                          Find by id + app_id + user_id
                                          Delete record
                                          Emit "entity.delete"
                                          Return { success: true }
                                        ALL handlers use req.config (snapshot), not runtimeState.config directly

GROUP 6 — Config Routes
  backend/src/api/configRoutes.ts   ← registerConfigRoutes(app):
                                        GET /config/runtime → { version, config }
                                        GET /config/version → { version }

GROUP 7 — Placeholder Middleware
  backend/src/middleware/tenantResolver.ts ← Reads X-App-Id header → req.app = { id }
                                               Returns 400 if missing
  backend/src/middleware/auth.ts          ← Reads X-User-Id header → req.user = { id }
                                               Returns 401 if missing

GROUP 8 — Types
  backend/src/types/express.d.ts    ← Express Request augmentation:
                                        req.app: { id: string }
                                        req.user: { id: string }
                                        req.config: RuntimeConfig

GROUP 9 — Entry Point Update
  backend/src/index.ts              ← MODIFY existing file:
                                        Add req.config snapshot middleware
                                        Add rate limiting on /api
                                        Add tenant + auth middleware on /api
                                        Register config routes
                                        Call bootApp() at startup
                                        Server listens on PORT after boot
                                        Use pino logger for startup messages
</output_requirements>

<implementation_rules>
RULE 1 — Every file compiles.
  `npx tsc --noEmit` must succeed after all changes.

RULE 2 — Every DB query is tenant-scoped.
  ALL queries in handlers.ts MUST include:
    .where({ app_id: req.app.id, user_id: req.user.id })
  No query may omit either field. No exceptions.

RULE 3 — Events emitted AFTER successful DB operation.
  eventBus.emit() is called AFTER the insert/update/delete succeeds,
  never before. If the DB operation fails, no event is emitted.
  Event names: "entity.create", "entity.update", "entity.delete"
  Payload: { entity: string, action: string, data: any }

RULE 4 — req.config middleware snapshots config.
  app.use() near the top sets req.config = runtimeState.config.
  All handlers use req.config (NOT runtimeState.config directly).
  This ensures in-flight requests use the config active when the
  request started, even if a reload happens mid-request.

RULE 5 — Update uses JSONB merge with partial validation.
  1. buildZodSchema(entity).partial() for validation
  2. Find existing record by id + app_id + user_id
  3. Merge: { ...existing.data, ...newData }
  4. Update merged data in DB
  This preserves fields not included in the update request.

RULE 6 — Error responses are structured JSON.
  All errors: { error: "ERROR_CODE", message?: string, details?: any }
  Status codes: 200 (success), 201 (created), 400 (bad request),
  401 (unauthorized), 404 (not found), 500 (server error)
  Error codes: VALIDATION_ERROR, NOT_FOUND, DB_ERROR, UNAUTHORIZED, FORBIDDEN

RULE 7 — Placeholder auth will be replaced in Step 5.
  Use X-App-Id and X-User-Id headers for now. These middleware files
  will be rewritten in Step 5 to use real JWT verification.
  Do NOT implement bcrypt, NextAuth, or JWT in this step.

RULE 8 — bootApp throws on invalid config.
  If validateConfig returns { success: false }, bootApp MUST throw
  an error with the validation errors. The server must NOT start
  with an invalid config.

RULE 9 — Rate limiting uses express-rate-limit.
  100 requests per 60 seconds on the /api prefix.
  Already installed in Step 0 dependencies.

RULE 10 — Config routes are NOT behind auth middleware.
  GET /config/runtime and GET /config/version are public endpoints.
  They do not require X-App-Id or X-User-Id headers.

RULE 11 — Health check remains functional.
  GET /health from Step 0 must continue working after all changes.

RULE 12 — RouterEngine uses hot-swap, not route deletion.
  Express has no native route removal. The RouterEngine creates a
  new Router instance, registers routes on it, and swaps the app's
  reference to the old router with the new one. The old router is
  garbage collected. This is the pattern that fixes the
  clearExistingRoutes() gap documented in the architecture review.

RULE 13 — Logger integration.
  Use pino logger from backend/src/lib/logger.ts.
  Log: boot sequence steps, route registration, errors.
  Include requestId in all request-scoped logs.
</implementation_rules>

<verification>
After completing all files, run these checks. ALL must pass:

CHECK 1 — TypeScript compiles:
  cd backend && npx tsc --noEmit → 0 errors

CHECK 2 — Server boots with valid config:
  npm run dev → "ConfigForge backend running on port 4000"
  No validation errors, entity tables created

CHECK 3 — Health check:
  curl http://localhost:4000/health → {"status":"ok","db":"connected"}

CHECK 4 — Config runtime:
  curl http://localhost:4000/config/runtime
  Expected: { "version": <number>, "config": { ... bug tracker config ... } }

CHECK 5 — Config version:
  curl http://localhost:4000/config/version
  Expected: { "version": <number> }

CHECK 6 — List entities (empty):
  curl -H "X-App-Id: <valid-uuid>" -H "X-User-Id: <valid-uuid>" \
    http://localhost:4000/api/bug
  Expected: { "success": true, "data": [] }

CHECK 7 — Create entity:
  curl -X POST -H "Content-Type: application/json" \
    -H "X-App-Id: <uuid>" -H "X-User-Id: <uuid>" \
    -d '{"data":{"title":"Test bug","severity":"high"}}' \
    http://localhost:4000/api/bug
  Expected: 201, { "success": true, "data": { "id": "...", ... } }

CHECK 8 — List after create:
  GET /api/bug → { "success": true, "data": [{ id, data: { title, severity } }] }

CHECK 9 — Update entity:
  curl -X PUT -H "Content-Type: application/json" \
    -H "X-App-Id: <uuid>" -H "X-User-Id: <uuid>" \
    -d '{"data":{"severity":"low"}}' \
    http://localhost:4000/api/bug/<id>
  Expected: { "success": true, "data": { data: { title: "Test bug", severity: "low" } } }

CHECK 10 — Delete entity:
  curl -X DELETE -H "X-App-Id: <uuid>" -H "X-User-Id: <uuid>" \
    http://localhost:4000/api/bug/<id>
  Expected: { "success": true }

CHECK 11 — Validation error on create:
  POST /api/bug with { "data": { "title": 123 } }
  Expected: 400, { "error": "VALIDATION_ERROR", "details": [...] }

CHECK 12 — Missing auth returns 401:
  curl http://localhost:4000/api/bug (no X-User-Id header)
  Expected: 401

CHECK 13 — Rate limiting:
  Send 101 requests in 60 seconds to /api/bug
  Expected: 101st returns 429

CHECK 14 — Invalid config prevents boot:
  Set backend/config/app.json to { "version": "1.0" } (no entities)
  npm run dev → Boot fails with validation error

CHECK 15 — RouterEngine hot-swap works:
  Verify routerEngine.replaceRoutes() creates new Router
  Old router routes no longer active after swap

CHECK 16 — Steps 0-2 regression:
  Migration tables intact, ensureEntityTable still works
</verification>
```
