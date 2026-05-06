## DOCUMENT 4 — Frontend Documentation (Revised)

````markdown id="frontenddoc-rev-01"
# Frontend Documentation

This document defines the **complete frontend runtime system** for ConfigForge.

It specifies:
- Dynamic UI rendering engine (component registry)
- Integration with validated config
- Error handling and fallback behavior
- Hot config reload synchronization
- Data fetching + API interaction
- State management strategy
- Failure modes and recovery

---

## 1. Frontend Architecture Overview

The frontend is a **config-driven renderer**, not a static UI.

> 📌 Decision:
> The frontend **never trusts raw config** — it only consumes **validated + normalized config from backend**.

**Why:**
- Prevents inconsistent state
- Centralizes validation logic

---

## 2. Data Flow (Critical Integration)

```text
Backend (validated config)
   ↓
GET /config/runtime
   ↓
Frontend loads config
   ↓
Renderer builds UI dynamically
   ↓
User interacts → API calls
   ↓
Backend processes → DB
   ↓
Frontend updates state
````

---

## 3. Config Fetching System

### 3.1 API Endpoint

```ts
GET /config/runtime
```

Response:

```json id="fe_json_01"
{
  "version": "1.0",
  "config": { ...normalizedConfig }
}
```

---

### 3.2 Client Fetch Hook

```ts id="fe_ts_01"
import { useEffect, useState } from "react";

export function useRuntimeConfig() {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/config/runtime")
      .then(res => res.json())
      .then(setConfig)
      .catch(setError);
  }, []);

  return { config, error };
}
```

---

## 4. Component Registry System

### 4.1 Registry Definition

```ts id="fe_ts_02"
import TextInput from "../components/TextInput";
import NumberInput from "../components/NumberInput";
import SelectInput from "../components/SelectInput";

export const componentRegistry = {
  text: TextInput,
  number: NumberInput,
  select: SelectInput
};
```

---

### 4.2 Safe Renderer (Critical)

```tsx id="fe_ts_03"
export function renderField(field) {
  const Component = componentRegistry[field.type];

  if (!Component) {
    return (
      <div style={{ color: "red" }}>
        Unsupported field type: {field.type}
      </div>
    );
  }

  return <Component {...field} />;
}
```

> 📌 Decision:
> Unknown components **do NOT crash UI** — they render fallback.

---

## 5. Page Rendering Engine

```tsx id="fe_ts_04"
export function PageRenderer({ page, config }) {
  const entity = config.entities.find(e => e.name === page.entity);

  if (!entity) {
    return <ErrorPage message="Entity not found" />;
  }

  switch (page.type) {
    case "form":
      return <FormPage entity={entity} />;
    case "list":
      return <ListPage entity={entity} />;
    default:
      return <ErrorPage message="Unsupported page type" />;
  }
}
```

---

## 6. Form Engine (Dynamic)

```tsx id="fe_ts_05"
export function FormPage({ entity }) {
  const [formData, setFormData] = useState({});

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();

        const res = await fetch(`/api/${entity.name}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: formData })
        });

        const json = await res.json();

        if (!res.ok) {
          alert(JSON.stringify(json));
        }
      }}
    >
      {entity.fields.map(field => (
        <div key={field.id}>
          {renderField({
            ...field,
            value: formData[field.id],
            onChange: (val) =>
              setFormData(prev => ({ ...prev, [field.id]: val }))
          })}
        </div>
      ))}

      <button type="submit">Submit</button>
    </form>
  );
}
```

---

## 7. API Integration

### Fetch Wrapper

```ts id="fe_ts_06"
export async function apiRequest(path, options = {}) {
  const res = await fetch(path, options);
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || "API_ERROR");
  }

  return json;
}
```

---

## 8. Error Handling Strategy (Critical)

### 8.1 Config Load Error

```tsx id="fe_ts_07"
if (error) {
  return <div>Failed to load config</div>;
}
```

---

### 8.2 Validation Error Display

```tsx id="fe_ts_08"
catch (err) {
  setError(err.message);
}
```

---

### 8.3 API Error UI

```tsx id="fe_ts_09"
{error && <div style={{ color: "red" }}>{error}</div>}
```

---

## 9. Hot Reload Synchronization

### 9.1 Polling Strategy

```ts id="fe_ts_10"
useEffect(() => {
  const interval = setInterval(async () => {
    const res = await fetch("/config/version");
    const { version } = await res.json();

    if (version !== currentVersion) {
      window.location.reload();
    }
  }, 5000);

  return () => clearInterval(interval);
}, []);
```

> 📌 Decision:
> Polling used instead of WebSockets for simplicity.

---

## 10. State Management

> 📌 Decision:
> Use **local state + hooks**, not Redux.

**Why:**

* Config-driven UI is already dynamic
* Avoid global complexity

---

## 11. Failure Modes

### 11.1 Missing Component

* Shows fallback message
* UI continues

---

### 11.2 Invalid Config (should not happen)

* Backend blocks config
* Frontend never receives invalid config

---

### 11.3 API Failure

* Error message shown
* No crash

---

### 11.4 Network Failure

* Config load fails
* Show error screen

---

## 12. Debugging

### Logs

```ts id="fe_ts_11"
console.log("Loaded config", config);
```

---

### Common Issues

| Issue         | Cause             |
| ------------- | ----------------- |
| Blank UI      | Config not loaded |
| Missing field | Bad config        |
| API error     | Backend failure   |

---

## 13. Trade-offs

| Decision       | Benefit  | Cost         |
| -------------- | -------- | ------------ |
| Dynamic UI     | Flexible | Debug harder |
| Polling reload | Simple   | Slight delay |
| No Redux       | Simpler  | Less control |

---

```

---

# ✅ What this FIXED

### ✔ Frontend ↔ Backend integration
- Uses `/config/runtime`
- Uses validated config only

### ✔ Validation alignment
- No raw config usage
- error handling defined

### ✔ UI stability
- fallback components implemented
- no crash scenarios

### ✔ Hot reload sync
- polling strategy defined

---

# 🚀 Next (Critical)

Now we MUST fix:

👉 **DOCUMENT 7 — Authentication (Revised)**

This will:
- define `req.user`
- define `req.app`
- secure tenant isolation COMPLETELY

Say:
👉 **Generate DOCUMENT 7 — Authentication (Revised)**
```
