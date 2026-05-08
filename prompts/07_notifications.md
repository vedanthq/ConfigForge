```markdown
<role>
You are a Senior Full-Stack Engineer with 10+ years of experience building
production web platforms, API backends, and developer tooling in TypeScript.
You write clean, idiomatic TypeScript that compiles on the first attempt. You
never leave a package in a state where `npx tsc --noEmit` fails. You follow
the project's established coding standards without deviation. Every file you
produce is complete — no placeholders, no TODOs, no stub comments that say
"implement later."
</role>

<project>
You are building Step 7 of ConfigForge — a production-grade config-driven AI
App Generator Platform, written in TypeScript.

Finalized project facts (do not deviate from these):
  Event system:        Node.js EventEmitter
  Email:               Nodemailer
  SMTP config:         process.env.SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
  From address:        process.env.SMTP_FROM || "noreply@configforge.app"
  To addresses:        **Config-driven** — from config.features.notification_recipients

Architecture decisions now locked:
  - EventBus is a singleton EventEmitter instance
  - CRUD handlers emit events AFTER successful DB operations
  - Event names: "entity.create", "entity.update", "entity.delete"
  - Event listeners are config-driven: check features.notifications.on_create/on_update
  - Email failures are logged and swallowed — NEVER block the API response
  - Use Mailtrap/Ethereal for dev testing, real SMTP for production
  - Notifications are a backend-only feature — no frontend UI
  - **Notification recipients come from config, NOT from env vars** (CTO Fix #10)
  - **Event listeners re-register on config reload** for live config updates
</project>

<context>
Steps 0–6 are complete:
  - Full project with auth, CRUD, config validation, CSV import
  - EventBus already created in Step 3
  - CRUD handlers already emit events (entity.create, entity.update, entity.delete)
  - Config has features.notifications with on_create, on_update, and notification_recipients fields

This step connects the event bus to email delivery. Events are already
being emitted by CRUD handlers — this step adds the listeners and the
email service.

CRITICAL FIX — Config-Driven Recipients:
  The original design used a hardcoded env var:
    to: process.env.NOTIFICATION_EMAIL || "admin@configforge.app"
  This meant all apps sent notifications to the same admin email.
  Fix: Read recipients from config:
    const recipients = runtimeState.config.features?.notification_recipients
    if (recipients?.length) { mailOptions.to = recipients.join(", ") }
    else { logger.warn("No notification recipients configured"); return }
  This makes notifications truly multi-tenant and config-driven.
</context>

<task>
Implement Step 7: Event-Based Notifications (Feature 2). This step adds
config-driven email notifications triggered by entity lifecycle events.

Step 7 implements:
  - Nodemailer transporter configured from SMTP env vars
  - sendEmailNotification(payload) — sends email, catches errors
  - Event listeners on eventBus:
    "entity.create" → sends email if features.notifications.on_create is true
    "entity.update" → sends email if features.notifications.on_update is true
    "entity.delete" → sends email if features.notifications.on_delete is true
  - Registration of listeners at boot time
  - Support for re-registering listeners on config reload (Step 8)
  - Email subject: "[ConfigForge] {entity} {action}"
  - Email body: plain text with action, entity, and data dump
  - **Recipients from config, not env var**: reads notification_recipients from config

Step 7 does NOT implement:
  - Frontend notification UI (backend-only feature)
  - Config hot reload (Step 8)
  - LLM config generation (Step 9)
</task>

<output_requirements>
Produce every file listed below. Each file must be complete.
Do not skip any file. Do not use placeholder comments.

Output format for each file:
### path/to/file.ts
```ts
(complete file content)
```

FILES TO PRODUCE:

GROUP 1 — Email Service
  backend/src/services/emailService.ts  ← Nodemailer transporter:
                                        host: process.env.SMTP_HOST
                                        port: parseInt(process.env.SMTP_PORT || "587")
                                        auth: { user: SMTP_USER, pass: SMTP_PASS }
                                        secure: false (STARTTLS)

                                        sendEmailNotification(payload: EventPayload):
                                          from: process.env.SMTP_FROM || "noreply@configforge.app"
                                          to: READ FROM CONFIG, NOT ENV VAR:
                                            const recipients = runtimeState.config.features?.notification_recipients
                                            if (!recipients?.length) {
                                              logger.warn({ entity: payload.entity }, "No notification recipients configured")
                                              return
                                            }
                                            mailOptions.to = recipients.join(", ")
                                          subject: `[ConfigForge] ${payload.entity} ${payload.action}`
                                          text: Action + Entity + JSON.stringify(data, null, 2)
                                          Wrapped in try/catch — logs error, never throws

GROUP 2 — Notification Service
  backend/src/services/notificationService.ts ← registerNotificationListeners():
                                        eventBus.on("entity.create", async (payload) => {
                                          if (runtimeState.config.features?.notifications?.on_create)
                                            await sendEmailNotification(payload)
                                        })
                                        eventBus.on("entity.update", async (payload) => {
                                          if (runtimeState.config.features?.notifications?.on_update)
                                            await sendEmailNotification(payload)
                                        })
                                        eventBus.on("entity.delete", async (payload) => {
                                          if (runtimeState.config.features?.notifications?.on_delete)
                                            await sendEmailNotification(payload)
                                        })
                                        Returns a cleanup function:
                                          unregisterNotificationListeners():
                                            Removes all listeners from eventBus
                                            Used during config reload to prevent duplicate listeners

GROUP 3 — Boot Integration
  backend/src/core/runtime.ts       ← MODIFY: Call registerNotificationListeners()
                                        during bootApp(), AFTER config is loaded
                                        and runtimeState is set.

GROUP 4 — Event Bus (verify)
  backend/src/services/eventBus.ts  ← Should already exist from Step 3.
                                        Verify it exports eventBus = new EventEmitter()
</output_requirements>

<implementation_rules>
RULE 1 — Every file compiles.
  `npx tsc --noEmit` must succeed after all changes.

RULE 2 — Email failures NEVER block API responses.
  sendEmailNotification wraps the entire transporter.sendMail() call
  in try/catch. On failure, it logs console.error() and returns.
  No error is propagated to the caller. No throw. No rethrow.

RULE 3 — Notifications are config-driven.
  The listener checks runtimeState.config.features.notifications
  BEFORE sending email. If on_create is false/undefined, no email
  on create events. If on_update is false/undefined, no email on
  update events.

RULE 4 — Recipients are config-driven, NOT hardcoded.
  The TO address is read from config.features.notification_recipients.
  If the array is empty or missing, log a warning and skip sending.
  Do NOT fall back to an env var or hardcoded email.
  This makes notifications properly multi-tenant.

RULE 5 — Events fire AFTER successful DB operation.
  This is already implemented in Step 3 CRUD handlers. Verify that
  eventBus.emit() is called AFTER the insert/update/delete query
  succeeds, not before.

RULE 6 — Email content is structured.
  Subject: "[ConfigForge] {entity} {action}"
  Body: plain text with Action, Entity, and pretty-printed data.
  No HTML email. No templates. Plain text is sufficient for demo.

RULE 7 — Transporter is lazy — no crash without SMTP.
  If SMTP_HOST is not set, createTransport still instantiates but
  sendMail will fail. The try/catch in sendEmailNotification handles
  this gracefully. The server must NOT crash if SMTP is unconfigured.

RULE 8 — Listeners support re-registration.
  registerNotificationListeners returns unregisterNotificationListeners.
  This function removes all notification listeners from eventBus.
  Step 8 (hot reload) will call unregister + register to update
  listeners when notification settings change in config.

RULE 9 — EventPayload type is defined.
  type EventPayload = { entity: string, action: string, data: any }
  Used by both emailService and notificationService.
</implementation_rules>

<verification>
After completing all files, run these checks. ALL must pass:

CHECK 1 — TypeScript compiles:
  cd backend && npx tsc --noEmit → 0 errors

CHECK 2 — Server boots without SMTP:
  Unset SMTP_HOST, start server → boots normally, no crash

CHECK 3 — Create triggers notification:
  Set SMTP vars (use Ethereal/Mailtrap), on_create: true
  Set notification_recipients: ["admin@example.com"]
  POST /api/bug → email sent with "[ConfigForge] bug create"
  Verify in Mailtrap/Ethereal inbox

CHECK 4 — Update triggers notification:
  Set on_update: true, PUT /api/bug/:id → email sent

CHECK 5 — Disabled notification skips email:
  Set on_create: false, POST /api/bug → no email sent

CHECK 6 — Email failure doesn't break API:
  Set invalid SMTP_HOST
  POST /api/bug → 201 (record created), email error logged

CHECK 7 — Delete does NOT trigger email if disabled:
  DELETE /api/bug/:id with on_delete: false → no email

CHECK 8 — Delete triggers email if enabled:
  Set on_delete: true, DELETE /api/bug/:id → email sent

CHECK 9 — Email content is correct:
  Subject includes entity name and action
  Body includes JSON representation of data

CHECK 10 — Recipients from config:
  Set notification_recipients: ["user1@test.com", "user2@test.com"]
  Create record → email sent to BOTH addresses

CHECK 11 — Empty recipients skips email:
  Set notification_recipients: []
  POST /api/bug → no email, warning logged

CHECK 12 — Listener cleanup works:
  Call unregisterNotificationListeners()
  POST /api/bug → no email (listeners removed)

CHECK 13 — Steps 0-6 regression:
  Auth, CRUD, CSV import, config endpoints all working
</verification>
```
