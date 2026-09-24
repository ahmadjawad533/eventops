import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

export let redisClient: Redis;

try {
  redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy(times) {
      if (process.env.NODE_ENV === 'test') return null; // don't retry continuously in test
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
  });

  redisClient.on('error', (err) => {
    logger.debug('Redis client notice', { message: err.message });
  });
} catch (err) {
  logger.warn('Redis client initialization failed', { error: err });
}

export async function checkRedisConnection(): Promise<boolean> {
  try {
    if (!redisClient) return false;
    if (redisClient.status === 'ready' || redisClient.status === 'connect') {
      const pong = await redisClient.ping();
      return pong === 'PONG';
    }
    // Attempt quick connect if not yet connected
    await redisClient.connect();
    const pong = await redisClient.ping();
    return pong === 'PONG';
  } catch (error) {
    logger.debug('Redis connection check failed', { error });
    return false;
  }
}
