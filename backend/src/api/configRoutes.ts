import express, { type Express, type Request, type Response } from 'express';
import { runtimeState, reloadConfig } from '../core/runtime';
import { validateConfig } from '../core/validator';
import { normalizeConfig } from '../core/normalizer';
import { diffConfigs, isBreaking } from '../core/diff';
import { requireAuth } from '../middleware/auth';
import { logger } from '../lib/logger';

export function registerConfigRoutes(app: Express): void {
  app.get('/config/runtime', (_req: Request, res: Response) => {
    res.json({ version: runtimeState.version, config: runtimeState.config });
  });

  app.get('/config/version', (_req: Request, res: Response) => {
    res.json({ version: runtimeState.version });
  });

  app.post('/config', express.json({ limit: '256kb' }), requireAuth, async (req: Request, res: Response) => {
    try {
      const validated = validateConfig(req.body);
      if (!validated.success) {
        res.status(400).json({ error: 'INVALID_CONFIG', details: validated.errors });
        return;
      }

      const newConfig = normalizeConfig(validated.data);

      const currentConfig = runtimeState.config;
      if (!currentConfig) {
        res.status(503).json({ error: 'SERVICE_UNAVAILABLE', message: 'No active config' });
        return;
      }

      const changes = diffConfigs(currentConfig, newConfig);
      const breakingChanges = changes.filter(isBreaking);

      if (breakingChanges.length > 0) {
        res.status(409).json({ error: 'BREAKING_SCHEMA_CHANGE', details: breakingChanges });
        return;
      }

      const version = await reloadConfig(app, newConfig, (req as any).app?.id);

      res.json({ success: true, version });
    } catch (err: any) {
      logger.error({ err: err?.message }, 'Config reload failed');
      res.status(500).json({ error: 'RELOAD_FAILED', message: 'Config reload failed' });
    }
  });
}
