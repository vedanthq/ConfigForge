import { z } from "zod";
import type { Config, ValidationError, ValidationResult } from "./types";
import { logger } from "../lib/logger";

const nameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const pathRegex = /^\/[a-zA-Z0-9\-\/]*$/;

export const fieldSchema = z.object({
  id: z.string().regex(nameRegex),
  type: z.enum(["text", "number", "date", "select", "boolean"]),
  label: z.string().max(120).optional(),
  options: z.array(z.string()).optional(),
  validation: z.object({
    required: z.boolean().default(false),
    maxLength: z.number().int().positive().optional(),
  }).default({}),
}).strict();

export const entitySchema = z.object({
  name: z.string().regex(nameRegex),
  fields: z.array(fieldSchema).min(1),
}).strict();

export const pageSchema = z.object({
  path: z.string().regex(pathRegex),
  type: z.enum(["list", "form", "detail", "dashboard"]),
  entity: z.string().regex(nameRegex),
}).strict();

export const featuresSchema = z.object({
  csv_import: z.boolean(),
  notifications: z.object({
    on_create: z.boolean().optional(),
    on_update: z.boolean().optional(),
    on_delete: z.boolean().optional(),
  }).strict(),
  notification_recipients: z.array(z.string().email()).optional(),
}).strict();

export const configSchema = z.object({
  version: z.string().regex(/^[0-9]+\.[0-9]+$/),
  app: z.object({
    name: z.string().min(1).max(120),
  }).strict(),
  auth: z.object({
    methods: z.array(z.enum(["email", "google"])).min(1).default(["email"]),
  }).default({ methods: ["email"] }),
  entities: z.array(entitySchema).min(1),
  pages: z.array(pageSchema).min(1),
  features: featuresSchema,
}).strict();

export type ConfigInferred = z.infer<typeof configSchema>;

export function semanticValidate(config: Config): ValidationError[] {
  const errors: ValidationError[] = [];
  const entityNames = new Set<string>();

  for (const entity of config.entities) {
    if (entityNames.has(entity.name)) {
      errors.push({
        path: `entities.${entity.name}`,
        message: "Duplicate entity name",
        severity: "error",
      });
      continue;
    }
    entityNames.add(entity.name);

    const fieldIds = new Set<string>();
    for (const field of entity.fields) {
      if (fieldIds.has(field.id)) {
        errors.push({
          path: `entities.${entity.name}.fields.${field.id}`,
          message: "Duplicate field ID within entity",
          severity: "error",
        });
      }
      fieldIds.add(field.id);

      if (field.type === "select") {
        if (!field.options || field.options.length === 0) {
          errors.push({
            path: `entities.${entity.name}.fields.${field.id}`,
            message: "Select field requires at least one option",
            severity: "error",
          });
        }

        if (field.options) {
          const optionSet = new Set<string>();
          for (const option of field.options) {
            if (optionSet.has(option)) {
              errors.push({
                path: `entities.${entity.name}.fields.${field.id}`,
                message: "Duplicate option in select field",
                severity: "error",
              });
              break;
            }
            optionSet.add(option);
          }
        }
      }
    }
  }

  const pagePaths = new Set<string>();
  for (const page of config.pages) {
    if (!entityNames.has(page.entity)) {
      errors.push({
        path: `pages.${page.path}`,
        message: `Entity '${page.entity}' does not exist`,
        severity: "error",
      });
    }

    if (pagePaths.has(page.path)) {
      errors.push({
        path: `pages.${page.path}`,
        message: "Duplicate page path",
        severity: "error",
      });
    }
    pagePaths.add(page.path);
  }

  return errors;
}

export function validateConfig(raw: unknown): ValidationResult<Config> {
  const parsed = configSchema.safeParse(raw);

  if (!parsed.success) {
    const errors: ValidationError[] = parsed.error.errors.map((e) => ({
      path: e.path.length > 0 ? e.path.join(".") : "root",
      message: e.message,
      severity: "error" as const,
    }));
    logger.warn({ errors }, "Config validation failed: Zod schema errors");
    return { success: false, errors };
  }

  const semanticErrors = semanticValidate(parsed.data);

  if (semanticErrors.length > 0) {
    logger.warn({ errors: semanticErrors }, "Config validation failed: semantic errors");
    return { success: false, errors: semanticErrors };
  }

  return {
    success: true,
    data: parsed.data,
    warnings: [],
  };
}
