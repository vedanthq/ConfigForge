import Redis from 'ioredis';
import { logger } from '../lib/logger';
import type { RuntimeConfig } from '../core/types';

const KEY_PREFIX = 'configforge:config:';
const CHANNEL = 'configforge:config:invalidate';
const DEFAULT_TTL = 300;

let redisClient: Redis | null | undefined = undefined;
let redisStatus: 'connected' | 'disconnected' | 'not_configured' = 'not_configured';

export function getRedisStatus(): string {
  return redisStatus;
}

export function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.REDIS_URL;
  if (!url) {
    redisStatus = 'not_configured';
    redisClient = null;
    return null;
  }

  try {
    redisClient = new Redis(url, {
      retryStrategy: (times: number) => {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      maxRetriesPerRequest: 1,
    });

    redisClient.on('connect', () => {
      redisStatus = 'connected';
      logger.info('Redis connected');
    });

    redisClient.on('close', () => {
      redisStatus = 'disconnected';
    });

    redisClient.on('error', (err: any) => {
      redisStatus = 'disconnected';
      logger.warn({ err: err?.message }, 'Redis connection error');
    });

    return redisClient;
  } catch (err: any) {
    redisStatus = 'disconnected';
    logger.warn({ err: err?.message }, 'Redis initialization failed');
    redisClient = null;
    return null;
  }
}

export async function getConfigCache(appId: string): Promise<RuntimeConfig | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const key = `${KEY_PREFIX}${appId}`;
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as RuntimeConfig;
  } catch (err: any) {
    logger.warn({ err: err?.message, appId }, 'Cache get failed');
    return null;
  }
}

export async function setConfigCache(appId: string, config: RuntimeConfig, ttl: number = DEFAULT_TTL): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const key = `${KEY_PREFIX}${appId}`;
    const data = JSON.stringify(config);
    await redis.setex(key, ttl, data);
  } catch (err: any) {
    logger.warn({ err: err?.message, appId }, 'Cache set failed');
  }
}

export async function invalidateConfigCache(appId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const key = `${KEY_PREFIX}${appId}`;
    await redis.del(key);
    await redis.publish(CHANNEL, appId);
  } catch (err: any) {
    logger.warn({ err: err?.message, appId }, 'Cache invalidation failed');
  }
}
