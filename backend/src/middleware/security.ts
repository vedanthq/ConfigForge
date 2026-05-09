import type { Express, Request, Response, NextFunction } from 'express';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { getRedis, getRedisStatus } from '../services/cacheService';
import { logAuditEvent } from '../services/auditService';
import { runtimeState } from '../core/runtime';
import type { Logger } from 'pino';

export function logStartupStatus(logger: Logger): void {
  const config = runtimeState.config;
  if (config) {
    logger.info(`Config loaded: ${config.app.name} with ${config.entities.length} entities`);
  }
  const redis = getRedisStatus();
  logger.info(`Redis: ${redis === 'connected' ? 'connected' : 'not available'}`);
}

export function registerSecurityMiddleware(app: Express): void {
  app.use(helmet());

  const corsOrigin = process.env.CORS_ORIGIN;
  app.use(cors({
    origin: corsOrigin ? corsOrigin.split(',').map(s => s.trim()) : true,
    credentials: corsOrigin ? true : false,
  }));

  app.use(express.json({ limit: '1mb' }));

  const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logAuditEvent({
        type: 'RATE_LIMIT',
        ip: req.ip,
        requestId: (req as any).requestId,
        details: { path: req.path, method: req.method, limit: 'global:100/min' },
      });
      res.status(429).json({ error: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded' });
    },
  });
  app.use('/api', globalLimiter);

  const redis = getRedis();
  if (redis) {
    app.use('/api', async (req: Request, res: Response, next: NextFunction) => {
      const appId = req.headers['x-app-id'] as string | undefined;
      if (!appId) return next();

      try {
        const key = `ratelimit:tenant:${appId}`;
        const current = await redis.incr(key);
        if (current === 1) {
          await redis.expire(key, 60);
        }

        const tier = (req.headers['x-tier'] as string) || 'default';
        const tierLimits: Record<string, number> = { free: 60, pro: 300 };
        const limit = tierLimits[tier] ?? 100;

        if (current > limit) {
          logAuditEvent({
            type: 'RATE_LIMIT',
            appId,
            ip: req.ip,
            requestId: (req as any).requestId,
            details: { path: req.path, method: req.method, tier, limit: `${limit}/min` },
          });
          res.status(429).json({ error: 'TENANT_RATE_LIMIT', message: 'Per-tenant rate limit exceeded' });
          return;
        }
      } catch {
        // Redis error, fall through to global limiter
      }
      next();
    });
  }
}
