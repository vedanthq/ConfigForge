# DOCUMENT 17 — Alignment Patch

## PHASE 3 — Features (CSV Import, Notifications, Multiple Auth)

---

## 1. Objective of Phase 3

Convert system from:

❌ “Core engine only”
➡️
✅ “Feature-complete platform”

---

## 2. Features to Implement (FINAL)

You MUST have exactly these 3:

1. CSV Import (end-to-end)
2. Event-based Notifications (email)
3. Multiple Authentication Methods (config-driven)

---

# 🧩 FEATURE 1 — CSV IMPORT (FULL SYSTEM)

---

## 3. CSV Flow (Complete)

```text id="csv_flow"
Upload CSV
   ↓
Parse headers
   ↓
Mapping UI (user maps columns → fields)
   ↓
Send mapping + file
   ↓
Validate each row
   ↓
Insert valid rows
   ↓
Return result (imported/skipped)
```

---

## 4. Backend — CSV Parse Endpoint

```ts id="csv_ts_100"
app.post("/api/csv-parse", upload.single("file"), (req, res) => {
  const text = req.file.buffer.toString("utf-8");

  const result = Papa.parse(text, { header: true });

  res.json({
    headers: result.meta.fields,
    preview: result.data.slice(0, 3)
  });
});
```

---

## 5. Frontend — CSV Mapping UI (CRITICAL)

```tsx id="csv_ts_101"
export function CSVMapperUI({ csvHeaders, entity, onSubmit }) {
  const [mapping, setMapping] = useState({});

  return (
    <div>
      <h3>Map CSV columns</h3>

      {csvHeaders.map(col => (
        <div key={col}>
          <span>{col}</span>

          <select
            onChange={e =>
              setMapping(m => ({
                ...m,
                [col]: e.target.value
              }))
            }
          >
            <option value="">Skip</option>
            {entity.fields.map(f => (
              <option key={f.id} value={f.id}>
                {f.id}
              </option>
            ))}
          </select>
        </div>
      ))}

      <button onClick={() => onSubmit(mapping)}>
        Import
      </button>
    </div>
  );
}
```

---

## 6. Backend — CSV Import Endpoint

```ts id="csv_ts_102"
app.post("/api/csv-import", upload.single("file"), async (req, res) => {
  const entity = req.config.entities.find(
    e => e.name === req.body.entity
  );

  const mapping = JSON.parse(req.body.mapping);

  const text = req.file.buffer.toString("utf-8");

  const { data } = Papa.parse(text, { header: true });

  const schema = buildZodSchema(entity);

  let imported = 0;
  let skipped = 0;

  for (const row of data) {
    const mapped = {};

    for (const [csvCol, fieldId] of Object.entries(mapping)) {
      if (fieldId) {
        mapped[fieldId] = row[csvCol];
      }
    }

    const result = schema.safeParse(mapped);

    if (!result.success) {
      skipped++;
      continue;
    }

    await db(entity.name).insert({
      app_id: req.app.id,
      user_id: req.user.id,
      data: result.data
    });

    imported++;
  }

  res.json({ imported, skipped });
});
```

---

## 7. Frontend — Import Result UI

```tsx id="csv_ts_103"
export function ImportResult({ result }) {
  return (
    <div>
      <p>{result.imported} rows imported</p>
      <p>{result.skipped} rows skipped</p>
    </div>
  );
}
```

---

## 8. CSV Feature Validation

* [ ] Upload file works
* [ ] Headers parsed
* [ ] Mapping UI works
* [ ] Invalid rows skipped
* [ ] Valid rows inserted
* [ ] Result shown

---

# 🔔 FEATURE 2 — NOTIFICATIONS (EVENT-BASED)

---

## 9. Event System

```ts id="notif_ts_100"
import EventEmitter from "events";

export const eventBus = new EventEmitter();
```

---

## 10. Emit Events (Backend)

### Create

```ts id="notif_ts_101"
eventBus.emit("entity.create", {
  entity: entity.name,
  data: inserted
});
```

---

### Update

```ts id="notif_ts_102"
eventBus.emit("entity.update", {...});
```

---

## 11. Email Service

```ts id="notif_ts_103"
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587
});

export async function sendEmail(data) {
  await transporter.sendMail({
    to: "test@mailtrap.io",
    subject: "New Record Created",
    text: JSON.stringify(data)
  });
}
```

---

## 12. Event Listener

```ts id="notif_ts_104"
eventBus.on("entity.create", async (payload) => {
  if (runtimeState.config.features?.notifications?.on_create) {
    await sendEmail(payload.data);
  }
});
```

---

## 13. Notification Validation

* [ ] Event triggers on create
* [ ] Email sent
* [ ] Config controls behavior

---

# 🔐 FEATURE 3 — MULTIPLE AUTH METHODS

---

## 14. Config Schema

```ts id="auth_ts_100"
auth: {
  methods: ["email", "google"]
}
```

---

## 15. Backend — Dynamic Providers

```ts id="auth_ts_101"
export function buildAuthProviders(config) {
  const providers = [];

  if (config.auth.methods.includes("email")) {
    providers.push(CredentialsProvider({...}));
  }

  if (config.auth.methods.includes("google")) {
    providers.push(GoogleProvider({...}));
  }

  return providers;
}
```

---

## 16. Frontend — Login UI

```tsx id="auth_ts_102"
export function LoginPage({ config }) {
  const methods = config.auth?.methods || ["email"];

  return (
    <div>
      {methods.includes("email") && <EmailLoginForm />}
      
      {methods.includes("google") && (
        <button onClick={() => signIn("google")}>
          Login with Google
        </button>
      )}
    </div>
  );
}
```

---

## 17. Auth Validation

* [ ] Email login works
* [ ] Google login works
* [ ] Config controls UI
* [ ] User data isolated

---

# 🧠 18. Integration Rules (VERY IMPORTANT)

All features must:

* Use config-driven logic
* Use same DB + API system
* Respect tenant isolation
* Not be standalone hacks

---

# 🎯 19. Phase 3 Checklist

* [ ] CSV full flow works
* [ ] Notifications send email
* [ ] Auth supports multiple methods
* [ ] All features integrated with config

---

# 🚀 20. Phase 3 Outcome

After this phase:

> ✅ You satisfy “3 features” requirement
> ✅ Your system becomes judge-ready
> ✅ You now have real functionality

---
