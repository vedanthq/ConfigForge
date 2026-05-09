import { exec } from 'child_process';
import { promisify } from 'util';
import type { Express } from 'express';
import type { Config, RuntimeConfig } from './types';
import { loadConfig } from './configLoader';
import { validateConfig } from './validator';
import { normalizeConfig } from './normalizer';
import { syncDatabase } from '../db/schemaBuilder';
import { registerDynamicRoutes } from '../api/routes';
import { registerInitialNotifications } from './reloadEngine';
import { logger } from '../lib/logger';

const asyncExec = promisify(exec);

export const runtimeState: { config: RuntimeConfig | null; version: number } = {
  config: null,
  version: 0,
};

export async function bootApp(app: Express): Promise<void> {
  logger.info('Starting boot sequence');

  if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
    throw new Error('NEXTAUTH_SECRET must be at least 32 characters');
  }

  const raw = loadConfig();
  logger.info('Config file loaded');

  const validated = validateConfig(raw);
  if (!validated.success) {
    logger.error({ errors: validated.errors }, 'Config validation failed');
    throw new Error('Configuration validation failed');
  }
  logger.info('Config validated');

  const normalized = normalizeConfig(validated.data);
  logger.info('Config normalized');

  await syncDatabase(normalized);
  logger.info('Database synced');

  // Run pending Knex migrations and seed now that DB is confirmed available
  await runPendingMigrations();

  registerDynamicRoutes(app, normalized);
  logger.info('Dynamic routes registered');

  runtimeState.config = normalized;
  runtimeState.version = 1;

  registerInitialNotifications();

  logger.info({ version: 1, app: normalized.app.name, entities: normalized.entities.length }, 'Boot sequence completed');
}

async function runPendingMigrations(): Promise<void> {
  try {
    await asyncExec(
      './node_modules/.bin/tsx ./node_modules/knex/bin/cli.js migrate:latest --knexfile ./knexfile.ts',
      { timeout: 30000 },
    );
    logger.info('Knex migrations completed');

    await asyncExec(
      './node_modules/.bin/tsx ./node_modules/knex/bin/cli.js seed:run --knexfile ./knexfile.ts',
      { timeout: 30000 },
    );
    logger.info('Knex seeds completed');
  } catch (err: any) {
    logger.warn({ err: err?.message }, 'Post-boot migrations/seeds failed — app running in degraded mode');
  }
}

export { reloadConfig } from './reloadEngine';
