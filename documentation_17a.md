Great — now we move to the **layer that judges actually see first**.

Phase 2 is where your system goes from:

> ⚙️ “it works internally”
> to
> 🎨 “it looks like a real product and doesn’t break”

---

# 🚀 PHASE 2 — Frontend + UX System (Critical for Demo)

This phase ensures:

* Dynamic UI actually renders cleanly
* Errors don’t crash the app
* Loading states exist (required by problem)
* Hot reload works visually

---

# DOCUMENT 17 — Alignment Patch

## PHASE 2 — Frontend Renderer, UX, and Stability

---

## 1. Objective of Phase 2

Convert frontend from:

❌ Basic rendering
➡️
✅ Production-ready dynamic UI system

---

## 2. Critical Gaps Identified

From implementation guide:

* No proper loading state ❌
* No global error UI ❌
* No fallback UI for unknown components ❌
* No hot reload sync ❌
* CSV UI missing ❌
* Auth UI not config-driven ❌

---

## 3. Frontend Architecture (Updated)

```text id="fe-flow"
AppShell
   ↓
useRuntimeConfig()
   ↓
PageRouter
   ↓
PageRenderer
   ↓
Dynamic Components
```

---

## 4. Global AppShell (MANDATORY)

### 4.1 Purpose

Handles:

* loading
* config errors
* safe rendering

---

### 4.2 Implementation

```tsx id="fe_ts_100"
export function AppShell() {
  const { config, error, loading } = useRuntimeConfig();

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <h2>Loading application...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: "red", padding: "2rem" }}>
        <h2>Failed to load configuration</h2>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return <PageRouter config={config} />;
}
```

---

## 5. Config Fetch Hook (UPDATED)

### 5.1 Must track loading state

```tsx id="fe_ts_101"
export function useRuntimeConfig() {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/config/runtime")
      .then(res => {
        if (!res.ok) throw new Error("Config fetch failed");
        return res.json();
      })
      .then(data => {
        setConfig(data.config);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, []);

  return { config, error, loading };
}
```

---

## 6. Page Routing System

### 6.1 Dynamic Route Resolver

```tsx id="fe_ts_102"
export function PageRouter({ config }) {
  const path = window.location.pathname;

  const page = config.pages.find(p => p.path === path);

  if (!page) {
    return <ErrorPage message="Page not found" />;
  }

  return <PageRenderer page={page} config={config} />;
}
```

---

## 7. PageRenderer (CORE)

```tsx id="fe_ts_103"
export function PageRenderer({ page, config }) {
  const entity = config.entities.find(e => e.name === page.entity);

  switch (page.type) {
    case "form":
      return <FormPage entity={entity} />;
    case "list":
      return <ListPage entity={entity} />;
    case "detail":
      return <DetailPage entity={entity} />;
    default:
      return <ErrorPage message="Unsupported page type" />;
  }
}
```

---

## 8. Component Registry + Fallback

### 8.1 Registry

```ts id="fe_ts_104"
export const componentRegistry = {
  text: TextInput,
  number: NumberInput,
  select: SelectInput,
  boolean: BooleanInput,
  date: DateInput
};
```

---

### 8.2 Fallback Component (CRITICAL)

```tsx id="fe_ts_105"
export function UnknownField({ field }) {
  return (
    <div style={{ color: "orange" }}>
      Unknown field type: {field.type}
    </div>
  );
}
```

---

### 8.3 Safe Renderer

```tsx id="fe_ts_106"
export function renderField(fieldProps) {
  const Component =
    componentRegistry[fieldProps.type] || UnknownField;

  return <Component {...fieldProps} />;
}
```

---

## 9. FormPage (UPDATED with UX)

```tsx id="fe_ts_107"
export function FormPage({ entity }) {
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/${entity.name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: formData })
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) return <div style={{color:"green"}}>Saved!</div>;

  return (
    <form onSubmit={handleSubmit}>
      {entity.fields.map(field => (
        <div key={field.id}>
          {renderField({
            ...field,
            value: formData[field.id],
            onChange: val =>
              setFormData(prev => ({ ...prev, [field.id]: val }))
          })}
        </div>
      ))}

      {error && <div style={{color:"red"}}>{error}</div>}

      <button disabled={submitting}>
        {submitting ? "Saving..." : "Submit"}
      </button>
    </form>
  );
}
```

---

## 10. ListPage (Dynamic Table)

```tsx id="fe_ts_108"
export function ListPage({ entity }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch(`/api/${entity.name}`)
      .then(res => res.json())
      .then(res => setData(res.data));
  }, []);

  return (
    <table>
      <thead>
        <tr>
          {entity.fields.map(f => <th key={f.id}>{f.id}</th>)}
        </tr>
      </thead>
      <tbody>
        {data.map(row => (
          <tr key={row.id}>
            {entity.fields.map(f => (
              <td key={f.id}>{row.data[f.id]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## 11. Hot Reload (Frontend Sync)

### 11.1 Polling Hook

```tsx id="fe_ts_109"
export function useConfigPolling(version) {
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch("/config/version");
      const data = await res.json();

      if (data.version !== version) {
        window.location.reload();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [version]);
}
```

---

## 12. Error Handling Strategy

| Scenario      | UI Behavior        |
| ------------- | ------------------ |
| Config fails  | Error screen       |
| Unknown field | fallback component |
| API error     | inline message     |
| Submit error  | form-level error   |

---

## 13. Phase 2 Validation Checklist

* [ ] App shows loading state
* [ ] Config error shows UI
* [ ] Unknown field type doesn’t crash
* [ ] Form shows success + error states
* [ ] List page renders dynamic data
* [ ] API errors don’t crash UI
* [ ] Hot reload works (via polling)

---

## 14. Phase 2 Outcome

After this phase:

> ✅ Fully working frontend renderer
> ✅ Stable UI (no crashes)
> ✅ Demo-ready UI

---

---

