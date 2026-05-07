# Feature Systems

This document specifies the **feature subsystems** in ConfigForge with full implementation detail:

1. CSV Import Pipeline (Feature 1)
2. Event-based Notifications (Feature 2)
3. Multiple Login Methods (Feature 3)
4. LLM-based Config Generation (Bonus Feature)

Each feature is designed to **integrate with the config-driven runtime**, not operate as an isolated add-on. All three mandatory features are config-driven, use the shared validation pipeline, and respect tenant isolation.

> Decision: **Three qualifying features are CSV Import, Notifications, and Multiple Auth Methods.**
> Rejected: Multi-language (i18n) was considered and permanently dropped.
> Why: Multi-language added complexity without strengthening the core config-driven architecture. Multiple auth methods is already partially implemented and directly demonstrates config-driven extensibility.

---

# 1. CSV Import System (Feature 1)

## 1.1 Overview

CSV Import allows users to upload a CSV file, map its columns to entity fields via a visual UI, validate each row against the entity's Zod schema, and insert valid rows into the database.

This feature satisfies the problem statement requirement for data import functionality.

## 1.2 Complete CSV Flow

```text
Step 1: User selects CSV file and target entity
   |
Step 2: Frontend uploads file to POST /api/csv-parse
   |
Step 3: Backend parses CSV, returns headers + 3-row preview
   |
Step 4: Frontend shows CSVMapperUI (CSV column -> entity field dropdowns)
   |
Step 5: User maps columns to entity fields (unmapped columns are skipped)
   |
Step 6: Frontend sends file + mapping to POST /api/csv-import
   |
Step 7: Backend validates each row via Zod schema
   |
Step 8: Valid rows inserted into DB; invalid rows skipped with error details
   |
Step 9: Frontend shows ImportResult (X imported, Y skipped)
```

## 1.3 CSV Parse Endpoint (Step 2-3)

This endpoint parses the CSV file and returns headers without inserting any data:

```ts
// POST /api/csv-parse
app.post("/api/csv-parse", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "NO_FILE_PROVIDED" });
  }

  if (req.file.size > 2 * 1024 * 1024) {
    return res.status(413).json({ error: "FILE_TOO_LARGE", maxSize: "2MB" });
  }

  try {
    const text = req.file.buffer.toString("utf-8");
    const result = Papa.parse(text, { header: true });

    if (result.errors.length > 0 && result.data.length === 0) {
      return res.status(400).json({ error: "INVALID_CSV", details: result.errors });
    }

    const csvHeaders = result.meta.fields ?? [];
    return res.json({ success: true, headers: csvHeaders, preview: result.data.slice(0, 3) });
  } catch (err) {
    return res.status(400).json({ error: "CSV_PARSE_ERROR", message: err.message });
  }
});
```

## 1.4 CSV Mapping UI Component (Step 4-5)

This React component renders a table where users map each CSV column to an entity field via dropdown selectors. Unmapped columns are skipped during import.

```tsx
import { useState } from "react";

export function CSVMapperUI({ csvHeaders, entity, onSubmit }) {
  const [mapping, setMapping] = useState({});
  // mapping = { csvColumn: entityFieldId }

  return (
    <div>
      <h3>Map CSV columns to {entity.name} fields</h3>
      <table>
        <thead>
          <tr><th>CSV Column</th><th>Maps to Field</th><th>Preview</th></tr>
        </thead>
        <tbody>
          {csvHeaders.map(col => (
            <tr key={col}>
              <td>{col}</td>
              <td>
                <select
                  onChange={e => setMapping(m => ({ ...m, [col]: e.target.value }))}
                  defaultValue="">
                  <option value="">-- Skip --</option>
                  {entity.fields.map(f => (
                    <option key={f.id} value={f.id}>{f.label ?? f.id}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => onSubmit(mapping)}>Import</button>
    </div>
  );
}
```

> Decision: **Field mapping is manual via dropdown UI, not auto-matched.**
> Rejected: Automatic column-to-field matching by name similarity.
> Why: Auto-matching creates false confidence. Manual mapping gives users full control and avoids silent data corruption when column names are similar but not equivalent.

## 1.5 CSV Import Endpoint with Mapping (Step 6-8)

This endpoint receives the file and mapping, validates each row against the entity's Zod schema, and inserts valid rows:

```ts
// POST /api/csv-import
app.post("/api/csv-import", upload.single("file"), async (req, res) => {
  const entity = req.config.entities.find(e => e.name === req.body.entity);
  if (!entity) return res.status(400).json({ error: "ENTITY_NOT_FOUND" });

  const mapping = JSON.parse(req.body.mapping);
  // mapping = { csvCol: entityFieldId }

  const text = req.file.buffer.toString("utf-8");
  const { data } = Papa.parse(text, { header: true });

  const schema = buildZodSchema(entity);
  let imported = 0, skipped = 0;
  const errors = [];

  for (const [index, row] of data.entries()) {
    // Apply mapping: remap CSV columns to entity field names
    const mapped = {};
    for (const [csvCol, fieldId] of Object.entries(mapping)) {
      if (fieldId) mapped[fieldId] = row[csvCol];
    }

    const result = schema.safeParse(mapped);
    if (!result.success) {
      skipped++;
      errors.push({ row: index + 1, errors: result.error.errors });
      continue;
    }

    await db(entity.name).insert({
      app_id: req.app.id, user_id: req.user.id, data: result.data
    });
    imported++;
  }

  return res.json({ success: true, imported, skipped, errors: errors.slice(0, 10) });
});
```

## 1.6 Import Result Component (Step 9)

Displays the import outcome so users (and judges) can see it worked:

```tsx
function ImportResult({ result }) {
  return (
    <div>
      <p style={{ color: "green" }}>{result.imported} rows imported successfully</p>
      {result.skipped > 0 && (
        <p style={{ color: "orange" }}>{result.skipped} rows skipped (invalid data)</p>
      )}
      {result.errors && result.errors.length > 0 && (
        <div>
          <h4>First errors:</h4>
          <ul>
            {result.errors.map((e, i) => (
              <li key={i}>Row {e.row}: {e.errors.map(err => err.message).join(", ")}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

## 1.7 Edge Cases

| Scenario | System Behavior |
|----------|----------------|
| Oversized file (>2MB) | Rejected at upload with `FILE_TOO_LARGE` error |
| Completely invalid CSV (not parseable) | Rejected at parse step with `INVALID_CSV` error |
| CSV with no headers | Rejected — `Papa.parse` with `header: true` produces empty fields |
| Partial row failures (some valid, some not) | Valid rows inserted; invalid rows skipped; error details returned (up to 10) |
| All rows invalid | Returns `{ imported: 0, skipped: N }` with error list |
| Unmapped columns | Silently skipped — only mapped columns are processed |
| Empty mapping (all columns set to "Skip") | No rows imported; returns `{ imported: 0, skipped: N }` |

## 1.8 Failure Modes

| What can fail | What the system does | How to debug |
|---|---|---|
| File too large | Returns 413 with `FILE_TOO_LARGE` | Check multer `fileSize` limit |
| CSV parse error | Returns 400 with `CSV_PARSE_ERROR` | Check file encoding (must be UTF-8) |
| Entity not found in config | Returns 400 with `ENTITY_NOT_FOUND` | Verify entity name matches config |
| Row validation failure | Skips row, records error | Check Zod schema vs CSV data types |
| DB insert failure | Stops import, returns 500 | Check DB connection and table existence |

---

# 2. Event-Based Notifications (Feature 2)

## 2.1 Overview

Notifications are triggered by entity lifecycle events (create, update, delete) and delivered via email using Nodemailer. The notification behavior is controlled by config:

```json
{
  "features": {
    "notifications": {
      "on_create": true,
      "on_update": false
    }
  }
}
```

## 2.2 Event Bus

```ts
import EventEmitter from "events";

export const eventBus = new EventEmitter();
```

## 2.3 Event Schema

```ts
type EventPayload = {
  entity: string;
  action: "create" | "update" | "delete";
  data: any;
};
```

## 2.4 Triggering Events from CRUD Handlers

Events are emitted from the CRUD handlers after successful database operations:

```ts
// In createHandler:
eventBus.emit("entity.create", {
  entity: entity.name,
  action: "create",
  data: row
});

// In updateHandler:
eventBus.emit("entity.update", {
  entity: entity.name,
  action: "update",
  data: updated
});

// In deleteHandler:
eventBus.emit("entity.delete", {
  entity: entity.name,
  action: "delete",
  id
});
```

## 2.5 Email Service (Nodemailer)

```ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendEmailNotification(payload: EventPayload) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@configforge.app",
      to: process.env.NOTIFICATION_EMAIL || "admin@configforge.app",
      subject: `[ConfigForge] ${payload.entity} ${payload.action}`,
      text: `Action: ${payload.action}\nEntity: ${payload.entity}\nData: ${JSON.stringify(payload.data, null, 2)}`
    });
  } catch (err) {
    // Email failure must not break the API
    console.error("Email notification failed:", err.message);
  }
}
```

> Decision: **Use Mailtrap/Ethereal for development, real SMTP for production.**
> Rejected: In-app notification panel (too much UI work for hackathon scope).
> Why: Email is verifiable by judges (show Mailtrap inbox), requires no additional frontend work, and demonstrates the event system end-to-end.

## 2.6 Event Listeners (Config-Driven)

```ts
eventBus.on("entity.create", async (payload) => {
  if (runtimeState.config.features?.notifications?.on_create) {
    await sendEmailNotification(payload);
  }
});

eventBus.on("entity.update", async (payload) => {
  if (runtimeState.config.features?.notifications?.on_update) {
    await sendEmailNotification(payload);
  }
});
```

## 2.7 Failure Modes

| What can fail | What the system does | How to debug |
|---|---|---|
| SMTP connection refused | Logs error, API continues normally | Check SMTP_HOST and SMTP_PORT env vars |
| Email send failure | Logs error, does not retry | Check Mailtrap inbox and SMTP credentials |
| Event listener throws | Isolated — does not affect API response | Check console.error logs |
| Missing notification config | No email sent (feature disabled) | Verify `features.notifications` in config |

---

# 3. Multiple Login Methods (Feature 3)

## 3.1 Overview

This feature makes authentication config-driven. The `auth.methods` field in the config JSON determines which login methods are available. The system supports:

- **Email + password** login via NextAuth CredentialsProvider
- **Google OAuth** login via NextAuth GoogleProvider

## 3.2 What Qualifies This as a Feature

| Criterion | How it is met |
|-----------|--------------|
| Config-driven | `auth.methods` array in config JSON controls which providers are active |
| Integrated with runtime | `buildAuthProviders()` reads config at boot time |
| Affects frontend | LoginPage renders only the methods specified in config |
| User-scoped data | Already enforced via `app_id` + `user_id` on all queries |
| Not isolated | Uses same config pipeline, same validation, same DB system |

> Decision: **Multiple Auth Methods is the 3rd qualifying feature, replacing multi-language.**
> Rejected: Multi-language / i18n (permanently dropped).
> Why: Auth methods are already partially implemented (CredentialsProvider + GoogleProvider exist). Making them config-driven demonstrates the platform's extensibility with minimal new infrastructure. Multi-language would require translation pipelines, locale-aware rendering, and significant UI changes that do not strengthen the core value proposition.

## 3.3 Config Schema Addition

Add this to the config schema (both Zod and JSON Schema):

```ts
auth: z.object({
  methods: z.array(z.enum(["email", "google"])).min(1).default(["email"])
}).default({ methods: ["email"] })
```

Example config:

```json
{
  "auth": {
    "methods": ["email", "google"]
  }
}
```

## 3.4 Config-Driven Provider Selection (Backend)

This function dynamically builds the NextAuth providers array based on the config:

```ts
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";

export function buildAuthProviders(config: RuntimeConfig) {
  const providers = [];

  if (config.auth?.methods?.includes("email")) {
    providers.push(CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const user = await db("users")
          .where({ email: credentials.email })
          .first();

        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) return null;

        return { id: user.id, email: user.email };
      }
    }));
  }

  if (config.auth?.methods?.includes("google")) {
    providers.push(GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }));
  }

  return providers;
}
```

Usage in NextAuth config:

```ts
export const authOptions = {
  providers: buildAuthProviders(runtimeState.config),
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.user_id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.user_id,
        email: token.email
      };
      return session;
    }
  }
};
```

## 3.5 Config-Driven Login UI (Frontend)

The login page renders only the methods defined in config. This satisfies the "customizable auth UI" item from the problem statement:

```tsx
import { signIn } from "next-auth/react";
import { useState } from "react";

export function LoginPage({ config }) {
  const methods = config.auth?.methods ?? ["email"];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    });

    if (result?.error) {
      setError("Invalid email or password");
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Sign In</h2>

      {methods.includes("email") && (
        <form onSubmit={handleEmailLogin}>
          <div>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div style={{ color: "red" }}>{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in with Email"}
          </button>
        </form>
      )}

      {methods.includes("email") && methods.includes("google") && (
        <hr />
      )}

      {methods.includes("google") && (
        <button onClick={() => signIn("google")}>
          Sign in with Google
        </button>
      )}
    </div>
  );
}
```

## 3.6 Failure Modes

| What can fail | What the system does | How to debug |
|---|---|---|
| Invalid credentials (email) | Returns null from authorize, shows error in UI | Check users table for matching email + password hash |
| Google OAuth misconfigured | Redirects to error page | Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars |
| auth.methods empty in config | Blocked by Zod `.min(1)` validation | Config rejected at validation step |
| auth.methods missing from config | Defaults to `["email"]` via Zod `.default()` | LoginPage renders email-only |
| User not in app_users table | Returns 403 FORBIDDEN | Check app_users membership for app_id + user_id |

---

# 4. LLM-Based Config Generation (Bonus Feature)

This feature is NOT one of the 3 qualifying features. It is a bonus differentiator.

## 4.1 Overview

This feature converts **natural language into a valid ConfigForge JSON config** using the Anthropic Claude API.

Pipeline:

```text
User Prompt
   |
System Prompt + JSON Schema Injection
   |
LLM (Anthropic Claude)
   |
Raw JSON Output
   |
Parse -> Zod Validation -> Semantic Validation
   |
Retry (if invalid, up to 3 attempts)
   |
Accepted Config OR Error Feedback
```

## 4.2 System Prompt

```text
You are an expert system that generates valid JSON configurations for ConfigForge.

STRICT RULES:
- Output ONLY valid JSON. No explanation.
- Follow the provided JSON Schema exactly.
- Do not invent fields outside schema.
- All entities must have at least one field.
- All pages must reference valid entities.
- Use simple names (snake_case).
- For select fields, always include options.

If unsure, choose safe defaults.

Return JSON only.
```

## 4.3 JSON Schema Injection

```ts
import schema from "./config-schema.json";

const prompt = `
SCHEMA:
${JSON.stringify(schema, null, 2)}

USER REQUEST:
${userInput}

Generate valid config JSON:
`;
```

## 4.4 LLM API Call (Anthropic)

```ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateConfig(userInput: string): Promise<string> {
  const response = await client.messages.create({
    model: "claude-3-sonnet-20240229",
    max_tokens: 2000,
    messages: [
      { role: "user", content: prompt }
    ]
  });

  return response.content[0].text;
}
```

## 4.5 Validation Pipeline with Retry

```ts
export async function generateAndValidate(userInput: string) {
  let attempts = 0;
  let lastError = null;

  while (attempts < 3) {
    try {
      const raw = await generateConfig(userInput);
      const parsed = JSON.parse(raw);
      const result = validateConfig(parsed);

      if (result.success) {
        return result.data;
      }

      lastError = result.errors;
    } catch (err) {
      lastError = err.message;
    }

    attempts++;
  }

  throw new Error("LLM_GENERATION_FAILED");
}
```

> Decision: **Maximum 3 retries before failure.**
> Rejected: Unlimited retries or user-prompted retry.
> Why: Each retry costs tokens. Three attempts balance reliability with cost. If all 3 fail, the config structure is likely too complex for the current prompt.

## 4.6 Failure Handling

| Failure | Handling |
|---------|---------|
| LLM timeout | Retry (counts as one attempt) |
| Invalid JSON output | Retry |
| Schema mismatch | Retry |
| All 3 retries fail | Return structured error to UI |
| Anthropic API key missing | Return 500 with `LLM_NOT_CONFIGURED` |

## 4.7 Worked Example

User Input:

```text
I want a bug tracker with title, severity, and assignee
```

Expected LLM Output:

```json
{
  "version": "1.0",
  "app": { "name": "Bug Tracker" },
  "auth": { "methods": ["email"] },
  "entities": [
    {
      "name": "bug",
      "fields": [
        { "id": "title", "type": "text", "validation": { "required": true } },
        {
          "id": "severity",
          "type": "select",
          "options": ["low", "medium", "high"]
        },
        { "id": "assignee", "type": "text" }
      ]
    }
  ],
  "pages": [
    { "path": "/bugs", "type": "list", "entity": "bug" },
    { "path": "/bugs/new", "type": "form", "entity": "bug" }
  ],
  "features": {
    "csv_import": true,
    "notifications": {
      "on_create": true,
      "on_update": false
    }
  }
}
```

---

# 5. Integration Summary

| Feature | Config Field | Backend Integration | Frontend Integration | DB Integration |
|---------|-------------|--------------------|--------------------|---------------|
| CSV Import | `features.csv_import` | `/api/csv-parse`, `/api/csv-import` | CSVMapperUI, ImportResult | Entity tables via JSONB |
| Notifications | `features.notifications` | EventBus listeners | N/A (backend-only) | N/A (email delivery) |
| Multiple Auth | `auth.methods` | `buildAuthProviders()` | LoginPage | users, app_users tables |
| LLM Generation | N/A (bonus) | `generateAndValidate()` | Generation UI | Config stored, app booted |

---

# 6. Trade-offs

| Feature | Benefit | Cost |
|---------|---------|------|
| CSV Import | Bulk data ingestion | Validation complexity, mapping UI effort |
| Notifications | Extensible event-driven architecture | Async debugging, SMTP dependency |
| Multiple Auth | Config-driven flexibility | OAuth setup complexity |
| LLM Generation | Fastest app creation possible | Unpredictable output, API cost |

---

CHANGES APPLIED:
- Guide sections used: 2.1, 2.2, 2.3, 2.4, 3.1-3.5, 4 (event integration), 11
- Contradictions resolved: Multi-language removed entirely; CSV section now includes full mapping flow; Feature 3 (Multiple Auth Methods) added as complete section; LLM explicitly marked as bonus, not a qualifying feature
- Code added: CSVMapperUI, ImportResult, POST /api/csv-parse, POST /api/csv-import (with mapping), buildAuthProviders(), LoginPage, sendEmailNotification
- Removed: Multi-language references; simplified CSV upload endpoint (replaced with two-step mapping flow); "what was fixed" trailing commentary; all emoji from body
