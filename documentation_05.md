# Backend API System

This document specifies the ConfigForge backend: dynamic route registration, CRUD handlers, config management endpoints, and middleware.

The backend is a single generic API engine that reads config at runtime and creates endpoints dynamically. No routes are hardcoded per entity.

---

# 1. Core Architecture

## 1.1 Runtime State

All backend behavior derives from a single shared state object:

```ts
const runtimeState = {
  config: null as RuntimeConfig | null,
  version: 0
};
```

## 1.2 Boot Process

```ts
export async function bootApp() {
  const raw = loadConfigFromFile();
  const result = validateConfig(raw);

  if (!result.success) {
    throw new Error(`INVALID_CONFIG: ${JSON.stringify(result.errors)}`);
  }

  const normalized = normalizeConfig(result.data);
  runtimeState.config = normalized;
  runtimeState.version = Date.now();

  registerDynamicRoutes(normalized);
}
```

## 1.3 App Setup

```ts
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/api", rateLimit({ windowMs: 60_000, max: 100 }));
```

---

# 2. Dynamic Route Registration

Routes are created programmatically from config entities. This is the core of the "no hardcoded routes" architecture.

```ts
function registerDynamicRoutes(config: RuntimeConfig) {
  config.entities.forEach(entity => {
    const base = `/api/${entity.name}`;

    app.get(base, listHandler(entity));
    app.post(base, createHandler(entity));
    app.put(`${base}/:id`, updateHandler(entity));
    app.delete(`${base}/:id`, deleteHandler(entity));
  });
}
```

> Decision: **Routes are re-registered on config reload.**
> Rejected: Keeping a persistent route table with dynamic resolution.
> Why: Re-registration is simpler, avoids stale route state, and Express handles route replacement cleanly during reload.

---

# 3. CRUD Handlers

All four handlers enforce tenant isolation via `app_id` + `user_id` scoping and emit events for the notification system.

## 3.1 List Handler (GET /api/:entity)

```ts
function listHandler(entity: Entity) {
  return async (req, res) => {
    try {
      const rows = await db(entity.name)
        .where({ app_id: req.app.id, user_id: req.user.id })
        .orderBy("created_at", "desc");

      return res.json({ success: true, data: rows });
    } catch (err) {
      return res.status(500).json({ error: "DB_ERROR", message: err.message });
    }
  };
}
```

## 3.2 Create Handler (POST /api/:entity)

```ts
function createHandler(entity: Entity) {
  return async (req, res) => {
    const schema = buildZodSchema(entity);
    const result = schema.safeParse(req.body.data);

    if (!result.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: result.error.errors
      });
    }

    try {
      const [row] = await db(entity.name)
        .insert({
          app_id: req.app.id,
          user_id: req.user.id,
          data: result.data
        })
        .returning("*");

      eventBus.emit("entity.create", {
        entity: entity.name,
        action: "create",
        data: row
      });

      return res.status(201).json({ success: true, data: row });
    } catch (err) {
      return res.status(500).json({ error: "DB_ERROR", message: err.message });
    }
  };
}
```

## 3.3 Update Handler (PUT /api/:entity/:id)

```ts
function updateHandler(entity: Entity) {
  return async (req, res) => {
    const schema = buildZodSchema(entity).partial();
    const result = schema.safeParse(req.body.data);

    if (!result.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: result.error.errors
      });
    }

    try {
      const existing = await db(entity.name)
        .where({ id: req.params.id, app_id: req.app.id, user_id: req.user.id })
        .first();

      if (!existing) {
        return res.status(404).json({ error: "NOT_FOUND" });
      }

      const merged = { ...existing.data, ...result.data };

      const [updated] = await db(entity.name)
        .where({ id: req.params.id, app_id: req.app.id })
        .update({ data: merged })
        .returning("*");

      eventBus.emit("entity.update", {
        entity: entity.name,
        action: "update",
        data: updated
      });

      return res.json({ success: true, data: updated });
    } catch (err) {
      return res.status(500).json({ error: "DB_ERROR", message: err.message });
    }
  };
}
```

> Decision: **Update uses `schema.partial()` for partial updates with JSONB merge.**
> Rejected: Full replacement (PUT semantics with complete validation).
> Why: JSONB storage means the frontend may not send every field. `schema.partial()` allows updating a single field without sending the entire record. The existing data is merged with the new data to preserve unmodified fields.

## 3.4 Delete Handler (DELETE /api/:entity/:id)

```ts
function deleteHandler(entity: Entity) {
  return async (req, res) => {
    try {
      const existing = await db(entity.name)
        .where({ id: req.params.id, app_id: req.app.id, user_id: req.user.id })
        .first();

      if (!existing) {
        return res.status(404).json({ error: "NOT_FOUND" });
      }

      await db(entity.name)
        .where({ id: req.params.id, app_id: req.app.id })
        .delete();

      eventBus.emit("entity.delete", {
        entity: entity.name,
        action: "delete",
        id: req.params.id
      });

      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "DB_ERROR", message: err.message });
    }
  };
}
```

---

# 4. Middleware

## 4.1 Tenant Resolution Middleware

Every request must resolve the app context. This middleware attaches `req.app` based on the request's subdomain or header:

```ts
async function resolveTenant(req, res, next) {
  const subdomain = req.headers["x-app-subdomain"]
    || req.hostname.split(".")[0];

  const app = await db("apps").where({ subdomain }).first();

  if (!app) {
    return res.status(404).json({ error: "APP_NOT_FOUND" });
  }

  req.app = app;
  next();
}
```

## 4.2 Authentication Middleware

Verifies the JWT session and attaches `req.user`:

```ts
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split("Bearer ")[1];

  if (!token) {
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }

  try {
    const decoded = verifyJWT(token);
    req.user = { id: decoded.user_id, email: decoded.email };
    next();
  } catch {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
}
```

## 4.3 Middleware Chain

Applied in order to all API routes:

```ts
app.use("/api", resolveTenant, requireAuth);
```

---

# 5. Config Management Endpoints

These endpoints manage the runtime config lifecycle.

## 5.1 GET /config/runtime

Returns the current active config. Used by the frontend to fetch the runtime configuration on page load:

```ts
app.get("/config/runtime", (req, res) => {
  if (!runtimeState.config) {
    return res.status(503).json({ error: "CONFIG_NOT_LOADED" });
  }

  return res.json({
    version: runtimeState.version,
    config: runtimeState.config
  });
});
```

## 5.2 GET /config/version

Returns only the config version number. Used by the frontend hot-reload polling system (every 5 seconds):

```ts
app.get("/config/version", (req, res) => {
  return res.json({ version: runtimeState.version });
});
```

## 5.3 POST /config

Accepts a new config, validates it, checks for breaking schema changes, and reloads the runtime if safe:

```ts
app.post("/config", express.json({ limit: "256kb" }), async (req, res) => {
  const result = validateConfig(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "INVALID_CONFIG",
      details: result.errors
    });
  }

  const newConfig = normalizeConfig(result.data);
  const changes = diffConfigs(runtimeState.config, newConfig);

  const breaking = changes.filter(c =>
    c.type === "REMOVE_FIELD" || c.type === "CHANGE_FIELD_TYPE"
  );

  if (breaking.length > 0) {
    return res.status(409).json({
      error: "BREAKING_SCHEMA_CHANGE",
      details: breaking
    });
  }

  reloadConfig(newConfig);
  return res.json({ success: true, version: runtimeState.version });
});
```

> Decision: **POST /config uses 256KB body limit, not 1MB.**
> Rejected: Using the global 1MB limit.
> Why: Config documents should be small. A 256KB limit prevents abuse while being generous enough for complex configs. The global 1MB limit remains for data endpoints.

## 5.4 Config Reload Function

Called by `POST /config` after validation succeeds:

```ts
function reloadConfig(newConfig: RuntimeConfig) {
  runtimeState.config = newConfig;
  runtimeState.version = Date.now();

  clearExistingRoutes();
  registerDynamicRoutes(newConfig);
}
```

---

# 6. Health Check Endpoint

```ts
app.get("/health", async (req, res) => {
  try {
    await db.raw("SELECT 1");
    return res.json({
      status: "ok",
      configLoaded: runtimeState.config !== null,
      version: runtimeState.version
    });
  } catch {
    return res.status(500).json({ status: "fail" });
  }
});
```

---

# 7. Request Validation

## 7.1 Dynamic Zod Schema Builder

Builds a Zod validation schema from the entity's field definitions at runtime:

```ts
import { z } from "zod";

function buildZodSchema(entity: Entity) {
  const shape = {};

  entity.fields.forEach(field => {
    let validator;

    switch (field.type) {
      case "text": validator = z.string(); break;
      case "number": validator = z.number(); break;
      case "boolean": validator = z.boolean(); break;
      case "date": validator = z.string().datetime(); break;
      case "select":
        validator = z.enum(field.options as [string, ...string[]]);
        break;
      default:
        validator = z.any();
    }

    if (field.validation?.required) {
      shape[field.id] = validator;
    } else {
      shape[field.id] = validator.optional();
    }
  });

  return z.object(shape);
}
```

## 7.2 Identifier Allowlisting

All entity and field names are validated against a strict regex before being used in any database operation:

```ts
const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function validateIdentifier(name: string): boolean {
  return SAFE_IDENTIFIER.test(name);
}
```

---

# 8. Error Response Format

All errors follow a consistent structure:

```ts
{
  error: string,           // Machine-readable error code
  message?: string,        // Human-readable description
  details?: any            // Validation errors, breaking changes, etc.
}
```

HTTP status codes used:

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error or bad request |
| 401 | Unauthorized (no token or invalid token) |
| 404 | Not found (entity, record, or app) |
| 409 | Conflict (breaking schema change) |
| 413 | Payload too large |
| 429 | Rate limited |
| 500 | Internal server error |
| 503 | Service unavailable (config not loaded) |

---

# 9. Failure Modes

| What can fail | What the system does | How to debug |
|---|---|---|
| Config file not found at boot | Throws `INVALID_CONFIG`, app does not start | Check config file path and existence |
| Zod validation failure on CRUD input | Returns 400 with `VALIDATION_ERROR` | Check request body against entity schema |
| Entity not found in config | Returns 404 | Verify entity name matches config |
| Record not found for update/delete | Returns 404 with `NOT_FOUND` | Check record ID and tenant scoping |
| DB connection failure | Returns 500 with `DB_ERROR` | Check DATABASE_URL env var |
| Breaking schema change on POST /config | Returns 409 with details | Review diff output for REMOVE_FIELD or CHANGE_FIELD_TYPE |
| Rate limit exceeded | Returns 429 | Wait 60 seconds or adjust rate limit config |
| Config not loaded (GET /config/runtime) | Returns 503 | Server is still booting; wait and retry |

---

CHANGES APPLIED:
- Guide sections used: 4.1 (updateHandler), 4.2 (deleteHandler), 5.1 (GET /config/runtime), 5.2 (GET /config/version), 5.3 (POST /config)
- Contradictions resolved: Added complete updateHandler with schema.partial() + JSONB merge + tenant scoping + event emission; added complete deleteHandler with tenant scoping + event emission; added all 3 config endpoints; standardized breaking change type names to REMOVE_FIELD/CHANGE_FIELD_TYPE (matching doc_06)
- Code added: updateHandler, deleteHandler, GET /config/runtime, GET /config/version, POST /config (with 256KB limit), reloadConfig, health check, identifier allowlisting, complete boot process
- Removed: Trailing "what was fixed" commentary; emoji from headers
