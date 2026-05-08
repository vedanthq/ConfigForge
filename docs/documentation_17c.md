# DOCUMENT 17 — Alignment Patch

## PHASE 4 — Deployment, Security, and Submission Readiness

---

# 1. Objective of Phase 4

Convert system from:

❌ “Runs locally”
➡️
✅ “Live, secure, submission-ready system”

---

# 2. MANDATORY REQUIREMENT — LIVE DEPLOYMENT

> ⚠️ If your project is not deployed → it FAILS the assignment

---

## 2.1 Required Infrastructure

| Component             | Platform |
| --------------------- | -------- |
| Frontend (Next.js)    | Vercel   |
| Backend (Node.js)     | Railway  |
| Database (PostgreSQL) | Railway  |

---

## 2.2 Deployment Flow

```text id="deploy_flow"
Push to GitHub
   ↓
Frontend → Vercel deploy
   ↓
Backend → Railway deploy
   ↓
PostgreSQL → Railway DB
   ↓
Connect via env variables
```

---

## 2.3 Frontend Deployment (Vercel)

Steps:

1. Push frontend to GitHub
2. Connect repo to Vercel
3. Set env variables:

```env id="env_fe"
NEXT_PUBLIC_API_URL=https://your-backend-url
NEXTAUTH_URL=https://your-frontend-url
```

---

## 2.4 Backend Deployment (Railway)

Steps:

1. Push backend to GitHub
2. Deploy on Railway
3. Add env variables:

```env id="env_be"
DATABASE_URL=postgres://...
NEXTAUTH_SECRET=secure_random_string
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
```

---

## 2.5 Database Setup

Run migrations:

```bash id="db_cmd"
npx knex migrate:latest
```

Tables required:

* apps
* users
* app_users
* entity tables

---

## 2.6 Health Check Endpoint

```ts id="health_ts"
app.get("/health", async (req, res) => {
  try {
    await db.raw("select 1");
    res.json({ status: "ok" });
  } catch {
    res.status(500).json({ status: "fail" });
  }
});
```

---

# 3. CONFIG DEPLOYMENT SYSTEM

---

## 3.1 Runtime Config Upload

```ts id="cfg_post"
POST /config
```

---

## 3.2 Behavior

* Valid config → applied instantly
* Invalid config → rejected
* Breaking change → blocked

---

## 3.3 Hot Reload

Frontend polls:

```text id="polling"
GET /config/version (every 5 seconds)
```

If version changes → reload UI

---

# 4. SECURITY IMPLEMENTATION (CRITICAL)

---

## 4.1 Input Validation

All config must pass:

* Zod schema validation
* Semantic validation

---

## 4.2 SQL Injection Prevention

✅ Allowed:

```ts id="safe_sql"
db("table").where({ id })
```

❌ Forbidden:

```ts id="unsafe_sql"
db.raw(`SELECT * FROM ${table}`)
```

---

## 4.3 Rate Limiting

```ts id="rate_limit"
app.use("/api", rateLimit({
  windowMs: 60 * 1000,
  max: 100
}));
```

---

## 4.4 File Upload Limits

```ts id="upload_limit"
const upload = multer({
  limits: { fileSize: 2 * 1024 * 1024 }
});
```

---

## 4.5 Auth Security

* JWT sessions
* HTTP-only cookies
* No `app_id` in token
* Always resolve from server

---

## 4.6 Tenant Isolation

Every query MUST include:

```ts id="tenant_scope"
app_id + user_id
```

---

## 4.7 Secrets Management

✅ Use:

```env id="secret_env"
DATABASE_URL=...
JWT_SECRET=...
```

❌ Never:

* commit secrets to repo
* expose secrets to frontend

---

# 5. LOGGING & MONITORING

---

## 5.1 Logging

```ts id="log_ts"
logger.info("Request", {
  path: req.path,
  user: req.user?.id
});
```

---

## 5.2 Monitoring

Optional tools:

* Sentry (errors)
* basic logs (console)

---

# 6. ROLLBACK STRATEGY

---

## 6.1 Config Rollback

* store previous config
* reload old config if needed

---

## 6.2 DB Rollback

```bash id="rollback_cmd"
npx knex migrate:rollback
```

---

# 7. REPOSITORY CLEANUP (MANDATORY)

---

## 7.1 REMOVE

❌ Explanation.md
❌ Any random notes
❌ Hardcoded secrets

---

## 7.2 ADD

✅ .gitignore

```gitignore id="gitignore"
.env
node_modules
.next
dist
```

---

## 7.3 README MUST INCLUDE

* Live URL
* Project description
* Features list
* Setup instructions

---

# 8. FINAL SYSTEM VALIDATION

---

## 8.1 Core System

* [ ] App loads from config
* [ ] Form submits to DB
* [ ] List shows records
* [ ] Update/Delete works

---

## 8.2 Features

* [ ] CSV import works end-to-end
* [ ] Notifications send email
* [ ] Auth supports email + Google

---

## 8.3 Stability

* [ ] Invalid config rejected
* [ ] Unknown fields handled
* [ ] API errors handled

---

## 8.4 Deployment

* [ ] Live frontend URL
* [ ] Live backend URL
* [ ] DB connected

---

# 9. Phase 4 Outcome

After this phase:

> ✅ System is LIVE
> ✅ System is SECURE
> ✅ Repo is CLEAN
> ✅ Ready for submission

---
