import type { Express } from 'express';
import type { Config, RuntimeConfig } from './types';
import { loadConfig } from './configLoader';
import { validateConfig } from './validator';
import { normalizeConfig } from './normalizer';
import { syncDatabase } from '../db/schemaBuilder';
import { registerDynamicRoutes } from '../api/routes';
import { registerInitialNotifications } from './reloadEngine';
import { logger } from '../lib/logger';

export const runtimeState: { config: RuntimeConfig | null; version: number } = {
  config: null,
  version: 0,
};

export async function bootApp(app: Express): Promise<void> {
  logger.info('Starting boot sequence');

  if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
    logger.fatal('NEXTAUTH_SECRET must be at least 32 characters');
    process.exit(1);
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

  registerDynamicRoutes(app, normalized);
  logger.info('Dynamic routes registered');

  runtimeState.config = normalized;
  runtimeState.version = 1;

  registerInitialNotifications();

  logger.info({ version: 1, app: normalized.app.name, entities: normalized.entities.length }, 'Boot sequence completed');
}

export { reloadConfig } from './reloadEngine';
