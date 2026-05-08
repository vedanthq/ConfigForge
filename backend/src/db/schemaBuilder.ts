import { z } from "zod";
import type { Entity, Config } from "../core/types";
import { db } from "./connection";
import { logger } from "../lib/logger";

const MAX_SYNC_RETRIES = 10;
const BASE_RETRY_DELAY_MS = 2000;

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
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_SYNC_RETRIES; attempt++) {
    try {
      for (const entity of config.entities) {
        await ensureEntityTable(entity);
      }
      logger.info({ count: config.entities.length, attempt }, 'Database sync completed');
      return; // success
    } catch (err: any) {
      lastError = err;
      if (attempt < MAX_SYNC_RETRIES) {
        const delay = attempt * BASE_RETRY_DELAY_MS;
        logger.warn(
          { err: err.message, attempt, maxRetries: MAX_SYNC_RETRIES, delayMs: delay },
          'Database sync attempt failed, retrying',
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted
  logger.error(
    { err: lastError?.message, attempts: MAX_SYNC_RETRIES },
    'Database sync failed after all retries',
  );
  throw lastError || new Error('Database sync failed after all retries');
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
