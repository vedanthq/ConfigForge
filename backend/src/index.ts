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

// Liveness probe — always returns 200 so Railway never kills the container
app.get('/health', async (_req, res) => {
  const checks: Record<string, any> = {};

  try {
    await db.raw('SELECT 1');
    checks.database = 'connected';
  } catch (err) {
    checks.database = 'disconnected';
  }

  const redisStatus = getRedisStatus();
  checks.redis = redisStatus === 'connected' ? 'connected' : redisStatus;
  checks.runtime = runtimeState.config ? 'loaded' : 'not_loaded';
  checks.version = runtimeState.version;
  checks.app = runtimeState.config?.app?.name || null;
  checks.entities = runtimeState.config?.entities?.length || 0;
  checks.uptime = process.uptime();
  checks.ready = runtimeState.config !== null && checks.database === 'connected';

  res.json({ status: checks.ready ? 'healthy' : 'starting', ...checks });
});

// Readiness probe — returns 503 when the app is not fully ready
app.get('/health/ready', async (_req, res) => {
  const checks: Record<string, any> = {};

  try {
    await db.raw('SELECT 1');
    checks.database = 'connected';
  } catch (err) {
    checks.database = 'disconnected';
  }

  checks.runtime = runtimeState.config ? 'loaded' : 'not_loaded';
  checks.version = runtimeState.version;
  checks.uptime = process.uptime();

  const ready = runtimeState.config !== null && checks.database === 'connected';

  if (!ready) {
    res.status(503).json({ status: 'not_ready', ready: false, ...checks });
  } else {
    res.json({ status: 'ready', ready: true, ...checks });
  }
});

registerConfigRoutes(app);
registerAuthRoutes(app);
registerLlmRoutes(app);

app.use('/api', resolveTenant, requireAuth, checkAppMembership);

registerCsvRoutes(app);

// Start HTTP server immediately so Railway health checks succeed
app.listen(PORT, () => {
  logger.info({ port: PORT }, 'ConfigForge backend HTTP server listening');
  logStartupStatus(logger);
});

// Boot the app (DB sync, config load, dynamic routes) in the background
bootApp(app).then(() => {
  logger.info('Boot sequence completed successfully');
}).catch((err) => {
  logger.error({ err }, 'Boot sequence failed — app is running in degraded mode');
});
