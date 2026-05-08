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
You are building Step 1 of ConfigForge — a production-grade config-driven AI
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
  - Runtime interpretation: Config interpreted at runtime, NOT compiled to code
  - Config validation: Fail-fast — entire config rejected if ANY error exists
  - Zod schema is the source of truth for runtime validation
  - Identifier regex: /^[a-zA-Z_][a-zA-Z0-9_]*$/ for entity/field names
  - Path regex: /^\/[a-zA-Z0-9\-\/]*$/ for page paths
  - Config max size: 256KB enforced at load time
  - auth.methods: z.array(z.enum(["email","google"])).min(1).default(["email"])
  - No partial rendering — invalid config means zero execution
  - Normalization happens ONCE at boot/reload, never per request
  - Notification recipients are config-driven, not hardcoded
  - Duplicate select field options are detected and rejected at validation time
  - Field types enum: ["text", "number", "date", "select", "boolean"] — closed but documented for extension
</project>

<context>
Step 0 is complete. The project has:
  - frontend/ and backend/ directories scaffolded with all dependencies
  - PostgreSQL connected via Knex, pool min:2 max:10
  - Migration creating apps, users, app_users, config_snapshots tables
  - Health check endpoint (GET /health)
  - Pino structured logger with request IDs
  - TypeScript compiling cleanly in both directories
  - Dockerfile and docker-compose.yml for containerized deployment

This step builds the config validation pipeline — the foundation that every
subsequent step depends on. If validation is wrong, everything else fails.

Key documentation references:
  1. documentation_02.md — Sections 3.1–3.4 (ValidationResult, Zod schema,
     semantic validation, validation pipeline)
  2. documentation_03.md — ALL sections (authoritative Zod schema, semantic
     rules, worked examples, failure modes)
  3. documentation_02.md — Section 4 (normalizeConfig)
</context>

<task>
Implement Step 1: Config Validation Pipeline. This step produces the complete
validation system that all future steps rely on.

Step 1 implements:
  - The authoritative Zod schema (configSchema) with all sub-schemas
  - Type exports: Config, RuntimeConfig, ValidationResult, ValidationError
  - Semantic validation (cross-field consistency checks) — 6 rules total
  - The validateConfig() pipeline function (Zod → semantic → result)
  - The normalizeConfig() function (defaults, label fallback)
  - Config file loader with 256KB size enforcement
  - buildZodSchema() — dynamic Zod schema builder for entity field validation
  - Diff engine: diffConfigs(), isBreaking(), 7 change types

Step 1 does NOT implement:
  - Route registration or CRUD handlers
  - Frontend components
  - Authentication
  - Database entity table creation
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

GROUP 1 — Core Types
  backend/src/core/types.ts         ← ValidationError, ValidationResult<T>,
                                        Config (z.infer<typeof configSchema>),
                                        RuntimeConfig (same as Config after normalization),
                                        Entity, Field, Page, Features, EventPayload types.
                                        Features now includes:
                                          csv_import: boolean
                                          notifications: { on_create?: boolean, on_update?: boolean, on_delete?: boolean }
                                          notification_recipients?: string[]

GROUP 2 — Zod Schema
  backend/src/core/validator.ts     ← fieldSchema, entitySchema, pageSchema,
                                        configSchema (strict mode, all regexes),
                                        semanticValidate() function,
                                        validateConfig() pipeline function.
                                        Exact schema from documentation_03.md Section 3:
                                        - fieldSchema: id (nameRegex), type (5 enum values),
                                          label (max 120, optional), options (optional),
                                          validation object (required bool, maxLength int)
                                        - entitySchema: name (nameRegex), fields (min 1)
                                        - pageSchema: path (pathRegex), type (4 enum values),
                                          entity (nameRegex)
                                        - configSchema: version (semver regex), app.name
                                          (1-120 chars), auth.methods, entities (min 1),
                                          pages (min 1), features with:
                                            csv_import: boolean
                                            notifications: { on_create?, on_update?, on_delete? }
                                            notification_recipients?: z.array(z.string().email())
                                        All schemas use .strict()

GROUP 3 — Normalizer
  backend/src/core/normalizer.ts    ← normalizeConfig(config: Config): RuntimeConfig
                                        - Sets field.label to field.id if missing
                                        - Sets field.validation to {} if missing
                                        - Sets features.notifications to {} if missing
                                        - Sets notification_recipients to [] if missing
                                        - Called ONCE at boot/reload

GROUP 4 — Config Loader
  backend/src/core/configLoader.ts  ← loadConfig(path?: string): unknown
                                        - Default path: ./config/app.json
                                        - Reads file synchronously
                                        - Rejects files > 256KB
                                        - Returns parsed JSON

GROUP 5 — Dynamic Schema Builder
  backend/src/db/schemaBuilder.ts   ← buildZodSchema(entity: Entity): z.ZodObject
                                        - Maps field types to Zod validators:
                                          text → z.string()
                                          number → z.number()
                                          boolean → z.boolean()
                                          date → z.string().datetime()
                                          select → z.enum(field.options) — deduplicate options first
                                          default → z.any()
                                        - Applies required/optional per field.validation
                                        - Returns z.object(shape)

GROUP 6 — Diff Engine
  backend/src/core/diff.ts         ← ChangeType union type (7 types),
                                        ConfigChange interface,
                                        diffConfigs(old, new): ConfigChange[],
                                        isBreaking(change): boolean
                                        Change types: ADD_ENTITY, REMOVE_ENTITY,
                                        ADD_FIELD, REMOVE_FIELD, CHANGE_FIELD_TYPE,
                                        ADD_PAGE, REMOVE_PAGE
                                        Breaking = REMOVE_FIELD | CHANGE_FIELD_TYPE | REMOVE_ENTITY

GROUP 7 — Test Config
  backend/config/app.json           ← Valid Bug Tracker config from documentation_01.md:
                                        version "1.0", app.name "Bug Tracker",
                                        auth.methods ["email","google"],
                                        one entity "bug" with 4 fields (title, severity, assignee, resolved),
                                        two pages (/bugs, /bugs/new),
                                        features with csv_import true + notifications { on_create: true, on_update: false }
                                        notification_recipients: ["admin@example.com"]
</output_requirements>

<implementation_rules>
RULE 1 — Every file compiles.
  No file may have an import that is not used. No file may have a
  declared variable that is not used. `npx tsc --noEmit` must succeed.

RULE 2 — Zod schema matches exact specification.
  The configSchema must use the exact field names, types, regexes,
  defaults, and constraints from the architecture. The
  authoritative regex patterns are:
    nameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/
    pathRegex = /^\/[a-zA-Z0-9\-\/]*$/
  auth.methods uses .min(1).default(["email"]).
  All object schemas use .strict() to reject unknown properties.

RULE 3 — Semantic validation catches ALL six rules.
  1. page.entity must exist in entities
  2. select fields must have options array with ≥1 option
  3. No duplicate entity names
  4. No duplicate field IDs within an entity
  5. No duplicate page paths
  6. select field options must not contain duplicate values

RULE 4 — validateConfig returns structured diagnostics.
  Return type is ValidationResult<Config>, never boolean:
  - Success: { success: true, data: Config, warnings: [] }
  - Failure: { success: false, errors: ValidationError[] }
  ValidationError = { path: string, message: string, severity: "error"|"warning" }

RULE 5 — Fail-fast means ALL errors collected then rejected.
  If Zod fails, return all Zod errors. If Zod passes but semantic
  validation finds errors, return all semantic errors. Never partially
  apply. Never return individual errors one at a time.

RULE 6 — normalizeConfig is idempotent.
  Running normalizeConfig twice on the same config produces the same
  output. It does not mutate the input. It returns a new object.

RULE 7 — buildZodSchema handles all 5 field types.
  text → z.string(), number → z.number(), boolean → z.boolean(),
  date → z.string().datetime(), select → z.enum(field.options).
  For select fields, deduplicate options before creating z.enum.
  Unknown types → z.any() (never crashes).

RULE 8 — Config loader enforces 256KB limit.
  If the file exceeds 256 * 1024 bytes, throw Error("CONFIG_TOO_LARGE")
  BEFORE attempting JSON.parse.

RULE 9 — Diff engine detects all 7 change types.
  Entity-level: ADD_ENTITY, REMOVE_ENTITY.
  Field-level: ADD_FIELD, REMOVE_FIELD, CHANGE_FIELD_TYPE.
  Page-level: ADD_PAGE, REMOVE_PAGE.
  Breaking check: REMOVE_FIELD, CHANGE_FIELD_TYPE, REMOVE_ENTITY.

RULE 10 — No circular imports.
  types.ts must not import from validator.ts. validator.ts may import
  from types.ts. All dependency arrows point downward.

RULE 11 — Export everything that other steps need.
  Future steps will import: validateConfig, normalizeConfig, loadConfig,
  buildZodSchema, diffConfigs, isBreaking, configSchema, Config,
  RuntimeConfig, ValidationResult, ValidationError, Entity, Field.

RULE 12 — Use pino logger from backend/src/lib/logger.ts.
  Import and use the logger: import { logger } from "../lib/logger"
  Log validation errors at 'warn' level, config load at 'info' level.
</implementation_rules>

<verification>
After completing all files, run these checks. ALL must pass:

CHECK 1 — TypeScript compiles:
  cd backend && npx tsc --noEmit → 0 errors

CHECK 2 — Valid config passes validation:
  Call validateConfig(require("../config/app.json"))
  Expected: { success: true, data: {...}, warnings: [] }

CHECK 3 — Missing entities fails:
  validateConfig({ version: "1.0", app: { name: "Test" }, entities: [], pages: [] })
  Expected: { success: false, errors: [{ path: "entities", ... }] }

CHECK 4 — Dangling page.entity fails:
  Config with page referencing entity "task" but no entity named "task"
  Expected: { success: false, errors: [{ path: "pages./tasks", message: "Entity 'task' does not exist" }] }

CHECK 5 — Select without options fails:
  Entity with field type "select" but no options array
  Expected: { success: false, errors: [{ message: "Select field requires options" }] }

CHECK 6 — Duplicate entity names fail:
  Config with two entities both named "bug"
  Expected: { success: false, errors: [{ message: "Duplicate entity name" }] }

CHECK 7 — SQL injection in entity name fails:
  Entity name: "task; DROP TABLE users;"
  Expected: Zod regex rejects at schema level

CHECK 8 — Duplicate select options fail:
  Entity with select field having options ["low", "low", "high"]
  Expected: { success: false, errors: [{ message: "Duplicate option in select field" }] }

CHECK 9 — normalizeConfig sets defaults:
  Field without label → label set to field.id after normalization
  Field without validation → validation set to {} after normalization

CHECK 10 — Config too large rejected:
  Create a string > 256KB, attempt loadConfig
  Expected: Error("CONFIG_TOO_LARGE")

CHECK 11 — buildZodSchema validates entity data:
  buildZodSchema(bugEntity).safeParse({ title: "test", severity: "high" })
  Expected: { success: true }

CHECK 12 — buildZodSchema rejects invalid data:
  buildZodSchema(bugEntity).safeParse({ title: 123, severity: "invalid" })
  Expected: { success: false }

CHECK 13 — diffConfigs detects added entity:
  diffConfigs(configA, configAWithNewEntity)
  Expected: [{ type: "ADD_ENTITY", entity: "task" }]

CHECK 14 — isBreaking identifies breaking changes:
  isBreaking({ type: "REMOVE_FIELD" }) → true
  isBreaking({ type: "ADD_FIELD" }) → false

CHECK 15 — auth.methods defaults to ["email"]:
  validateConfig with no auth section
  Expected: success, data.auth.methods === ["email"]

CHECK 16 — notification_recipients is optional:
  Config without notification_recipients
  Expected: success, data.features.notification_recipients === undefined

CHECK 17 — Steps 0 regression:
  Health check still returns OK, migration still works
</verification>
```
