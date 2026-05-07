# Security Specification

This document defines the **complete security model** of ConfigForge.

It includes:
- Threat model (what can go wrong)
- Config injection protection
- API security (auth + tenant isolation)
- SQL injection prevention
- Input validation constraints
- Rate limiting
- Resource abuse prevention

This is a **system-level security specification**, not a checklist.

---

# 1. Threat Model

## 1.1 Attack Surfaces

| Surface | Risk |
|--------|------|
| Config JSON | Injection, malformed structure |
| API endpoints | Unauthorized access |
| Database | SQL injection |
| LLM output | Malicious or invalid config |
| File uploads (CSV) | Large payload / invalid data |

---

## 1.2 Primary Threats

1. Config Injection
2. Cross-Tenant Data Access
3. SQL Injection
4. Denial of Service (DoS)
5. LLM Misbehavior

---

# 2. Config Injection Protection

## 2.1 Problem

Config is user-controlled input.  
Malicious config could attempt:

```json
{
  "name": "task; DROP TABLE users;"
}
````

---

## 2.2 Identifier Allowlist (Strict)

```ts id="sec_ts_01"
const NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const PATH_REGEX = /^\/[a-zA-Z0-9\-\/]*$/;
```

---

## 2.3 Enforced in Zod Schema

```ts id="sec_ts_02"
z.string().regex(NAME_REGEX)
```

---

## 2.4 Result

* Invalid identifiers rejected BEFORE runtime
* No dynamic SQL injection possible

---

# 3. SQL Injection Prevention

## 3.1 Rule

> 📌 Decision:
> **No raw SQL with string interpolation allowed**

---

## 3.2 Safe Query Example

```ts id="sec_ts_03"
await db("task")
  .where({
    app_id: req.app.id,
    user_id: req.user.id
  });
```

---

## 3.3 Unsafe (Forbidden)

```ts id="sec_ts_04"
// ❌ NEVER DO THIS
db.raw(`SELECT * FROM ${table}`);
```

---

## 3.4 JSONB Safety

```ts id="sec_ts_05"
.whereRaw("data->>? = ?", ["status", "done"])
```

---

# 4. Authentication Security

## 4.1 Token Scope

Tokens only contain:

```json id="sec_json_01"
{
  "user_id": "uuid",
  "email": "user@example.com"
}
```

---

## 4.2 No app_id in token

> 📌 Decision:
> app_id is resolved per request, NOT stored in token

**Why:**

* Prevents token reuse across apps

---

# 5. Tenant Isolation Enforcement

## 5.1 Rule

Every DB query MUST include:

```ts id="sec_ts_06"
app_id + user_id
```

---

## 5.2 Enforcement Layer

```ts id="sec_ts_07"
function enforceScope(query, req) {
  return query.where({
    app_id: req.app.id,
    user_id: req.user.id
  });
}
```

---

## 5.3 Attack Prevention

### Attempt

```http
GET /api/task?app_id=other
```

### Result

* Ignored
* Server uses `req.app.id`

---

# 6. API Security

## 6.1 Rate Limiting

```ts id="sec_ts_08"
import rateLimit from "express-rate-limit";

app.use("/api", rateLimit({
  windowMs: 60 * 1000,
  max: 100
}));
```

---

## 6.2 Payload Limits

```ts id="sec_ts_09"
app.use(express.json({ limit: "1mb" }));
```

---

## 6.3 File Upload Limits

```ts id="sec_ts_10"
const upload = multer({
  limits: { fileSize: 2 * 1024 * 1024 }
});
```

---

# 7. LLM Security

## 7.1 Risk

LLM can generate:

* invalid JSON
* malicious config
* huge payloads

---

## 7.2 Protection

### Step 1 — Parse

```ts id="sec_ts_11"
JSON.parse(raw)
```

---

### Step 2 — Validate

```ts id="sec_ts_12"
validateConfig(parsed)
```

---

### Step 3 — Reject if invalid

No partial acceptance

---

## 7.3 Retry Limit

```ts id="sec_ts_13"
maxRetries = 3
```

---

# 8. CSV Upload Security

## 8.1 Risks

* Large files
* invalid data
* injection via CSV values

---

## 8.2 Protection

* file size limit (2MB)
* row validation via Zod
* skip invalid rows

---

# 9. Denial of Service Protection

## 9.1 Limits

| Resource    | Limit   |
| ----------- | ------- |
| Config size | 256 KB  |
| API payload | 1 MB    |
| CSV upload  | 2 MB    |
| Requests    | 100/min |

---

# 10. Secrets Management

## 10.1 Rule

> 📌 Decision:
> All secrets must be in environment variables

---

## 10.2 Example

```env id="sec_env_01"
DATABASE_URL=...
JWT_SECRET=...
ANTHROPIC_API_KEY=...
```

---

## 10.3 Forbidden

* No secrets in config JSON
* No secrets in frontend

---

# 11. Failure Modes

## 11.1 Invalid Config

* rejected

## 11.2 Auth failure

* 401

## 11.3 Cross-tenant attempt

* blocked silently

## 11.4 Rate limit exceeded

* 429

---

# 12. Observability

## Logs

```ts id="sec_ts_14"
logger.warn("Suspicious request", {
  ip: req.ip,
  path: req.path
});
```

---

## Metrics

* failed auth attempts
* rate limit triggers
* invalid configs

---

# 13. Trade-offs

| Decision          | Benefit  | Cost                  |
| ----------------- | -------- | --------------------- |
| Strict validation | secure   | less flexible         |
| Rate limiting     | safe     | possible false blocks |
| JSONB             | flexible | harder auditing       |

---

```


