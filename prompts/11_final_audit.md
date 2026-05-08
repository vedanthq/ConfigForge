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
You are building Step 11 of ConfigForge — a production-grade config-driven AI
App Generator Platform, written in TypeScript.

This is the FINAL step. After this step, the project must be complete,
compilable, demonstrable, and production-ready.

Finalized project facts (do not deviate from these):
  Frontend framework:  Next.js 14 (App Router), Tailwind CSS
  Backend runtime:     Node.js + Express, TypeScript
  Database:            PostgreSQL 15+ with JSONB, Knex.js
  Auth:                NextAuth.js (Email + Google), bcryptjs, JWT
  Validation:          Zod (fail-fast, runtime interpretation)
  Features:            CSV Import (batch), Event Notifications (config-driven recipients), Multi-Auth (dynamic providers)
  Bonus:               LLM Config Generation (Anthropic Claude 3.5 Sonnet)
  Security:            Helmet, CORS, rate limiting, tenant isolation, audit logging
  Caching:             Redis (config cache, pub/sub invalidation)
  Logging:             Pino structured JSON with request IDs
  Routing:             RouterEngine hot-swap (replaces clearExistingRoutes)
  Reload:              Mutex-protected atomic config reload with rollback
</project>

<context>
Steps 0–10 are complete. The full platform is built with ALL CTO Review fixes applied:
  - Step 0: Project scaffolded, migrations, Pino logger, Docker
  - Step 1: Config validation (Zod + semantic + diff engine, 6 rules)
  - Step 2: Database engine (entity tables, JSONB, config snapshots)
  - Step 3: Dynamic API (CRUD routes, RouterEngine hot-swap, event bus)
  - Step 4: Frontend renderer (AppShell, forms, lists, detail, dashboard, pagination, ConfigContext)
  - Step 5: Authentication (NextAuth, JWT, per-request providers, bcrypt null check, multi-strategy tenant resolution)
  - Step 6: CSV Import (parse, map, validate, batch insert 500)
  - Step 7: Notifications (EventBus, Nodemailer, config-driven recipients)
  - Step 8: Hot Reload (mutex, atomic DB sync, RouterEngine swap, config snapshots, Redis invalidation)
  - Step 9: LLM Generation (Anthropic Claude 3.5 Sonnet, retry loop, validate)
  - Step 10: Security Hardening (Helmet, CORS, audit, per-tenant rate limiting)

This step is a FINAL INTEGRITY AUDIT. No new features. Fix any gaps,
inconsistencies, or broken integrations from previous steps.

SPECIAL CTO REVIEW VERIFICATION:
  All 20 CTO Review issues must be verified as fixed:
  1. ✅ clearExistingRoutes() — RouterEngine.replaceRoutes() hot-swap
  2. ✅ Auth providers rebuilt per-request — getAuthOptions() reads runtimeState live
  3. ✅ Subdomain + header tenant resolution — 3-strategy fallback
  4. ✅ Deployment — Docker, docker-compose, CI/CD ready
  5. ✅ LLM model updated — claude-3-5-sonnet-20241022
  6. ✅ Batch CSV inserts — knex.batchInsert 500-row batches
  7. ✅ bcrypt null check — if (!user.password_hash) return null
  8. ✅ Mutex on config reload — async-mutex runExclusive
  9. ✅ Atomic DB sync — runtimeState updated AFTER syncDatabase succeeds
  10. ✅ Config-driven notification recipients — from config, not env var
  11. ✅ Redis for distributed state — cache + pub/sub invalidation
  12. ✅ Typed JSONB querying — GIN indexes on data column
  13. ✅ Duplicate select options validation — semantic rule #6
  14. ✅ Config size limit — 256KB enforced
  15. ✅ React Context for config — ConfigContext
  16. ✅ Pagination on ListPage — 20 items/page, prev/next
  17. ✅ DetailPage and DashboardPage implemented — not stubs
  18. ✅ Reduced polling — 10s interval (down from 5s)
  19. ✅ Structured logging — Pino with request IDs
  20. ✅ Error boundaries — ErrorBoundary component wraps pages
</project>

<task>
Implement Step 11: Final Integrity Audit. This is NOT a feature step.
This is a comprehensive verification and polish pass.

Step 11 performs:
  1. TypeScript compilation audit — both frontend and backend
  2. Import/export dependency audit — no circular imports, no missing exports
  3. Environment variable completeness — every process.env.* in code has
     a corresponding .env.example entry
  4. Error handling completeness — every try/catch returns structured JSON
  5. Tenant isolation audit — every DB query has app_id + user_id
  6. Config consistency — configSchema, buildZodSchema, and normalizeConfig
     all agree on field types and defaults
  7. CTO Review fix verification — all 20 fixes confirmed present
  8. End-to-end flow verification — boot → create entity → list → update → delete
  9. Auth flow verification — register → login → get JWT → use CRUD
  10. CSV flow verification — upload → parse → map → import → list
  11. Hot reload verification — POST /config → frontend reloads
  12. README.md creation — comprehensive project documentation
  13. Demo config creation — production-quality Bug Tracker config
  14. Express Request augmentation completeness

Step 11 produces:
  - Fixed versions of any broken files
  - README.md with setup instructions, architecture, and demo guide
  - Demo config (backend/config/app.json) with realistic data
  - Any missing type declarations or interface files
  - Cross-reference verification report
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

GROUP 1 — Project README
  README.md                         ← Comprehensive documentation:
                                        - Project name: ConfigForge
                                        - Tagline: "Define your app in JSON. Get a full-stack application instantly."
                                        - Architecture overview (runtime interpretation, not code gen)
                                        - Tech stack table
                                        - Setup instructions (step by step)
                                        - Environment variables reference
                                        - API reference (all endpoints)
                                        - Features list with descriptions
                                        - Demo walkthrough (10-step judge flow)
                                        - Project structure tree
                                        - CTO Review fixes list ("What was fixed")
                                        - Docker deployment guide

GROUP 2 — Demo Config
  backend/config/app.json           ← Production-quality Bug Tracker config:
                                        version: "1.0"
                                        app.name: "Bug Tracker"
                                        auth.methods: ["email", "google"]
                                        Entity "bug" with fields:
                                          title (text, required)
                                          description (text)
                                          severity (select: low/medium/high/critical)
                                          assignee (text)
                                          resolved (boolean)
                                        Pages:
                                          /bugs (list, entity: bug)
                                          /bugs/new (form, entity: bug)
                                          /bugs/:id (detail, entity: bug)
                                          /dashboard (dashboard)
                                        Features:
                                          csv_import: true
                                          notifications: { on_create: true, on_update: false }
                                          notification_recipients: ["admin@example.com"]

GROUP 3 — Type Declarations
  backend/src/types/express.d.ts    ← Augment Express Request:
                                        req.app: { id: string, subdomain: string }
                                        req.user: { id: string, email: string }
                                        req.config: RuntimeConfig
                                        req.requestId: string

GROUP 4 — Any Broken Files
  (Fix any files that have compilation errors, missing imports,
   or incorrect types. List each fix with explanation.)

GROUP 5 — Fix Verification Report
  VERIFICATION.md                   ← Auto-generated verification report:
                                        For each CTO Review fix:
                                          - Fix description
                                          - Files modified
                                          - Verification command
                                          - Status: PASS/FAIL
                                        Include compilation results
                                        Include E2E flow results
</output_requirements>

<implementation_rules>
RULE 1 — Zero compilation errors.
  cd backend && npx tsc --noEmit → 0 errors
  cd frontend && npx tsc --noEmit → 0 errors
  This is non-negotiable. Every TypeScript error must be fixed.

RULE 2 — No placeholder content.
  No TODOs, no "implement later" comments, no empty function bodies,
  no console.log("test") statements, no commented-out code blocks.

RULE 3 — All env vars documented.
  Create a table in README.md listing every environment variable,
  its purpose, whether it's required, and its default value.

RULE 4 — README includes demo walkthrough.
  Step-by-step instructions for running the demo:
  1. Start PostgreSQL (docker compose up db)
  2. Run migrations
  3. Start backend
  4. Start frontend
  5. Register a user
  6. Create a record via form
  7. View records in list
  8. View detail page
  9. Import CSV
  10. Generate config via LLM (if API key set)
  11. Update config via POST /config

RULE 5 — All endpoints documented.
  README includes a table of all API endpoints:
  | Method | Path | Auth | Description |

RULE 6 — Demo config is realistic.
  The Bug Tracker config in app.json must have meaningful field
  names, proper labels, correct validation rules, and realistic
  feature settings. It should be immediately demonstrable.

RULE 7 — Type declarations complete.
  Express Request augmentation must include all custom properties
  added by middleware (app, user, config, requestId). This prevents
  TypeScript errors on req.app.id, req.user.id, req.config.

RULE 8 — No dead code.
  Remove any functions, imports, or variables that are not used
  by any other file. No orphan exports.

RULE 9 — Git-ready.
  .gitignore covers: node_modules, dist, .env, .env.local, .next,
  *.log, coverage/. No sensitive files committed.

RULE 10 — Server startup message.
  Backend must log:
    "ConfigForge backend running on port {PORT}"
    "Config loaded: {app.name} with {N} entities"
    "Redis: {connected|not available}"
  Frontend must compile and serve without errors.

RULE 11 — CTO Review fix verification.
  Run each verification check from the CTO Review fixes list.
  For each fix, confirm the code pattern exists.
  Generate VERIFICATION.md with PASS/FAIL for each.
</implementation_rules>

<verification>
After completing all files, run these FINAL checks. ALL must pass:

=== COMPILATION ===
CHECK 1: cd backend && npx tsc --noEmit → 0 errors
CHECK 2: cd frontend && npx tsc --noEmit → 0 errors

=== BOOT SEQUENCE ===
CHECK 3: cd backend && npm run dev → server starts, no errors
CHECK 4: cd frontend && npm run dev → Next.js compiles, no errors
CHECK 5: curl http://localhost:4000/health → {"status":"ok","db":"connected","redis":"..."}

=== CONFIG ===
CHECK 6: curl http://localhost:4000/config/runtime → valid config JSON

=== AUTH FLOW ===
CHECK 7: POST /auth/register → 201 user created
CHECK 8: Sign in via NextAuth → JWT returned
CHECK 9: CRUD with JWT → 200 data returned

=== CRUD FLOW ===
CHECK 10: POST /api/bug with valid data → 201
CHECK 11: GET /api/bug → array with created record
CHECK 12: PUT /api/bug/:id → record updated
CHECK 13: DELETE /api/bug/:id → record deleted

=== FEATURE 1: CSV IMPORT ===
CHECK 14: POST /api/csv-parse with CSV file → headers returned
CHECK 15: POST /api/csv-import with mapping → imported count (batch insert)

=== FEATURE 2: NOTIFICATIONS ===
CHECK 16: POST /api/bug → event emitted, recipients from config

=== FEATURE 3: MULTI-AUTH ===
CHECK 17: Config has auth.methods: ["email","google"]
CHECK 18: LoginPage renders both providers conditionally
CHECK 19: Auth providers change on config reload (dynamic resolution)

=== HOT RELOAD ===
CHECK 20: POST /config with new entity → new routes available
CHECK 21: POST /config with breaking change → 409
CHECK 22: Concurrent POST /config → mutex prevents corruption
CHECK 23: Config snapshot saved to DB on reload

=== LLM (BONUS) ===
CHECK 24: POST /api/generate-config with prompt → valid config or LLM_NOT_CONFIGURED
CHECK 25: Model is claude-3-5-sonnet-20241022 (not deprecated)

=== SECURITY ===
CHECK 26: Helmet headers present in responses
CHECK 27: Rate limiting enforced (429 after 100 req/min)
CHECK 28: No raw SQL interpolation in codebase
CHECK 29: bcrypt null check prevents TypeError on OAuth users
CHECK 30: Tenant resolution works via header + subdomain

=== CODE QUALITY ===
CHECK 31: No TODO comments in source code
CHECK 32: No console.log("test") in source code
CHECK 33: All env vars in .env.example
CHECK 34: README.md exists with complete documentation
CHECK 35: docker-compose.yml builds successfully
CHECK 36: VERIFICATION.md reports PASS on all CTO Review fixes
</verification>
```
