## DOCUMENT 9 — Developer Guide (Revised)

````markdown id="devdoc-rev-01"
# Developer Guide

This document defines how developers **extend, modify, and maintain** ConfigForge.

It specifies:
- Extension points (UI, API, features)
- Component registry system (frontend)
- Backend extension patterns
- Config evolution rules
- Plugin-style architecture (lightweight)
- Testing strategy
- Failure modes

This is critical for:
- Extensibility requirement (assignment)
- Long-term maintainability
- Multi-developer collaboration

---

# 1. Development Philosophy

> 📌 Decision:
> ConfigForge is designed as a **modular runtime system**, not a monolith.

### Rules

1. No core logic modification required for extensions
2. All new functionality plugs into:
   - registry (frontend)
   - hooks/events (backend)
   - config schema (shared layer)

---

# 2. Project Structure

```bash
/configforge
 ├── frontend/
 │   ├── components/
 │   ├── registry/
 │   ├── pages/
 │   └── hooks/
 │
 ├── backend/
 │   ├── routes/
 │   ├── services/
 │   ├── middleware/
 │   ├── events/
 │   └── db/
 │
 ├── core/
 │   ├── validator/
 │   ├── normalizer/
 │   └── runtime/
 │
 ├── config/
 │   └── app.json
 │
 ├── migrations/
 └── docs/
````

---

# 3. Frontend Extension System

## 3.1 Component Registry

```ts id="dev_ts_01"
export const componentRegistry = {
  text: TextInput,
  number: NumberInput,
  select: SelectInput
};
```

---

## 3.2 Adding New Component

### Step 1 — Create Component

```tsx id="dev_ts_02"
export default function ChartComponent({ data }) {
  return <div>Chart Placeholder</div>;
}
```

---

### Step 2 — Register Component

```ts id="dev_ts_03"
componentRegistry["chart"] = ChartComponent;
```

---

### Step 3 — Use in Config

```json id="dev_json_01"
{
  "type": "chart"
}
```

---

## 3.3 Constraints

* Component must accept props dynamically
* Must handle missing data safely

---

## 4. Backend Extension System

## 4.1 Adding Custom API Action

### Config

```json id="dev_json_02"
{
  "custom_actions": ["approve"]
}
```

---

### Implementation

```ts id="dev_ts_04"
app.post("/api/task/:id/approve", async (req, res) => {
  const id = req.params.id;

  await db("task")
    .where({ id, app_id: req.app.id })
    .update({ data: { approved: true } });

  res.json({ success: true });
});
```

---

## 4.2 Middleware Extension

```ts id="dev_ts_05"
export function auditMiddleware(req, res, next) {
  logger.info("Audit", { path: req.path });
  next();
}
```

---

## 4.3 Register Middleware

```ts id="dev_ts_06"
app.use("/api", auditMiddleware);
```

---

# 5. Event System Extensions

## 5.1 Add New Event

```ts id="dev_ts_07"
eventBus.emit("entity.approve", { id: 1 });
```

---

## 5.2 Add Listener

```ts id="dev_ts_08"
eventBus.on("entity.approve", async (payload) => {
  console.log("Approved", payload);
});
```

---

# 6. Config Extension Rules

## 6.1 Backward Compatibility

> 📌 Rule:
> Never break existing configs without version bump

---

## 6.2 Adding New Fields

Safe:

```json id="dev_json_03"
{
  "new_feature": true
}
```

---

## 6.3 Changing Existing Fields

Requires:

* version bump
* migration

---

# 7. Plugin-Like Architecture

> 📌 Decision:
> Lightweight plugin system via **registry + events**

---

## Example Plugin

```ts id="dev_ts_09"
export function registerPlugin() {
  componentRegistry["chart"] = ChartComponent;

  eventBus.on("entity.create", (data) => {
    console.log("Plugin triggered");
  });
}
```

---

# 8. Testing Strategy

## 8.1 Unit Testing

```ts id="dev_ts_10"
test("validate config", () => {
  const result = validateConfig(sampleConfig);
  expect(result.success).toBe(true);
});
```

---

## 8.2 API Testing

```ts id="dev_ts_11"
import request from "supertest";

await request(app)
  .post("/api/task")
  .send({ data: { title: "Test" } })
  .expect(200);
```

---

## 8.3 Integration Testing

* Full flow:
  config → UI → API → DB

---

# 9. Failure Modes

## 9.1 Invalid Extension

* Component not registered → fallback UI

---

## 9.2 API Extension Error

* Route fails → 500 error

---

## 9.3 Plugin Crash

* isolated via event system

---

# 10. Debugging

## Logs

```ts id="dev_ts_12"
logger.debug("Component render", field.type);
```

---

## Common Issues

| Issue                   | Cause            |
| ----------------------- | ---------------- |
| Component not rendering | not registered   |
| API not working         | missing route    |
| event not firing        | wrong event name |

---

# 11. Trade-offs

| Decision                | Benefit        | Cost                |
| ----------------------- | -------------- | ------------------- |
| Registry pattern        | easy extension | manual registration |
| Event system            | flexible       | async complexity    |
| No strict plugin system | simple         | less control        |

---

```

---

# ✅ What this FIXED

### ✔ Extensibility Requirement (CRITICAL)
- shows how to extend UI
- shows how to extend backend
- shows plugin-like system

---

### ✔ Developer Experience (FIXED)
- clear structure
- extension patterns
- testing strategy

---

# 🚀 Next (FINAL CORE DOC)

Now we must complete:

👉 **DOCUMENT 10 — Deployment (Revised)**

This will:
- satisfy mandatory requirement
- make project production-ready
- complete system end-to-end

Say:
👉 **Generate DOCUMENT 10 — Deployment (Revised)**
```
