# Frontend System

This document specifies the ConfigForge frontend: dynamic UI rendering from config, component registry, page routing, state management, and all user-facing components.

The frontend is a single React application (Next.js 14) that reads the runtime config from the backend and dynamically renders the appropriate UI. No pages are hardcoded per entity.

---

# 1. Frontend Architecture

```text
AppShell (loading/error boundary)
   |
useRuntimeConfig() -> fetches config from GET /config/runtime
   |
PageRouter (matches URL path to config page)
   |
PageRenderer (resolves page type -> component)
   |
Dynamic Components (from component registry)
```

---

# 2. AppShell (Top-Level Wrapper)

The AppShell is the root component. It handles three states: loading, error, and ready. This satisfies the problem statement requirement for loading states and error handling.

```tsx
import { useRuntimeConfig } from "@/hooks/useRuntimeConfig";
import { useConfigPolling } from "@/hooks/useConfigPolling";

export function AppShell() {
  const { config, error, loading } = useRuntimeConfig();

  // Hot reload: poll for config version changes
  useConfigPolling(config?.version);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <h2>Loading application...</h2>
        <p>Fetching configuration from server</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: "red", padding: "2rem", textAlign: "center" }}>
        <h2>Failed to load configuration</h2>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return <PageRouter config={config} />;
}
```

> Decision: **AppShell handles all top-level state (loading, error, ready).**
> Rejected: Individual pages managing their own config fetch.
> Why: Centralizing config fetch in AppShell prevents duplicate requests and ensures a consistent loading/error UX across all pages.

---

# 3. Config Fetch Hook

This hook fetches the runtime config from `GET /config/runtime` and tracks loading, error, and data states:

```tsx
import { useState, useEffect } from "react";

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

# 4. Hot Reload Polling

The frontend polls `GET /config/version` every 5 seconds. If the version changes, the page reloads to pick up the new config:

```tsx
import { useEffect } from "react";

export function useConfigPolling(currentVersion: number | undefined) {
  useEffect(() => {
    if (!currentVersion) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/config/version");
        const data = await res.json();

        if (data.version !== currentVersion) {
          window.location.reload();
        }
      } catch {
        // Polling failure is non-critical; silently retry next interval
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentVersion]);
}
```

> Decision: **Hot reload uses polling (5s interval), not WebSockets.**
> Rejected: WebSocket-based push notification.
> Why: Polling is simpler to implement, debug, and deploy. WebSockets add connection management complexity. A 5-second delay is acceptable for config changes, which happen infrequently.

---

# 5. Page Router

Matches the current URL path to a page definition in config:

```tsx
export function PageRouter({ config }) {
  const path = window.location.pathname;

  const page = config.pages.find(p => p.path === path);

  if (!page) {
    return <ErrorPage message={`Page not found: ${path}`} />;
  }

  return <PageRenderer page={page} config={config} />;
}
```

---

# 6. Page Renderer

Resolves the page type to the appropriate component:

```tsx
export function PageRenderer({ page, config }) {
  const entity = config.entities.find(e => e.name === page.entity);

  if (!entity) {
    return <ErrorPage message={`Entity not found: ${page.entity}`} />;
  }

  switch (page.type) {
    case "form":
      return <FormPage entity={entity} />;
    case "list":
      return <ListPage entity={entity} />;
    case "detail":
      return <DetailPage entity={entity} />;
    case "dashboard":
      return <DashboardPage entity={entity} config={config} />;
    default:
      return <ErrorPage message={`Unsupported page type: ${page.type}`} />;
  }
}
```

---

# 7. Component Registry

The component registry maps field types to React input components. This is the core of the dynamic form rendering system.

## 7.1 Registry Definition

```ts
import { TextInput } from "@/components/inputs/TextInput";
import { NumberInput } from "@/components/inputs/NumberInput";
import { SelectInput } from "@/components/inputs/SelectInput";
import { BooleanInput } from "@/components/inputs/BooleanInput";
import { DateInput } from "@/components/inputs/DateInput";

export const componentRegistry: Record<string, React.ComponentType<FieldProps>> = {
  text: TextInput,
  number: NumberInput,
  select: SelectInput,
  boolean: BooleanInput,
  date: DateInput
};
```

## 7.2 Fallback Component

When the config specifies a field type not in the registry, the system renders a warning instead of crashing:

```tsx
export function UnknownField({ field }) {
  return (
    <div style={{ color: "orange", padding: "0.5rem", border: "1px solid orange" }}>
      <strong>Unknown field type:</strong> {field.type}
      <br />
      <small>Field ID: {field.id}</small>
    </div>
  );
}
```

## 7.3 Safe Field Renderer

```tsx
export function renderField(fieldProps: FieldProps) {
  const Component = componentRegistry[fieldProps.type] || UnknownField;
  return <Component {...fieldProps} />;
}
```

---

# 8. FormPage

Full form component with submitting state, error handling, and success feedback:

```tsx
import { useState } from "react";
import { renderField } from "@/components/renderField";

export function FormPage({ entity }) {
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/${entity.name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: formData })
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Submission failed");
      }

      setSubmitSuccess(true);
      setFormData({});
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div style={{ color: "green", padding: "1rem" }}>
        <h3>Record created successfully</h3>
        <button onClick={() => setSubmitSuccess(false)}>Create another</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create {entity.name}</h2>

      {entity.fields.map(field => (
        <div key={field.id} style={{ marginBottom: "1rem" }}>
          <label>{field.label ?? field.id}</label>
          {renderField({
            ...field,
            value: formData[field.id],
            onChange: val => setFormData(prev => ({ ...prev, [field.id]: val }))
          })}
        </div>
      ))}

      {submitError && (
        <div style={{ color: "red", marginBottom: "1rem" }}>{submitError}</div>
      )}

      <button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Submit"}
      </button>
    </form>
  );
}
```

---

# 9. ListPage

Dynamic table that renders all records for an entity:

```tsx
import { useState, useEffect } from "react";

export function ListPage({ entity }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/${entity.name}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load data");
        return res.json();
      })
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [entity.name]);

  if (loading) return <div>Loading records...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;
  if (data.length === 0) return <div>No records found for {entity.name}</div>;

  return (
    <div>
      <h2>{entity.name} Records</h2>
      <table>
        <thead>
          <tr>
            {entity.fields.map(f => <th key={f.id}>{f.label ?? f.id}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.id}>
              {entity.fields.map(f => (
                <td key={f.id}>{String(row.data?.[f.id] ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

# 10. CSV Import UI

The CSV import flow uses three components: file upload trigger, CSVMapperUI (for column-to-field mapping), and ImportResult.

## 10.1 CSV Upload Flow Component

```tsx
import { useState } from "react";
import { CSVMapperUI } from "./CSVMapperUI";
import { ImportResult } from "./ImportResult";

export function CSVUploadFlow({ entity }) {
  const [step, setStep] = useState("upload"); // upload | mapping | result
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/csv-parse", { method: "POST", body: formData });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "CSV parse failed");
      }
      const data = await res.json();
      setCsvHeaders(data.headers);
      setStep("mapping");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleImport = async (mapping) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("entity", entity.name);
    formData.append("mapping", JSON.stringify(mapping));

    try {
      const res = await fetch("/api/csv-import", { method: "POST", body: formData });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Import failed");
      }
      const data = await res.json();
      setResult(data);
      setStep("result");
    } catch (err) {
      setError(err.message);
    }
  };

  if (error) {
    return (
      <div>
        <div style={{ color: "red" }}>{error}</div>
        <button onClick={() => { setStep("upload"); setError(null); }}>Try again</button>
      </div>
    );
  }

  switch (step) {
    case "upload":
      return (
        <div>
          <h3>Import CSV for {entity.name}</h3>
          <input type="file" accept=".csv" onChange={handleFileUpload} />
        </div>
      );
    case "mapping":
      return <CSVMapperUI csvHeaders={csvHeaders} entity={entity} onSubmit={handleImport} />;
    case "result":
      return <ImportResult result={result} />;
    default:
      return null;
  }
}
```

## 10.2 CSVMapperUI Component

See doc_08 section 1.4 for the full implementation. This component renders dropdown selectors mapping each CSV column to an entity field.

## 10.3 ImportResult Component

See doc_08 section 1.6 for the full implementation. This component shows imported/skipped counts and error details.

---

# 11. Config-Driven Login Page

The login page renders only the authentication methods specified in `config.auth.methods`. See doc_08 section 3.5 for the full implementation.

Summary of behavior:

| Config Value | UI Rendered |
|---|---|
| `["email"]` | Email + Password form only |
| `["google"]` | Google OAuth button only |
| `["email", "google"]` | Both: email form + divider + Google button |
| `[]` or missing | Blocked by Zod validation at config level; defaults to `["email"]` |

---

# 12. Error Page Component

Reusable error display for routing misses, missing entities, and unsupported page types:

```tsx
export function ErrorPage({ message }) {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>Something went wrong</h2>
      <p style={{ color: "red" }}>{message}</p>
      <button onClick={() => window.history.back()}>Go back</button>
    </div>
  );
}
```

---

# 13. Error Handling Strategy

| Scenario | UI Behavior |
|----------|-------------|
| Config fetch fails | Full-screen error with retry button (AppShell) |
| Config loading | Full-screen loading message (AppShell) |
| Page not found in config | ErrorPage with "Page not found" |
| Entity not found in config | ErrorPage with "Entity not found" |
| Unknown field type in form | UnknownField component (orange warning) |
| API error on form submit | Inline error message below form |
| Form submitting | "Saving..." text on disabled submit button |
| Form success | Green success message with "Create another" button |
| List page loading | "Loading records..." text |
| List page error | Inline red error message |
| List page empty | "No records found" message |

---

# 14. Failure Modes

| What can fail | What the system does | How to debug |
|---|---|---|
| GET /config/runtime fails | AppShell shows error screen with retry | Check backend is running, check /health endpoint |
| Config version polling fails | Silently retries on next interval | Non-critical; check network connectivity |
| Unknown field type in config | Renders UnknownField (orange warning) | Check field type against component registry (text, number, select, boolean, date) |
| Form submission returns 400 | Shows validation error inline | Check request body against entity schema |
| Form submission returns 500 | Shows generic error inline | Check backend logs for DB errors |
| CSV parse fails | Shows error, offers "Try again" | Check file format (must be valid UTF-8 CSV) |
| CSV import partially fails | Shows imported + skipped counts | Check individual row data against entity schema |

---

CHANGES APPLIED:
- Guide sections used: 6.1 (AppShell), 6.2 (useRuntimeConfig with loading), 6.3 (FormPage with submitting/error/success), 3.3 (CSVMapperUI reference), 3.5 (ImportResult reference), 2.4 (LoginPage reference)
- Contradictions resolved: useRuntimeConfig now returns `{ config, error, loading }`; FormPage now has submitting/error/success states; component registry has all 5 types (text, number, select, boolean, date); UnknownField component added; hot reload polling hook added
- Code added: AppShell, useRuntimeConfig (with loading), useConfigPolling, FormPage (complete), ListPage (with loading/error), CSVUploadFlow, ErrorPage
- Removed: Trailing commentary; emoji from headers; `alert(JSON.stringify(json))` pattern from FormPage
