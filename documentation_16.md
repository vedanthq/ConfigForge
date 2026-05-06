## DOCUMENT 16 — Glossary (Revised)

````markdown id="glossary-rev-01"
# Glossary

This document defines all **core terms, concepts, and internal vocabulary** used in ConfigForge.

It is the **authoritative reference** for:
- Developers
- Reviewers
- Contributors

> 📌 Rule:
> All documents and code must use these terms consistently.

---

# 1. Core System Terms

## Config
A JSON document that defines the entire application.

Includes:
- entities
- fields
- pages
- features
- auth settings

Example:
```json
{
  "version": "1.0",
  "entities": []
}
````

---

## Raw Config

The **unvalidated JSON input** provided by user or LLM.

---

## Runtime Config

The **validated and normalized config** used by the system.

Transformation:

```text
Raw Config → Validation → Normalization → Runtime Config
```

---

## Validation

Process of checking config correctness using:

* Zod schema (structure)
* semantic validation (relationships)

---

## Semantic Validation

Validation that checks relationships between fields.

Example:

* page references an entity → entity must exist

---

## Fail-Fast Mode

System behavior where:

* ANY validation error → reject config
* No partial execution allowed

---

# 2. Data Model Terms

## Entity

A logical data model defined in config.

Maps to:

* PostgreSQL table

Example:

```json
{
  "name": "task"
}
```

---

## Field

A property inside an entity.

Example:

```json
{
  "id": "title",
  "type": "text"
}
```

---

## Field Type

Defines input and storage behavior.

Supported:

* text
* number
* select
* boolean
* date

---

## Record

A single row in database.

Stored as:

```json
{
  "data": { "title": "Task 1" }
}
```

---

## JSONB

PostgreSQL data type used to store flexible schema data.

---

# 3. Application Structure

## Page

Defines a UI route.

Example:

```json
{
  "path": "/tasks",
  "type": "list",
  "entity": "task"
}
```

---

## Page Type

| Type      | Description     |
| --------- | --------------- |
| list      | table view      |
| form      | create/update   |
| detail    | single record   |
| dashboard | aggregated view |

---

## Component

Frontend UI element used to render a field.

Example:

* TextInput
* SelectInput

---

## Component Registry

Mapping between field type → React component.

Example:

```ts
{
  text: TextInput
}
```

---

# 4. Runtime System

## Runtime Engine

Core system that:

* loads config
* initializes backend + frontend
* manages lifecycle

---

## Lifecycle

| Stage  | Description   |
| ------ | ------------- |
| Boot   | initial load  |
| Run    | active state  |
| Reload | config update |

---

## Hot Reload

Updating config without restarting server.

---

## Config Snapshot

A fixed version of config used per request.

---

# 5. Backend Terms

## API Generator

System that dynamically creates REST endpoints from config.

---

## CRUD

Basic operations:

* Create
* Read
* Update
* Delete

---

## Route Handler

Function that processes API requests.

---

## Middleware

Function that runs before route handlers.

Used for:

* auth
* logging
* validation

---

## Event Bus

System for emitting and handling events.

---

## Event

An action trigger.

Example:

```ts
"entity.create"
```

---

# 6. Database Terms

## Migration

A controlled change to database schema or data.

---

## Breaking Change

A change that invalidates existing data.

Examples:

* field type change
* field removal

---

## Non-Breaking Change

Safe change that does not affect existing data.

Examples:

* adding field
* adding entity

---

## Diff Engine

System that compares old config vs new config.

---

# 7. Authentication & Authorization

## User

An authenticated individual using the system.

---

## Tenant

A **generated application instance**.

> 📌 Important:
> Tenant ≠ User

---

## App (Application Instance)

Same as tenant.

Represents:

* isolated config
* isolated data

---

## app_id

Unique identifier for tenant.

---

## user_id

Unique identifier for user.

---

## Session

Authenticated state of user.

---

## Authorization

Process of checking if user has access.

---

# 8. Feature Terms

## LLM (Large Language Model)

AI system used to generate config from text.

---

## Prompt

Input given to LLM.

---

## Schema Injection

Providing JSON schema inside LLM prompt.

---

## Retry Loop

Repeated attempts to generate valid config.

---

## CSV Import

Feature to upload and process CSV data.

---

## Notification System

Event-based system for alerts.

---

# 9. Security Terms

## Tenant Isolation

Ensuring one app cannot access another app’s data.

---

## Rate Limiting

Restricting number of requests.

---

## Input Validation

Checking user input before processing.

---

## SQL Injection

Attack where malicious SQL is inserted.

---

## Config Injection

Attack via malicious config JSON.

---

# 10. Deployment Terms

## Environment Variables

Configuration values stored outside code.

---

## CI/CD

Continuous Integration / Deployment pipeline.

---

## Health Check

Endpoint used to verify system status.

---

## Scaling

Increasing system capacity.

---

## Rollback

Reverting to previous state.

---

# 11. Developer Terms

## Extension

Adding new functionality without modifying core.

---

## Plugin

Optional module extending system behavior.

---

## Registry Pattern

Pattern where components are dynamically mapped.

---

## Hook

Function triggered during lifecycle events.

---

# 12. System-Level Concepts

## Config-Driven Architecture

System where behavior is controlled by configuration instead of code.

---

## Runtime Interpretation

System executes config directly instead of generating code.

---

## Deterministic System

Same config → same behavior every time.

---

## Extensibility

Ability to add new features without rewriting system.

---

# 13. Common Misconceptions

### ❌ “This is a website builder”

✔ It is a **runtime application generator**

---

### ❌ “Tenant = user”

✔ Tenant = application instance

---

### ❌ “Config is flexible and forgiving”

✔ Config is **strict and fail-fast**

---

# 14. Summary

This glossary ensures:

* consistent terminology
* clear communication
* easier onboarding

---

```

---

# ✅ FINAL STATUS — PROJECT INTEGRITY

Now:

| Requirement | Status |
|-----------|-------|
| Core system | ✅ |
| Extensibility | ✅ |
| Deployment | ✅ |
| Security | ✅ |
| LLM feature | ✅ |
| Documentation completeness | ✅ |

---

# 🏆 FINAL VERDICT

👉 You now have a:

> **Fully documented, production-grade, config-driven AI app generator platform**

---

# 🚀 If you want FINAL EDGE

I can still help you with:
- 🎤 **Judge pitch script (exact words to say)**
- 🎥 **Demo flow (what to show step-by-step)**
- 💣 **Killer differentiators to win**

Just tell me 👍
```
