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
You are building Step 2 of ConfigForge — a production-grade config-driven AI
App Generator Platform, written in TypeScript.

Finalized project facts (do not deviate from these):
  Frontend framework:  Next.js 14 (App Router)
  Backend runtime:     Node.js + Express
  Language:            TypeScript (strict mode)
  Database:            PostgreSQL 15+ with JSONB
  ORM / Query Builder: Knex.js
  Validation:          Zod
  Logging:             Pino (structured JSON logging)

Architecture decisions now locked:
  - Entity storage: JSONB hybrid — fixed columns (id, app_id, user_id,
    data, created_at, updated_at) + dynamic JSONB data column
  - Entity table names come from validated config entity names
  - Table names validated against /^[a-zA-Z_][a-zA-Z0-9_]*$/ BEFORE any SQL
  - All queries use Knex parameterized builder — NEVER raw SQL interpolation
  - Entity tables created via ensureEntityTable() at boot, NOT via migrations
  - Diff engine classifies changes as breaking or non-breaking
  - Breaking changes: REMOVE_FIELD, CHANGE_FIELD_TYPE, REMOVE_ENTITY
  - Non-breaking changes: ADD_ENTITY, ADD_FIELD, ADD_PAGE, REMOVE_PAGE
  - Tables are NEVER dropped on config change — manual DBA operation only
  - config_snapshots table stores config version history for rollback
</project>

<context>
Step 0 is complete: project scaffolded, database connected, system tables exist.
Step 1 is complete: config validation pipeline works — validateConfig(),
normalizeConfig(), loadConfig(), buildZodSchema(), diffConfigs(), isBreaking().

This step connects config to the database — creating entity tables dynamically
and providing the schema builder that CRUD handlers will use.

Key documentation references:
  1. documentation_06.md — Section 3 (Entity Table Structure), Section 4
     (Dynamic Table Creation), Section 5 (Diff Engine)
  2. documentation_06.md — Section 3.3 (Query Patterns), Section 3.4
     (JSONB Indexing)
  3. documentation_05.md — Section 7.1 (buildZodSchema)

The entity table structure is:
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  app_id      UUID NOT NULL REFERENCES apps(id)
  user_id     UUID NOT NULL REFERENCES users(id)
  data        JSONB NOT NULL DEFAULT '{}'
  created_at  TIMESTAMP DEFAULT NOW()
  updated_at  TIMESTAMP DEFAULT NOW()
  INDEX on (app_id, user_id)
  GIN INDEX on data
</context>

<task>
Implement Step 2: Database Engine. This step connects the config validation
system (Step 1) to PostgreSQL, creating entity tables dynamically and
providing the query infrastructure for CRUD handlers.

Step 2 implements:
  - ensureEntityTable(entityName) — creates table if not exists
  - syncDatabase(config) — ensures all entity tables exist for current config
  - Composite index on (app_id, user_id) for each entity table
  - GIN index on data column for JSONB queries
  - Automatic updated_at handling (Knex lifecycle or trigger)
  - Config snapshot storage helper for the config_snapshots table

Step 2 does NOT implement:
  - CRUD handlers or route registration
  - Frontend components
  - Authentication
  - Config reload logic
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

GROUP 1 — Database Schema Builder
  backend/src/db/schemaBuilder.ts   ← Complete file with:
                                        ensureEntityTable(entityName: string, trx?: Knex.Transaction):
                                          - Validates name against SAFE_IDENTIFIER regex
                                          - Checks if table exists via db.schema.hasTable()
                                          - Creates table with exact structure:
                                            id UUID PK DEFAULT gen_random_uuid()
                                            app_id UUID NOT NULL REFERENCES apps(id)
                                            user_id UUID NOT NULL REFERENCES users(id)
                                            data JSONB NOT NULL DEFAULT '{}'
                                            created_at TIMESTAMP DEFAULT NOW()
                                            updated_at TIMESTAMP DEFAULT NOW()
                                          - Adds composite index on (app_id, user_id)
                                          - Adds GIN index on data column
                                          - Returns true if created, false if existed
                                        syncDatabase(config: RuntimeConfig):
                                          - Iterates config.entities
                                          - Calls ensureEntityTable for each
                                          - Returns { created: string[], existed: string[] }
                                        saveConfigSnapshot(appId: string, config: RuntimeConfig, version: number):
                                          - Inserts into config_snapshots table
                                          - Returns the snapshot record
                                        getConfigSnapshots(appId: string, limit?: number):
                                          - Queries config_snapshots by app_id
                                          - Ordered by version DESC
                                          - Limited to 10 by default
                                        buildZodSchema(entity: Entity) already exists from Step 1

GROUP 2 — Database Connection (verify exists)
  backend/src/db/connection.ts     ← Verify this file exists from Step 0.
                                        Should export Knex instance with pool min:2 max:10.
                                        No changes needed unless errors found.
</output_requirements>

<implementation_rules>
RULE 1 — Every file compiles.
  `npx tsc --noEmit` must succeed after all changes.

RULE 2 — Identifier validation before ANY table operation.
  ensureEntityTable() MUST validate the entity name against
  /^[a-zA-Z_][a-zA-Z0-9_]*$/ BEFORE calling db.schema.hasTable().
  Throw Error("INVALID_TABLE_NAME") if validation fails.

RULE 3 — Entity tables match exact structure.
  Every entity table has exactly these columns:
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
    app_id     UUID NOT NULL REFERENCES apps(id)
    user_id    UUID NOT NULL REFERENCES users(id)
    data       JSONB NOT NULL DEFAULT '{}'
    created_at TIMESTAMP (via table.timestamp("created_at").defaultTo(db.fn.now()))
    updated_at TIMESTAMP (via table.timestamp("updated_at").defaultTo(db.fn.now()))

RULE 4 — Indexes are created with the table.
  Each entity table gets:
    - Composite index on (app_id, user_id)
    - GIN index on data column for JSONB queries
  Index names follow pattern: idx_{entity}_app_user, idx_{entity}_data

RULE 5 — ensureEntityTable is idempotent.
  Calling it twice with the same entity name does not error and does
  not create duplicate tables or indexes. Use db.schema.hasTable() check.

RULE 6 — syncDatabase processes ALL entities.
  syncDatabase iterates the entire config.entities array and calls
  ensureEntityTable for each. It does not skip entities that already
  have tables — idempotency handles that.

RULE 7 — No raw SQL interpolation.
  All table creation uses Knex schema builder methods. The only
  db.raw() calls are for gen_random_uuid() default value and GIN index.
  Entity names are validated BEFORE being passed to db.schema.createTable().

RULE 8 — Tables are NOT dropped on config change.
  If an entity is removed from config, its table remains in the
  database. Table deletion is a manual DBA operation, not automated.
  ensureEntityTable only CREATES, never DROPS.

RULE 9 — Export for future steps.
  Export: ensureEntityTable, syncDatabase, buildZodSchema,
  saveConfigSnapshot, getConfigSnapshots.
  These will be imported by Step 3 (API generator), Step 8 (reload),
  and Step 11 (final audit).

RULE 10 — Config snapshots are versioned.
  saveConfigSnapshot checks for duplicate (app_id, version) before inserting.
  Versions are integers (millisecond timestamps from Date.now()).
  Snapshots enable rollback to previous config versions.
</implementation_rules>

<verification>
After completing all files, run these checks. ALL must pass:

CHECK 1 — TypeScript compiles:
  cd backend && npx tsc --noEmit → 0 errors

CHECK 2 — Entity table created:
  Call ensureEntityTable("bug") then check \dt
  Expected: "bug" table exists with id, app_id, user_id, data, timestamps

CHECK 3 — Table has correct columns:
  \d bug → id(uuid), app_id(uuid NOT NULL), user_id(uuid NOT NULL),
  data(jsonb NOT NULL), created_at(timestamp), updated_at(timestamp)

CHECK 4 — Indexes exist:
  \di → idx_bug_app_user on bug(app_id, user_id)
  \di → idx_bug_data GIN index on bug(data)

CHECK 5 — Idempotent — no error on second call:
  Call ensureEntityTable("bug") twice → no error, one table

CHECK 6 — Invalid name rejected:
  ensureEntityTable("task; DROP TABLE apps;") → Error("INVALID_TABLE_NAME")

CHECK 7 — syncDatabase creates all entities:
  Call syncDatabase(config) with two entities (bug, task)
  Expected: Both tables exist

CHECK 8 — Foreign keys work:
  INSERT INTO bug (app_id, user_id, data) VALUES ('nonexistent-uuid', ...)
  Expected: Foreign key violation error

CHECK 9 — JSONB default works:
  INSERT INTO bug (app_id, user_id) VALUES (valid_app_id, valid_user_id)
  Expected: data column defaults to '{}'

CHECK 10 — Config snapshot saved:
  saveConfigSnapshot(appId, config, 1234567890)
  Expected: config_snapshots table has new row with version 1234567890

CHECK 11 — Config snapshots retrieved:
  getConfigSnapshots(appId) → array ordered by version DESC

CHECK 12 — Steps 0-1 regression:
  Health check OK, validateConfig works, migration tables intact
</verification>
```
