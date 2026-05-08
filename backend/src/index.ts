import express from 'express';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from './lib/logger';
import { db } from './db/connection';
import { bootApp, runtimeState } from './core/runtime';
import { registerSecurityMiddleware, logStartupStatus } from './middleware/security';
import { getRedisStatus } from './services/cacheService';
import { registerConfigRoutes } from './api/configRoutes';
import { registerAuthRoutes } from './api/authRoutes';
import { registerCsvRoutes } from './api/csvRoutes';
import { registerLlmRoutes } from './api/llmRoutes';
import { resolveTenant } from './middleware/tenantResolver';
import { requireAuth } from './middleware/auth';
import { checkAppMembership } from './middleware/membership';

dotenv.config();

const app = express();
const logger = createLogger('backend');
const PORT = parseInt(process.env.PORT || '4000', 10);

registerSecurityMiddleware(app);

app.use((req, _res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  (req as any).requestId = requestId;
  (req as any).logger = logger.child({ requestId });
  (req as any).logger.info({ method: req.method, url: req.url }, 'incoming request');
  next();
});

app.use('/api', (req, _res, next) => {
  req.config = runtimeState.config!;
  next();
});

app.get('/health', async (_req, res) => {
  const checks: Record<string, any> = {};
  let healthy = true;

  try {
    await db.raw('SELECT 1');
    checks.database = 'connected';
  } catch (err) {
    checks.database = 'disconnected';
    healthy = false;
  }

  const redisStatus = getRedisStatus();
  checks.redis = redisStatus === 'connected' ? 'connected' : redisStatus;
  checks.runtime = runtimeState.config ? 'loaded' : 'not_loaded';
  checks.version = runtimeState.version;
  checks.app = runtimeState.config?.app?.name || null;
  checks.entities = runtimeState.config?.entities?.length || 0;
  checks.uptime = process.uptime();

  if (!healthy) {
    res.status(503).json({ status: 'unhealthy', ...checks });
  } else {
    res.json({ status: 'healthy', ...checks });
  }
});

registerConfigRoutes(app);
registerAuthRoutes(app);
registerLlmRoutes(app);

app.use('/api', resolveTenant, requireAuth, checkAppMembership);

registerCsvRoutes(app);

(async () => {
  try {
    await bootApp(app);
    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'ConfigForge backend running on port');
      logStartupStatus(logger);
    });
  } catch (err) {
    logger.error({ err }, 'Boot sequence failed');
    process.exit(1);
  }
})();
