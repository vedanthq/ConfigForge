import { Mutex } from 'async-mutex';
import type { Express } from 'express';
import type { Config } from './types';
import { normalizeConfig } from './normalizer';
import { syncDatabase, saveConfigSnapshot } from '../db/schemaBuilder';
import { registerDynamicRoutes } from '../api/routes';
import { registerNotificationListeners } from '../services/notificationService';
import { invalidateConfigCache } from '../services/cacheService';
import { runtimeState } from './runtime';
import { logger } from '../lib/logger';

const reloadMutex = new Mutex();

let unregisterNotifications: (() => void) | null = null;

export function registerInitialNotifications(): void {
  const cleanup = registerNotificationListeners();
  unregisterNotifications = cleanup;
}

export async function reloadConfig(app: Express, newConfig: Config, appId?: string): Promise<number> {
  return reloadMutex.runExclusive(async () => {
    const normalized = normalizeConfig(newConfig);

    await syncDatabase(normalized);
    logger.info('Database synced during reload');

    registerDynamicRoutes(app, normalized);
    logger.info('Dynamic routes re-registered during reload');

    if (typeof unregisterNotifications === 'function') {
      unregisterNotifications();
    }
    const cleanup = registerNotificationListeners();
    unregisterNotifications = cleanup;

    runtimeState.config = normalized;
    runtimeState.version = Date.now();

    if (appId) {
      await saveConfigSnapshot(appId, normalized, runtimeState.version);
    }

    if (appId) {
      await invalidateConfigCache(appId);
    }

    logger.info({ version: runtimeState.version }, 'Config reloaded successfully');
    return runtimeState.version;
  });
}
