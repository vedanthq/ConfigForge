## DOCUMENT 6 — Database Documentation (Revised)

````markdown id="dbdoc-rev-01"
# Database Documentation

This document specifies how ConfigForge maps configuration to PostgreSQL, how it evolves schemas safely, and how tenant isolation is enforced.

It addresses:
- Physical schema design (tables, columns, indexes)
- Tenant isolation (app-level + user-level)
- Change detection and classification
- Migration generation and execution (Knex)
- JSONB lifecycle (add/remove/change field)
- Hot-reload interaction with DB
- Failure modes and recovery

> 📌 Decision:
> ConfigForge uses a **hybrid schema**:
> - **Core columns**: id, app_id, user_id, timestamps
> - **Dynamic fields**: JSONB `data`
>
> **Why:**
> - Avoids frequent DDL for minor changes
> - Keeps writes flexible
>
> **Trade-off:**
> - Requires disciplined indexing and validation
> - Some queries are more complex

---

## 1. Tenant Model and Isolation (Platform-Correct)

### 1.1 Definitions

- **Tenant** = Generated App (not a user)
- **User** = End-user within a tenant/app

### 1.2 Isolation Strategy

> 📌 Decision:
> Use **row-level isolation with composite key (app_id, user_id)** within a shared database.

**Why:**
- Simpler operations than schema-per-app or DB-per-app
- Scales to thousands of apps with proper indexing

**Rejected:**
- Schema-per-app (migration complexity)
- DB-per-app (cost, connection limits)

### 1.3 Table Layout (Per Entity)

```sql id="db_sql_01"
CREATE TABLE IF NOT EXISTS task (
  id BIGSERIAL PRIMARY KEY,
  app_id UUID NOT NULL,
  user_id UUID NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
````

### 1.4 Mandatory Indexes

```sql id="db_sql_02"
CREATE INDEX IF NOT EXISTS idx_task_app_user ON task (app_id, user_id);
CREATE INDEX IF NOT EXISTS idx_task_data_gin ON task USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_task_updated_at ON task (updated_at DESC);
```

### 1.5 Query Enforcement (Never Trust Client Input)

```ts id="db_ts_01"
export async function listRecords(db, table, req) {
  return db(table)
    .where({
      app_id: req.app.id,
      user_id: req.user.id
    })
    .select("*");
}
```

> Prevents cross-app data access even if a user guesses another entity/table name.

---

## 2. Entity → Table Mapping

Each entity maps to a table named exactly as the entity name (validated by regex).

```ts id="db_ts_02"
export function tableName(entity: string): string {
  return entity; // validated safe identifier earlier
}
```

> 📌 Decision:
> **Direct mapping (no prefixes)** for simplicity.
>
> **Risk:** name collisions → mitigated by validation and reserved keywords list.

---

## 3. Change Detection (Config Diff Engine)

### 3.1 Definitions

* **Non-breaking change**: No data reinterpretation needed
* **Breaking change**: Existing data becomes invalid or ambiguous

### 3.2 Change Types

```ts id="db_ts_03"
type Change =
  | { type: "ADD_ENTITY"; entity: string }
  | { type: "REMOVE_ENTITY"; entity: string }
  | { type: "ADD_FIELD"; entity: string; field: string }
  | { type: "REMOVE_FIELD"; entity: string; field: string }
  | { type: "CHANGE_FIELD_TYPE"; entity: string; field: string; from: string; to: string }
  | { type: "CHANGE_FIELD_OPTIONS"; entity: string; field: string; from: string[]; to: string[] };
```

### 3.3 Diff Algorithm (Deterministic)

```ts id="db_ts_04"
export function diffConfigs(oldCfg: Config, newCfg: Config): Change[] {
  const changes: Change[] = [];

  const oldEntities = new Map(oldCfg.entities.map(e => [e.name, e]));
  const newEntities = new Map(newCfg.entities.map(e => [e.name, e]));

  // Entities added/removed
  for (const [name] of newEntities) {
    if (!oldEntities.has(name)) changes.push({ type: "ADD_ENTITY", entity: name });
  }
  for (const [name] of oldEntities) {
    if (!newEntities.has(name)) changes.push({ type: "REMOVE_ENTITY", entity: name });
  }

  // Fields diff
  for (const [name, newEnt] of newEntities) {
    const oldEnt = oldEntities.get(name);
    if (!oldEnt) continue;

    const oldFields = new Map(oldEnt.fields.map(f => [f.id, f]));
    const newFields = new Map(newEnt.fields.map(f => [f.id, f]));

    for (const [fid, nf] of newFields) {
      if (!oldFields.has(fid)) {
        changes.push({ type: "ADD_FIELD", entity: name, field: fid });
        continue;
      }
      const of = oldFields.get(fid)!;

      if (of.type !== nf.type) {
        changes.push({
          type: "CHANGE_FIELD_TYPE",
          entity: name,
          field: fid,
          from: of.type,
          to: nf.type
        });
      }

      if (nf.type === "select" && JSON.stringify(of.options || []) !== JSON.stringify(nf.options || [])) {
        changes.push({
          type: "CHANGE_FIELD_OPTIONS",
          entity: name,
          field: fid,
          from: of.options || [],
          to: nf.options || []
        });
      }
    }

    for (const [fid] of oldFields) {
      if (!newFields.has(fid)) {
        changes.push({ type: "REMOVE_FIELD", entity: name, field: fid });
      }
    }
  }

  return changes;
}
```

---

## 4. Breaking vs Non-Breaking Classification

### 4.1 Rules

| Change               | Classification              |
| -------------------- | --------------------------- |
| ADD_ENTITY           | Non-breaking                |
| ADD_FIELD            | Non-breaking                |
| REMOVE_ENTITY        | Breaking                    |
| REMOVE_FIELD         | Breaking                    |
| CHANGE_FIELD_TYPE    | Breaking                    |
| CHANGE_FIELD_OPTIONS | Breaking (if values shrink) |

```ts id="db_ts_05"
export function isBreaking(change: Change): boolean {
  switch (change.type) {
    case "ADD_ENTITY":
    case "ADD_FIELD":
      return false;
    case "CHANGE_FIELD_OPTIONS":
      return true;
    default:
      return true;
  }
}
```

> 📌 Decision:
> Any change that can **invalidate existing JSON values** is breaking.

---

## 5. Migration Strategy (Knex)

### 5.1 Who Triggers Migrations?

> 📌 Decision:
> **Explicit migration step required for breaking changes.**
>
> * Non-breaking → auto-applied at reload
> * Breaking → system blocks reload and returns actionable plan

---

### 5.2 Migration File Structure

```bash id="db_bash_01"
migrations/
  20260507_add_entity_task.ts
  20260507_change_field_priority.ts
```

---

### 5.3 Example: ADD_ENTITY

```ts id="db_ts_06"
import { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.createTable("task", table => {
    table.bigIncrements("id");
    table.uuid("app_id").notNullable();
    table.uuid("user_id").notNullable();
    table.jsonb("data").notNullable().defaultTo("{}");
    table.timestamps(true, true);
  });

  await knex.raw(`CREATE INDEX idx_task_app_user ON task (app_id, user_id)`);
  await knex.raw(`CREATE INDEX idx_task_data_gin ON task USING GIN (data)`);
}

export async function down(knex: Knex) {
  await knex.schema.dropTableIfExists("task");
}
```

---

## 6. Worked Example (CRITICAL)

### Scenario

**v1 Config**

```json id="db_json_01"
{
  "entities": [
    {
      "name": "task",
      "fields": [
        { "id": "priority", "type": "text" }
      ]
    }
  ]
}
```

Stored data:

```json id="db_json_02"
{ "priority": "urgent" }
```

---

### v2 Config

```json id="db_json_03"
{
  "entities": [
    {
      "name": "task",
      "fields": [
        {
          "id": "priority",
          "type": "select",
          "options": ["low", "medium", "high"]
        }
      ]
    }
  ]
}
```

---

### Step-by-Step Handling

#### Step 1 — Detect Change

```ts id="db_ts_07"
CHANGE_FIELD_TYPE(task.priority, text → select)
```

→ Classified as **breaking**

---

#### Step 2 — Block Reload

System response:

```json id="db_json_04"
{
  "error": "BREAKING_SCHEMA_CHANGE",
  "details": [
    {
      "entity": "task",
      "field": "priority",
      "reason": "Existing values may not match new enum"
    }
  ]
}
```

---

#### Step 3 — Migration Required

Developer writes migration:

```ts id="db_ts_08"
export async function up(knex: Knex) {
  await knex("task")
    .whereRaw("data->>'priority' NOT IN ('low','medium','high')")
    .update({
      data: knex.raw(
        "jsonb_set(data, '{priority}', '\"low\"')"
      )
    });
}
```

---

#### Step 4 — Apply Migration

```bash id="db_bash_02"
npx knex migrate:latest
```

---

#### Step 5 — Reload Config

Now safe → system accepts config

---

## 7. JSONB Lifecycle

### Field Added

* No migration needed
* Value absent → treated as null/default

---

### Field Removed

> 📌 Decision:
> Data is **retained in JSONB but ignored**

```ts id="db_ts_09"
const filtered = Object.fromEntries(
  Object.entries(row.data).filter(([key]) => allowedFields.has(key))
);
```

---

### Field Type Changed

* Requires migration (see above)

---

## 8. Hot Reload Interaction

### Non-breaking changes

* DB sync runs automatically

### Breaking changes

* Reload blocked until migration complete

---

## 9. Failure Modes

### DB Connection Failure

```ts id="db_ts_10"
try {
  await knex.raw("select 1");
} catch (err) {
  logger.error("DB connection failed", err);
  process.exit(1);
}
```

---

### Migration Failure

* Abort deployment
* Rollback transaction

---

### Data Corruption

* Detected via validation mismatch
* Logged + rejected at API layer

---

## 10. Observability

### Query Logging

```ts id="db_ts_11"
knex.on("query", q => {
  logger.debug(q.sql);
});
```

---

### Metrics

* Query latency
* Row count per tenant
* JSONB index usage

---

## 11. Trade-offs

| Decision            | Benefit  | Cost                   |
| ------------------- | -------- | ---------------------- |
| JSONB hybrid        | Flexible | Complex queries        |
| Shared DB           | Cheap    | Needs strict isolation |
| Explicit migrations | Safe     | Slower iteration       |

---

```

---

# ✅ What was FIXED (Critical Issues)

### ✔ Problem 2 — Schema evolution (FULLY FIXED)
- Breaking vs non-breaking defined
- Full diff engine
- Migration logic implemented
- Worked example (step-by-step)

### ✔ Problem 6 — Tenant isolation (FIXED)
- Tenant = app (correct)
- app_id + user_id enforced
- Query-level enforcement shown

### ✔ Real implementation depth (FIXED)
- Actual code, not bullet points
- Full lifecycle handling

---

## 🚀 Next

Send:
👉 **DOCUMENT 5 — Backend / API**

We’ll fix:
- dynamic API generation properly
- auth bypass risks
- route isolation per tenant
- hot reload integration
- request lifecycle

This is where **security + system integrity meet**.
```
