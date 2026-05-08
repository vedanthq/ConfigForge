Perfect — now we’ll do this **properly, in phases**, like a real system documentation upgrade.

We won’t dump everything at once.
We’ll **build a clean, production-grade documentation set step-by-step** based on the Claude guide.

---

# 🧠 How we will proceed

We will generate **DOCUMENT 17 (Alignment Patch)** in **PHASES**:

| Phase   | Focus                                       |
| ------- | ------------------------------------------- |
| Phase 1 | Core system fixes (runtime, API, config)    |
| Phase 2 | Frontend + UX fixes                         |
| Phase 3 | Features (CSV, Notifications, Auth upgrade) |
| Phase 4 | Deployment + Security + Repo cleanup        |
| Phase 5 | Pitch + Competitive + Final polish          |

---

# 🚀 PHASE 1 — Core System Alignment (MOST IMPORTANT)

This phase ensures:

> ⚙️ Your system actually runs end-to-end

---

# DOCUMENT 17 — Alignment Patch

## PHASE 1 — Core Runtime, API, Config (Critical Fixes)

---

## 1. Objective of Phase 1

This phase converts the project from:

❌ “Documented architecture”
➡️ into
✅ “Working runtime system”

---

## 2. Critical Gaps Identified

From implementation audit:

* Runtime engine not implemented
* Config endpoints missing
* CRUD incomplete (Update/Delete missing)
* Backend not fully dynamic
* Config lifecycle incomplete

---

## 3. Runtime Engine (MUST IMPLEMENT)

### 3.1 Core Responsibility

The runtime engine must:

* Load config at startup
* Validate config
* Normalize config
* Register API routes dynamically
* Support config reload

---

### 3.2 Required Files

```
backend/src/core/
  validator.ts
  normalizer.ts
  runtime.ts
  diff.ts
```

---

### 3.3 Boot Process

```ts
export async function bootApp() {
  const raw = loadConfigFromFile();
  
  const result = validateConfig(raw);
  if (!result.success) {
    throw new Error("INVALID_CONFIG");
  }

  const normalized = normalizeConfig(result.data);

  runtimeState.config = normalized;

  registerDynamicRoutes(normalized);
}
```

---

## 4. Config Lifecycle (NEW — CRITICAL)

### 4.1 Flow

```text
POST /config
   ↓
Validate (Zod)
   ↓
Normalize
   ↓
Diff with old config
   ↓
Check breaking changes
   ↓
Reload runtime
```

---

### 4.2 Required Endpoint

```ts
app.post("/config", async (req, res) => {
  const result = validateConfig(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "INVALID_CONFIG",
      errors: result.errors
    });
  }

  const newConfig = normalizeConfig(result.data);

  const changes = diffConfigs(runtimeState.config, newConfig);

  const hasBreaking = changes.some(isBreaking);

  if (hasBreaking) {
    return res.status(409).json({
      error: "BREAKING_SCHEMA_CHANGE",
      details: changes
    });
  }

  reloadConfig(newConfig);

  return res.json({ success: true });
});
```

---

## 5. Missing Config APIs (MANDATORY)

### 5.1 GET /config/runtime

```ts
app.get("/config/runtime", (req, res) => {
  res.json({
    version: runtimeState.config.version,
    config: runtimeState.config
  });
});
```

---

### 5.2 GET /config/version

```ts
app.get("/config/version", (req, res) => {
  res.json({
    version: runtimeState.config.version
  });
});
```

---

## 6. CRUD Completion (VERY IMPORTANT)

Your system currently supports:

* Create ✔
* List ✔

You MUST add:

---

### 6.1 Update Handler

```ts
app.patch("/api/:entity/:id", async (req, res) => {
  const entity = req.params.entity;
  const { id } = req.params;

  const existing = await db(entity).where({ id }).first();

  if (!existing) {
    return res.status(404).json({ error: "NOT_FOUND" });
  }

  const updated = {
    ...existing.data,
    ...req.body.data
  };

  await db(entity).where({ id }).update({ data: updated });

  res.json({ success: true });
});
```

---

### 6.2 Delete Handler

```ts
app.delete("/api/:entity/:id", async (req, res) => {
  const entity = req.params.entity;
  const { id } = req.params;

  const deleted = await db(entity).where({ id }).delete();

  if (!deleted) {
    return res.status(404).json({ error: "NOT_FOUND" });
  }

  res.json({ success: true });
});
```

---

## 7. Dynamic Route Registration

### 7.1 Required Behavior

Routes must be created based on config:

```ts
function registerDynamicRoutes(config) {
  config.entities.forEach(entity => {
    app.get(`/api/${entity.name}`, listHandler(entity));
    app.post(`/api/${entity.name}`, createHandler(entity));
    app.patch(`/api/${entity.name}/:id`, updateHandler(entity));
    app.delete(`/api/${entity.name}/:id`, deleteHandler(entity));
  });
}
```

---

## 8. Diff Engine (Schema Change Detection)

### 8.1 Purpose

Prevent unsafe schema changes

---

### 8.2 Example

```ts
function isBreaking(change) {
  return change.type === "FIELD_REMOVED" ||
         change.type === "TYPE_CHANGED";
}
```

---

## 9. Runtime Reload

```ts
function reloadConfig(newConfig) {
  runtimeState.config = newConfig;

  clearExistingRoutes();
  registerDynamicRoutes(newConfig);
}
```

---

## 10. Phase 1 Validation Checklist

Before moving to Phase 2:

* [ ] Backend starts successfully
* [ ] Hardcoded config loads
* [ ] Form renders in frontend
* [ ] Form submission stores data
* [ ] List page shows data
* [ ] Update works
* [ ] Delete works
* [ ] /config/runtime returns config
* [ ] /config endpoint reloads config

---

## 11. Phase 1 Outcome

After this phase:

> ✅ You have a working app generator core
> ❌ No features yet (that’s Phase 3)
> ❌ No AI yet

---
