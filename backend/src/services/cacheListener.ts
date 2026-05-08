import Redis from 'ioredis';
import { logger } from '../lib/logger';
import { getRedis } from './cacheService';

const CHANNEL = 'configforge:config:invalidate';

export function subscribeToInvalidations(): void {
  const redis = getRedis();
  if (!redis) {
    logger.info('Redis not available, cache invalidation listener not started');
    return;
  }

  const sub = redis.duplicate();

  sub.on('message', (channel: string, message: string) => {
    if (channel === CHANNEL) {
      const appId = message;
      logger.info({ appId }, 'Cache invalidation received via pub/sub');

      const mainRedis = getRedis();
      if (mainRedis) {
        const key = `configforge:config:${appId}`;
        mainRedis.del(key).catch((err: any) => {
          logger.warn({ err: err?.message, appId }, 'Cache invalidation delete failed');
        });
      }
    }
  });

  sub.subscribe(CHANNEL).catch((err: any) => {
    logger.warn({ err: err?.message }, 'Failed to subscribe to cache invalidation channel');
  });

  sub.on('error', (err: any) => {
    logger.warn({ err: err?.message }, 'Cache subscriber error');
  });

  logger.info('Cache invalidation listener started');
}
