import { z } from "zod";
import type { Entity, Config } from "../core/types";
import { db } from "./connection";
import { logger } from "../lib/logger";

export function buildZodSchema(entity: Entity): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of entity.fields) {
    let fieldSchema: z.ZodTypeAny;

    switch (field.type) {
      case "text": {
        let s = z.string();
        if (field.validation?.maxLength) {
          s = s.max(field.validation.maxLength);
        }
        fieldSchema = s;
        break;
      }
      case "number":
        fieldSchema = z.number();
        break;
      case "boolean":
        fieldSchema = z.boolean();
        break;
      case "date":
        fieldSchema = z.string().datetime();
        break;
      case "select": {
        const uniqueOptions = [...new Set(field.options ?? [])];
        if (uniqueOptions.length === 0) {
          fieldSchema = z.any();
        } else {
          fieldSchema = z.enum(uniqueOptions as [string, ...string[]]);
        }
        break;
      }
      default:
        fieldSchema = z.any();
    }

    if (!field.validation?.required) {
      fieldSchema = fieldSchema.optional();
    }

    shape[field.id] = fieldSchema;
  }

  return z.object(shape);
}

export async function ensureEntityTable(entity: Entity): Promise<void> {
  const tableName = entity.name;
  const exists = await db.schema.hasTable(tableName);

  if (!exists) {
    await db.schema.createTable(tableName, (table) => {
      table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      table.uuid('app_id').notNullable().references('id').inTable('apps').onDelete('CASCADE');
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.jsonb('data').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
      table.index(['app_id', 'user_id']);
    });
    logger.info({ table: tableName }, 'Entity table created');
  } else {
    logger.info({ table: tableName }, 'Entity table already exists');
  }
}

export async function syncDatabase(config: Config): Promise<void> {
  for (const entity of config.entities) {
    await ensureEntityTable(entity);
  }
  logger.info({ count: config.entities.length }, 'Database sync completed');
}

export async function saveConfigSnapshot(appId: string, config: Config, version: number): Promise<void> {
  await db('config_snapshots').insert({
    app_id: appId,
    config: JSON.stringify(config),
    version,
    created_at: db.fn.now(),
  });
  logger.info({ version }, 'Config snapshot saved');
}
