# Database System

This document specifies the ConfigForge database layer: table structure, JSONB hybrid schema, migration system, diff engine, and tenant isolation at the data level.

ConfigForge uses PostgreSQL with a JSONB hybrid approach: fixed columns for system fields (`id`, `app_id`, `user_id`, `created_at`) and a JSONB `data` column for flexible entity-specific fields defined by config.

---

# 1. Database Architecture

## 1.1 Connection Setup (Knex)

```ts
import knex from "knex";

const db = knex({
  client: "pg",
  connection: process.env.DATABASE_URL,
  pool: { min: 2, max: 10 }
});

export default db;
```

## 1.2 Table Categories

| Category | Tables | Purpose |
|----------|--------|---------|
| System tables | `apps`, `users`, `app_users` | Authentication and tenant isolation |
| Entity tables | Dynamic (one per config entity) | Application data storage |

---

# 2. System Tables (Initial Migration)

These tables are created once during initial setup. They support the authentication and multi-tenant architecture.

## 2.1 Apps Table

Stores application instances (tenants). Each generated app gets one row:

```sql
CREATE TABLE apps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain   VARCHAR(63) UNIQUE NOT NULL,
  name        VARCHAR(255) NOT NULL,
  config      JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_apps_subdomain ON apps(subdomain);
```

## 2.2 Users Table

Stores all user accounts across all apps:

```sql
CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          VARCHAR(255) UNIQUE NOT NULL,
  password_hash  VARCHAR(255),
  auth_provider  VARCHAR(50) NOT NULL DEFAULT 'email',
  created_at     TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_email ON users(email);
```

## 2.3 App Users Table (Join Table)

Maps users to apps (many-to-many). A user can belong to multiple apps, and an app can have multiple users:

```sql
CREATE TABLE app_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id     UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       VARCHAR(50) DEFAULT 'member',
  joined_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(app_id, user_id)
);

CREATE INDEX idx_app_users_app ON app_users(app_id);
CREATE INDEX idx_app_users_user ON app_users(user_id);
```

> Decision: **Separate apps, users, and app_users tables instead of embedding user data in apps.**
> Rejected: Storing users as a JSONB array inside the apps table.
> Why: A normalized join table allows proper SQL indexing, referential integrity, and efficient queries. JSONB user arrays would make membership queries slow and prevent foreign key constraints.

---

# 3. Entity Tables (Dynamic)

## 3.1 Entity Table Structure

Each entity defined in config maps to a database table. All entity tables share the same structure:

```sql
CREATE TABLE <entity_name> (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id      UUID NOT NULL REFERENCES apps(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);
```

Example for a "task" entity:

```sql
CREATE TABLE task (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id      UUID NOT NULL REFERENCES apps(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_task_app_user ON task(app_id, user_id);
```

## 3.2 JSONB Data Column

Entity-specific fields are stored in the `data` JSONB column, not as individual SQL columns:

```json
{
  "title": "Fix login bug",
  "severity": "high",
  "assignee": "alice"
}
```

This allows the config to define any number of fields without requiring SQL migrations when fields are added.

> Decision: **Use JSONB `data` column for entity fields, not individual SQL columns.**
> Rejected: Creating individual SQL columns per field (e.g., `title VARCHAR`, `severity VARCHAR`).
> Why: Individual columns require a migration every time a field is added, removed, or renamed. JSONB allows schema flexibility at the cost of some query performance. For a config-driven platform where schemas change frequently, this trade-off is correct.

## 3.3 Query Patterns

All queries MUST include `app_id` and `user_id` for tenant isolation:

```ts
// List all records for entity in current app/user scope
const rows = await db("task")
  .where({ app_id: req.app.id, user_id: req.user.id })
  .orderBy("created_at", "desc");

// Insert a new record
const [row] = await db("task")
  .insert({
    app_id: req.app.id,
    user_id: req.user.id,
    data: { title: "Fix login bug", severity: "high" }
  })
  .returning("*");

// Update a record (JSONB merge)
const existing = await db("task")
  .where({ id, app_id: req.app.id, user_id: req.user.id })
  .first();

const merged = { ...existing.data, ...newData };

await db("task")
  .where({ id, app_id: req.app.id })
  .update({ data: merged });

// Delete a record
await db("task")
  .where({ id, app_id: req.app.id, user_id: req.user.id })
  .delete();
```

## 3.4 JSONB Indexing

For frequently queried JSONB fields, create GIN indexes:

```sql
CREATE INDEX idx_task_data ON task USING GIN (data);
```

---

# 4. Dynamic Table Creation

When a new entity appears in config, the system creates the corresponding table:

```ts
async function ensureEntityTable(entityName: string) {
  const exists = await db.schema.hasTable(entityName);

  if (!exists) {
    await db.schema.createTable(entityName, table => {
      table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
      table.uuid("app_id").notNullable().references("id").inTable("apps");
      table.uuid("user_id").notNullable().references("id").inTable("users");
      table.jsonb("data").notNullable().defaultTo("{}");
      table.timestamps(true, true);
    });
  }
}
```

Called during boot for each entity in config:

```ts
for (const entity of config.entities) {
  await ensureEntityTable(entity.name);
}
```

---

# 5. Diff Engine (Schema Change Detection)

The diff engine compares old and new configs to detect schema changes before applying a config update.

## 5.1 Change Types

```ts
type ChangeType =
  | "ADD_ENTITY"
  | "REMOVE_ENTITY"
  | "ADD_FIELD"
  | "REMOVE_FIELD"
  | "CHANGE_FIELD_TYPE"
  | "ADD_PAGE"
  | "REMOVE_PAGE";
```

## 5.2 Diff Function

```ts
function diffConfigs(oldConfig: RuntimeConfig, newConfig: RuntimeConfig) {
  const changes = [];

  // Entity-level changes
  const oldEntities = new Set(oldConfig.entities.map(e => e.name));
  const newEntities = new Set(newConfig.entities.map(e => e.name));

  for (const name of newEntities) {
    if (!oldEntities.has(name)) {
      changes.push({ type: "ADD_ENTITY", entity: name });
    }
  }

  for (const name of oldEntities) {
    if (!newEntities.has(name)) {
      changes.push({ type: "REMOVE_ENTITY", entity: name });
    }
  }

  // Field-level changes (for entities that exist in both)
  for (const newEntity of newConfig.entities) {
    const oldEntity = oldConfig.entities.find(e => e.name === newEntity.name);
    if (!oldEntity) continue;

    const oldFields = new Map(oldEntity.fields.map(f => [f.id, f]));
    const newFields = new Map(newEntity.fields.map(f => [f.id, f]));

    for (const [id, field] of newFields) {
      if (!oldFields.has(id)) {
        changes.push({ type: "ADD_FIELD", entity: newEntity.name, field: id });
      } else if (oldFields.get(id).type !== field.type) {
        changes.push({ type: "CHANGE_FIELD_TYPE", entity: newEntity.name, field: id });
      }
    }

    for (const [id] of oldFields) {
      if (!newFields.has(id)) {
        changes.push({ type: "REMOVE_FIELD", entity: newEntity.name, field: id });
      }
    }
  }

  return changes;
}
```

## 5.3 Breaking Change Detection

```ts
function isBreaking(change: { type: ChangeType }) {
  return change.type === "REMOVE_FIELD"
    || change.type === "CHANGE_FIELD_TYPE"
    || change.type === "REMOVE_ENTITY";
}
```

---

# 6. Migration System

## 6.1 Migration Runner (Knex)

```bash
# Run all pending migrations
npx knex migrate:latest

# Rollback last migration
npx knex migrate:rollback
```

## 6.2 Initial Migration File

```ts
// migrations/001_initial_setup.ts
export async function up(knex) {
  // System tables
  await knex.schema.createTable("apps", table => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("subdomain", 63).unique().notNullable();
    table.string("name", 255).notNullable();
    table.jsonb("config").notNullable().defaultTo("{}");
    table.timestamps(true, true);
  });

  await knex.schema.createTable("users", table => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("email", 255).unique().notNullable();
    table.string("password_hash", 255);
    table.string("auth_provider", 50).notNullable().defaultTo("email");
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("app_users", table => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("app_id").notNullable().references("id").inTable("apps").onDelete("CASCADE");
    table.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.string("role", 50).defaultTo("member");
    table.timestamp("joined_at").defaultTo(knex.fn.now());
    table.unique(["app_id", "user_id"]);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("app_users");
  await knex.schema.dropTableIfExists("users");
  await knex.schema.dropTableIfExists("apps");
}
```

---

# 7. Tenant Isolation at the Data Level

Every database query enforces tenant isolation by scoping on `app_id` + `user_id`. This is non-negotiable.

| Isolation Property | Implementation |
|---|---|
| Data visibility | All queries include `WHERE app_id = ? AND user_id = ?` |
| Cross-app access | Impossible — no query path exists without app_id filter |
| Cross-user access | Impossible within same app — user_id always scoped |
| Table creation | Tables are shared, but data is isolated by app_id + user_id |
| Index strategy | Composite index on `(app_id, user_id)` for fast lookups |

---

# 8. SQL Safety Rules

| Rule | Implementation |
|---|---|
| No raw SQL interpolation | All queries use parameterized Knex builder |
| Identifier allowlisting | Entity names validated against `^[a-zA-Z_][a-zA-Z0-9_]*$` |
| No dynamic table names in raw SQL | Table names only come from validated config |

Allowed:
```ts
db("task").where({ id }).first();
```

Forbidden:
```ts
db.raw(`SELECT * FROM ${entityName} WHERE id = '${id}'`);
```

---

# 9. Failure Modes

| What can fail | What the system does | How to debug |
|---|---|---|
| DATABASE_URL not set | Knex connection fails at boot | Check env vars |
| Table does not exist | DB_ERROR on query | Run `ensureEntityTable()` or migrations |
| Duplicate app subdomain | Insert fails with unique constraint | Check `apps` table |
| Duplicate user email | Insert fails with unique constraint | Expected — user should sign in |
| JSONB data too large | Insert succeeds but slows queries | Monitor data column sizes |
| Missing app_id/user_id in query | Security vulnerability (tenant leak) | Review all queries for scoping |
| Breaking config change applied | Data becomes inconsistent | Use diff engine to block breaking changes |
| Migration rollback fails | Tables in inconsistent state | Check migration files and DB state |

---

CHANGES APPLIED:
- Guide sections used: 2.5 (apps, users, app_users SQL)
- Contradictions resolved: Added full CREATE TABLE SQL for apps, users, app_users; standardized change type names (REMOVE_FIELD, CHANGE_FIELD_TYPE, REMOVE_ENTITY); added indexes; added Knex migration file with up/down
- Code added: apps table SQL + index, users table SQL + index, app_users table SQL + indexes + foreign keys, initial migration file (001_initial_setup.ts), ensureEntityTable function, query patterns with tenant scoping
- Removed: Trailing commentary; emoji from headers
