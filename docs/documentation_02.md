## DOCUMENT 2 — Architecture Overview (Revised)

````markdown
# Architecture Overview

## 1. Design Principles

ConfigForge is built as a **config-interpreting runtime**, not a code generator. All behavior is derived from a validated and normalized configuration object.

### Core Principles

1. **Fail-fast validation**
2. **Deterministic runtime state**
3. **Separation of concerns between layers**
4. **Tenant isolation at app level**
5. **Explicit lifecycle management (boot → run → reload)**

> 📌 Decision:
> The system **rejects partially valid configs** instead of running in degraded mode.
>
> **Why:**
> - Prevents undefined runtime behavior
> - Ensures consistency across UI/API/DB layers
>
> **Rejected Alternative:**
> Partial rendering (too complex, inconsistent state)

---

## 2. System Architecture (Detailed)

```mermaid
graph TD

A[Raw Config JSON] --> B[Validator (Zod)]
B -->|ValidationResult| C[Normalizer]

C --> D[Runtime Config]

D --> E[Frontend Renderer]
D --> F[API Generator]
D --> G[DB Engine]
D --> H[Auth System]

F --> I[HTTP Server]
G --> J[(PostgreSQL)]
H --> J

I --> K[Event System]
K --> L[Notifications]

subgraph Runtime Lifecycle
M[Boot] --> N[Run]
N --> O[Reload]
end
````

---

## 3. Config Validation System (Full Specification)

### 3.1 Validation Result Object

Validation does NOT return boolean. It returns structured diagnostics.

```ts
export type ValidationError = {
  path: string;
  message: string;
  severity: "error" | "warning";
};

export type ValidationResult<T> =
  | { success: true; data: T; warnings: ValidationError[] }
  | { success: false; errors: ValidationError[] };
```

---

### 3.2 Zod Schema (Simplified Core)

```ts
import { z } from "zod";

const fieldSchema = z.object({
  id: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  type: z.enum(["text", "number", "select", "date", "boolean"]),
  label: z.string().optional(),
  options: z.array(z.string()).optional(),
});

const entitySchema = z.object({
  name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  fields: z.array(fieldSchema),
});

const pageSchema = z.object({
  path: z.string().regex(/^\/[a-zA-Z0-9\/\-]*$/),
  type: z.enum(["list", "form", "detail", "dashboard"]),
  entity: z.string()
});

export const configSchema = z.object({
  version: z.string(),
  app: z.object({ name: z.string() }),
  auth: z.object({
    methods: z.array(z.enum(["email", "google"])).min(1).default(["email"])
  }).default({ methods: ["email"] }),
  entities: z.array(entitySchema),
  pages: z.array(pageSchema)
});
```

---

### 3.3 Semantic Validation Layer

After schema validation, semantic checks run:

```ts
export function semanticValidate(config: Config): ValidationError[] {
  const errors: ValidationError[] = [];

  const entityNames = new Set(config.entities.map(e => e.name));

  for (const page of config.pages) {
    if (!entityNames.has(page.entity)) {
      errors.push({
        path: `pages.${page.path}`,
        message: `Entity '${page.entity}' does not exist`,
        severity: "error"
      });
    }
  }

  return errors;
}
```

---

### 3.4 Validation Pipeline

```ts
export function validateConfig(raw: unknown): ValidationResult<Config> {
  const parsed = configSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.errors.map(e => ({
        path: e.path.join("."),
        message: e.message,
        severity: "error"
      }))
    };
  }

  const semanticErrors = semanticValidate(parsed.data);

  if (semanticErrors.some(e => e.severity === "error")) {
    return { success: false, errors: semanticErrors };
  }

  return {
    success: true,
    data: parsed.data,
    warnings: semanticErrors.filter(e => e.severity === "warning")
  };
}
```

---

## 4. Config Normalization

### Purpose

Convert user config → runtime-safe config with defaults applied.

```ts
export function normalizeConfig(config: Config): RuntimeConfig {
  return {
    ...config,
    entities: config.entities.map(e => ({
      ...e,
      fields: e.fields.map(f => ({
        ...f,
        label: f.label ?? f.id,
        validation: f.validation ?? {}
      }))
    }))
  };
}
```

> 📌 Decision:
> Normalization happens **once at boot/reload**, never per request.

---

## 5. Runtime Lifecycle

### 5.1 Boot Phase

```ts
export async function bootApp(config: RuntimeConfig) {
  await dbEngine.sync(config);
  apiEngine.registerRoutes(config);
  eventBus.initialize(config);
}
```

---

### 5.2 Run Phase

* Accept requests
* Serve UI
* Execute APIs

---

### 5.3 Reload Phase (Hot Reload Strategy)

> 📌 Decision:
> ConfigForge uses **graceful hot reload with version switching**

---

### Reload Flow

```ts
import EventEmitter from "events";

const configBus = new EventEmitter();

export function reloadConfig(newRawConfig: unknown) {
  const result = validateConfig(newRawConfig);

  if (!result.success) {
    throw new Error("Invalid config");
  }

  const newConfig = normalizeConfig(result.data);

  configBus.emit("config:reload", newConfig);
}
```

---

### Runtime Reaction

```ts
configBus.on("config:reload", async (newConfig) => {
  await dbEngine.sync(newConfig);
  apiEngine.rebuildRoutes(newConfig);
  runtimeState.config = newConfig;
});
```

---

### In-flight Requests Handling

> 📌 Decision:
> In-flight requests use **old config**, new requests use **new config**

Implementation:

```ts
app.use((req, res, next) => {
  req.config = runtimeState.config;
  next();
});
```

---

## 6. Frontend Sync Strategy

### Approach: Polling (Simple + Reliable)

```ts
setInterval(async () => {
  const res = await fetch("/config/version");
  if (res.version !== currentVersion) {
    window.location.reload();
  }
}, 5000);
```

> 📌 Decision:
> Polling chosen over WebSockets for simplicity.

---

## 7. Database Sync Strategy

> 📌 Decision:
> Schema changes are **NOT auto-applied on reload**

### Flow:

1. Detect config diff
2. Classify change:

   * Non-breaking → auto apply
   * Breaking → require migration

(Full logic defined in Database Documentation)

---

## 8. Tenant Isolation Model

### Definition

* **Tenant = Generated App**
* Multiple apps share same backend

---

### Isolation Strategy

> 📌 Decision:
> Use **composite isolation: app_id + user_id**

---

### Table Structure

```sql
CREATE TABLE task (
  id SERIAL PRIMARY KEY,
  app_id UUID NOT NULL,
  user_id UUID NOT NULL,
  data JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

### Query Enforcement

```ts
await db("task")
  .where({
    app_id: req.app.id,
    user_id: req.user.id
  });
```

---

### Why Not Schema-per-App?

Rejected because:

* Expensive at scale
* Hard to manage migrations

---

## 9. Failure Modes

### 9.1 Invalid Config

* System refuses to boot
* Logs validation errors

---

### 9.2 Reload Failure

* Reject new config
* Keep old config running

---

### 9.3 DB Sync Failure

* Abort reload
* Log critical error

---

### 9.4 Route Rebuild Failure

* Rollback to previous route set

---

## 10. Observability

### Logging

```ts
logger.info("Config loaded", { version: config.version });
logger.error("Validation failed", errors);
```

---

### Debugging Strategy

* Config logs
* Request logs
* DB query logs

---

## 11. Trade-offs Summary

| Decision             | Benefit             | Cost                   |
| -------------------- | ------------------- | ---------------------- |
| Fail-fast validation | Predictable runtime | Less flexibility       |
| Hot reload           | No downtime         | Complexity             |
| JSONB schema         | Flexible            | Query complexity       |
| Shared DB            | Simpler ops         | Needs strong isolation |
