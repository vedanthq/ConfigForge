# Config Schema Reference

This document specifies the **complete, enforceable contract** for ConfigForge configuration files, including:
- Formal JSON Schema (Draft-07)
- Zod runtime schema (authoritative for validation)
- Semantic validation rules
- Partial validation behavior (fail-fast)
- Versioning and compatibility rules
- Worked examples

> Decision: The **Zod schema is the source of truth** for runtime validation.
> JSON Schema is provided for tooling (editors, LLM prompt injection), but the runtime enforces Zod + semantic validation.

---

## 1. File Location and Loading

- Default path: `/config/app.json`
- Encoding: UTF-8
- Maximum size: 256 KB (enforced at upload/API boundary)

```ts
import fs from "fs";

export function loadConfig(path = "./config/app.json"): unknown {
  const raw = fs.readFileSync(path, "utf-8");
  if (raw.length > 256 * 1024) {
    throw new Error("CONFIG_TOO_LARGE");
  }
  return JSON.parse(raw);
}
```

---

## 2. JSON Schema (Draft-07)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["version", "app", "entities", "pages"],
  "additionalProperties": false,
  "properties": {
    "version": { "type": "string", "pattern": "^[0-9]+\\.[0-9]+$" },

    "app": {
      "type": "object",
      "required": ["name"],
      "additionalProperties": false,
      "properties": {
        "name": { "type": "string", "minLength": 1, "maxLength": 120 }
      }
    },

    "auth": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "methods": {
          "type": "array",
          "items": { "type": "string", "enum": ["email", "google"] },
          "minItems": 1,
          "uniqueItems": true,
          "default": ["email"]
        }
      }
    },

    "entities": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/definitions/entity" }
    },

    "pages": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/definitions/page" }
    },

    "features": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "csv_import": { "type": "boolean", "default": false },
        "notifications": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "on_create": { "type": "boolean", "default": false },
            "on_update": { "type": "boolean", "default": false }
          }
        }
      }
    }
  },

  "definitions": {
    "entity": {
      "type": "object",
      "required": ["name", "fields"],
      "additionalProperties": false,
      "properties": {
        "name": {
          "type": "string",
          "pattern": "^[a-zA-Z_][a-zA-Z0-9_]*$"
        },
        "fields": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/definitions/field" }
        }
      }
    },

    "field": {
      "type": "object",
      "required": ["id", "type"],
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[a-zA-Z_][a-zA-Z0-9_]*$"
        },
        "type": {
          "type": "string",
          "enum": ["text", "number", "date", "select", "boolean"]
        },
        "label": { "type": "string", "maxLength": 120 },
        "options": {
          "type": "array",
          "items": { "type": "string" }
        },
        "validation": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "required": { "type": "boolean", "default": false },
            "maxLength": { "type": "integer", "minimum": 1 }
          }
        }
      }
    },

    "page": {
      "type": "object",
      "required": ["path", "type", "entity"],
      "additionalProperties": false,
      "properties": {
        "path": {
          "type": "string",
          "pattern": "^/[a-zA-Z0-9\\-\\/]*$"
        },
        "type": {
          "type": "string",
          "enum": ["list", "form", "detail", "dashboard"]
        },
        "entity": {
          "type": "string",
          "pattern": "^[a-zA-Z_][a-zA-Z0-9_]*$"
        }
      }
    }
  }
}
```

---

## 3. Authoritative Zod Schema (Runtime)

```ts
import { z } from "zod";

const nameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const pathRegex = /^\/[a-zA-Z0-9\-\/]*$/;

export const fieldSchema = z.object({
  id: z.string().regex(nameRegex),
  type: z.enum(["text", "number", "date", "select", "boolean"]),
  label: z.string().max(120).optional(),
  options: z.array(z.string()).optional(),
  validation: z.object({
    required: z.boolean().default(false),
    maxLength: z.number().int().positive().optional()
  }).default({})
}).strict();

export const entitySchema = z.object({
  name: z.string().regex(nameRegex),
  fields: z.array(fieldSchema).min(1)
}).strict();

export const pageSchema = z.object({
  path: z.string().regex(pathRegex),
  type: z.enum(["list", "form", "detail", "dashboard"]),
  entity: z.string().regex(nameRegex)
}).strict();

export const configSchema = z.object({
  version: z.string().regex(/^[0-9]+\.[0-9]+$/),
  app: z.object({
    name: z.string().min(1).max(120)
  }).strict(),
  auth: z.object({
    methods: z.array(z.enum(["email", "google"])).min(1).default(["email"])
  }).default({ methods: ["email"] }),
  entities: z.array(entitySchema).min(1),
  pages: z.array(pageSchema).min(1),
  features: z.object({
    csv_import: z.boolean().default(false),
    notifications: z.object({
      on_create: z.boolean().default(false),
      on_update: z.boolean().default(false)
    }).default({})
  }).default({})
}).strict();

export type Config = z.infer<typeof configSchema>;
```

> Decision: **auth.methods uses `.min(1).default(["email"])` — no github in enum.**
> Rejected: Including `github` in the enum and making auth.methods fully optional with no minimum.
> Why: The project only implements email and Google OAuth. Including github in the enum would create a false promise. `.min(1)` prevents an empty methods array (which would render a login page with no options). `.default(["email"])` ensures configs without an auth section still produce a functional login.

---

## 4. Semantic Validation (Cross-Field Rules)

### 4.1 Rules

1. `page.entity` must exist in `entities`
2. `field.options` is required when `type = "select"`
3. No duplicate entity names
4. No duplicate field ids within an entity
5. Page paths must be unique

### 4.2 Implementation

```ts
type ValidationError = {
  path: string;
  message: string;
  severity: "error" | "warning";
};

export function semanticValidate(config: Config): ValidationError[] {
  const errors: ValidationError[] = [];

  const entityMap = new Map<string, Set<string>>();

  // Entity + field checks
  for (const entity of config.entities) {
    if (entityMap.has(entity.name)) {
      errors.push({
        path: `entities.${entity.name}`,
        message: "Duplicate entity name",
        severity: "error"
      });
      continue;
    }

    const fieldSet = new Set<string>();
    for (const field of entity.fields) {
      if (fieldSet.has(field.id)) {
        errors.push({
          path: `entities.${entity.name}.fields.${field.id}`,
          message: "Duplicate field id",
          severity: "error"
        });
      }
      fieldSet.add(field.id);

      if (field.type === "select" && (!field.options || field.options.length === 0)) {
        errors.push({
          path: `entities.${entity.name}.fields.${field.id}`,
          message: "Select field requires options",
          severity: "error"
        });
      }
    }

    entityMap.set(entity.name, fieldSet);
  }

  // Page checks
  const pathSet = new Set<string>();

  for (const page of config.pages) {
    if (!entityMap.has(page.entity)) {
      errors.push({
        path: `pages.${page.path}`,
        message: `Entity '${page.entity}' does not exist`,
        severity: "error"
      });
    }

    if (pathSet.has(page.path)) {
      errors.push({
        path: `pages.${page.path}`,
        message: "Duplicate page path",
        severity: "error"
      });
    }

    pathSet.add(page.path);
  }

  return errors;
}
```

---

## 5. Validation Pipeline (Complete)

```ts
export function validateConfig(raw: unknown): ValidationResult<Config> {
  const parsed = configSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.errors.map(e => ({
        path: e.path.join("."),
        message: e.message,
        severity: "error"
      }))
    };
  }

  const semanticErrors = semanticValidate(parsed.data);

  if (semanticErrors.length > 0) {
    return {
      success: false,
      errors: semanticErrors
    };
  }

  return {
    success: true,
    data: parsed.data,
    warnings: []
  };
}
```

---

## 6. Partial Validation Behavior (Critical Decision)

> Decision: ConfigForge uses **strict fail-fast mode**.

### Meaning:

* If ANY error exists, the config is rejected
* No partial rendering
* No partial API generation

### Why:

* Prevents inconsistent state between UI/API/DB
* Keeps runtime deterministic

### Trade-off:

* Less forgiving for users
* Requires better tooling (editor, LLM assist)

---

## 7. Versioning Strategy

### Format

```json
"version": "major.minor"
```

### Compatibility Rules

| Change Type | Version Impact |
|---|---|
| Add field | Minor |
| Remove field | Major |
| Change field type | Major |
| Add page | Minor |
| Add entity | Minor |
| Remove entity | Major |

---

## 8. Config Diff Classification (Used by DB Engine)

```ts
type ChangeType =
  | "ADD_FIELD"
  | "REMOVE_FIELD"
  | "CHANGE_FIELD_TYPE"
  | "ADD_ENTITY"
  | "REMOVE_ENTITY"
  | "ADD_PAGE"
  | "REMOVE_PAGE";
```

Full diff engine implementation is defined in doc_06 (Database).

---

## 9. Worked Example

### Input (Invalid Config)

```json
{
  "version": "1.0",
  "app": { "name": "Test" },
  "entities": [],
  "pages": [
    { "path": "/x", "type": "list", "entity": "missing" }
  ]
}
```

### Output

```json
{
  "success": false,
  "errors": [
    {
      "path": "entities",
      "message": "Array must contain at least 1 element",
      "severity": "error"
    },
    {
      "path": "pages./x",
      "message": "Entity 'missing' does not exist",
      "severity": "error"
    }
  ]
}
```

---

## 10. Failure Modes

| What can fail | What the system does | How to debug |
|---|---|---|
| Invalid JSON syntax | JSON.parse throws error | Check for trailing commas, missing quotes |
| Schema violation (wrong types) | Zod returns structured errors | Review error path and message |
| Semantic violation (dangling reference) | semanticValidate returns errors | Check entity/page cross-references |
| Oversized config (>256KB) | Rejected before validation | Reduce config size |
| auth.methods empty | Zod `.min(1)` rejects | Ensure at least one auth method |
| auth.methods missing | Defaults to `["email"]` | Expected behavior |
| Select field without options | Semantic validation error | Add options array to select fields |

---

## 11. LLM Compatibility Notes

* JSON Schema is injected into the LLM prompt so the model knows the expected structure
* Zod validation is enforced on LLM output (post-generation)
* Fail-fast ensures invalid LLM output is rejected, triggering a retry
* Maximum 3 retries before returning error (see doc_08 section 4)

---

CHANGES APPLIED:
- Guide sections used: 2.2 (auth.methods fix), 11 (multi-language removal)
- Contradictions resolved: auth.methods now uses `z.enum(["email","google"])` (no github), `.min(1)` (prevents empty), `.default(["email"])` (ensures fallback); auth object uses `.default({ methods: ["email"] })` (ensures auth section always exists); removed `locale` from app object; removed `i18n` from features (both JSON Schema and Zod); standardized ChangeType names to match doc_06 (CHANGE_FIELD_TYPE, REMOVE_ENTITY); JSON Schema auth.methods now has `minItems: 1`
- Removed: `github` from auth enum; `app.locale` field; `features.i18n` section; `CHANGE_TYPE` (renamed to `CHANGE_FIELD_TYPE`); trailing "what was fixed" commentary block; emoji from headers; wrapping code fences
