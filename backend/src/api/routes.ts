import type { Express } from 'express';
import type { RuntimeConfig } from '../core/types';
import { createRouterEngine, type RouterEngine } from '../core/routerEngine';
import { logger } from '../lib/logger';

let engine: RouterEngine | null = null;

export function registerDynamicRoutes(app: Express, config: RuntimeConfig): void {
  if (!engine) {
    engine = createRouterEngine(app);
    logger.info('Router engine created');
  }

  engine.replaceRoutes(config);
  logger.info({ entities: config.entities.length }, 'Dynamic routes registered');
}
